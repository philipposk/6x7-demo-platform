# 6×7 demo platform — `demo.6x7.gr`

Hosted front-end for the [demo-pipeline](https://github.com/philipposk/demo-pipeline) engine.
Paste a live URL → pick options → get a demo video or screenshot grid.

Part of the 6×7 ecosystem: one shared Supabase project, SSO via the `.6x7.gr`
cookie, deployed as its own Vercel project.

## Stack
- Next.js 16 (App Router) + React 19 + Tailwind v4
- `@supabase/ssr` — shared session cookie `sb-6x7-auth` on `.6x7.gr`
- Live-URL-only model (we drive your deployed site in a headless browser; **no repo is uploaded or run**)

## Local dev
```bash
npm install
cp .env.example .env.local   # fill from Supabase → Project → API (anon key)
npm run dev                  # http://localhost:3000
```

## Structure
```
src/
  app/
    page.tsx                 landing (how it works, services, CLI)
    new/page.tsx             intake form
    api/jobs/route.ts        accept a render request (validates + quotes; auth required)
    auth/callback/route.ts   OAuth / magic-link code exchange
  components/
    AuthButton.tsx           sign in / account chip (shared SSO)
    NewDemoForm.tsx          options + live price
  lib/
    supabase/{client,server}.ts   .6x7.gr-scoped clients
    options.ts               services / modes / formats / voices / presets
    pricing.ts               cost + price quote
  middleware.ts              refreshes the SSO session cookie
```

## Roadmap (this is S1)
- **S2** — `demo` schema + `demo.jobs` table in the 6×7 Supabase (RLS `auth.uid() = user_id`).
- **S3** — render worker (Fly.io VM) polls `demo.jobs`, runs demo-pipeline / screenshot-grid against the URL, uploads output to Supabase storage.
- **S4** — Stripe pay-per-video (mirror the School app) for the premium voices.
- **S5** — Vercel deploy, link the 6×7 Supabase (env auto-inject), point `demo.6x7.gr` CNAME, then render the platform's own meta demo.

`api/jobs` currently validates + requires login + returns a price quote; the DB
insert (S2), worker (S3), and checkout (S4) are marked with TODOs in that file.
