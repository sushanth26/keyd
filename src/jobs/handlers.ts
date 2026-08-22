// Job type → handler registry. Handlers receive the job payload and must be idempotent.
import { logger } from "@/lib/logger";
import { runOnboardingWorkflow } from "@/workflow/onboarding";
import { runBuyerMatching } from "@/workflow/matching";

export type JobHandler = (payload: any) => Promise<void>;

export const HANDLERS: Record<string, JobHandler> = {
  // Kicked off by the `property.created` domain event.
  "property.onboarding": async (payload: { propertyId: string }) => {
    await runOnboardingWorkflow(payload.propertyId);
  },
  // Recompute buyer matches when a property becomes ACTIVE (also runnable standalone).
  "property.match_buyers": async (payload: { propertyId: string }) => {
    await runBuyerMatching(payload.propertyId);
  },
};

export function getHandler(type: string): JobHandler {
  const h = HANDLERS[type];
  if (!h) {
    logger.error("job.no_handler", { type });
    throw new Error(`No handler registered for job type "${type}"`);
  }
  return h;
}
