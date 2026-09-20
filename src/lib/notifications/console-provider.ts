import type { NotificationMessage, NotificationProvider } from "@/lib/notifications/provider";

/**
 * Development/fallback provider — logs instead of sending. Used whenever
 * SMS_PROVIDER/EMAIL_PROVIDER is unset ("none"), which is the honest
 * default until a real SMS/email account is configured. Never pretend a
 * message was delivered when it was only logged.
 */
export const consoleProvider: NotificationProvider = {
  name: "console",
  async send(message: NotificationMessage) {
    console.log(`[notification:console] to=${message.to} subject=${message.subject ?? ""} body=${message.body}`);
    return { ok: true };
  },
};
