import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { quote } from "@/lib/pricing";
import { isEntitled } from "@/lib/entitlement";
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

  // Every hosted render uses our servers → requires an active subscription.
  if (!isEntitled(user)) {
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

  // TODO(S3): a worker polls demo.jobs (status='queued') → runs demo-pipeline /
  // screenshot-grid against the URL → uploads output to storage → sets output_url.

  return NextResponse.json({
    ok: true,
    job,
    message: `Queued render for ${body.url}. You'll get the file here when it's done.`,
  });
}
