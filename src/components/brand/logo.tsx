import Image from "next/image";
import { cn } from "@/lib/cn";

// Source art is 1800x1500 (see public/brand/logo.png).
const LOGO_ASPECT_RATIO = 1800 / 1500;
const HEIGHT_BY_SIZE = { sm: 32, md: 44, lg: 72 } as const;

/**
 * The real L&J Spa 2 Go Home logo (full resolution, public/brand/logo.png).
 * Every surface in the app is white background now (matching the logo's
 * own palette), so the image is just rendered directly — no special
 * wrapping needed for a dark surface.
 */
export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const height = HEIGHT_BY_SIZE[size];
  const width = Math.round(height * LOGO_ASPECT_RATIO);

  return (
    <div className={cn("flex items-center", className)} style={{ height }}>
      <Image
        src="/brand/logo.png"
        alt="L&J Spa 2 Go Home"
        height={height}
        width={width}
        priority
        className="block h-full w-auto object-contain"
      />
    </div>
  );
}
