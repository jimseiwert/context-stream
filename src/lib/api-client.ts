// Typed HTTP client wrapper around fetch
// Throws on non-2xx responses, attaching parsed JSON as `error.data`

class ApiError extends Error {
  data?: unknown;
  status?: number;
  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  }

  if (!res.ok) {
    const message =
      (data as any)?.error ?? (data as any)?.message ?? res.statusText;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body: unknown) => request<T>("POST", url, body),
  patch: <T>(url: string, body: unknown) => request<T>("PATCH", url, body),
  delete: <T = unknown>(url: string) => request<T>("DELETE", url),
};
