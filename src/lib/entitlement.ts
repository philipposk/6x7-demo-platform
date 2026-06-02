import type { User } from "@supabase/supabase-js";

// Whether a user may run a HOSTED render. Every hosted render uses our server
// time, so it requires an active subscription. Guests (no user) are never
// entitled — they can explore + price everything, but Generate → subscribe.
//
// S4 (Stripe) will set this from the user's subscription status. Until then,
// nobody is entitled, so the subscribe gate always shows — which is the correct
// behaviour while billing is being built.
export function isEntitled(user: User | null): boolean {
  if (!user) return false;
  const status = (user.app_metadata as { subscription_status?: string } | undefined)
    ?.subscription_status;
  return status === "active" || status === "trialing";
}
