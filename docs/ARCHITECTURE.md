# Architecture decision records — Keyd MVP

Concise records of the key decisions and their rationale. The guiding principle: **build a coherent, runnable MVP that proves the owner-to-buyer flow, without over-engineering or splitting into microservices.**

## ADR-001 — Modular monolith on Next.js (App Router) + TypeScript
**Decision.** One Next.js application provides both the React frontend and the Node/TypeScript backend (server actions + route handlers), organized into clear domains (`domain`, `services`, `providers`, `jobs`, `events`, `workflow`).
**Why.** The brief asks for React/Next.js, a Node/TS backend, and a modular monolith — and explicitly warns against microservices. Server actions keep forms progressive and typed end-to-end; route handlers serve media/documents with custom authorization. Domains are separated by folder and dependency direction, not by network boundary, so the modularity is real but the deployment stays single-process.

## ADR-002 — PostgreSQL + Prisma with migrations
**Decision.** Prisma models the full domain in one schema; `prisma migrate` manages schema evolution; a rich `seed.ts` provides realistic DFW data.
**Why.** Strong typing from DB to UI, first-class migrations, and fast iteration. A single schema fits a modular monolith and keeps cross-entity queries (funnel analytics, admin views) simple.

## ADR-003 — Custom session auth over a framework
**Decision.** bcrypt password hashing + a signed JWT (`jose`) in an httpOnly, SameSite=Lax cookie; `getCurrentUser`/`requireRole`/`assertRole` guards.
**Why.** Three distinct roles with role-scoped dashboards and per-action authorization. A minimal custom layer gives full control over the session shape and RBAC without adapter complexity, and is easy to audit for a security-sensitive marketplace.

## ADR-004 — DB-backed background job queue (no Redis)
**Decision.** A `Job` table claimed atomically with `SELECT … FOR UPDATE SKIP LOCKED`, exponential-backoff retries, and a `DEAD` state. A `DomainEvent` bus fans events out to jobs. The worker runs in-process (via `instrumentation.ts`) for single-command dev, or as a dedicated `npm run worker` process (and a separate Docker service).
**Why.** The MVP needs reliable, idempotent, retryable async work (the AI workflow, buyer matching) but not the operational weight of Redis/BullMQ. Postgres row-locking gives safe concurrent claiming; the interface is small enough to swap for a hosted queue later.
**Gotcha resolved.** Prisma stores `DateTime` as naive-UTC `timestamp`; raw `now()` is `timestamptz` in the session zone. The claim query compares against `now() AT TIME ZONE 'UTC'` to stay timezone-correct on any host.

## ADR-005 — Provider abstractions for AI, email, verification, enrichment, storage
**Decision.** Each external concern sits behind a TypeScript interface with a local/mock driver selected by env (`AI_PROVIDER`, `EMAIL_PROVIDER`, `VERIFICATION_PROVIDER`, `ENRICHMENT_PROVIDER`, `STORAGE_PROVIDER`).
**Why.** The app can run fully offline and be demoed deterministically, while real integrations (Stripe Identity/Persona, Postmark/SES, an AVM vendor, S3/GCS) slot in by adding a driver — no call-site changes. The mock AI is fact-grounded and deterministic so tests are stable and it never invents data.

## ADR-006 — AI as a background workflow, not an inline call
**Decision.** Listing preparation is an idempotent workflow triggered by `property.created`, guarded by a `WorkflowRun`, with each step recorded. It prepares a draft and routes lifecycle state; **publishing is a separate, explicit seller action** gated by verification + readiness.
**Why.** Keeps side effects off the request path, makes the multi-step process observable and retryable (admin can re-run failures), and structurally enforces "AI must not publish without approval." Provenance (source, timestamp, confidence) is stored per generated/enriched field.

## ADR-007 — Deterministic lifecycle + readiness as pure modules
**Decision.** The state machine and the readiness scorer are pure functions (`src/domain/*`), adapted to persistence by thin services. A single `transitionProperty` service is the only sanctioned way to change status; it validates, records a `StatusTransition`, writes an `AuditLog`, and emits funnel analytics.
**Why.** Determinism and testability. Pure logic is trivially unit-tested; funneling every transition through one service guarantees the audit trail and analytics are never bypassed.

## ADR-008 — Trust, safety & fair housing built into the data path
**Decision.** Contact-info redaction and HTML sanitization on all messages/content; a fair-housing screen on AI + seller copy before publish; matching restricted to housing-relevant criteria; private documents behind an authz route; rate limiting on messaging/inquiries/showings; an append-only audit log.
**Why.** A real-estate marketplace carries legal and safety obligations (Fair Housing Act, fraud, off-platform leakage). Encoding these as reusable, testable modules — rather than ad-hoc checks — makes the guarantees consistent and auditable.

## ADR-009 — Object storage abstraction with public/private separation
**Decision.** A `StorageProvider` interface with a local-disk driver namespaces objects under `public/` and `private/`. Public photos are served by `/api/media/[...key]` (which refuses non-public keys); private documents only by the authorization-gated `/api/documents/[id]`.
**Why.** "Private documents must never be publicly accessible" is a hard requirement. Separating by prefix and by serving route makes accidental exposure structurally difficult, and swapping to S3/GCS is isolated to one folder.
