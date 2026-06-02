"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Sign in / account chip. Reads the shared sb-6x7-auth session, so a login made
// on 6x7.gr (or any sibling app) shows here automatically.
export default function AuthButton() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  async function google() {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  }
  async function magicLink() {
    if (!input) return;
    await supabase.auth.signInWithOtp({ email: input, options: { emailRedirectTo: redirectTo } });
    setSent(true);
  }
  async function signOut() {
    await supabase.auth.signOut();
    setEmail(null);
  }

  if (email) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-zinc-400">{email}</span>
        <button onClick={signOut} className="rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
      >
        Sign in
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl">
          <button onClick={google} className="mb-3 w-full rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">
            Continue with Google
          </button>
          <div className="mb-2 text-center text-xs text-zinc-500">or magic link</div>
          {sent ? (
            <p className="text-sm text-emerald-400">Check your email for the link.</p>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="you@email.com"
                className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
              <button onClick={magicLink} className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400">
                Send
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
