"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export interface ExpenseCategoryOption {
  id: string;
  name: string;
}

export interface ExpenseFormValues {
  id?: string;
  date: string;
  categoryId: string;
  description: string;
  amount: number;
  paymentMethod: "CASH" | "GCASH" | "MAYA" | "BANK_TRANSFER" | "ONLINE_GATEWAY";
  vendor: string;
}

export function ExpenseForm({ initial, categories }: { initial?: ExpenseFormValues; categories: ExpenseCategoryOption[] }) {
  const router = useRouter();
  const [values, setValues] = useState<ExpenseFormValues>(
    initial ?? {
      date: new Date().toISOString().slice(0, 10),
      categoryId: categories[0]?.id ?? "",
      description: "",
      amount: 0,
      paymentMethod: "CASH",
      vendor: "",
    }
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(values.id ? `/api/expenses/${values.id}` : "/api/expenses", {
        method: values.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save this expense.");
        return;
      }
      router.push("/expenses");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-5">
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required value={values.date} onChange={(e) => setValues({ ...values, date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" required value={values.categoryId} onChange={(e) => setValues({ ...values, categoryId: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" required value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount (₱)</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                required
                value={values.amount}
                onChange={(e) => setValues({ ...values, amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="method">Payment method</Label>
              <Select
                id="method"
                value={values.paymentMethod}
                onChange={(e) => setValues({ ...values, paymentMethod: e.target.value as ExpenseFormValues["paymentMethod"] })}
              >
                <option value="CASH">Cash</option>
                <option value="GCASH">GCash</option>
                <option value="MAYA">Maya</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ONLINE_GATEWAY">Online Gateway</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="vendor">Vendor (optional)</Label>
            <Input id="vendor" value={values.vendor} onChange={(e) => setValues({ ...values, vendor: e.target.value })} />
          </div>
        </CardContent>
      </Card>
      <FieldError>{error ?? undefined}</FieldError>
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Expense"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/expenses")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
