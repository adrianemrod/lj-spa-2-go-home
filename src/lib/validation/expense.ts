import { z } from "zod";

export const expenseSchema = z.object({
  date: z.coerce.date(),
  categoryId: z.string().uuid(),
  description: z.string().trim().min(2),
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(["CASH", "GCASH", "MAYA", "BANK_TRANSFER", "ONLINE_GATEWAY"]),
  vendor: z.string().trim().optional(),
  receiptUrl: z.string().trim().optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
