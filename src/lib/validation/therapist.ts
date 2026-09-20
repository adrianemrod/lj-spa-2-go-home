import { z } from "zod";

export const workingHoursSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isActive: z.boolean(),
    startMinutes: z.coerce.number().int().min(0).max(1439),
    endMinutes: z.coerce.number().int().min(0).max(1440),
    breakStartMinutes: z.coerce.number().int().min(0).max(1439).nullable().optional(),
    breakEndMinutes: z.coerce.number().int().min(0).max(1440).nullable().optional(),
  })
  .refine((v) => v.endMinutes > v.startMinutes, {
    message: "End time must be after start time.",
    path: ["endMinutes"],
  });

export const therapistSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(7),
  password: z.string().min(8).optional(),
  photoUrl: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  employmentStatus: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]).default("ACTIVE"),
  hireDate: z.coerce.date().optional(),
  bio: z.string().trim().optional(),
  areasServed: z.array(z.string()).default([]),
  maxTravelRadiusKm: z.coerce.number().min(1).max(100).default(15),
  homeLat: z.coerce.number().min(-90).max(90),
  homeLng: z.coerce.number().min(-180).max(180),
  serviceIds: z.array(z.string().uuid()).default([]),
  active: z.boolean().default(true),
});

export type TherapistInput = z.infer<typeof therapistSchema>;

export const dayOffSchema = z.object({
  date: z.coerce.date(),
  reason: z.string().trim().optional(),
});
