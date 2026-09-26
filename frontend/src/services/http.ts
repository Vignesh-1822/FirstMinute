import { apiConfig } from "./config";

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }
}

/** True when the backend could not be reached at all (network / CORS / refused). */
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

export async function apiFetch<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiConfig.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(`Backend unreachable at ${apiConfig.baseUrl}`, 0, path);
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "detail" in body) {
        const value = (body as { detail: unknown }).detail;
        detail = typeof value === "string" ? value : JSON.stringify(value);
      }
    } catch {
      /* non-JSON error body — keep statusText */
    }
    throw new ApiError(detail || `HTTP ${response.status}`, response.status, path);
  }

  return (await response.json()) as TResponse;
}

export function postJson<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
  return apiFetch<TResponse>(path, { method: "POST", body: JSON.stringify(body) });
}
