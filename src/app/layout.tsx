import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "L&J Spa 2 Go Home",
  description: "Professional massage. Delivered to your door.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#7a0000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
