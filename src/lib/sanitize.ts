// Content sanitization for user- and AI-generated text.
//
// The app stores plain text (never raw HTML) and renders it as text in React, which
// escapes by default. These helpers add defense-in-depth: strip any HTML/script,
// and — for in-platform messaging — redact direct contact details so buyers and
// sellers communicate through Keyd rather than off-platform by default.

/// Remove HTML tags and normalize whitespace. Use for stored titles/descriptions.
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/[\t\f\v ]{2,}/g, " ")
    .trim();
}

export function sanitizeMultiline(input: string | null | undefined, maxLen = 5000): string {
  return sanitizeText(input).slice(0, maxLen);
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// Phone numbers: 10+ digits possibly with separators/parens/+country code.
const PHONE_RE = /(\+?\d[\d().\s-]{8,}\d)/g;
const URL_RE = /\b((https?:\/\/)?(www\.)?[a-z0-9-]+\.(com|net|org|io|co|me)(\/\S*)?)\b/gi;

export interface RedactionResult {
  text: string;
  redacted: boolean;
}

/// Replace emails, phone numbers, and external URLs with placeholders. Keeps buyer
/// and seller communication on-platform by default (they can share details later
/// by mutual choice; we simply don't expose them automatically).
export function redactContactInfo(input: string): RedactionResult {
  let redacted = false;
  let text = sanitizeText(input);
  text = text.replace(EMAIL_RE, () => {
    redacted = true;
    return "[contact hidden]";
  });
  text = text.replace(PHONE_RE, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length >= 10) {
      redacted = true;
      return "[contact hidden]";
    }
    return m;
  });
  text = text.replace(URL_RE, () => {
    redacted = true;
    return "[link hidden]";
  });
  return { text, redacted };
}
