import { createBrowserClient } from "@supabase/ssr";

// Cookie name + domain are shared across every 6x7 app so one login is seen on
// all *.6x7.gr subdomains. Domain is only set in production; on localhost the
// browser rejects a `.6x7.gr` cookie, so we leave it unset for dev.
function cookieDomainFor(host?: string | null): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;
  const h = (host ?? "").split(":")[0].toLowerCase();
  // .6x7.dk mirror gets its own shared cookie domain; every other host keeps .6x7.gr (unchanged).
  return h === "6x7.dk" || h.endsWith(".6x7.dk") ? ".6x7.dk" : ".6x7.gr";
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: "sb-6x7-auth",
        domain: cookieDomainFor(typeof window !== "undefined" ? window.location.hostname : undefined),
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
  );
}
