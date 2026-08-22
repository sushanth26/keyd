import { describe, it, expect } from "vitest";
import { sanitizeText, redactContactInfo } from "@/lib/sanitize";

describe("sanitizeText", () => {
  it("strips HTML tags and scripts", () => {
    expect(sanitizeText("<b>Hi</b>")).toBe("Hi");
    expect(sanitizeText("<script>alert(1)</script>clean")).toBe("clean");
  });
  it("preserves normal words and single spaces", () => {
    expect(sanitizeText("A nice home")).toBe("A nice home");
  });
});

describe("redactContactInfo", () => {
  it("redacts email addresses", () => {
    const r = redactContactInfo("Reach me at john.doe@example.com please");
    expect(r.redacted).toBe(true);
    expect(r.text).not.toContain("@example.com");
  });
  it("redacts phone numbers", () => {
    const r = redactContactInfo("Call 214-555-1234 anytime");
    expect(r.redacted).toBe(true);
    expect(r.text).not.toContain("555-1234");
  });
  it("redacts external links", () => {
    const r = redactContactInfo("See more at myhouse.com/listing");
    expect(r.redacted).toBe(true);
  });
  it("leaves clean messages untouched", () => {
    const r = redactContactInfo("I love the kitchen, when can I visit?");
    expect(r.redacted).toBe(false);
    expect(r.text).toBe("I love the kitchen, when can I visit?");
  });
});
