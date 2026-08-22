import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    appUrl: Boolean(process.env.APP_URL),
    authSecret: Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16),
    databaseUrl: Boolean(process.env.DATABASE_URL),
    siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };

  let database = "not_configured";
  if (checks.databaseUrl) {
    const prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "ok";
    } catch {
      database = "error";
    } finally {
      await prisma.$disconnect();
    }
  }

  const ok = checks.authSecret && checks.databaseUrl && database === "ok";
  return NextResponse.json({ ok, checks, database }, { status: ok ? 200 : 503 });
}
