// Legacy property URL handler. The canonical page now lives at
// /homes/{state}/{city}/{slug}-{id}. This preserves previously-shared/indexed
// /p/{slug} links:
//   • public listing        → 308 permanent redirect to the canonical URL
//   • withdrawn/sold listing → 410 Gone (permanently removed)
//   • unknown/unpublished    → 404 Not Found
import { NextResponse } from "next/server";
import type { PropertyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isPubliclyVisible } from "@/domain/lifecycle";
import { propertyUrl } from "@/lib/seo/urls";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  let property: { id: string; slug: string; city: string; state: string; status: PropertyStatus } | null = null;
  try {
    property = await prisma.property.findUnique({
      where: { slug: params.slug },
      select: { id: true, slug: true, city: true, state: true, status: true },
    });
  } catch {
    return new NextResponse("Service temporarily unavailable", { status: 503 });
  }
  if (!property) return new NextResponse("Not found", { status: 404 });
  if (property.status === "WITHDRAWN" || property.status === "SOLD") {
    return new NextResponse("This listing has been permanently removed.", { status: 410 });
  }
  if (!isPubliclyVisible(property.status)) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(propertyUrl(property), 308);
}
