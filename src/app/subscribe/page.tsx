import Link from "next/link";

// Subscription page. S4 wires Stripe Checkout here (mirroring the School app).
// For now it states the offer and links back.
export default function SubscribePage() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-3xl font-bold">Subscribe</h1>
      <p className="mt-3 text-zinc-400">
        Unlimited hosted demo videos and screenshot grids, premium voices included.
      </p>

      <div className="mt-8 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-left">
        <div className="text-sm text-zinc-400">6×7 demo — Pro</div>
        <div className="mt-1 text-3xl font-semibold">
          €X<span className="text-base font-normal text-zinc-500"> / month</span>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex gap-2"><span className="text-emerald-400">✓</span> Unlimited hosted renders</li>
          <li className="flex gap-2"><span className="text-emerald-400">✓</span> All voices (incl. premium)</li>
          <li className="flex gap-2"><span className="text-emerald-400">✓</span> Video + screenshot grids</li>
          <li className="flex gap-2"><span className="text-emerald-400">✓</span> Vertical / social formats</li>
        </ul>
        <button
          disabled
          className="mt-6 w-full cursor-not-allowed rounded-md bg-emerald-500/60 px-4 py-2.5 font-medium text-emerald-950"
        >
          Checkout (coming soon)
        </button>
        <p className="mt-2 text-center text-xs text-zinc-600">Stripe checkout lands in S4.</p>
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        Or run everything free with the{" "}
        <a href="https://github.com/philipposk/demo-pipeline" className="underline hover:text-zinc-300">
          open-source CLI
        </a>
        . <Link href="/new" className="underline hover:text-zinc-300">Back to options</Link>
      </p>
    </div>
  );
}
