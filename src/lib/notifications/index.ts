import "server-only";
import { prisma } from "@/lib/prisma";
import { consoleProvider } from "@/lib/notifications/console-provider";
import type { NotificationProvider } from "@/lib/notifications/provider";
import type { NotificationChannel } from "@prisma/client";

/**
 * SMS/Email providers are configuration-dependent: with SMS_PROVIDER or
 * EMAIL_PROVIDER unset ("none", the .env.example default), everything
 * falls back to the console provider below, which logs instead of
 * sending — the same honest-fallback pattern as the travel provider.
 * Wiring in a real Twilio/Semaphore/Resend/SES account is a matter of
 * implementing NotificationProvider here; nothing else in the app needs
 * to change since callers only ever depend on the interface.
 */
function providerFor(channel: NotificationChannel): NotificationProvider {
  if (channel === "SMS" && process.env.SMS_PROVIDER && process.env.SMS_PROVIDER !== "none") {
    console.warn(`SMS_PROVIDER=${process.env.SMS_PROVIDER} is not implemented yet — falling back to console.`);
  }
  if (channel === "EMAIL" && process.env.EMAIL_PROVIDER && process.env.EMAIL_PROVIDER !== "none") {
    console.warn(`EMAIL_PROVIDER=${process.env.EMAIL_PROVIDER} is not implemented yet — falling back to console.`);
  }
  return consoleProvider;
}

/**
 * Sends (or logs) a notification AND records it in the Notification table
 * so the recipient's in-app notification list and the audit trail are
 * always accurate, even when the outbound channel is just the console.
 */
export async function notify(params: {
  userId: string;
  channel: NotificationChannel;
  type: string;
  title: string;
  body: string;
  to?: string;
  bookingId?: string;
}): Promise<void> {
  const provider = providerFor(params.channel);
  const result = params.to ? await provider.send({ to: params.to, subject: params.title, body: params.body }) : { ok: true };

  await prisma.notification.create({
    data: {
      userId: params.userId,
      channel: params.channel,
      type: params.type,
      title: params.title,
      body: params.body,
      bookingId: params.bookingId,
      status: result.ok ? "SENT" : "FAILED",
      sentAt: result.ok ? new Date() : undefined,
    },
  });
}
