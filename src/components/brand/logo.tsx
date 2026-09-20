import { cn } from "@/lib/cn";

/**
 * Wordmark placeholder standing in for the supplied L&J Spa 2 Go Home logo
 * artwork (not available as a file in this environment). Swap the SVG mark
 * below for the real logo asset — see README "Brand assets".
 */
export function Logo({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const fg = tone === "light" ? "#F7F5F2" : "#171310";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <circle cx="15" cy="15" r="14" stroke="#7A0000" strokeWidth="1.5" />
        <path
          d="M15 6c3 3.5 6 6.8 6 10.2a6 6 0 1 1-12 0C9 12.8 12 9.5 15 6Z"
          fill="#7A0000"
        />
      </svg>
      <span className="font-serif leading-tight" style={{ color: fg }}>
        <span className="block text-base font-semibold tracking-wide">L&amp;J SPA</span>
        <span className="block text-[10px] tracking-[0.2em] opacity-80">2 GO HOME</span>
      </span>
    </div>
  );
}
