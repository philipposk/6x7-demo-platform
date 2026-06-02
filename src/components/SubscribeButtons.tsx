"use client";

import { useState } from "react";

// Launches Stripe Checkout for a plan. If the user isn't signed in, the API
// returns 401 and we nudge them to sign in (top-right button).
export default function SubscribeButtons() {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function go(plan: "demo" | "global") {
    setBusy(plan);
    setErr(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Checkout failed");
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Plan
        title="Demo Pro"
        blurb="Unlimited hosted demo videos + screenshot grids for demo.6x7.gr."
        cta="Subscribe to Demo Pro"
        busy={busy === "demo"}
        onClick={() => go("demo")}
      />
      <Plan
        title="6×7 Pro"
        blurb="All-access: every 6×7 app, including everything in Demo Pro."
        cta="Subscribe to 6×7 Pro"
        highlight
        busy={busy === "global"}
        onClick={() => go("global")}
      />
      {err && <p className="sm:col-span-2 text-sm text-red-400">{err}</p>}
    </div>
  );
}

function Plan({
  title, blurb, cta, busy, onClick, highlight,
}: {
  title: string; blurb: string; cta: string; busy: boolean; onClick: () => void; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-6 text-left ${highlight ? "border-emerald-500/50 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/40"}`}>
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-1 text-sm text-zinc-400">{blurb}</p>
      <button
        onClick={onClick}
        disabled={busy}
        className="mt-5 w-full rounded-md bg-emerald-500 px-4 py-2.5 font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
      >
        {busy ? "Redirecting…" : cta}
      </button>
    </div>
  );
}
