// AI-first property onboarding workflow (triggered by the `property.created` event).
//
// Idempotent: guarded by a WorkflowRun row keyed on the property. Each step is safe
// to re-run. The workflow NEVER publishes and NEVER invents facts — it prepares a
// draft, scores readiness, and routes the property to the correct lifecycle state
// for the seller to review. Publication is a separate, explicit seller action.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ai, type ListingFacts } from "@/providers/ai";
import { enrichment } from "@/providers/enrichment";
import { verification } from "@/providers/verification";
import { recordProvenance } from "@/services/provenance";
import { assessProperty } from "@/services/readiness";
import { transitionProperty } from "@/services/property-status";
import { notify } from "@/services/notifications";
import { recordAudit, trackEvent } from "@/lib/audit";
import { screenMany } from "@/domain/fair-housing";
import { sanitizeText, sanitizeMultiline } from "@/lib/sanitize";

interface StepState {
  name: string;
  status: "ok" | "error" | "skipped";
  startedAt: string;
  finishedAt?: string;
  output?: unknown;
  error?: string;
}

function toFacts(p: {
  city: string;
  state: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  lotSizeSqft: number | null;
  yearBuilt: number | null;
  garageSpaces: number | null;
  stories: number | null;
  hoaFeeMonthly: number | null;
  askingPrice: number | null;
  features: string[];
  improvements: string | null;
}): ListingFacts {
  return {
    city: p.city,
    state: p.state,
    propertyType: p.propertyType,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    squareFeet: p.squareFeet,
    lotSizeSqft: p.lotSizeSqft,
    yearBuilt: p.yearBuilt,
    garageSpaces: p.garageSpaces,
    stories: p.stories,
    hoaFeeMonthly: p.hoaFeeMonthly,
    askingPrice: p.askingPrice,
    features: p.features,
    improvements: p.improvements,
  };
}

export async function runOnboardingWorkflow(propertyId: string): Promise<void> {
  const idempotencyKey = `onboarding:${propertyId}`;

  const run = await prisma.workflowRun.upsert({
    where: { idempotencyKey },
    create: { propertyId, idempotencyKey, status: "RUNNING", startedAt: new Date(), steps: [] },
    update: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 }, error: null },
  });

  if (run.status === "COMPLETED") {
    logger.info("workflow.already_complete", { propertyId });
    return;
  }

  const steps: StepState[] = [];
  const runStep = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const step: StepState = { name, status: "ok", startedAt: new Date().toISOString() };
    await prisma.workflowRun.update({ where: { id: run.id }, data: { currentStep: name } });
    try {
      const output = await fn();
      step.finishedAt = new Date().toISOString();
      step.output = summarize(output);
      steps.push(step);
      await prisma.workflowRun.update({ where: { id: run.id }, data: { steps: steps as unknown as Prisma.InputJsonValue } });
      return output;
    } catch (err) {
      step.status = "error";
      step.finishedAt = new Date().toISOString();
      step.error = err instanceof Error ? err.message : String(err);
      steps.push(step);
      throw err;
    }
  };

  try {
    const property = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
      include: { seller: true, _count: { select: { photos: true } } },
    });
    const facts = toFacts(property);
    const photoCount = property._count.photos;

    // 1. Validate required fields (missing required facts are surfaced, not fatal).
    const missing = await runStep("validate", async () => ai().findMissingInfo(facts, photoCount));
    const hasBlockers = missing.some((m) => m.severity === "BLOCKER");

    // 2-3. Start identity + ownership verification via the provider interface (mock/manual for MVP).
    await runStep("verification", async () => {
      await ensureVerification(property.sellerId, "IDENTITY", propertyId, property.seller.fullName, property.seller.email);
      await ensureVerification(
        property.sellerId,
        "OWNERSHIP",
        propertyId,
        property.seller.fullName,
        property.seller.email,
        `${property.addressLine1}, ${property.city}, ${property.state} ${property.zip}`,
      );
      return { started: true };
    });

    // 4. Enrich property information (mock/seeded comparables + value estimate).
    const enr = await runStep("enrichment", async () => {
      const result = await enrichment().enrich({
        city: property.city,
        zip: property.zip,
        squareFeet: property.squareFeet,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        yearBuilt: property.yearBuilt,
        askingPrice: property.askingPrice,
      });
      await prisma.enrichmentRecord.deleteMany({ where: { propertyId, provider: result.provider } });
      await prisma.enrichmentRecord.create({
        data: { propertyId, provider: result.provider, data: result as unknown as Prisma.InputJsonValue, confidence: result.confidence },
      });
      await recordProvenance(propertyId, [
        { field: "estimatedValueLow", value: String(result.estimatedValueLow ?? ""), source: "ENRICHMENT", provider: result.provider, confidence: result.confidence },
        { field: "estimatedValueHigh", value: String(result.estimatedValueHigh ?? ""), source: "ENRICHMENT", provider: result.provider, confidence: result.confidence },
        { field: "pricePerSqft", value: String(result.pricePerSqft ?? ""), source: "ENRICHMENT", provider: result.provider, confidence: result.confidence },
      ]);
      return result;
    });

    // 5. Identify missing/inconsistent info → warnings.
    const warnings: string[] = [];
    if (enr.priceAssessment === "above_range") warnings.push("Asking price is above the estimated market value range.");
    if (enr.priceAssessment === "below_range") warnings.push("Asking price is below the estimated market value range.");

    // 6. Calculate the Market Readiness Score.
    const readiness = await runStep("readiness", async () => assessProperty(propertyId, warnings));

    // 7. Generate listing content (only if the seller hasn't already approved content).
    await runStep("generate_content", async () => {
      if (property.aiContentStatus === "APPROVED") return { skipped: true };
      const gen = await ai().generateListing(facts);

      // Fair-housing screen; if AI copy trips a rule, fall back to a neutral description.
      const flags = screenMany([gen.headline, gen.description, ...gen.highlights, gen.openHouseCopy]);
      const description = flags.length
        ? `${facts.bedrooms ?? ""}BR/${facts.bathrooms ?? ""}BA ${facts.propertyType.toLowerCase().replace(/_/g, " ")} in ${facts.city}. Listed directly by owner on Keyd.`
        : gen.description;

      await prisma.property.update({
        where: { id: propertyId },
        data: {
          aiContentStatus: "GENERATED",
          headline: sanitizeText(gen.headline),
          description: sanitizeMultiline(description),
          highlights: gen.highlights.map(sanitizeText),
          buyerFaq: gen.buyerFaq as unknown as Prisma.InputJsonValue,
          socialCaptions: gen.socialCaptions as unknown as Prisma.InputJsonValue,
          openHouseCopy: sanitizeMultiline(gen.openHouseCopy),
          emailSummary: sanitizeMultiline(gen.emailSummary),
        },
      });
      await recordProvenance(propertyId, [
        { field: "headline", value: gen.headline, source: "AI", provider: "mock", confidence: gen.confidence },
        { field: "description", value: "(generated)", source: "AI", provider: "mock", confidence: gen.confidence },
        { field: "highlights", value: "(generated)", source: "AI", provider: "mock", confidence: gen.confidence },
        { field: "buyerFaq", value: "(generated)", source: "AI", provider: "mock", confidence: gen.confidence },
      ]);
      await recordAudit(prisma, {
        actorType: "AI",
        action: "listing.content.generated",
        entityType: "Property",
        entityId: propertyId,
        metadata: { provider: "mock", confidence: gen.confidence, fairHousingFlags: flags.length },
      });
      return { generated: true, fairHousingFlags: flags.length };
    });

    // 8. Create recommended seller actions from the missing-info findings + photo advice.
    await runStep("recommendations", async () => {
      const photoAdvice = await ai().advisePhotos(facts, photoCount);
      await syncRecommendations(propertyId, missing, photoAdvice.recommendations, warnings);
      return { recommendationCount: missing.length + warnings.length };
    });

    // 9. Route to the correct lifecycle state and notify the seller.
    await runStep("route_and_notify", async () => {
      const ownershipApproved = await isVerified(propertyId, "OWNERSHIP");
      const identityApproved =
        property.seller.identityStatus === "VERIFIED" || (await isVerified(propertyId, "IDENTITY"));

      if (property.status === "DRAFT") {
        await transitionProperty(propertyId, "VERIFICATION_PENDING", { actorType: "SYSTEM", reason: "Onboarding started" });
      }

      let target: "NEEDS_ATTENTION" | "VERIFICATION_PENDING" | "READY_FOR_REVIEW";
      if (hasBlockers) target = "NEEDS_ATTENTION";
      else if (!ownershipApproved || !identityApproved) target = "VERIFICATION_PENDING";
      else target = "READY_FOR_REVIEW";

      if (target !== "VERIFICATION_PENDING") {
        await transitionProperty(propertyId, target, { actorType: "SYSTEM", reason: "Onboarding complete" });
      }

      await trackEvent({ type: "LISTING_COMPLETED", propertyId, userId: property.sellerId });

      if (target === "NEEDS_ATTENTION") {
        await notify({
          userId: property.sellerId,
          type: "MISSING_LISTING_INFO",
          title: "Your Keyd listing needs a few more details",
          body: `We prepared a draft, but a few required items are missing before you can publish: ${missing
            .filter((m) => m.severity === "BLOCKER")
            .map((m) => m.message)
            .join(" ")}`,
          actionPath: `/seller/properties/${propertyId}`,
        });
      } else if (target === "VERIFICATION_PENDING") {
        await notify({
          userId: property.sellerId,
          type: "VERIFICATION_REQUIRED",
          title: "Verifying your identity and ownership",
          body: "Your listing draft is ready. We're verifying your identity and property ownership. You'll be notified as soon as it's cleared for review.",
          actionPath: `/seller/properties/${propertyId}`,
        });
      } else {
        await notify({
          userId: property.sellerId,
          type: "LISTING_READY_FOR_REVIEW",
          title: "Your AI-prepared listing is ready to review",
          body: `Your readiness score is ${readiness.score}/100. Review the AI-generated headline, description, highlights, and promo assets, then publish when you're happy.`,
          actionPath: `/seller/properties/${propertyId}/review`,
        });
      }
      return { target };
    });

    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: "COMPLETED", finishedAt: new Date(), currentStep: null, steps: steps as unknown as Prisma.InputJsonValue },
    });
    logger.info("workflow.completed", { propertyId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: "FAILED", error: message, steps: steps as unknown as Prisma.InputJsonValue },
    });
    // Alert every admin so the failure can be retried from the dashboard.
    await notifyAdminsOfFailure(propertyId, message);
    logger.error("workflow.failed", { propertyId, error: message });
    throw err; // let the job queue apply retry/backoff
  }
}

async function ensureVerification(
  subjectId: string,
  kind: "IDENTITY" | "OWNERSHIP",
  propertyId: string,
  name: string,
  emailAddr: string,
  propertyAddress?: string,
) {
  const existing = await prisma.identityVerification.findFirst({
    where: { subjectId, kind, propertyId: kind === "OWNERSHIP" ? propertyId : undefined, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (existing) return existing;
  const result = await verification().start({ kind, subjectName: name, subjectEmail: emailAddr, propertyAddress });
  const rec = await prisma.identityVerification.create({
    data: {
      subjectId,
      propertyId: kind === "OWNERSHIP" ? propertyId : propertyId, // both attach to property for admin context
      kind,
      provider: result.provider,
      status: result.status,
      referenceId: result.referenceId,
      confidence: result.confidence,
      evidence: result.evidence as unknown as Prisma.InputJsonValue,
    },
  });
  if (result.status === "APPROVED" && kind === "IDENTITY") {
    await prisma.user.update({ where: { id: subjectId }, data: { identityStatus: "VERIFIED" } });
  }
  return rec;
}

async function isVerified(propertyId: string, kind: "IDENTITY" | "OWNERSHIP"): Promise<boolean> {
  const v = await prisma.identityVerification.findFirst({ where: { propertyId, kind, status: "APPROVED" } });
  return !!v;
}

async function syncRecommendations(
  propertyId: string,
  missing: { field: string; message: string; severity: "INFO" | "WARNING" | "BLOCKER" }[],
  photoRecs: string[],
  warnings: string[],
) {
  const rows: { code: string; title: string; detail: string; severity: "INFO" | "WARNING" | "BLOCKER"; category: string }[] = [];
  for (const m of missing) {
    rows.push({
      code: `missing_${m.field}`,
      title: m.severity === "BLOCKER" ? "Required before publishing" : "Recommended",
      detail: m.message,
      severity: m.severity,
      category: m.field === "photos" ? "photos" : "info",
    });
  }
  warnings.forEach((w, i) =>
    rows.push({ code: `warning_${i}`, title: "Data check", detail: w, severity: "WARNING", category: "pricing" }),
  );
  if (photoRecs.length) {
    rows.push({ code: "photo_tips", title: "Photo tips", detail: photoRecs.join(" "), severity: "INFO", category: "photos" });
  }

  for (const r of rows) {
    await prisma.sellerRecommendation.upsert({
      where: { propertyId_code: { propertyId, code: r.code } },
      create: { propertyId, ...r },
      update: { title: r.title, detail: r.detail, severity: r.severity, category: r.category, resolvedAt: null },
    });
  }
  // Clear stale blocker/warning recommendations that no longer apply.
  const activeCodes = new Set(rows.map((r) => r.code));
  const stale = await prisma.sellerRecommendation.findMany({ where: { propertyId, resolvedAt: null } });
  for (const s of stale) {
    if (!activeCodes.has(s.code)) {
      await prisma.sellerRecommendation.update({ where: { id: s.id }, data: { resolvedAt: new Date() } });
    }
  }
}

async function notifyAdminsOfFailure(propertyId: string, message: string) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(
    admins.map((a) =>
      notify({
        userId: a.id,
        type: "WORKFLOW_FAILURE",
        title: "AI workflow failed for a property",
        body: `The onboarding workflow for property ${propertyId} failed: ${message}. Retry it from the admin dashboard.`,
        actionPath: `/admin/workflows`,
      }),
    ),
  );
}

function summarize(output: unknown): unknown {
  if (Array.isArray(output)) return { count: output.length };
  return output;
}
