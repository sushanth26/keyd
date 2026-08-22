import QRCode from "qrcode";

/// Generate a QR code as a data URI (PNG) for a URL. Server-side only.
export async function qrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: "#0f232e", light: "#ffffff" } });
}
