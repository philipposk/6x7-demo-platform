// Turns what the user pasted into the live website we should record.
//  - a website link          -> itself (after the public-address safety check)
//  - a public GitHub repo    -> its live site, looked up in this order:
//      1. the repo's "Website" (homepage) field
//      2. GitHub Pages
//      3. the latest successful production deployment (Vercel/Netlify/...)
//      4. the first real link in the README (not a badge, not docs)
// Every candidate goes through assertPublicUrl, so a repo cannot point us at an
// internal address. Private repos are not supported.
import { assertPublicUrl, UrlSafetyError } from "./url-safety.ts";

export type Source =
  | "website"
  | "github-homepage"
  | "github-pages"
  | "github-deployment"
  | "github-readme";

export type ResolveErrorCode =
  | "invalid"
  | "not-public"
  | "not-found"
  | "not-a-repo"
  | "repo-not-found"
  | "private-repo"
  | "no-live-site"
  | "github-busy";

export type Resolved =
  | { ok: true; url: string; source: Source; repo?: string }
  | { ok: false; code: ResolveErrorCode; message: string };

export type ResolveDeps = {
  fetch?: typeof fetch;
  lookup?: Parameters<typeof assertPublicUrl>[1];
  /** Optional GitHub token: lifts the 60 requests/hour anonymous limit. */
  token?: string;
};

export function sourceLabel(source: Source, repo?: string): string {
  switch (source) {
    case "github-homepage": return `from the Website field of ${repo}`;
    case "github-pages": return `from the GitHub Pages site of ${repo}`;
    case "github-deployment": return `from the latest live deployment of ${repo}`;
    case "github-readme": return `from the first link in the README of ${repo}`;
    default: return "";
  }
}

// ---- GitHub link parsing ---------------------------------------------------

const NAME = /^[A-Za-z0-9_.-]+$/;
const RESERVED_OWNERS = new Set([
  "about", "apps", "codespaces", "collections", "contact", "enterprise", "events", "explore",
  "features", "issues", "join", "login", "marketplace", "new", "notifications", "orgs",
  "pricing", "pulls", "readme", "search", "security", "settings", "sponsors", "topics", "trending",
]);

/** {owner, repo} for a github.com repo link, "not-a-repo" for other GitHub links, null if not GitHub. */
export function parseGithubUrl(u: URL): { owner: string; repo: string } | "not-a-repo" | null {
  const host = u.hostname.toLowerCase();
  if (host === "gist.github.com") return "not-a-repo";
  if (host !== "github.com" && host !== "www.github.com") return null;
  const [owner, repoRaw] = u.pathname.split("/").filter(Boolean);
  if (!owner || !repoRaw || RESERVED_OWNERS.has(owner.toLowerCase())) return "not-a-repo";
  const repo = repoRaw.replace(/\.git$/i, "");
  if (!NAME.test(owner) || !NAME.test(repo)) return "not-a-repo";
  return { owner, repo };
}

const isGithubHost = (h: string) => /(^|\.)github\.com$|(^|\.)githubusercontent\.com$/i.test(h);

// ---- README link extraction ------------------------------------------------

const NOISE_HOSTS = [
  // badges, CI, registries, social, licences, deploy buttons
  "shields.io", "badgen.net", "badge.fury.io", "travis-ci.com", "travis-ci.org", "circleci.com",
  "codecov.io", "coveralls.io", "npmjs.com", "pypi.org", "crates.io", "rubygems.org",
  "hub.docker.com", "twitter.com", "x.com", "linkedin.com", "facebook.com", "instagram.com",
  "discord.gg", "discord.com", "t.me", "youtube.com", "youtu.be", "medium.com",
  "opensource.org", "creativecommons.org", "gnu.org", "apache.org",
  "vercel.com", "netlify.com", "heroku.com", "render.com", "railway.app", "readthedocs.io",
  "gitbook.io", "docusaurus.io",
];

function isNoiseLink(u: URL): boolean {
  const host = u.hostname.toLowerCase();
  if (isGithubHost(host)) return true;
  if (NOISE_HOSTS.some((n) => host === n || host.endsWith(`.${n}`))) return true;
  if (/^(docs?|wiki|api|developer|developers)\./.test(host)) return true;
  if (/\/(docs?|documentation|wiki|api-docs|changelog|license|contributing)(\/|$)/i.test(u.pathname)) return true;
  if (/\.(png|jpe?g|gif|svg|webp|ico|pdf|md|zip|tar|gz|json|xml|ya?ml)$/i.test(u.pathname)) return true;
  return false;
}

// One pass over the README in reading order. Alternation order matters: at the
// same position, a badge ([![img](..)](url)) wins over a plain image or link.
const LINK_RE = new RegExp(
  [
    String.raw`(?<badge>\[\s*!\[[^\]]*\]\([^)]*\)\s*\]\([^)]*\))`,
    String.raw`(?<image>!\[[^\]]*\]\([^)]*\))`,
    String.raw`\[[^\]]*\]\((?<md><?[^)\s>]+>?)(?:\s+"[^"]*")?\)`,
    String.raw`<a\s[^>]*href=["'](?<ahref>[^"']+)["'][^>]*>(?<atext>[\s\S]*?)</a>`,
    String.raw`(?<bare>https?://[^\s<>"'\])]+)`,
  ].join("|"),
  "gi",
);

/** http(s) links in README text, in order, without badges, images and fenced code. */
export function extractReadmeLinks(markdown: string): string[] {
  const text = markdown.replace(/```[\s\S]*?```/g, " ").replace(/~~~[\s\S]*?~~~/g, " ");
  const out: string[] = [];
  for (const m of text.matchAll(LINK_RE)) {
    const g = m.groups ?? {};
    if (g.badge || g.image) continue;
    let raw = g.md ?? g.bare;
    if (g.ahref) {
      if (/<img\b/i.test(g.atext ?? "")) continue; // image-wrapped link = badge/button
      raw = g.ahref;
    }
    if (!raw) continue;
    raw = raw.replace(/^<|>$/g, "").replace(/[.,;:!?]+$/, "");
    if (/^https?:\/\//i.test(raw)) out.push(raw);
  }
  return out;
}

// ---- Resolver --------------------------------------------------------------

const MSG = {
  invalid: "Enter a valid link starting with http:// or https://.",
  notARepo:
    "That GitHub link isn't a repository. Paste a repo link like https://github.com/owner/name, or the address of your live site.",
  repoNotFound:
    "We couldn't open that repository. The link may be wrong, or the repo is private (private repos aren't supported yet). Paste the address of your live site instead.",
  privateRepo:
    "That repository is private, and private repos aren't supported yet. Paste the address of your live site instead.",
  busy: "GitHub didn't answer just now. Try again in a minute, or paste the address of your live site.",
};

const noLiveSite = (repo: string): Resolved => ({
  ok: false,
  code: "no-live-site",
  message:
    `We couldn't find a live site for ${repo}. Paste the address of your live site (the website, not the repo). ` +
    `Tip: add it to the repo's "Website" field on GitHub and we'll find it next time.`,
});

function fromSafety(e: unknown): Resolved {
  if (e instanceof UrlSafetyError) return { ok: false, code: e.code, message: e.message };
  return { ok: false, code: "invalid", message: MSG.invalid };
}

export async function resolveTarget(input: string, deps: ResolveDeps = {}): Promise<Resolved> {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return { ok: false, code: "invalid", message: MSG.invalid };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, code: "invalid", message: "Only http:// and https:// links work." };
  }

  const gh = parseGithubUrl(u);
  if (gh === null) {
    try {
      return { ok: true, url: (await assertPublicUrl(input, deps.lookup)).href, source: "website" };
    } catch (e) {
      return fromSafety(e);
    }
  }
  if (gh === "not-a-repo") return { ok: false, code: "not-a-repo", message: MSG.notARepo };
  return resolveRepo(gh.owner, gh.repo, deps);
}

async function resolveRepo(owner: string, repo: string, deps: ResolveDeps): Promise<Resolved> {
  const doFetch = deps.fetch ?? fetch;
  const full = `${owner}/${repo}`;
  const base = `/repos/${owner}/${repo}`;
  let limited = false;

  async function gh(path: string, accept = "application/vnd.github+json"): Promise<Response | null> {
    const call = (auth: boolean) =>
      doFetch(`https://api.github.com${path}`, {
        headers: {
          Accept: accept,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "6x7-demo-platform",
          ...(auth && deps.token ? { Authorization: `Bearer ${deps.token}` } : {}),
        },
        signal: AbortSignal.timeout(8000),
      });
    try {
      let res = await call(true);
      if (res.status === 401 && deps.token) res = await call(false); // bad/expired token: go anonymous
      if (res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")) limited = true;
      return res;
    } catch {
      return null;
    }
  }

  const json = async <T>(res: Response | null): Promise<T | null> => {
    if (!res || !res.ok) return null;
    try { return (await res.json()) as T; } catch { return null; }
  };

  async function accept(source: Source, raw: string | null | undefined): Promise<Resolved | null> {
    if (!raw) return null;
    try {
      const u = await assertPublicUrl(raw, deps.lookup);
      if (isGithubHost(u.hostname)) return null;
      return { ok: true, url: u.href, source, repo: full };
    } catch {
      return null;
    }
  }

  const metaRes = await gh(base);
  if (!metaRes) return { ok: false, code: "github-busy", message: MSG.busy };
  if (metaRes.status === 404) return { ok: false, code: "repo-not-found", message: MSG.repoNotFound };
  if (!metaRes.ok) return { ok: false, code: "github-busy", message: MSG.busy };
  const info = await json<{ private?: boolean; homepage?: string | null; has_pages?: boolean }>(metaRes);
  if (!info) return { ok: false, code: "github-busy", message: MSG.busy };
  if (info.private) return { ok: false, code: "private-repo", message: MSG.privateRepo };

  // 1. Website field
  let homepage = info.homepage?.trim();
  if (homepage && !/^https?:\/\//i.test(homepage)) homepage = `https://${homepage}`;
  const fromHomepage = await accept("github-homepage", homepage);
  if (fromHomepage) return fromHomepage;

  // 2. GitHub Pages (html_url includes a custom domain when there is one)
  if (info.has_pages) {
    const pages = await json<{ html_url?: string }>(await gh(`${base}/pages`));
    const userSite = repo.toLowerCase() === `${owner}.github.io`.toLowerCase();
    const computed = userSite ? `https://${owner}.github.io/` : `https://${owner}.github.io/${repo}/`;
    const fromPages = (await accept("github-pages", pages?.html_url)) ?? (await accept("github-pages", computed));
    if (fromPages) return fromPages;
  }

  // 3. Latest successful deployment. Preview/staging URLs are skipped: they are
  //    usually behind a login wall and would record that instead of the app.
  const deployments = await json<{ id: number; environment?: string }[]>(
    await gh(`${base}/deployments?per_page=10`),
  );
  const notPreview = (env = "") => !/preview|pull|review|staging|dev|test|pr-/i.test(env);
  const wanted = (deployments ?? []).filter((d) => /prod/i.test(d.environment ?? "") || notPreview(d.environment));
  wanted.sort((a, b) => Number(/prod/i.test(b.environment ?? "")) - Number(/prod/i.test(a.environment ?? "")));
  for (const d of wanted.slice(0, 5)) {
    const statuses = await json<{ state?: string; environment_url?: string }[]>(
      await gh(`${base}/deployments/${d.id}/statuses?per_page=5`),
    );
    const ok = statuses?.find((s) => s.state === "success" && s.environment_url);
    const fromDeploy = await accept("github-deployment", ok?.environment_url);
    if (fromDeploy) return fromDeploy;
  }

  // 4. First real link in the README
  const readmeRes = await gh(`${base}/readme`, "application/vnd.github.raw+json");
  if (readmeRes?.ok) {
    let text = "";
    try { text = (await readmeRes.text()).slice(0, 200_000); } catch { /* ignore */ }
    for (const link of extractReadmeLinks(text)) {
      let parsed: URL;
      try { parsed = new URL(link); } catch { continue; }
      if (isNoiseLink(parsed)) continue;
      const fromReadme = await accept("github-readme", link);
      if (fromReadme) return fromReadme;
    }
  }

  if (limited) return { ok: false, code: "github-busy", message: MSG.busy };
  return noLiveSite(full);
}
