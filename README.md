# Keyd — AI-first, owner-to-buyer home marketplace (DFW MVP)

Keyd is an Airbnb-style marketplace where **verified homeowners list properties directly** and buyers discover, message, and coordinate showings with owners — **no MLS, no brokers, no commission**. An AI-first background workflow prepares each listing (description, highlights, buyer FAQ, promo assets), verifies the owner, scores market readiness, and matches buyers — but **never publishes anything without the seller's explicit approval**.

Initial market: single-family homes in **Allen, Frisco, Plano, McKinney** and surrounding DFW communities.

> Keyd is a self-service marketing platform for property owners. It is **not** a licensed real-estate broker and does not provide brokerage, legal, appraisal, escrow, title, or mortgage services, and does not represent buyers or sellers.

---

## Tech stack

| Concern | Choice |
|---|---|
| Web + API | **Next.js 14 (App Router) + TypeScript** — one modular monolith serving React UI and server-side logic |
| Database | **PostgreSQL** via **Prisma** ORM with migrations |
| Styling | **Tailwind CSS** (clean, accessible, mobile-first) |
| Auth | Custom sessions — bcrypt passwords + signed JWT in an httpOnly cookie (`jose`), 3 roles |
| Background jobs | **DB-backed queue** with `FOR UPDATE SKIP LOCKED` claiming, retries + backoff, dead-letter |
| Providers (swappable) | AI, email, identity/ownership verification, property enrichment, object storage — all behind interfaces with local/mock drivers |
| Tests | **Vitest** (unit + integration), **Playwright** (end-to-end) |
| Local dev | **Docker Compose** or local Node + Postgres |

Everything runs offline with mock/local drivers — no external API keys required for the MVP.

---

## Quick start (local Node + Postgres)

Prerequisites: **Node 20+**, **PostgreSQL 14+** running locally.

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
# Edit DATABASE_URL for your machine, e.g. (macOS/Homebrew trust auth):
#   postgresql://<youruser>@localhost:5432/keyd_dev
createdb keyd_dev   # if it doesn't exist

# 3. Migrate + seed realistic DFW data
npm run db:migrate
npm run db:seed

# 4. Run (the in-process background worker starts automatically)
npm run dev
# → http://localhost:3000
```

### Quick start (Docker)

```bash
cp .env.example .env          # DATABASE_URL is overridden for the compose network
docker compose up             # starts Postgres + app + a dedicated worker
# → http://localhost:3000  (migrations + seed run automatically)
```

### Demo accounts (password `Password123!` for all)

| Role | Email | Notes |
|---|---|---|
| Admin | `admin@keyd.local` | Verification queue, reports, workflows, audit, funnel |
| Seller | `seller1@keyd.local` … `seller6@keyd.local` | Live published listings |
| Seller | `seller.demo@keyd.local` | Has a **DRAFT** to walk the full create → publish flow |
| Buyer | `buyer1@keyd.local` … `buyer3@keyd.local` | Preferences + saved searches set |

> **Email/OTP in dev:** verification codes and all notification emails are written to `storage/outbox/*.json` and printed in the server logs (`verification.code_issued`, `email.sent`).

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server + in-process worker |
| `npm run worker` | Standalone background worker (set `WORKER_IN_PROCESS=false` to use it) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:migrate:deploy` | Apply migrations (prod/CI) |
| `npm run db:seed` | Seed DFW sellers, buyers, and listings |
| `npm run db:reset` | Drop, re-migrate, re-seed |
| `npm test` | Unit + integration tests (Vitest) |
| `npm run test:e2e` | End-to-end test (Playwright; `npx playwright install chromium` once) |
| `npm run typecheck` | `tsc --noEmit` |

---

## AI-first property workflow

When a seller submits a draft, the app publishes a `property.created` **domain event**, which enqueues an **idempotent** background workflow (`src/workflow/onboarding.ts`). Guarded by a `WorkflowRun` row keyed to the property, it:

1. **Validates** required fields and surfaces missing/inconsistent info.
2. Starts **identity + ownership verification** through a provider interface (MVP: manual admin review, or auto-approve in dev).
3. **Enriches** the property (seeded DFW comparables + estimated value range).
4. Flags **data-quality warnings** (e.g. asking price outside the estimate).
5. Computes the **Market Readiness Score** (explainable, weighted, 0–100).
6. **Generates** the headline, description, highlights, buyer FAQ, and promotional copy — using *only* seller-provided facts.
7. Creates **recommended seller actions**.
8. **Routes** the listing to the correct lifecycle state and **notifies** the seller.
9. On **seller approval + successful verification**, the seller publishes → a `property.published` event **matches** and **notifies** registered buyers.

**Guardrails (enforced in code):** the AI never publishes without approval, never invents facts (provenance + confidence stored per field in `DataProvenance`), never changes transaction status outside the deterministic state machine, never accepts/negotiates offers, and never uses protected characteristics. All AI/seller copy is **fair-housing screened** (`src/domain/fair-housing.ts`) before it can go live.

## Property lifecycle

Deterministic state machine (`src/domain/lifecycle.ts`), enforced by a single transition service (`src/services/property-status.ts`) that records every change in `StatusTransition` + the immutable `AuditLog`:

```
DRAFT → VERIFICATION_PENDING → { NEEDS_ATTENTION | READY_FOR_REVIEW } → ACTIVE
ACTIVE → { BUYER_INTEREST_RECEIVED | UNDER_CONTRACT | PAUSED | WITHDRAWN }
UNDER_CONTRACT → { SOLD | ACTIVE }        PAUSED → { ACTIVE | WITHDRAWN }
```

## Market Readiness Score

Weighted, explainable components (contact verification, seller identity, ownership, required facts, asking price, photos, disclosures, showing availability) minus outstanding-warning penalties. `blockers` are the hard requirements that gate publishing. Pure and unit-tested (`src/domain/readiness.ts`).

---

## Security & compliance

- **Role-based authorization** on every seller/buyer/admin surface and server action.
- **Private documents** (`PropertyDocument`) are stored under a `private/` prefix and served **only** through an authz-gated route (`/api/documents/[id]`); public photos go through `/api/media`.
- **Secure uploads:** type + size validation; content-type stored out-of-band.
- **Sanitization:** all user/AI text is HTML-stripped; **messaging redacts contact details** (email/phone/links) by default to keep communication on-platform.
- **Rate limiting** on messaging, inquiries, and showing requests.
- **Immutable audit trail** — application code never updates/deletes `AuditLog` rows.
- **Fair-housing safeguards** — matching uses only housing-relevant criteria; listing copy is screened.
- **Clear disclaimers** that Keyd is not a brokerage and interest forms are non-binding.
- **No secrets committed** — `.env` is gitignored; `.env.example` documents configuration.

---

## Project structure

```
prisma/            schema.prisma, migrations, seed.ts
src/
  app/             App Router pages + route handlers + server actions
    (auth)/        login, register, verify
    seller/        dashboard, wizard, AI review, promote, analytics, showings, interest
    buyer/         dashboard, preferences, favorites, saved searches, matches, showings
    p/[slug]/      public property page, buyer-interest form, printable flyer
    messages/      secure in-platform messaging
    admin/         verifications, reports, properties, users, workflows, audit, funnel
    api/           media (public), documents (private, authz)
  domain/          pure logic: lifecycle, readiness, matching, fair-housing, constants
  services/        property-status, readiness, publish, notifications, showings, verification-review
  providers/       ai, email, verification, enrichment, storage (interfaces + local/mock drivers)
  jobs/            DB-backed queue, runner, handlers
  events/          domain event bus
  workflow/        onboarding (AI-first), matching
  lib/             db, env, auth, audit/analytics, sanitize, rate-limit, format, media, qr
tests/             unit/ (Vitest), integration/ (Vitest), e2e/ (Playwright)
docs/              ARCHITECTURE.md (decision records)
```

## Testing

- **Unit** — lifecycle transitions, readiness scoring, buyer matching, fair-housing, sanitization/redaction.
- **Integration** — property creation → AI workflow → provenance → idempotency → publish gate → buyer match/notify.
- **E2E** — seller onboarding → AI review → publication → buyer showing request (runs its own server on `:3100` with auto-verification).

```bash
npm test            # 39 unit + integration tests
npm run test:e2e    # full-flow browser test
```

## Out of scope (by design)

MLS integration · broker workflows · legal contract generation · binding electronic offers · price negotiation on behalf of a party · title/escrow · mortgage origination · commissions/referral fees · native mobile apps.

## Notes

- Next.js is pinned to a patched `14.2.x`; the npm deprecation banner blanket-covers the 14.x line.
- The DB-backed job queue is intentionally simple (no Redis) — appropriate for a single-node MVP and easy to swap later.
