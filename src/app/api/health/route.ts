import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Deployment diagnostic. Visit /api/health to see, at a glance:
//   databaseUrl:false → DATABASE_URL not wired to the service ("not connected")
//   database:"error"  → set but cannot connect (wrong URL / DB down)
//   migrated:false    → connected but tables missing (run `prisma migrate deploy`)
//   counts.users:0    → migrated but not seeded (login will fail; set SEED_ON_BOOT=true)
export async function GET() {
  const checks = {
    appUrl: Boolean(process.env.APP_URL),
    authSecret: Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16),
    databaseUrl: Boolean(process.env.DATABASE_URL),
    siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };

  let database: "not_configured" | "ok" | "error" = "not_configured";
  let migrated = false;
  let counts: { users: number; properties: number } | null = null;

  if (checks.databaseUrl) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "ok";
    } catch {
      database = "error";
    }
    if (database === "ok") {
      try {
        const [users, properties] = await Promise.all([prisma.user.count(), prisma.property.count()]);
        migrated = true;
        counts = { users, properties };
      } catch {
        migrated = false; // querying a table failed → schema not migrated
      }
    }
  }

  let hint: string | undefined;
  if (!checks.databaseUrl) hint = "DATABASE_URL is not set. Wire it to your Postgres service and redeploy.";
  else if (database === "error") hint = "DATABASE_URL is set but the app cannot connect. Check the URL/credentials.";
  else if (!migrated) hint = "Connected, but no tables. Run `prisma migrate deploy` (runs automatically on boot in the Docker image).";
  else if (counts && counts.users === 0) hint = "Migrated but empty. Set SEED_ON_BOOT=true and redeploy to create demo accounts.";

  const ok = checks.authSecret && checks.databaseUrl && database === "ok" && migrated;
  return NextResponse.json({ ok, database, migrated, counts, checks, hint }, { status: ok ? 200 : 503 });
}
