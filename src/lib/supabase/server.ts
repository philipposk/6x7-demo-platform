import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const cookieDomain =
  process.env.NODE_ENV === "production" ? ".6x7.gr" : undefined;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
