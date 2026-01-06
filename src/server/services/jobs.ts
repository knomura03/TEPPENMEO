export type JobResult<T> = {
  id: string;
  name: string;
  status: "success" | "failed";
  startedAt: string;
  finishedAt: string;
  result?: T;
  error?: string;
};

export async function runJob<T>(
  name: string,
  handler: () => Promise<T>
): Promise<JobResult<T>> {
  const startedAt = new Date().toISOString();
  try {
    const result = await handler();
    return {
      id: `job_${Date.now()}`,
      name,
      status: "success",
      startedAt,
      finishedAt: new Date().toISOString(),
      result,
    };
  } catch (error) {
    return {
      id: `job_${Date.now()}`,
      name,
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
