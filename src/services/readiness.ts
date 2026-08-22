// Bridges a persisted Property to the pure readiness scorer, then stores the score
// and its explanation. Callable from the AI workflow and on-demand (e.g. after the
// seller edits the listing or uploads photos).
import { prisma } from "@/lib/db";
import { computeReadiness, type ReadinessInput, type ReadinessResult } from "@/domain/readiness";
import { DISCLOSURE_CHECKLIST } from "@/domain/constants";

interface DisclosureItem {
  key: string;
  label: string;
  acknowledged: boolean;
}

export function countAcknowledgedDisclosures(disclosures: unknown): { total: number; acknowledged: number } {
  const items = Array.isArray(disclosures) ? (disclosures as DisclosureItem[]) : [];
  const total = items.length || DISCLOSURE_CHECKLIST.length;
  const acknowledged = items.filter((d) => d?.acknowledged).length;
  return { total, acknowledged };
}

export function countShowingWindows(showingAvailability: unknown): number {
  return Array.isArray(showingAvailability) ? showingAvailability.length : 0;
}

export async function buildReadinessInput(propertyId: string, extraWarnings: string[] = []): Promise<ReadinessInput> {
  const p = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: {
      seller: { select: { emailVerifiedAt: true, phoneVerifiedAt: true, identityStatus: true } },
      verifications: { select: { kind: true, status: true } },
      _count: { select: { photos: true } },
    },
  });

  const ownershipVerified = p.verifications.some((v) => v.kind === "OWNERSHIP" && v.status === "APPROVED");
  const identityVerified =
    p.seller.identityStatus === "VERIFIED" || p.verifications.some((v) => v.kind === "IDENTITY" && v.status === "APPROVED");

  const { total, acknowledged } = countAcknowledgedDisclosures(p.disclosures);

  return {
    emailVerified: !!p.seller.emailVerifiedAt,
    phoneVerified: !!p.seller.phoneVerifiedAt,
    identityVerified,
    ownershipVerified,
    hasAddress: !!p.addressLine1 && !!p.city && !!p.zip,
    presentFacts: {
      bedrooms: p.bedrooms != null,
      bathrooms: p.bathrooms != null,
      squareFeet: p.squareFeet != null,
      yearBuilt: p.yearBuilt != null,
      propertyType: !!p.propertyType,
    },
    hasAskingPrice: p.askingPrice != null && p.askingPrice > 0,
    photoCount: p._count.photos,
    disclosuresTotal: total,
    disclosuresAcknowledged: acknowledged,
    showingWindowCount: countShowingWindows(p.showingAvailability),
    warnings: extraWarnings,
  };
}

export async function assessProperty(propertyId: string, extraWarnings: string[] = []): Promise<ReadinessResult> {
  const input = await buildReadinessInput(propertyId, extraWarnings);
  const result = computeReadiness(input);
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      readinessScore: result.score,
      readinessBreakdown: {
        components: result.components,
        warnings: result.warnings,
        blockers: result.blockers,
        publishable: result.publishable,
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
      readinessComputedAt: new Date(),
    },
  });
  return result;
}
