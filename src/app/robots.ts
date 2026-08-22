import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/config";

// Public marketing/location/listing pages are crawlable; private and transactional
// areas are disallowed. Parameterized search is left crawlable but carries a
// `noindex` meta tag + canonical so it is dropped from the index without wasting the
// robots layer. Private documents are blocked entirely.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/seller/",
          "/buyer/",
          "/admin/",
          "/account",
          "/notifications",
          "/messages/",
          "/login",
          "/register",
          "/verify",
          "/api/documents/",
        ],
      },
    ],
    sitemap: `${siteConfig.baseUrl}/sitemap.xml`,
    host: siteConfig.baseUrl,
  };
}
