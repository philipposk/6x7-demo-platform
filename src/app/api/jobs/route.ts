import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { quote } from "@/lib/pricing";
import { isEntitledFor } from "@/lib/entitlement";
import { triggerRender } from "@/lib/trigger";
import type { RenderOptions } from "@/lib/options";

// Accepts a render request. S1: validates + requires login + returns a quote.
// S2 will insert into demo.jobs; S3 will have the worker pick it up.
export async function POST(request: Request) {
  let body: RenderOptions;
  try {
    body = (await request.json()) as RenderOptions;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate the URL — only public http(s) URLs (live-URL-only model, no repos).
  try {
    const u = new URL(body.url);
    if (!/^https?:$/.test(u.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: "Enter a valid http(s) URL." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to generate a demo." }, { status: 401 });
  }

  // Every hosted render uses our servers → requires an active subscription
  // (this app, or a global 6x7 plan).
  if (!(await isEntitledFor(supabase, "demo"))) {
    return NextResponse.json(
      { error: "A subscription is required to render.", subscribe: "/subscribe" },
      { status: 402 },
    );
  }

  const q = quote(body);

  // Persist the job (demo.jobs via the SECURITY DEFINER RPC in public).
  const { data: job, error } = await supabase.rpc("demo_create_job", {
    p_target_url: body.url,
    p_service: body.service,
    p_options: {
      mode: body.mode, format: body.format, voice: body.voice,
      subtitles: body.subtitles, preset: body.preset,
    },
    p_cost_cents: Math.round(q.costUsd * 100),
    p_price_cents: Math.round(q.priceUsd * 100),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Kick off the render (free GitHub Actions worker). Job stays 'queued' if the
  // trigger isn't configured yet; nothing is lost.
  const jobId = (job as { id?: string })?.id;
  const trig = jobId ? await triggerRender(jobId) : { ok: false, reason: "no job id" };

  return NextResponse.json({
    ok: true,
    job,
    triggered: trig.ok,
    message: trig.ok
      ? `Rendering ${body.url} now — your file will appear here when it's done.`
      : `Queued render for ${body.url}. It will start once the render worker is connected.`,
  });
}
