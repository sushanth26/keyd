import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GaProvider } from "@/components/analytics/ga-provider";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { siteConfig } from "@/lib/seo/config";
import { getCurrentUser } from "@/lib/auth/current-user";

// The root layout renders a per-user header (Sign in vs. the signed-in account), so it
// must render per request rather than be statically cached — otherwise the header shows
// a stale logged-out state after login.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.baseUrl),
  title: {
    default: siteConfig.defaultTitle,
    template: siteConfig.titleTemplate,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en_US",
    url: siteConfig.baseUrl,
  },
  twitter: {
    card: "summary_large_image",
    ...(siteConfig.twitterHandle ? { site: siteConfig.twitterHandle, creator: siteConfig.twitterHandle } : {}),
  },
  ...(siteConfig.googleSiteVerification
    ? { verification: { google: siteConfig.googleSiteVerification } }
    : {}),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SiteHeader user={user} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <ConsentBanner />
        <Suspense fallback={null}>
          <GaProvider />
        </Suspense>
      </body>
    </html>
  );
}
