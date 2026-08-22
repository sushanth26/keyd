// Authorization-gated download for PRIVATE supporting documents.
// Only the property's owner (seller) or a platform admin may fetch a document.
// Private objects are NEVER served from /api/media.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { storage } from "@/providers/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const doc = await prisma.propertyDocument.findUnique({
    where: { id: params.id },
    include: { property: { select: { sellerId: true } } },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const allowed = user.role === "ADMIN" || doc.property.sellerId === user.id || doc.uploadedById === user.id;
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  const obj = await storage().get(doc.storageKey);
  if (!obj) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(obj.data), {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Disposition": `inline; filename="${doc.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
