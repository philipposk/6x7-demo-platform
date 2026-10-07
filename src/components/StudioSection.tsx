// "Studio" offer: code-built motion videos. Static server component.

// TODO(owner): where "We make it for you" requests go. The site has no contact
// route yet, so this is a placeholder address until the owner picks one. The
// email is pre-filled so people send a link (website or GitHub repo) or a short
// description; screenshots can be attached to the email.
const STUDIO_REQUEST_HREF =
  "mailto:CONTACT_ADDRESS_NEEDED" +
  "?subject=" + encodeURIComponent("Studio video request") +
  "&body=" + encodeURIComponent(
    "Link to your app (website or GitHub repo), or a short description of it:\n\n\n" +
      "Anything you want shown or said (optional; you can attach screenshots):\n",
  );

const ENGINE_URL = "https://github.com/philipposk/demo-pipeline/tree/main/motion";
const SKILL_URL = "https://github.com/philipposk/demo-pipeline/tree/main/skills/product-video";

function Point({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-zinc-400">{body}</p>
    </div>
  );
}

export default function StudioSection() {
  return (
    <section id="studio" className="scroll-mt-20 space-y-10">
      <div className="text-center">
        <span className="inline-block rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-emerald-300">
          Studio
        </span>
        <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
          A product video built from code.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
          Nobody films a screen. Your app&apos;s screens are redrawn as animation, with made-up
          data, and every movement is timed to the voice. The result looks designed, not recorded.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Point
          title="No screen recording"
          body="Screens are rebuilt as animation with made-up data, so nothing private ever shows up on screen."
        />
        <Point
          title="Timed to the voice"
          body="Each click, highlight and zoom lands on the exact word being spoken."
        />
        <Point
          title="Light, dark and phone"
          body="One set of scenes gives you a light version, a dark version and a vertical cut for phones."
        />
      </div>

      <figure className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <video
            src="/studio-demo.mp4"
            poster="/studio-demo-poster.jpg"
            controls
            playsInline
            preload="none"
            className="aspect-video w-full bg-zinc-900"
          />
        </div>
        <figcaption className="mt-2 text-center text-xs text-zinc-600">
          ↑ Example Studio video for Catchy, a meeting-notes app. Nothing was screen-recorded and the data is made up.
        </figcaption>
      </figure>

      <div>
        <h3 className="mb-5 text-center text-xl font-semibold">Two ways to get a Studio video</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex min-w-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Do it yourself</p>
            <h4 className="mt-1 text-lg font-semibold">Make it with Claude Code</h4>
            <p className="mt-2 text-sm text-zinc-400">
              The engine and a ready-made Claude skill are open source. Add the skill, then ask
              Claude Code to make a video for your app.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-[13px] text-emerald-300">
{`git clone https://github.com/philipposk/demo-pipeline
cd demo-pipeline
cp -r skills/product-video ~/.claude/skills/`}
            </pre>
            <p className="mt-3 text-xs text-zinc-500">
              The voice uses an OpenAI key you add yourself. The video tool (Remotion) is free for
              individuals and small companies; larger ones should check remotion.dev/license.
            </p>
            <div className="mt-auto flex flex-wrap gap-3 pt-5">
              <a href={SKILL_URL} className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-800">
                The Claude skill →
              </a>
              <a href={ENGINE_URL} className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-800">
                The engine →
              </a>
            </div>
          </div>

          <div className="flex min-w-0 flex-col rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-400">Done for you</p>
            <h4 className="mt-1 text-lg font-semibold">We make it for you</h4>
            <p className="mt-2 text-sm text-zinc-400">
              Send us a link (your website or a GitHub repo) or a short description. We build the scenes, record the voice and send you the
              finished videos: light, dark and phone versions.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              <li>✓ Made-up data, nothing private on screen</li>
              <li>✓ Voice and captions included</li>
              <li>✓ Ready for your site, README or socials</li>
            </ul>
            <div className="mt-auto pt-5">
              <a
                href={STUDIO_REQUEST_HREF}
                className="inline-block rounded-md bg-emerald-500 px-5 py-2.5 font-medium text-emerald-950 hover:bg-emerald-400"
              >
                Request a Studio video →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
