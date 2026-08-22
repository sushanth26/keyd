import type { Role } from "@prisma/client";

/// Landing route for a role after login.
export function homeForRole(role: Role): string {
  return role === "SELLER" ? "/seller" : role === "ADMIN" ? "/admin" : "/buyer";
}
