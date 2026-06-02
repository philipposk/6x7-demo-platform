// Kicks off a render by dispatching the GitHub Actions `render` workflow in the
// worker repo (the free, serverless compute path). No-op (logged) if not
// configured, so local dev / pre-deploy still creates jobs without erroring.
export async function triggerRender(jobId: string): Promise<{ ok: boolean; reason?: string }> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_WORKER_REPO; // "owner/name"
  if (!token || !repo) return { ok: false, reason: "render trigger not configured" };

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/render.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        ref: process.env.GITHUB_WORKER_REF || "main",
        inputs: { job_id: jobId },
      }),
    },
  );
  if (!res.ok) return { ok: false, reason: `github ${res.status}` };
  return { ok: true };
}
