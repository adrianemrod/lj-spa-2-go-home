import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().min(7),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  notes: z.string().trim().optional(),
  marketingConsent: z.boolean().default(false),
});

export const clientAddressSchema = z.object({
  label: z.string().trim().min(1).default("Home"),
  addressLine: z.string().trim().min(3),
  landmark: z.string().trim().optional(),
  area: z.string().trim().optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  isDefault: z.boolean().default(false),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ClientAddressInput = z.infer<typeof clientAddressSchema>;
