// apps/web/src/lib/api.ts
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type FetchOpts = RequestInit & { json?: unknown };

export async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  if (opts.json !== undefined) headers.set("Content-Type", "application/json");

  const res = await fetch(path, {
    ...opts,
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
    credentials: "include",
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Request failed: ${res.status}`;
    const code = payload?.error?.code;
    throw new ApiError(res.status, message, code);
  }
  return payload as T;
}
