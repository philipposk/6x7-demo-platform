"use client";

import Link from "next/link";

// Shown when a guest (or a signed-in user without a subscription) tries to run a
// hosted render. They've already seen the price + options; this is the paywall.
export default function SubscribeModal({
  open,
  onClose,
  signedIn,
}: {
  open: boolean;
  onClose: () => void;
  signedIn: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold">Rendering needs a subscription</h2>
        <p className="mt-2 text-sm text-zinc-400">
          You can configure and price everything for free. Running it on our servers — recording,
          narrating, and encoding your video — is the part that needs a plan.
        </p>

        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex gap-2"><span className="text-emerald-400">✓</span> Unlimited hosted renders</li>
          <li className="flex gap-2"><span className="text-emerald-400">✓</span> Premium voices included</li>
          <li className="flex gap-2"><span className="text-emerald-400">✓</span> Video + screenshot grids</li>
        </ul>

        <Link
          href="/subscribe"
          className="mt-5 block rounded-md bg-emerald-500 px-4 py-2.5 text-center font-medium text-emerald-950 hover:bg-emerald-400"
        >
          {signedIn ? "Subscribe to render" : "Sign up & subscribe"}
        </Link>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Prefer free? Run it yourself with the{" "}
          <a href="https://github.com/philipposk/demo-pipeline" className="underline hover:text-zinc-300">
            open-source CLI
          </a>
          .
        </p>
        <button onClick={onClose} className="mt-3 w-full text-center text-xs text-zinc-600 hover:text-zinc-400">
          Maybe later
        </button>
      </div>
    </div>
  );
}
