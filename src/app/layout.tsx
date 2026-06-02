import type { Metadata } from "next";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "6×7 demo — turn any live app into a demo video",
  description:
    "Paste a live URL, get a narrated click-through demo video or a screenshot grid. Free via Claude Code / npx, or let us render it for you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <header className="sticky top-0 z-10 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="rounded-md bg-emerald-500 px-2 py-1 text-sm text-emerald-950">6×7</span>
              <span>demo</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/#how" className="text-zinc-400 hover:text-zinc-100">How it works</Link>
              <Link href="/new" className="text-zinc-400 hover:text-zinc-100">New demo</Link>
              <AuthButton />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        <footer className="border-t border-zinc-900 py-8 text-center text-sm text-zinc-600">
          Built with 6×7 · part of{" "}
          <a href="https://6x7.gr" className="hover:text-zinc-400">6x7.gr</a>
        </footer>
      </body>
    </html>
  );
}
