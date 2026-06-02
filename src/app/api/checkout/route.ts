import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, PRICE, type Plan } from "@/lib/stripe";

export const runtime = "nodejs";

// Creates a Stripe Checkout Session for a subscription. The Supabase user id +
// target app are stamped into metadata so the webhook links the subscription
// deterministically (no email guessing).
export async function POST(request: Request) {
  const { plan } = (await request.json().catch(() => ({}))) as { plan?: Plan };
  const chosen: Plan = plan === "global" ? "global" : "demo";
  const priceId = PRICE[chosen];
  if (!priceId) {
    return NextResponse.json({ error: "Plan not configured (missing price id)." }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
  const app = chosen === "global" ? "global" : "demo";
  const meta = { supabase_user_id: user.id, app };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: meta,
    subscription_data: { metadata: meta },
    success_url: `${origin}/new?sub=success`,
    cancel_url: `${origin}/subscribe?canceled=1`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
