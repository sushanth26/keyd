import { prisma } from "@/lib/db";

function base(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/// Generate a unique property slug from its address, appending a numeric suffix on collision.
export async function uniquePropertySlug(addressLine1: string, zip: string): Promise<string> {
  const root = `${base(addressLine1)}-${zip}` || `listing-${Date.now()}`;
  let candidate = root;
  let n = 1;
  // Loop until we find a free slug (bounded; addresses are effectively unique).
  while (await prisma.property.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${root}-${n++}`;
  }
  return candidate;
}
