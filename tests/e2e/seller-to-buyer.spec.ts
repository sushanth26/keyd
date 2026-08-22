// End-to-end: seller onboarding → AI review → publication → buyer showing request.
// Uses the seeded, already contact-verified demo seller (avoids OTP) and the
// mock-auto verification provider (set by the e2e webServer) so the AI workflow
// reaches READY_FOR_REVIEW automatically.
import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "Password123!";

// A minimal valid 1x1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(seller|buyer|admin)/);
}

test("seller onboards a listing, AI prepares it, seller publishes, buyer requests a showing", async ({ page }) => {
  test.setTimeout(90_000);

  // --- Seller: open the seeded draft and complete the questionnaire ---
  await login(page, "seller.demo@keyd.local");
  await page.goto("/seller");
  await page.getByText("45 Meadowbrook Ln").click();
  await page.waitForURL(/\/seller\/properties\//);
  const hubUrl = page.url();

  await page.getByRole("link", { name: /Edit details/ }).click();
  await page.waitForURL(/\/edit$/);
  await page.getByLabel("Square feet").fill("2100");
  await page.getByLabel("Year built").fill("2014");
  await page.getByLabel("Bathrooms").fill("2");
  await page.getByLabel("Bedrooms").fill("3");
  await page.getByLabel("Asking price ($)").fill("375000");
  // Acknowledge all disclosures + pick showing days.
  for (const cb of await page.locator('input[type="checkbox"]').all()) {
    if (!(await cb.isChecked())) await cb.check();
  }
  await page.getByRole("button", { name: "Save details" }).click();
  await page.waitForURL(/\/seller\/properties\/[^/?]+\?saved=1/);

  // --- Upload 5 photos ---
  await page.locator('input[type="file"][name="files"]').setInputFiles(
    Array.from({ length: 5 }, (_, i) => ({ name: `photo${i}.png`, mimeType: "image/png", buffer: PNG })),
  );
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText(/uploaded/)).toBeVisible();

  // --- Submit for AI preparation ---
  await page.getByRole("button", { name: "Submit for AI preparation" }).click();

  // Poll the hub until the AI workflow routes the listing to READY_FOR_REVIEW.
  await expect(async () => {
    await page.goto(hubUrl);
    await expect(page.getByText("Ready for your review")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 45_000 });

  // --- Review, approve, publish ---
  await page.getByRole("link", { name: /Review & publish/ }).click();
  await page.waitForURL(/\/review$/);
  await page.getByRole("button", { name: "Approve all content" }).click();
  await expect(page.getByText("✓ You approved this content.")).toBeVisible();
  await page.getByRole("button", { name: "Publish listing" }).click();
  await page.waitForURL(/published=1/);
  await expect(page.getByText("Published!")).toBeVisible();

  // Capture the public listing URL.
  const publicHref = await page.getByRole("link", { name: "View public page" }).getAttribute("href");
  expect(publicHref).toBeTruthy();

  // --- Buyer: view the listing and request a showing ---
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("http://localhost:3100/");
  await login(page, "buyer1@keyd.local");
  await page.goto(publicHref!);
  await expect(page.getByText("Listed directly by owner")).toBeVisible();

  await page.locator("summary", { hasText: "Request a showing" }).click();
  await page.locator('input[type="datetime-local"]').first().fill("2026-09-01T14:00");
  await page.getByRole("button", { name: "Request showing" }).click();
  await page.waitForURL(/\/buyer\/showings/);
  await expect(page.getByText("Showing request sent")).toBeVisible();
});
