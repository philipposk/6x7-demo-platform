import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

function cookieDomainFor(host?: string | null): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;
  const h = (host ?? "").split(":")[0].toLowerCase();
  // .6x7.dk mirror gets its own shared cookie domain; every other host keeps .6x7.gr (unchanged).
  return h === "6x7.dk" || h.endsWith(".6x7.dk") ? ".6x7.dk" : ".6x7.gr";
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: "sb-6x7-auth",
        domain: cookieDomainFor((((h)=>h.get("x-forwarded-host") ?? h.get("host"))(await headers()))),
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which cannot set cookies. The
            // middleware refreshes the session cookie instead, so this is safe.
          }
        },
      },
    },
  );
}
