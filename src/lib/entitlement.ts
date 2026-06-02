import type { SupabaseClient } from "@supabase/supabase-js";

// Hybrid entitlement: a user may run app X's paid features if they have an
// ACTIVE (or trialing, not-expired) subscription row for app=X OR app='global'.
// RLS already scopes the table to the caller's own rows, so we never filter by
// user_id here — works the same from server or browser client.
export async function isEntitledFor(
  supabase: SupabaseClient,
  app: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, app")
    .in("app", [app, "global"]);

  if (error || !data) return false;
  const now = Date.now();
  return data.some(
    (r) =>
      (r.status === "active" || r.status === "trialing") &&
      (!r.current_period_end || new Date(r.current_period_end).getTime() > now),
  );
}
