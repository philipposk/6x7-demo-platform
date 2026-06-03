"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SERVICES, MODES, FORMATS, VOICES, SUBTITLES, PRESETS,
  DEFAULT_OPTIONS, type RenderOptions,
} from "@/lib/options";
import { quote, fmtUsd } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";
import { isEntitledFor } from "@/lib/entitlement";
import SubscribeModal from "./SubscribeModal";
import type { User } from "@supabase/supabase-js";

type Job = { id: string; status: string; output_url?: string | null; error?: string | null; service?: string };

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued…",
  rendering: "Rendering on our servers…",
  done: "Done",
  error: "Failed",
};

function JobPanel({ job, onReset }: { job: Job; onReset: () => void }) {
  const working = job.status === "queued" || job.status === "rendering";
  return (
    <aside className="h-fit rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center gap-2 text-sm">
        {working && <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />}
        <span className={job.status === "error" ? "text-red-400" : "text-zinc-200"}>
          {STATUS_LABEL[job.status] || job.status}
        </span>
      </div>

      {working && (
        <p className="mt-3 text-xs text-zinc-500">
          This takes a couple of minutes — recording, narrating and encoding. You can leave this open.
        </p>
      )}

      {job.status === "done" && job.output_url && (
        <div className="mt-4 space-y-3">
          {job.service === "screenshots" ? (
            <a href={job.output_url} className="block rounded-md bg-emerald-500 px-4 py-2.5 text-center font-medium text-emerald-950 hover:bg-emerald-400">
              Download screenshots (.zip)
            </a>
          ) : (
            <>
              <video src={job.output_url} controls className="w-full rounded-lg border border-zinc-800" />
              <a href={job.output_url} download className="block rounded-md bg-emerald-500 px-4 py-2.5 text-center font-medium text-emerald-950 hover:bg-emerald-400">
                Download video
              </a>
            </>
          )}
        </div>
      )}

      {job.status === "error" && (
        <p className="mt-3 text-sm text-red-400">{job.error || "Render failed. Try again."}</p>
      )}

      <button onClick={onReset} className="mt-4 w-full text-center text-xs text-zinc-600 hover:text-zinc-400">
        ← Make another
      </button>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

const selectCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none";

export default function NewDemoForm() {
  const supabase = useMemo(() => createClient(), []);
  const [o, setO] = useState<RenderOptions>(DEFAULT_OPTIONS);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [entitled, setEntitled] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const set = (patch: Partial<RenderOptions>) => setO((p) => ({ ...p, ...patch }));

  // Poll the active job until it finishes.
  useEffect(() => {
    if (!job || job.status === "done" || job.status === "error") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/jobs?id=${job.id}`);
      if (!res.ok) return;
      const { job: j } = await res.json();
      if (j) setJob(j);
    }, 4000);
    return () => clearInterval(t);
  }, [job]);

  useEffect(() => {
    const refresh = async (u: User | null) => {
      setUser(u);
      setEntitled(u ? await isEntitledFor(supabase, "demo") : false);
    };
    supabase.auth.getUser().then(({ data }) => refresh(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => refresh(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const q = useMemo(() => quote(o), [o]);
  const isVideo = o.service === "video";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Every hosted render uses our servers → requires a subscription. Guests and
    // signed-in-but-unsubscribed users hit the paywall instead of rendering.
    if (!entitled) {
      setShowSubscribe(true);
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o),
      });
      const data = await res.json();
      if (res.status === 402) { setShowSubscribe(true); return; }
      if (!res.ok) throw new Error(data.error || "Failed");
      setStatus(null);
      if (data.job) setJob(data.job);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <Field label="Your live site URL">
          <input
            required
            type="url"
            value={o.url}
            onChange={(e) => set({ url: e.target.value })}
            placeholder="https://yourapp.com"
            className={selectCls}
          />
        </Field>

        <Field label="What to make">
          <div className="grid grid-cols-2 gap-2">
            {SERVICES.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => set({ service: s.id })}
                className={`rounded-lg border p-3 text-left text-sm ${
                  o.service === s.id ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-700 hover:border-zinc-500"
                }`}
              >
                <div className="font-medium">{s.label}</div>
                <div className="text-xs text-zinc-400">{s.blurb}</div>
              </button>
            ))}
          </div>
        </Field>

        {isVideo && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Style">
              <select className={selectCls} value={o.mode} onChange={(e) => set({ mode: e.target.value as RenderOptions["mode"] })}>
                {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Aspect ratio">
              <select className={selectCls} value={o.format} onChange={(e) => set({ format: e.target.value as RenderOptions["format"] })}>
                {FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </Field>
            <Field label="Voice">
              <select className={selectCls} value={o.voice} onChange={(e) => set({ voice: e.target.value as RenderOptions["voice"] })}>
                {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Subtitles">
              <select className={selectCls} value={o.subtitles} onChange={(e) => set({ subtitles: e.target.value as RenderOptions["subtitles"] })}>
                {SUBTITLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Which features">
              <select className={selectCls} value={o.preset} onChange={(e) => set({ preset: e.target.value as RenderOptions["preset"] })}>
                {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
          </div>
        )}
      </div>

      {/* Price + submit panel, or live job status once a render is running */}
      {job ? <JobPanel job={job} onReset={() => setJob(null)} /> : (
      <aside className="h-fit rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="text-sm text-zinc-400">Estimated price</div>
        <div className="mt-1 text-3xl font-semibold text-emerald-400">{fmtUsd(q.priceUsd)}</div>
        <ul className="mt-4 space-y-1 text-xs text-zinc-500">
          {q.breakdown.map((b) => (
            <li key={b.label} className="flex justify-between">
              <span>{b.label}</span>
              <span>{b.usd === 0 ? "—" : `$${b.usd.toFixed(3)}`}</span>
            </li>
          ))}
        </ul>
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-md bg-emerald-500 px-4 py-2.5 font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Generate"}
        </button>
        {status && <p className="mt-3 text-sm text-zinc-300">{status}</p>}
        <p className="mt-3 text-xs text-zinc-600">
          Hosted rendering needs a subscription. Configuring + pricing is free, and you can always
          run it yourself with the open-source CLI.
        </p>
      </aside>
      )}

      <SubscribeModal open={showSubscribe} onClose={() => setShowSubscribe(false)} signedIn={!!user} />
    </form>
  );
}
