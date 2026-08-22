// Creates an in-app Notification and (optionally) dispatches an email via the
// provider abstraction. All spec notification types funnel through here.
import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { email } from "@/providers/email";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sanitizeText } from "@/lib/sanitize";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
  sendEmail?: boolean;
  actionPath?: string; // relative path for the email CTA
}

export async function notify(params: NotifyParams) {
  const user = await prisma.user.findUnique({ where: { id: params.userId }, select: { email: true, fullName: true } });
  if (!user) return;

  const title = sanitizeText(params.title);
  const body = sanitizeText(params.body);

  let emailStatus: "SENT" | "FAILED" | undefined;
  if (params.sendEmail !== false) {
    try {
      await email().send({
        to: user.email,
        subject: title,
        html: renderEmail(user.fullName, title, body, params.actionPath),
        text: `${title}\n\n${body}`,
      });
      emailStatus = "SENT";
    } catch (err) {
      emailStatus = "FAILED";
      logger.error("notify.email_failed", { userId: params.userId, error: String(err) });
    }
  }

  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title,
      body,
      data: params.data,
      emailStatus,
    },
  });
}

function renderEmail(name: string, title: string, body: string, actionPath?: string): string {
  const cta = actionPath
    ? `<p style="margin:24px 0"><a href="${env.APP_URL}${actionPath}" style="background:#225d78;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open in Keyd</a></p>`
    : "";
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#0f232e">
    <h2 style="color:#225d78">Keyd</h2>
    <p>Hi ${name},</p>
    <h3>${title}</h3>
    <p style="line-height:1.6">${body}</p>
    ${cta}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="font-size:12px;color:#94a3b8">Keyd is a self-service marketing platform for property owners and is not a licensed real-estate broker.</p>
  </div>`;
}
