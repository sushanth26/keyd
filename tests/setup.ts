// Integration-test setup: load env and force deterministic auto-verification so the
// onboarding workflow reaches READY_FOR_REVIEW without manual admin steps.
import "dotenv/config";
process.env.VERIFICATION_PROVIDER = "mock-auto";
process.env.WORKER_IN_PROCESS = "false";
