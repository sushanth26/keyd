// Serves PUBLIC objects (listing photos) from the storage abstraction.
// Private objects live under the "private/" prefix and are refused here — they are
// only reachable through the authorization-gated /api/documents route.
//
// When the underlying object is missing (e.g. object storage isn't persisted, or a
// listing was seeded without real uploads), we serve a deterministic branded SVG
// placeholder instead of a 404 — so every listing always shows an image.
import { NextResponse } from "next/server";
import { storage } from "@/providers/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { key: string[] } }) {
  const key = params.key.join("/");
  if (!key.startsWith("public/")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const obj = await storage().get(key).catch(() => null);
  if (obj) {
    return new NextResponse(new Uint8Array(obj.data), {
      headers: { "Content-Type": obj.contentType, "Cache-Control": "public, max-age=3600" },
    });
  }
  // Fallback: generated placeholder so listings never show a broken image.
  return new NextResponse(placeholderSvg(key), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}

/** Deterministic branded placeholder image derived from the object key. */
function placeholderSvg(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
  const hue = h;
  const hue2 = (h + 28) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="683" viewBox="0 0 1024 683" role="img" aria-label="Listing photo placeholder">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="hsl(${hue},42%,72%)"/>
    <stop offset="100%" stop-color="hsl(${hue2},46%,50%)"/>
  </linearGradient></defs>
  <rect width="1024" height="683" fill="url(#g)"/>
  <g fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="14" stroke-linejoin="round" stroke-linecap="round">
    <path d="M392 356 L512 260 L632 356"/>
    <path d="M420 340 L420 452 L604 452 L604 340"/>
    <rect x="486" y="392" width="52" height="60"/>
  </g>
  <text x="512" y="536" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="30" font-weight="700" fill="rgba(255,255,255,0.92)">Photo coming soon</text>
  <text x="984" y="56" text-anchor="end" font-family="system-ui,sans-serif" font-size="26" font-weight="800" fill="rgba(255,255,255,0.85)">Keyd</text>
</svg>`;
}
