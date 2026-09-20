import { z } from "zod";

export const createBookingSchema = z.object({
  clientId: z.string().uuid().optional(), // omitted when creating a new client inline
  newClient: clientRefSchema().optional(),
  serviceId: z.string().uuid(),
  therapistId: z.string().uuid().nullable().optional(),
  anyAvailableTherapist: z.boolean().default(false),
  date: z.coerce.date(),
  scheduledStart: z.coerce.date(),
  addressId: z.string().uuid().optional(),
  clientAddressLine: z.string().trim().min(3),
  landmark: z.string().trim().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  notes: z.string().trim().optional(),
  internalNotes: z.string().trim().optional(),
  discount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "GCASH", "MAYA", "BANK_TRANSFER", "ONLINE_GATEWAY"]).optional(),
  amountPaidNow: z.coerce.number().min(0).default(0),
});

function clientRefSchema() {
  return z.object({
    name: z.string().trim().min(2),
    phone: z.string().trim().min(7),
    email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  });
}

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const rescheduleBookingSchema = z.object({
  scheduledStart: z.coerce.date(),
  date: z.coerce.date(),
  therapistId: z.string().uuid().nullable().optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(3),
});
