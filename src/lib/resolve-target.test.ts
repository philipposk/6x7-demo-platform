import { test } from "node:test";
import assert from "node:assert/strict";
import { extractReadmeLinks, parseGithubUrl, resolveTarget, sourceLabel } from "./resolve-target.ts";

const publicDns = async () => [{ address: "93.184.216.34" }];

type Route = { status?: number; body?: unknown; text?: string; headers?: Record<string, string> };

// Fake GitHub API: routes are matched on the path (without host). Unlisted
// paths return 404. Records every call so tests can inspect headers.
function fakeGithub(routes: Record<string, Route>) {
  const calls: { path: string; auth: string | null }[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(input)).pathname + new URL(String(input)).search;
    const headers = new Headers(init?.headers);
    calls.push({ path, auth: headers.get("authorization") });
    const r = routes[path] ?? routes[path.split("?")[0]];
    if (!r) return new Response("{}", { status: 404 });
    const body = r.text ?? JSON.stringify(r.body ?? {});
    return new Response(body, { status: r.status ?? 200, headers: r.headers });
  }) as typeof fetch;
  return { fetch: fn, calls };
}

const repoMeta = (extra: object = {}) => ({ body: { private: false, homepage: "", has_pages: false, ...extra } });
const ok = (url: string, source: string) => ({ ok: true, url, source, repo: "acme/widget" });

test("a plain website passes through", async () => {
  const r = await resolveTarget("https://example.com", { lookup: publicDns });
  assert.deepEqual(r, { ok: true, url: "https://example.com/", source: "website" });
});

test("a website that is really localhost is refused", async () => {
  const r = await resolveTarget("http://localhost:3000", { lookup: publicDns });
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.code, "not-public");
});

test("github.io sites are plain websites (no API calls)", async () => {
  const g = fakeGithub({});
  const r = await resolveTarget("https://acme.github.io/widget/", { lookup: publicDns, fetch: g.fetch });
  assert.equal(r.ok && r.source, "website");
  assert.equal(g.calls.length, 0);
});

test("parseGithubUrl: repo links in all common shapes", () => {
  const p = (s: string) => parseGithubUrl(new URL(s));
  assert.deepEqual(p("https://github.com/acme/widget"), { owner: "acme", repo: "widget" });
  assert.deepEqual(p("https://github.com/acme/widget/"), { owner: "acme", repo: "widget" });
  assert.deepEqual(p("https://github.com/acme/widget.git"), { owner: "acme", repo: "widget" });
  assert.deepEqual(p("https://www.github.com/acme/widget/tree/main/src"), { owner: "acme", repo: "widget" });
  assert.deepEqual(p("https://github.com/acme/widget/issues/3?x=1#c"), { owner: "acme", repo: "widget" });
  assert.equal(p("https://github.com/acme"), "not-a-repo");
  assert.equal(p("https://github.com/"), "not-a-repo");
  assert.equal(p("https://github.com/settings/profile"), "not-a-repo");
  assert.equal(p("https://gist.github.com/acme/abc123"), "not-a-repo");
  assert.equal(p("https://example.com/acme/widget"), null);
});

test("1. homepage field wins", async () => {
  const g = fakeGithub({
    "/repos/acme/widget": repoMeta({ homepage: "https://widget.example.com", has_pages: true }),
  });
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns });
  assert.deepEqual(r, ok("https://widget.example.com/", "github-homepage"));
});

test("1b. homepage without a scheme gets https://", async () => {
  const g = fakeGithub({ "/repos/acme/widget": repoMeta({ homepage: "widget.example.com" }) });
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns });
  assert.deepEqual(r, ok("https://widget.example.com/", "github-homepage"));
});

test("2. GitHub Pages (custom domain from the Pages API)", async () => {
  const g = fakeGithub({
    "/repos/acme/widget": repoMeta({ has_pages: true }),
    "/repos/acme/widget/pages": { body: { html_url: "https://widget.acme.dev/" } },
  });
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns });
  assert.deepEqual(r, ok("https://widget.acme.dev/", "github-pages"));
});

test("2b. GitHub Pages falls back to owner.github.io/repo when the Pages API is closed", async () => {
  const g = fakeGithub({ "/repos/acme/widget": repoMeta({ has_pages: true }) });
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns });
  assert.deepEqual(r, ok("https://acme.github.io/widget/", "github-pages"));
});

test("2c. user site repo owner.github.io maps to the root", async () => {
  const g = fakeGithub({ "/repos/acme/acme.github.io": repoMeta({ has_pages: true }) });
  const r = await resolveTarget("https://github.com/acme/acme.github.io", { fetch: g.fetch, lookup: publicDns });
  assert.equal(r.ok && r.url, "https://acme.github.io/");
});

test("3. latest production deployment, preview deployments skipped", async () => {
  const g = fakeGithub({
    "/repos/acme/widget": repoMeta(),
    "/repos/acme/widget/deployments": {
      body: [
        { id: 3, environment: "Preview" },
        { id: 2, environment: "Production" },
      ],
    },
    "/repos/acme/widget/deployments/3/statuses": {
      body: [{ state: "success", environment_url: "https://widget-git-feature-acme.vercel.app" }],
    },
    "/repos/acme/widget/deployments/2/statuses": {
      body: [
        { state: "success", environment_url: "https://widget.vercel.app" },
        { state: "pending" },
      ],
    },
  });
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns });
  assert.deepEqual(r, ok("https://widget.vercel.app/", "github-deployment"));
  assert.ok(!g.calls.some((c) => c.path.includes("/deployments/3/")), "preview deployment not even queried");
});

test("3b. a failed deployment is ignored", async () => {
  const g = fakeGithub({
    "/repos/acme/widget": repoMeta(),
    "/repos/acme/widget/deployments": { body: [{ id: 2, environment: "Production" }] },
    "/repos/acme/widget/deployments/2/statuses": {
      body: [{ state: "failure", environment_url: "https://broken.vercel.app" }],
    },
    "/repos/acme/widget/readme": { text: "# Widget\nTry it: https://try.widget.io" },
  });
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns });
  assert.deepEqual(r, ok("https://try.widget.io/", "github-readme"));
});

test("4. README: first real link, skipping badges, images, docs and repo links", async () => {
  const readme = [
    "# Widget",
    "[![CI](https://github.com/acme/widget/actions/workflows/ci.yml/badge.svg)](https://github.com/acme/widget/actions)",
    "[![npm](https://img.shields.io/npm/v/widget.svg)](https://www.npmjs.com/package/widget)",
    '<a href="https://vercel.com/new/clone"><img src="https://vercel.com/button"></a>',
    "![screenshot](https://cdn.example.com/shot.png)",
    "Read the [docs](https://docs.widget.io/start) or the [wiki](https://widget.io/wiki/home).",
    "Follow us on https://twitter.com/widget",
    "```\nnpm i widget # https://not-a-link-in-code.example.com\n```",
    "Live demo: [widget.io](https://widget.io/app).",
    "Second link: https://other.example.org",
  ].join("\n");
  const g = fakeGithub({ "/repos/acme/widget": repoMeta(), "/repos/acme/widget/readme": { text: readme } });
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns });
  assert.deepEqual(r, ok("https://widget.io/app", "github-readme"));
});

test("nothing found: clear message asking for the live URL", async () => {
  const g = fakeGithub({
    "/repos/acme/widget": repoMeta(),
    "/repos/acme/widget/readme": { text: "# Widget\nA library. See https://docs.widget.io" },
  });
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns });
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.code, "no-live-site");
  assert.match(!r.ok ? r.message : "", /Paste the address of your live site/);
});

test("repo not found or private (anonymous 404): friendly message, private repos not supported", async () => {
  const g = fakeGithub({});
  const r = await resolveTarget("https://github.com/acme/secret", { fetch: g.fetch, lookup: publicDns });
  assert.equal(!r.ok && r.code, "repo-not-found");
  assert.match(!r.ok ? r.message : "", /private repos aren't supported yet/);
});

test("repo visible to our token but private: refused, never used", async () => {
  const g = fakeGithub({ "/repos/acme/secret": repoMeta({ private: true, homepage: "https://secret.example.com" }) });
  const r = await resolveTarget("https://github.com/acme/secret", { fetch: g.fetch, lookup: publicDns, token: "t" });
  assert.equal(!r.ok && r.code, "private-repo");
});

test("GitHub rate limit gives a retry message, not 'no live site'", async () => {
  const g = fakeGithub({ "/repos/acme/widget": { status: 403, headers: { "x-ratelimit-remaining": "0" }, body: {} } });
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns });
  assert.equal(!r.ok && r.code, "github-busy");
});

test("rate limit hit midway (after metadata) also says busy", async () => {
  const g = fakeGithub({
    "/repos/acme/widget": repoMeta(),
    "/repos/acme/widget/deployments": { status: 429, body: {} },
    "/repos/acme/widget/readme": { status: 429, body: {} },
  });
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns });
  assert.equal(!r.ok && r.code, "github-busy");
});

test("network failure to GitHub gives the busy message", async () => {
  const failing = (async () => { throw new Error("boom"); }) as typeof fetch;
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: failing, lookup: publicDns });
  assert.equal(!r.ok && r.code, "github-busy");
});

test("token is sent when set; a rejected token falls back to anonymous", async () => {
  let n = 0;
  const calls: (string | null)[] = [];
  const f = (async (_u: string | URL | Request, init?: RequestInit) => {
    const auth = new Headers(init?.headers).get("authorization");
    calls.push(auth);
    n++;
    if (auth) return new Response("{}", { status: 401 });
    return new Response(JSON.stringify({ private: false, homepage: "https://widget.example.com" }), { status: 200 });
  }) as typeof fetch;
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: f, lookup: publicDns, token: "ghp_x" });
  assert.equal(r.ok && r.url, "https://widget.example.com/");
  assert.deepEqual(calls, ["Bearer ghp_x", null]);
  assert.equal(n, 2);
});

test("token is sent on every call when valid", async () => {
  const g = fakeGithub({
    "/repos/acme/widget": repoMeta(),
    "/repos/acme/widget/readme": { text: "https://widget.example.com" },
  });
  await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns, token: "ghp_x" });
  assert.ok(g.calls.length >= 2);
  assert.ok(g.calls.every((c) => c.auth === "Bearer ghp_x"));
});

test("hardening: a homepage pointing at a private address is skipped, next source is used", async () => {
  const g = fakeGithub({
    "/repos/acme/widget": repoMeta({ homepage: "http://169.254.169.254/latest", has_pages: true }),
  });
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns });
  assert.deepEqual(r, ok("https://acme.github.io/widget/", "github-pages"));
});

test("hardening: homepage whose name resolves to a private IP is skipped", async () => {
  const g = fakeGithub({ "/repos/acme/widget": repoMeta({ homepage: "https://evil.example.com" }) });
  const lookup = async (h: string) => [{ address: h === "evil.example.com" ? "10.0.0.7" : "93.184.216.34" }];
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup });
  assert.equal(!r.ok && r.code, "no-live-site");
});

test("a homepage that just points back to GitHub is not a live site", async () => {
  const g = fakeGithub({ "/repos/acme/widget": repoMeta({ homepage: "https://github.com/acme/widget#readme" }) });
  const r = await resolveTarget("https://github.com/acme/widget", { fetch: g.fetch, lookup: publicDns });
  assert.equal(!r.ok && r.code, "no-live-site");
});

test("owner-only and gist GitHub links are not repos", async () => {
  const g = fakeGithub({});
  for (const u of ["https://github.com/acme", "https://gist.github.com/acme/1"]) {
    const r = await resolveTarget(u, { fetch: g.fetch, lookup: publicDns });
    assert.equal(!r.ok && r.code, "not-a-repo");
  }
  assert.equal(g.calls.length, 0);
});

test("extractReadmeLinks: order, badges and code fences", () => {
  const links = extractReadmeLinks(
    [
      "[![b](https://i.example/b.svg)](https://badge.example/x)",
      "[a](https://a.example) text <a href='https://b.example'>b</a> <a href='https://c.example'><img src='x'></a>",
      "```\nhttps://code.example\n```",
      "bare https://d.example/path, and (https://e.example).",
    ].join("\n"),
  );
  assert.deepEqual(links, ["https://a.example", "https://b.example", "https://d.example/path", "https://e.example"]);
});

test("sourceLabel gives plain words", () => {
  assert.equal(sourceLabel("website"), "");
  assert.match(sourceLabel("github-homepage", "acme/widget"), /Website field of acme\/widget/);
});
