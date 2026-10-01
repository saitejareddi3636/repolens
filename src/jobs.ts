import type { Job, JobContext } from "deepspace/worker";
import type { Env } from "../worker";
import { createActionTools } from "./server/action-routes";
import { loadRepository } from "./repolens/server";
export async function runJob(
  job: Job,
  ctx: JobContext,
  env: Env,
): Promise<unknown> {
  if (job.type !== "analyze-repository")
    throw new Error("Unsupported job type");
  const { id, repository, ownerId } = job.payload as {
    id: string;
    repository: string;
    ownerId: string;
  };
  const tools = createActionTools(env, ownerId, "");
  const current = await tools.get("analyses", id);
  if (!current.success || current.data.record?.data.ownerId !== ownerId)
    throw new Error("Analysis owner mismatch");
  const update = async (data: Record<string, unknown>) => {
    const result = await tools.update("analyses", id, data);
    if (!result.success) throw new Error(result.error);
  };
  await update({
    status: "running",
    progress: 0.02,
    message: "Connecting to GitHub",
  });
  try {
    const signal = AbortSignal.any([ctx.signal, AbortSignal.timeout(120000)]);
    let progressWrite = Promise.resolve();
    const analysis = await loadRepository(
      env,
      repository,
      (p, m) => {
        ctx.progress(p, m);
        progressWrite = progressWrite.then(() =>
          update({ progress: p, message: m }),
        );
      },
      signal,
    );
    await progressWrite;
    signal.throwIfAborted();
    await update({
      status: "complete",
      progress: 1,
      message: "Source analysis ready",
      analysis,
    });
    return { id };
  } catch (e) {
    await update({
      status: "failed",
      message:
        e instanceof Error
          ? e.message
          : "Analysis failed. Retry from the repository form.",
    });
    throw e;
  }
}
