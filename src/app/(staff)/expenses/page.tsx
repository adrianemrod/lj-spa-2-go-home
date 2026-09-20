import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateManila } from "@/lib/format";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requirePermission("expenses:read");
  const { month } = await searchParams;
  const currentMonth = month ?? new Date().toISOString().slice(0, 7);
  const monthStart = new Date(`${currentMonth}-01T00:00:00`);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: monthStart, lt: monthEnd } },
    include: { category: true, createdBy: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    byCategory.set(e.category.name, (byCategory.get(e.category.name) ?? 0) + Number(e.amount));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-fg">Expenses</h1>
          <p className="text-sm text-fg-muted">Shop expenses by category.</p>
        </div>
        <Link href="/expenses/new">
          <Button>
            <Plus size={16} /> New Expense
          </Button>
        </Link>
      </div>

      <form method="get" className="mb-4 flex items-center gap-2">
        <input type="month" name="month" defaultValue={currentMonth} className="h-10 rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm" />
        <Button type="submit" variant="secondary" size="sm">
          View
        </Button>
      </form>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-fg-muted">Total This Month</p>
          <p className="mt-1 text-xl font-semibold text-fg">{formatCurrency(total)}</p>
        </Card>
        {[...byCategory.entries()].slice(0, 3).map(([name, amount]) => (
          <Card key={name} className="p-4">
            <p className="text-xs uppercase tracking-wide text-fg-muted">{name}</p>
            <p className="mt-1 text-xl font-semibold text-fg">{formatCurrency(amount)}</p>
          </Card>
        ))}
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Description</th>
              <th className="px-5 py-3 font-medium">Vendor</th>
              <th className="px-5 py-3 font-medium">Method</th>
              <th className="px-5 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-fg/[0.02]">
                <td className="px-5 py-3 text-fg-muted">{formatDateManila(e.date)}</td>
                <td className="px-5 py-3 text-fg-muted">{e.category.name}</td>
                <td className="px-5 py-3">
                  <Link href={`/expenses/${e.id}/edit`} className="text-fg hover:text-accent">
                    {e.description}
                  </Link>
                </td>
                <td className="px-5 py-3 text-fg-muted">{e.vendor ?? "—"}</td>
                <td className="px-5 py-3 text-fg-muted">{e.paymentMethod.replace("_", " ")}</td>
                <td className="px-5 py-3 text-fg-muted">{formatCurrency(e.amount.toString())}</td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-fg-muted">
                  No expenses recorded this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
