import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warning" | "critical" | "info" | "accent";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-fg/8 text-fg-muted",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  critical: "bg-critical/12 text-critical",
  info: "bg-info/12 text-info",
  accent: "bg-accent/12 text-accent",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  );
}
