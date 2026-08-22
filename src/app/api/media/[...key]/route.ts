// Serves PUBLIC objects (listing photos) from the storage abstraction.
// Private objects live under the "private/" prefix and are refused here — they are
// only reachable through the authorization-gated /api/documents route.
import { NextResponse } from "next/server";
import { storage } from "@/providers/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { key: string[] } }) {
  const key = params.key.join("/");
  if (!key.startsWith("public/")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const obj = await storage().get(key);
  if (!obj) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(obj.data), {
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
