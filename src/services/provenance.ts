// Records provenance for AI-generated or externally-enriched facts:
// source, provider, timestamp (createdAt), and confidence.
import type { Prisma, ProvenanceSource } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface ProvenanceEntry {
  field: string;
  value?: string | null;
  source: ProvenanceSource;
  provider?: string | null;
  confidence?: number | null;
}

export async function recordProvenance(
  propertyId: string,
  entries: ProvenanceEntry[],
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  if (entries.length === 0) return;
  await client.dataProvenance.createMany({
    data: entries.map((e) => ({
      propertyId,
      field: e.field,
      value: e.value ?? null,
      source: e.source,
      provider: e.provider ?? null,
      confidence: e.confidence ?? null,
    })),
  });
}
