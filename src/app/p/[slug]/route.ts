// Legacy property URL handler. The canonical page now lives at
// /homes/{state}/{city}/{slug}-{id}. This preserves previously-shared/indexed
// /p/{slug} links:
//   • public listing        → 308 permanent redirect to the canonical URL
//   • withdrawn/sold listing → 410 Gone (permanently removed)
//   • unknown/unpublished    → 404 Not Found
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isPubliclyVisible } from "@/domain/lifecycle";
import { propertyUrl } from "@/lib/seo/urls";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const property = await prisma.property.findUnique({
    where: { slug: params.slug },
    select: { id: true, slug: true, city: true, state: true, status: true },
  });
  if (!property) return new NextResponse("Not found", { status: 404 });
  if (property.status === "WITHDRAWN" || property.status === "SOLD") {
    return new NextResponse("This listing has been permanently removed.", { status: 410 });
  }
  if (!isPubliclyVisible(property.status)) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(propertyUrl(property), 308);
}
