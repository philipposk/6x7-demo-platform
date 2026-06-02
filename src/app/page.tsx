import Link from "next/link";

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-emerald-950">{n}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-zinc-400">{body}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="pt-8 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">demo.6x7.gr</p>
        <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Turn any live web app into a demo video.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
          Paste a URL. Get a narrated click-through video — landscape or vertical for socials — or a
          clickable screenshot grid for your README. Explore free; subscribe to render on our
          servers, or run it yourself with the open-source CLI.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/new" className="rounded-md bg-emerald-500 px-5 py-2.5 font-medium text-emerald-950 hover:bg-emerald-400">
            Make a demo →
          </Link>
          <a href="https://github.com/philipposk/demo-pipeline" className="rounded-md border border-zinc-700 px-5 py-2.5 font-medium hover:bg-zinc-800">
            View on GitHub
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20">
        <h2 className="mb-6 text-center text-2xl font-semibold">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Step n={1} title="Give us a live URL" body="Your deployed site. We drive it in a headless browser — nothing is installed from your repo." />
          <Step n={2} title="Pick the look" body="Cinematic landscape, vertical reel, voice, subtitles, and which features to include." />
          <Step n={3} title="Get your file" body="A polished MP4 (or screenshot grid) you can drop into your site, README, or socials." />
        </div>
      </section>

      {/* Two services */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="text-lg font-semibold">🎬 Demo video</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Per-scene zoom toward each click, animated cursor, intro/outro cards, logo, and subtitles.
            Landscape for your site, 9:16 for TikTok/Reels.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="text-lg font-semibold">🖼️ Screenshot grid</h3>
          <p className="mt-2 text-sm text-zinc-400">
            A clickable 3×N grid of clean screenshots for any GitHub README. No API keys, no cost.
          </p>
        </div>
      </section>

      {/* Use it yourself */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
        <h2 className="text-2xl font-semibold">Prefer to run it yourself?</h2>
        <p className="mt-2 max-w-2xl text-zinc-400">
          The engine is open source. Use it from Claude Code, or straight from your terminal — free
          voices and all. The hosted version here just runs it for you on our server.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-emerald-300">
{`# clone + run against your live site
git clone https://github.com/philipposk/demo-pipeline
cd demo-pipeline && npm install && npm run install-browsers
node pipeline.mjs <project> --mode=short --preset=highlights`}
        </pre>
      </section>

      {/* CTA */}
      <section className="text-center">
        <Link href="/new" className="inline-block rounded-md bg-emerald-500 px-6 py-3 font-medium text-emerald-950 hover:bg-emerald-400">
          Make your first demo
        </Link>
      </section>
    </div>
  );
}
