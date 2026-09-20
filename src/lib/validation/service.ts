import { z } from "zod";

export const serviceSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2, "Name is too short."),
  description: z.string().trim().optional(),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  price: z.coerce.number().min(0),
  commissionType: z.enum(["FLAT", "PERCENTAGE"]),
  commissionValue: z.coerce.number().min(0),
  bufferMinutes: z.coerce.number().int().min(0).max(120).default(15),
  requiredSkillTags: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  therapistIds: z.array(z.string().uuid()).default([]),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
