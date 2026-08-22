"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import { setSessionCookie, clearSessionCookie } from "./session";
import { getCurrentUser } from "./current-user";
import { trackEvent } from "@/lib/audit";
import { issueVerificationCode } from "@/services/verification-codes";
import { sanitizeText } from "@/lib/sanitize";
import { homeForRole } from "./roles";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

const registerSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name").max(120),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a valid phone number").max(30),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["SELLER", "BUYER"]),
});

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    fullName: sanitizeText(String(formData.get("fullName") ?? "")),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: sanitizeText(String(formData.get("phone") ?? "")),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "BUYER").toUpperCase(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { fullName, email, phone, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists. Try signing in." };

  const user = await prisma.user.create({
    data: { fullName, email, phone, passwordHash: await hashPassword(password), role },
  });

  if (role === "BUYER") {
    await prisma.buyerProfile.create({ data: { userId: user.id } });
  }

  await trackEvent({ type: role === "SELLER" ? "SELLER_REGISTERED" : "BUYER_REGISTERED", userId: user.id });

  // Issue email + phone verification codes (delivered via the email provider/outbox).
  await issueVerificationCode(user.id, "EMAIL");
  await issueVerificationCode(user.id, "PHONE");

  await setSessionCookie({ sub: user.id, role: user.role, email: user.email, name: user.fullName });
  redirect("/verify");
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }
  if (user.isBlocked) return { error: "This account has been suspended. Contact support." };

  await setSessionCookie({ sub: user.id, role: user.role, email: user.email, name: user.fullName });
  redirect(homeForRole(user.role));
}

export async function logoutAction() {
  clearSessionCookie();
  redirect("/");
}

// --- Verification code actions ---

const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") });

export async function verifyEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return consumeCode("EMAIL", formData);
}
export async function verifyPhoneAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return consumeCode("PHONE", formData);
}

async function consumeCode(type: "EMAIL" | "PHONE", formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = codeSchema.safeParse({ code: String(formData.get("code") ?? "").trim() });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { verifyLatestCode } = await import("@/services/verification-codes");
  const ok = await verifyLatestCode(user.id, type, parsed.data.code);
  if (!ok) return { error: "That code is incorrect or expired. Request a new one." };

  await prisma.user.update({
    where: { id: user.id },
    data: type === "EMAIL" ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() },
  });
  return { ok: true };
}

async function resendCode(type: "EMAIL" | "PHONE") {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await issueVerificationCode(user.id, type);
}
export async function resendEmailAction() {
  await resendCode("EMAIL");
}
export async function resendPhoneAction() {
  await resendCode("PHONE");
}
