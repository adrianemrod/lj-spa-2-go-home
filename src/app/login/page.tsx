"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/dashboard",
  OWNER: "/dashboard",
  MANAGER: "/dashboard",
  DISPATCHER: "/dashboard",
  ACCOUNTING: "/dashboard",
  THERAPIST: "/app",
  CLIENT: "/my",
};

export default function LoginPage() {
  return (
    <div data-theme="ops" className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <Suspense fallback={<Card className="p-6" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      const next = params.get("next");
      router.push(next && next !== "/" ? next : ROLE_HOME[data.user.role] ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="mb-1 font-serif text-xl text-fg">Sign in</h1>
      <p className="mb-6 text-sm text-fg-muted">Operations Control Center</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <FieldError>{error ?? undefined}</FieldError>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-fg-muted">
        Forgot your password?{" "}
        <a href="/forgot-password" className="text-accent hover:underline">
          Reset it
        </a>
      </p>
    </Card>
  );
}
