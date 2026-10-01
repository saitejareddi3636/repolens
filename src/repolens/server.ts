import { apiWorkerFetch } from "deepspace/worker";
import type { Env } from "../../worker";
import { analyzeSources, parseRepository } from "./analyzer";
import type { Analysis, SourceFile } from "./model";
export async function integrate<T>(
  env: Env,
  endpoint: string,
  data: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await apiWorkerFetch(env, `/api/integrations/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.APP_OWNER_JWT}`,
    },
    body: JSON.stringify(data),
    signal,
  });
  const result = (await response.json()) as {
    success: boolean;
    data: T;
    error?: string;
  };
  if (!response.ok || !result.success)
    throw new Error(
      result.error || "The integration could not complete. Try again later.",
    );
  return result.data;
}
export async function loadRepository(
  env: Env,
  input: string,
  progress: (p: number, m: string) => void,
  signal: AbortSignal,
): Promise<Analysis> {
  const repository = parseRepository(input);
  const [owner, repo] = repository.split("/");
  progress(0.06, "Resolving the repository");
  const meta = await integrate<{
    description: string;
    default_branch: string;
    private: boolean;
  }>(env, "github/get-repository", { owner, repo }, signal);
  if (meta.private) throw new Error("Only public repositories are supported.");
  const commit = await integrate<{ sha: string }>(
    env,
    "github/get-commit",
    { owner, repo, sha: meta.default_branch || "HEAD" },
    signal,
  );
  if (!/^[a-f0-9]{40}$/.test(commit.sha))
    throw new Error(
      "GitHub did not return a valid commit. No analysis was saved.",
    );
  progress(0.15, "Pinning source to a commit");
  const tree = await integrate<{
    tree: Array<{ path: string; type: string; size?: number }>;
    truncated: boolean;
  }>(
    env,
    "github/get-repository-tree",
    { owner, repo, sha: commit.sha, recursive: true },
    signal,
  );
  if (!Array.isArray(tree.tree))
    throw new Error("GitHub returned an unsupported tree response.");
  const candidates = tree.tree.filter(
    (f) =>
      f.type === "blob" &&
      /\.(tsx?|jsx?|mjs)$/.test(f.path) &&
      !/(^|\/)(node_modules|dist|build|vendor|\.next)\//.test(f.path) &&
      !/(\.d\.ts$|\.test\.|\.spec\.|lock)/.test(f.path) &&
      (f.size || 0) < 22000,
  );
  const priority = (p: string) =>
    /^(worker|index|app)\.[tj]s$/.test(p)
      ? 0
      : /src\/(pages|app)\/.*(home|index|page)\.[tj]sx?$/.test(p)
        ? 1
        : /src\/schemas/.test(p)
          ? 2
          : /src\/(actions|server|jobs)/.test(p)
            ? 3
            : /src\/components\/(?!ui)/.test(p)
              ? 4
              : p.startsWith("src/")
                ? 5
                : 6;
  candidates.sort(
    (a, b) =>
      priority(a.path) - priority(b.path) || a.path.localeCompare(b.path),
  );
  const selected = candidates.slice(0, 32);
  if (!selected.length)
    throw new Error(
      "No supported JavaScript or TypeScript source files were found.",
    );
  const files: SourceFile[] = [];
  let bytes = 0;
  for (let i = 0; i < selected.length; i += 4) {
    signal.throwIfAborted();
    const batch = await Promise.all(
      selected.slice(i, i + 4).map(async (f) => {
        const url = `https://raw.githubusercontent.com/${repository}/${commit.sha}/${f.path.split("/").map(encodeURIComponent).join("/")}`;
        const r = await fetch(url, { signal, redirect: "manual" });
        if (!r.ok)
          throw new Error(`Could not read ${f.path}. Retry the analysis.`);
        const content = await r.text();
        if (content.length > 22000) return null;
        return {
          path: f.path,
          content,
          language: /\.tsx?$/.test(f.path) ? "typescript" : "javascript",
        };
      }),
    );
    for (const f of batch)
      if (f && bytes + f.content.length <= 180000) {
        files.push(f);
        bytes += f.content.length;
      }
    progress(
      0.2 + 0.62 * Math.min(1, (i + 4) / selected.length),
      `Reading source · ${Math.min(i + 4, selected.length)} / ${selected.length} files`,
    );
  }
  if (!files.length)
    throw new Error("Source files exceed this prototype’s size limit.");
  progress(0.88, "Parsing imports and building walkthroughs");
  const analysis = analyzeSources(
    repository,
    commit.sha,
    files,
    meta.description || "",
  );
  if (candidates.length > files.length || tree.truncated)
    analysis.warnings.push(
      `Partial analysis: ${files.length} files included. Up to 32 files and 180 KB of source are supported.`,
    );
  return analysis;
}
export async function reserveUsage(
  env: Env,
  userId: string,
  bucket: string,
  limit = 8,
) {
  const stub = env.JOB_ROOMS.get(
    env.JOB_ROOMS.idFromName(`app:${env.DEEPSPACE_APP_ID}`),
  );
  const r = await stub.fetch(
    new Request("https://internal/repolens-budget", {
      method: "POST",
      body: JSON.stringify({ userId, bucket, limit }),
    }),
  );
  if (!r.ok)
    throw new Error(
      "Today’s demo usage limit has been reached. Saved walkthroughs remain available.",
    );
}
