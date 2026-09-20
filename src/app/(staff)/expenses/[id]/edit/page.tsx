import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { ExpenseForm } from "@/components/expenses/expense-form";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("expenses:manage");
  const { id } = await params;
  const [expense, categories] = await Promise.all([
    prisma.expense.findUniqueOrThrow({ where: { id } }),
    prisma.expenseCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-fg">Edit Expense</h1>
      <ExpenseForm
        initial={{
          id: expense.id,
          date: expense.date.toISOString().slice(0, 10),
          categoryId: expense.categoryId,
          description: expense.description,
          amount: Number(expense.amount),
          paymentMethod: expense.paymentMethod,
          vendor: expense.vendor ?? "",
        }}
        categories={categories}
      />
    </div>
  );
}
