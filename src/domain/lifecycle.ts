// Deterministic property lifecycle state machine.
//
// Every allowed transition is enumerated here. Backend code must call
// `assertTransition` (or check `canTransition`) before persisting a status change,
// and record a StatusTransition row. There are NO implicit transitions.

import type { PropertyStatus } from "@prisma/client";

export const TERMINAL_STATUSES: PropertyStatus[] = ["SOLD", "WITHDRAWN"];

/// Adjacency list of allowed transitions: from -> [allowed next states].
export const ALLOWED_TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
  DRAFT: ["VERIFICATION_PENDING", "WITHDRAWN"],
  VERIFICATION_PENDING: ["NEEDS_ATTENTION", "READY_FOR_REVIEW", "WITHDRAWN"],
  NEEDS_ATTENTION: ["VERIFICATION_PENDING", "READY_FOR_REVIEW", "WITHDRAWN"],
  READY_FOR_REVIEW: ["ACTIVE", "NEEDS_ATTENTION", "WITHDRAWN"],
  ACTIVE: ["BUYER_INTEREST_RECEIVED", "UNDER_CONTRACT", "PAUSED", "WITHDRAWN"],
  BUYER_INTEREST_RECEIVED: ["ACTIVE", "UNDER_CONTRACT", "PAUSED", "WITHDRAWN"],
  UNDER_CONTRACT: ["SOLD", "ACTIVE", "WITHDRAWN"],
  PAUSED: ["ACTIVE", "WITHDRAWN"],
  SOLD: [],
  WITHDRAWN: [],
};

/// Statuses in which a listing is publicly visible in search / on its public page.
export const PUBLIC_STATUSES: PropertyStatus[] = [
  "ACTIVE",
  "BUYER_INTEREST_RECEIVED",
  "UNDER_CONTRACT",
];

export function isTerminal(status: PropertyStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isPubliclyVisible(status: PropertyStatus): boolean {
  return PUBLIC_STATUSES.includes(status);
}

export function canTransition(from: PropertyStatus, to: PropertyStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidTransitionError extends Error {
  constructor(
    public from: PropertyStatus,
    public to: PropertyStatus,
  ) {
    super(`Invalid property lifecycle transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: PropertyStatus, to: PropertyStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

/// Human-readable label for each status (used across seller/admin UIs).
export const STATUS_LABELS: Record<PropertyStatus, string> = {
  DRAFT: "Draft",
  VERIFICATION_PENDING: "Verification pending",
  NEEDS_ATTENTION: "Needs attention",
  READY_FOR_REVIEW: "Ready for your review",
  ACTIVE: "Active",
  BUYER_INTEREST_RECEIVED: "Buyer interest received",
  UNDER_CONTRACT: "Under contract",
  SOLD: "Sold",
  PAUSED: "Paused",
  WITHDRAWN: "Withdrawn",
};
