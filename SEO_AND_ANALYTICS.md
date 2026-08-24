# SEO & Analytics — Keyd

Production SEO (metadata, structured data, sitemap/robots, clean URLs, programmatic
location pages) and GA4 analytics (consent-gated, typed event taxonomy) for Keyd.

---

## 1. Environment variables

| Variable | Scope | Purpose | Example |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **build-time** | Absolute production origin for canonical/OG/sitemap URLs. **Must be set at build time** (Next inlines `NEXT_PUBLIC_*`). | `https://www.keyd.live` |
| `NEXT_PUBLIC_GSC_VERIFICATION` | build-time | Google Search Console meta-tag token (optional). | `abc123...` |
| `NEXT_PUBLIC_TWITTER_HANDLE` | build-time | `twitter:site`/`creator` (optional). | `@keyd` |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | build-time | GA4 Measurement ID. **Empty disables analytics entirely.** | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | build-time | Set `true` to run GA4 outside production (local DebugView). Default: production only. | `true` |
| `APP_URL` | runtime | Server-side origin fallback if `NEXT_PUBLIC_SITE_URL` is unset. | `https://www.keyd.live` |

> Protocol-safety: `NEXT_PUBLIC_SITE_URL`/`APP_URL` are normalized. A value with no
> scheme (`www.keyd.live`) is upgraded to `https://`, and anything unparseable falls
> back to `http://localhost:3000` — a bad value can never crash the app (see §Incident).

---

## 2. Routes & metadata behavior

Clean, human-readable URLs; the **listing ID is the stable identifier** (final token).

| Route | Rendering | Indexable | Notes |
|---|---|---|---|
| `/` | dynamic | ✅ | Organization + WebSite JSON-LD |
| `/homes-for-sale` | dynamic | ✅ | Browse index; BreadcrumbList + ItemList |
| `/homes-for-sale/{state}` | dynamic | ✅ if inventory ≥ 1 | else `noindex,follow` |
| `/homes-for-sale/{state}/{city}` | dynamic | ✅ if inventory ≥ 1 | else `noindex,follow`; unique title/desc/H1/intro |
| `/homes/{state}/{city}/{slug}-{id}` | dynamic | ✅ | Canonical property page; residence + Offer + BreadcrumbList JSON-LD |
| `/sell`, `/how-it-works`, `/about` | static | ✅ | Marketing pages |
| `/search` | dynamic | ❌ `noindex,follow` | Parameterized filters; canonical points at itself; use location pages for indexable browse |
| `/p/{slug}` | route handler | — | Legacy → **308** to canonical (or **410** if withdrawn/sold, **404** if missing) |
| `/p/{slug}/interest`, `/p/{slug}/flyer` | dynamic | ❌ noindex | Login-gated / print asset |
| `/seller/*`, `/buyer/*`, `/admin/*`, `/account`, `/notifications`, `/messages/*`, `/login`, `/register`, `/verify` | dynamic | ❌ noindex | Private; also disallowed in robots |

- **Metadata generator:** `src/lib/seo/metadata.ts` `buildMetadata()` — unique title
  (template `%s | Keyd`), clamped description, absolute canonical (query stripped),
  Open Graph, Twitter `summary_large_image`, robots directives. `noindexMetadata` for
  private pages.
- **Titles/descriptions** are generated from listing data with missing attributes
  omitted cleanly; **no seller PII** ever appears in metadata.
  - Example title: `4-Bed Home for Sale by Owner in Allen, TX | Keyd`
- **Default OG image:** branded `/opengraph-image` (1200×630, generated). Property
  pages use the primary listing photo with the branded image as fallback.
- **Canonical URLs** exclude tracking/query params. Non-canonical property paths
  (wrong slug/city) **308** to the canonical URL to prevent duplicate content.
- **HTTP status:** missing listing → 404; withdrawn/sold (legacy URL) → 410.

---

## 3. Structured data (JSON-LD)

`src/lib/seo/jsonld.ts` — validated against Schema.org, public data only:

- `Organization`, `WebSite` (with `SearchAction`) — homepage
- `BreadcrumbList` — location & property pages
- `ItemList` — location pages with inventory
- Property `@graph`: a residence entity (`SingleFamilyResidence` / `House` /
  `Apartment` / `ApartmentComplex` / `Place` by type) + an `Offer`
  (price, `priceCurrency: USD`, availability from listing status).

Excluded: seller email, phone, name, account/seller IDs. We do **not** claim Google
rich-result eligibility for property types Google doesn't support.

---

## 4. Sitemap & robots

- `‎/robots.txt` (`src/app/robots.ts`): allows public pages; disallows
  `/seller/ /buyer/ /admin/ /account /notifications /messages/ /login /register /verify /api/documents/`;
  links the sitemap; sets `Host`.
- `/sitemap.xml` (`src/app/sitemap.ts`): static pages + qualifying location pages
  (inventory ≥ 1) + **published** property pages only. `lastmod` from each listing's
  `updatedAt`. Automatically excludes drafts, unpublished, sold, and withdrawn
  listings, and reflects publish/update/sold/removed changes on next crawl.
- Both degrade to static/empty output if the DB is briefly unavailable.

---

## 5. GA4 — how it loads

`src/components/analytics/ga-provider.tsx` + `src/lib/analytics/*`:

- Loads **only** when `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set **and**
  (`NODE_ENV=production` **or** `NEXT_PUBLIC_ANALYTICS_ENABLED=true`) **and** the user
  granted consent. No ID or no consent → gtag.js never loads. Automated tests / local
  dev send nothing.
- **Consent:** a lightweight banner (`consent-banner.tsx`) stores the choice in
  `localStorage` (`keyd_analytics_consent`) and broadcasts a change event. Extensible —
  swap for a CMP by replacing `src/lib/analytics/consent.ts`.
- **SPA page views:** `gtag('config', id, { send_page_view: false })` then exactly one
  manual `page_view` per path+query change (deduped via a ref) — no duplicates.
- **UTM / acquisition:** the full path+query (incl. `utm_*`) is sent as `page_location`
  / `page_path`; GA4 attributes the session automatically. No PII stored.
- **PII guard:** `sendEvent` strips empty values and refuses any string that looks like
  an email/phone. Prices are bucketed (`price_range`) rather than sent raw where noted.

---

## 6. GA4 event dictionary

All events go through the typed helper `analytics.*` in `src/lib/analytics/events.ts`
(no raw `gtag` calls in components). Events fire once per completed action.

**Buyer funnel**

| Event | Params | Fires when |
|---|---|---|
| `search` | `search_term, city, state, property_type, price_range` | Search page loads with filters |
| `view_search_results` | `result_count, city, state` | Search / location results render |
| `select_item` | `listing_id, position, source` | Property card clicked |
| `view_item` | `listing_id, property_type, city, state, price, currency` | Property page viewed |
| `save_listing` | `listing_id` | Favorite (save) clicked |
| `share` | `listing_id, method` | Share button (web_share / copy_link) |
| `schedule_tour` | `listing_id` | Showing request submitted |
| `contact_seller` | `listing_id, contact_method` | First message to owner sent |
| `generate_lead` | `listing_id, lead_type` | Interest submitted / contact / showing (`lead_type` distinguishes) |

**Seller funnel**

| Event | Params | Fires when |
|---|---|---|
| `start_listing` | `source` | New-listing page opened |
| `listing_step_completed` | `step_name, step_number` | Questionnaire saved |
| `listing_photo_uploaded` | `photo_count` | Photos uploaded |
| `listing_previewed` | `listing_id` | AI review page viewed |
| `listing_submitted` | `listing_id` | Submitted for AI preparation |
| `listing_published` | `listing_id` | Listing published |

**Account funnel** — GA4 recommended events

| Event | Params |
|---|---|
| `sign_up` | `method` |
| `login` | `method` |

Never sent as params: street addresses, seller contact details, buyer messages, form
field contents, full account IDs, names.

---

## 7. Conversions / key events (mark in GA4 UI)

Mark these as **Key events** (Admin → Events):

`generate_lead`, `contact_seller`, `schedule_tour`, `listing_submitted`,
`listing_published`, `sign_up`.

Measurable funnels:
1. Homepage → `search` → `view_item` → `contact_seller`
2. Location page → `view_item` → `generate_lead`
3. `start_listing` → `listing_step_completed` → `listing_submitted` → `listing_published`
4. Acquisition (UTM) → `sign_up` → buyer/seller conversion

---

## 8. Google Search Console setup

1. Add property `https://www.keyd.live` (Domain or URL-prefix).
2. **Meta-tag method:** set `NEXT_PUBLIC_GSC_VERIFICATION` to the token and redeploy —
   it renders `<meta name="google-site-verification">` on every page. Verify.
3. Submit `https://www.keyd.live/sitemap.xml`.
4. Use URL Inspection to confirm indexable pages return `index` and private pages
   return `noindex`.

## 9. GA4 DebugView testing

1. Set `NEXT_PUBLIC_GA4_MEASUREMENT_ID` and (for local) `NEXT_PUBLIC_ANALYTICS_ENABLED=true`.
2. Install the “GA Debugger” Chrome extension **or** append `?debug_mode=1`.
3. Load the app, click **Accept analytics** in the consent banner.
4. GA4 → Admin → **DebugView**. Verify: one `page_view` per navigation; `view_item`,
   `select_item`, `search`, `contact_seller`, etc. fire once with the expected params;
   no PII in any parameter.

---

## 10. Manual steps still required

- Set `NEXT_PUBLIC_SITE_URL=https://www.keyd.live` **as a build-time variable** on the
  host (Railway/Vercel), then redeploy so canonical/OG/sitemap URLs are absolute prod
  URLs (not `localhost`).
- Set `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (and optionally `NEXT_PUBLIC_GSC_VERIFICATION`,
  `NEXT_PUBLIC_TWITTER_HANDLE`) at build time; redeploy.
- Mark the six key events as conversions in GA4 (§7).
- Verify sitemap submission and coverage in Search Console (§8).

---

## Incident note — “Application error” on `/homes-for-sale`

The live 500 was **not** an SEO bug: the production database was unreachable/unmigrated.
The homepage hid it (`prisma.count().catch(() => 0)`); DB-backed pages surfaced it as a
generic server error. Fixes applied:
- Location/search/detail/sitemap pages now **degrade gracefully** (empty state / 404 /
  503) instead of 500 on a DB error.
- `getCurrentUser()` returns `null` on DB error so the header can't 500 every page.
- `NEXT_PUBLIC_SITE_URL`/`APP_URL` are normalized so a protocol-less value can't throw
  in `new URL()`.

**Root-cause remediation (do this on the host):** ensure `DATABASE_URL` points at the
production Postgres and run `npx prisma migrate deploy` (and optionally `npm run db:seed`)
against it, then redeploy.
