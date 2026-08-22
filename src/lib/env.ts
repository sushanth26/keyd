// Centralized, validated environment access. Import `env` everywhere instead of
// reaching into process.env directly, so runtime misconfiguration fails fast and
// loudly. `next build` is allowed to run with placeholders because Railway/Docker
// often build before runtime service variables are injected.

import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  SESSION_COOKIE: z.string().default("keyd_session"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().default("http://localhost:3000"),
  APP_NAME: z.string().default("Keyd"),
  // Public SEO/analytics config (also read directly from process.env in client code).
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  NEXT_PUBLIC_GSC_VERIFICATION: z.string().optional(),
  NEXT_PUBLIC_TWITTER_HANDLE: z.string().optional(),
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z.string().optional(),
  AI_PROVIDER: z.enum(["mock"]).default("mock"),
  EMAIL_PROVIDER: z.enum(["outbox", "console"]).default("outbox"),
  EMAIL_FROM: z.string().default("Keyd <no-reply@keyd.local>"),
  VERIFICATION_PROVIDER: z.enum(["manual", "mock-auto"]).default("manual"),
  ENRICHMENT_PROVIDER: z.enum(["seed"]).default("seed"),
  STORAGE_PROVIDER: z.enum(["local"]).default("local"),
  STORAGE_LOCAL_ROOT: z.string().default("./storage"),
  WORKER_IN_PROCESS: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  WORKER_POLL_MS: z
    .string()
    .default("1500")
    .transform((v) => parseInt(v, 10)),
});

const isNextBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

const buildFallbackEnv = isNextBuild
  ? {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://build:build@localhost:5432/keyd_build_placeholder?schema=public",
      AUTH_SECRET:
        process.env.AUTH_SECRET ??
        "build-time-placeholder-secret-change-me-please",
    }
  : {};

if (isNextBuild) {
  process.env.DATABASE_URL = buildFallbackEnv.DATABASE_URL;
  process.env.AUTH_SECRET = buildFallbackEnv.AUTH_SECRET;
}

const parsed = schema.safeParse({ ...buildFallbackEnv, ...process.env });

if (!parsed.success && (process.env.NODE_ENV !== "production" || isNextBuild)) {
  // eslint-disable-next-line no-console
  console.warn("[env] Some environment variables are missing or invalid:", parsed.error.flatten().fieldErrors);
}

export const env = parsed.success ? parsed.data : schema.parse(process.env);
