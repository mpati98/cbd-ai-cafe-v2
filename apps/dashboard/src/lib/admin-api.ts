export class AdminApiError extends Error {
  status: number;
  details: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string; details?: unknown };

async function request<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T | null> {
  const { method = "GET", body } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    // Gửi kèm cookie phiên đăng nhập (httpOnly, set bởi /api/auth/login) —
    // không còn cần truyền tay 1 API key nữa như trước.
    credentials: "same-origin",
  });

  if (res.status === 204) return null;

  let json: ApiEnvelope<T> | null = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }

  if (!res.ok || !json || json.ok === false) {
    const message = json && "error" in json ? json.error : `Lỗi HTTP ${res.status}`;
    const details = json && "details" in json ? json.details : undefined;
    throw new AdminApiError(res.status, message, details);
  }

  return (json as { ok: true; data: T }).data;
}

export const adminApi = {
  list: <T>(path: string) => request<T[]>(path).then((v) => v ?? []),
  get: <T>(path: string) => request<T>(path),
  create: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body }),
  update: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body }),
  remove: (path: string) => request<null>(path, { method: "DELETE" }),
  health: () => request<{ db: string }>("/api/health"),
};
