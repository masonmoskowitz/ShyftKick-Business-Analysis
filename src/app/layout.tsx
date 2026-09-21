import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

/* Same three voices as shyftkick.com: Cormorant Garamond carries the
   headings and the wordmark, Inter the body, JetBrains Mono the data. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
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
      className={`${inter.variable} ${cormorant.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-canvas">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-baseline gap-3">
              <span className="font-display text-xl tracking-[0.24em]">
                SHYFTKICK
              </span>
              <span className="sk-label hidden text-muted sm:inline">
                Intelligence
              </span>
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <a
                href="https://shyftkick.com"
                className="sk-label hidden px-3 py-2 text-muted hover:text-ink md:inline"
              >
                shyftkick.com
              </a>
              <Link
                href="/compatibility"
                className="sk-label px-3 py-2 text-muted hover:text-ink"
              >
                Compatibility
              </Link>
              <Link
                href="/setup"
                className="sk-label rounded-sm bg-ink px-4 py-2.5 text-canvas hover:bg-accent hover:text-white"
              >
                Guided setup
              </Link>
            </nav>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="bg-ink text-canvas">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm">
            <p className="font-display text-lg tracking-[0.24em]">SHYFTKICK</p>
            <p className="text-canvas/70">
              Built by a working restaurant operator. Read-only connections —
              your systems stay yours.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
