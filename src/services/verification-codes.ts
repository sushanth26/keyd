// Email/phone OTP codes. Codes are 6 digits, hashed at rest, single-use, and expire
// in 15 minutes. Delivery goes through the email provider (dev: local outbox), and
// the code is also logged so the MVP is easy to demo locally.
import type { VerificationTokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashCode, verifyCode } from "@/lib/auth/password";
import { email } from "@/providers/email";
import { logger } from "@/lib/logger";

const TTL_MS = 15 * 60 * 1000;

function sixDigits(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function issueVerificationCode(userId: string, type: VerificationTokenType): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const code = sixDigits();

  // Invalidate previous unconsumed codes of this type.
  await prisma.verificationToken.updateMany({
    where: { userId, type, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.verificationToken.create({
    data: { userId, type, codeHash: await hashCode(code), expiresAt: new Date(Date.now() + TTL_MS) },
  });

  const channel = type === "EMAIL" ? user.email : `phone ${user.phone ?? ""}`;
  await email().send({
    to: user.email,
    subject: `Your Keyd ${type === "EMAIL" ? "email" : "phone"} verification code`,
    html: `<p>Your Keyd verification code is <strong style="font-size:20px">${code}</strong>. It expires in 15 minutes.</p>`,
    text: `Your Keyd verification code is ${code} (expires in 15 minutes).`,
  });
  // Dev convenience — surfaces the code in server logs / outbox for local testing.
  logger.info("verification.code_issued", { userId, type, channel, code });
}

export async function verifyLatestCode(userId: string, type: VerificationTokenType, code: string): Promise<boolean> {
  const token = await prisma.verificationToken.findFirst({
    where: { userId, type, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token) return false;
  if (!(await verifyCode(code, token.codeHash))) return false;
  await prisma.verificationToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });
  return true;
}
