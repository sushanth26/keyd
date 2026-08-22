import { describe, it, expect } from "vitest";
import {
  canTransition,
  assertTransition,
  InvalidTransitionError,
  isTerminal,
  isPubliclyVisible,
  ALLOWED_TRANSITIONS,
} from "@/domain/lifecycle";

describe("property lifecycle state machine", () => {
  it("allows the happy-path onboarding chain", () => {
    expect(canTransition("DRAFT", "VERIFICATION_PENDING")).toBe(true);
    expect(canTransition("VERIFICATION_PENDING", "READY_FOR_REVIEW")).toBe(true);
    expect(canTransition("READY_FOR_REVIEW", "ACTIVE")).toBe(true);
    expect(canTransition("ACTIVE", "UNDER_CONTRACT")).toBe(true);
    expect(canTransition("UNDER_CONTRACT", "SOLD")).toBe(true);
  });

  it("rejects skipping straight from DRAFT to ACTIVE", () => {
    expect(canTransition("DRAFT", "ACTIVE")).toBe(false);
  });

  it("rejects publishing directly from VERIFICATION_PENDING", () => {
    expect(canTransition("VERIFICATION_PENDING", "ACTIVE")).toBe(false);
  });

  it("treats identical from/to as a non-transition", () => {
    expect(canTransition("ACTIVE", "ACTIVE")).toBe(false);
  });

  it("has no outgoing transitions from terminal states", () => {
    expect(ALLOWED_TRANSITIONS.SOLD).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS.WITHDRAWN).toHaveLength(0);
    expect(isTerminal("SOLD")).toBe(true);
    expect(isTerminal("WITHDRAWN")).toBe(true);
    expect(isTerminal("ACTIVE")).toBe(false);
  });

  it("supports NEEDS_ATTENTION recovery loop", () => {
    expect(canTransition("VERIFICATION_PENDING", "NEEDS_ATTENTION")).toBe(true);
    expect(canTransition("NEEDS_ATTENTION", "VERIFICATION_PENDING")).toBe(true);
    expect(canTransition("NEEDS_ATTENTION", "READY_FOR_REVIEW")).toBe(true);
  });

  it("supports pause/resume and contract-fell-through", () => {
    expect(canTransition("ACTIVE", "PAUSED")).toBe(true);
    expect(canTransition("PAUSED", "ACTIVE")).toBe(true);
    expect(canTransition("UNDER_CONTRACT", "ACTIVE")).toBe(true);
  });

  it("assertTransition throws InvalidTransitionError on a bad move", () => {
    expect(() => assertTransition("SOLD", "ACTIVE")).toThrow(InvalidTransitionError);
    expect(() => assertTransition("DRAFT", "SOLD")).toThrow(/Invalid property lifecycle transition/);
  });

  it("marks only listed statuses as publicly visible", () => {
    expect(isPubliclyVisible("ACTIVE")).toBe(true);
    expect(isPubliclyVisible("UNDER_CONTRACT")).toBe(true);
    expect(isPubliclyVisible("DRAFT")).toBe(false);
    expect(isPubliclyVisible("PAUSED")).toBe(false);
  });
});
