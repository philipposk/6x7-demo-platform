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

  // TODO(S2): insert into demo.jobs (user_id, target_url, service, options, status, cost_cents)
  // TODO(S3): worker polls demo.jobs → runs demo-pipeline / screenshot-grid → uploads to storage.
  // TODO(S4): if q.priceUsd > 0, create a Stripe Checkout session and gate the render.

  return NextResponse.json({
    ok: true,
    quote: q,
    message:
      q.priceUsd > 0
        ? `Job accepted for ${body.url}. Checkout + rendering land in the next release.`
        : `Job accepted for ${body.url}. Rendering backend lands in the next release — you'll get the file here.`,
  });
}
