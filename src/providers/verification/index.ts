// Identity & ownership verification provider abstraction.
//
// MVP drivers:
//  - "manual": creates a PENDING record for a platform admin to resolve (default).
//  - "mock-auto": auto-approves with a synthetic confidence, for fast local demos.
// A real integration (e.g. Persona, Stripe Identity, title-data vendor) would slot in here.
import { env } from "@/lib/env";
import type { VerificationKind, VerificationStatus } from "@prisma/client";

export interface VerificationRequest {
  kind: VerificationKind;
  subjectName: string;
  subjectEmail: string;
  propertyAddress?: string;
}

export interface VerificationResult {
  provider: string;
  status: VerificationStatus;
  referenceId: string;
  confidence: number | null;
  evidence: Record<string, unknown>;
}

export interface VerificationProvider {
  start(req: VerificationRequest): Promise<VerificationResult>;
}

class ManualVerification implements VerificationProvider {
  async start(req: VerificationRequest): Promise<VerificationResult> {
    return {
      provider: "manual",
      status: "PENDING",
      referenceId: `manual_${Date.now()}`,
      confidence: null,
      evidence: { note: "Queued for manual admin review", kind: req.kind },
    };
  }
}

class MockAutoVerification implements VerificationProvider {
  async start(req: VerificationRequest): Promise<VerificationResult> {
    return {
      provider: "mock-auto",
      status: "APPROVED",
      referenceId: `mockauto_${Date.now()}`,
      confidence: 0.92,
      evidence: {
        note: "Auto-approved by mock provider (development only)",
        kind: req.kind,
        matched: req.kind === "OWNERSHIP" ? { addressOnFile: req.propertyAddress } : { name: req.subjectName },
      },
    };
  }
}

let instance: VerificationProvider | null = null;
export function verification(): VerificationProvider {
  if (instance) return instance;
  instance = env.VERIFICATION_PROVIDER === "mock-auto" ? new MockAutoVerification() : new ManualVerification();
  return instance;
}
