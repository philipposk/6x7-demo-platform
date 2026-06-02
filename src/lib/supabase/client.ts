import { createBrowserClient } from "@supabase/ssr";

// Cookie name + domain are shared across every 6x7 app so one login is seen on
// all *.6x7.gr subdomains. Domain is only set in production; on localhost the
// browser rejects a `.6x7.gr` cookie, so we leave it unset for dev.
const cookieDomain =
  process.env.NODE_ENV === "production" ? ".6x7.gr" : undefined;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: "sb-6x7-auth",
        domain: cookieDomain,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
  );
}
