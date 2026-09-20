import { z } from "zod";

export const businessSettingsSchema = z.object({
  businessName: z.string().trim().min(2),
  defaultTravelBufferMinutes: z.coerce.number().int().min(0).max(120),
  maxAdvanceBookingDays: z.coerce.number().int().min(1).max(90),
  cancellationPolicy: z.string().trim(),
  noShowPolicy: z.string().trim(),
  reminderHoursBefore: z.array(z.coerce.number().int().min(0)).default([24, 3]),
});

export type BusinessSettings = z.infer<typeof businessSettingsSchema>;

export const BUSINESS_SETTINGS_KEY = "business_settings";

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: "L&J Spa 2 Go Home",
  defaultTravelBufferMinutes: 15,
  maxAdvanceBookingDays: 14,
  cancellationPolicy: "Cancellations within 2 hours of the scheduled time may be charged 50% of the service price.",
  noShowPolicy: "A no-show after 15 minutes of waiting may be charged the full service price.",
  reminderHoursBefore: [24, 3],
};
