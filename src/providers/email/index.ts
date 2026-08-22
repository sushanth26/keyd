// Email provider abstraction. MVP drivers write to a local outbox or the console;
// swapping in Postmark/SES/Resend later only changes this folder.
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  send(msg: EmailMessage): Promise<{ id: string }>;
}

class OutboxEmail implements EmailProvider {
  private dir = path.resolve(env.STORAGE_LOCAL_ROOT, "outbox");
  async send(msg: EmailMessage) {
    const id = crypto.randomBytes(8).toString("hex");
    await fs.mkdir(this.dir, { recursive: true });
    const record = { id, from: env.EMAIL_FROM, ...msg, sentAt: new Date().toISOString() };
    await fs.writeFile(path.join(this.dir, `${Date.now()}-${id}.json`), JSON.stringify(record, null, 2));
    logger.info("email.sent", { id, to: msg.to, subject: msg.subject });
    return { id };
  }
}

class ConsoleEmail implements EmailProvider {
  async send(msg: EmailMessage) {
    const id = crypto.randomBytes(8).toString("hex");
    logger.info("email.console", { id, to: msg.to, subject: msg.subject, text: msg.text ?? stripHtml(msg.html) });
    return { id };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

let instance: EmailProvider | null = null;
export function email(): EmailProvider {
  if (instance) return instance;
  instance = env.EMAIL_PROVIDER === "console" ? new ConsoleEmail() : new OutboxEmail();
  return instance;
}
