"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar({ name, role }: { name: string; role: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header data-theme="ops" className="flex h-14 items-center justify-between border-b border-border bg-bg px-5">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-fg">{name}</p>
          <p className="text-xs text-fg-muted">{role.replace(/_/g, " ")}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} title="Sign out">
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  );
}
