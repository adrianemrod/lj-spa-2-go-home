import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { ExpenseForm } from "@/components/expenses/expense-form";

export default async function NewExpensePage() {
  await requirePermission("expenses:manage");
  const categories = await prisma.expenseCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-fg">New Expense</h1>
      <ExpenseForm categories={categories} />
    </div>
  );
}
