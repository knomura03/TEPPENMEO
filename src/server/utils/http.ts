export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpRequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  timeoutMs?: number;
  retries?: number;
};

export class HttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_TIMEOUT = 10000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function httpRequestJson<T>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<T> {
  const retries = options.retries ?? 2;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? DEFAULT_TIMEOUT
    );

    try {
      const response = await fetch(url, {
        method: options.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
        },
        body: options.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const bodyText = await response.text();
        if (response.status >= 500 && attempt < retries) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        throw new HttpError(response.status, bodyText);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      await sleep(300 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("HTTP再試行が上限に達しました");
}
