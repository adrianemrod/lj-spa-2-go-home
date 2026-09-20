export interface NotificationMessage {
  to: string; // phone (SMS) or email address, depending on channel
  subject?: string;
  body: string;
}

export interface NotificationProvider {
  name: string;
  send(message: NotificationMessage): Promise<{ ok: boolean; error?: string }>;
}
