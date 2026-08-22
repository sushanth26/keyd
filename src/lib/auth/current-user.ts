import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readSession } from "./session";

/// Resolve the authenticated user from the session cookie (cached per request).
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || user.isBlocked) return null;
  return user;
});

/// Require any authenticated user; redirect to login otherwise.
export async function requireUser(redirectTo = "/login"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}

/// Require a user holding one of the given roles; redirect otherwise.
export async function requireRole(roles: Role | Role[], redirectTo = "/login"): Promise<User> {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  if (!allowed.includes(user.role)) redirect("/403");
  return user;
}

export class AuthorizationError extends Error {
  status = 403;
  constructor(msg = "Forbidden") {
    super(msg);
    this.name = "AuthorizationError";
  }
}

/// For route handlers / server actions that must throw (not redirect) on failure.
export async function assertRole(roles: Role | Role[]): Promise<User> {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Not authenticated");
  if (!allowed.includes(user.role)) throw new AuthorizationError("Insufficient role");
  return user;
}
