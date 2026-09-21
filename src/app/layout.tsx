import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShyftKick — Restaurant Intelligence",
  description:
    "Automated daily briefings for restaurants with 1–10 locations: what changed, the evidence, and the next useful action.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
                <ChartNoAxesCombined size={18} aria-hidden />
              </span>
              <span>
                ShyftKick
                <span className="ml-2 hidden text-sm font-normal text-muted sm:inline">
                  Restaurant Intelligence
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/compatibility"
                className="rounded-md px-3 py-2 text-muted hover:bg-canvas hover:text-ink"
              >
                Compatibility
              </Link>
              <Link
                href="/setup"
                className="rounded-md bg-accent px-3 py-2 font-medium text-white hover:opacity-90"
              >
                Guided setup
              </Link>
            </nav>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted">
            <p>ShyftKick — built by a working restaurant operator.</p>
            <p>Read-only connections. Your systems stay yours.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
