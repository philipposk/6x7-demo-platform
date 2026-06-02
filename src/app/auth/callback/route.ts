import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect from a magic-link email or OAuth provider. Exchanges the
// one-time code for a session, which sets the sb-6x7-auth cookie on .6x7.gr.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
