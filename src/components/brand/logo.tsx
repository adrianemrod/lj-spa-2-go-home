import Image from "next/image";
import { cn } from "@/lib/cn";

// Source art is 1800x1500 (see public/brand/logo.png).
const LOGO_ASPECT_RATIO = 1800 / 1500;
const HEIGHT_BY_SIZE = { sm: 32, md: 44, lg: 72 } as const;

/**
 * The real L&J Spa 2 Go Home logo (full resolution, public/brand/logo.png).
 * The source art has a solid white background (no transparency), which
 * reads fine directly on the light public site but needs a white "plate"
 * behind it on the dark ops theme (login, sidebar, therapist PWA) —
 * `tone="light"` (meaning: light foreground needed, i.e. a dark surface)
 * adds that plate; `tone="dark"` renders the image as-is on a light page.
 */
export function Logo({
  className,
  tone = "light",
  size = "md",
}: {
  className?: string;
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}) {
  const height = HEIGHT_BY_SIZE[size];
  const width = Math.round(height * LOGO_ASPECT_RATIO);

  const image = (
    <Image
      src="/brand/logo.png"
      alt="L&J Spa 2 Go Home"
      height={height}
      width={width}
      priority
      className="block h-full w-auto object-contain"
    />
  );

  if (tone === "dark") {
    // Already on a light/white page background — no plate needed.
    return (
      <div className={cn("flex items-center", className)} style={{ height }}>
        {image}
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center rounded-lg bg-white shadow-sm", className)}
      style={{ height: height + 12, padding: "6px 10px" }}
    >
      {image}
    </div>
  );
}
