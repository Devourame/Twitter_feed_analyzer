/**
 * Centralized API client.
 * All HTTP requests go through here so error handling and the base URL
 * are configured in exactly one place.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/** Error thrown for any non-successful API response. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    // Network failure / backend unreachable
    throw new ApiError(
      'Cannot reach the backend. Make sure the API server is running.',
      0
    );
  }

  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // response had no JSON body; keep the default message
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

/** GET request with automatic query-string building. */
export function get<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  signal?: AbortSignal
): Promise<T> {
  let url = path;
  if (params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') search.set(key, String(value));
    }
    const qs = search.toString();
    if (qs) url += `?${qs}`;
  }
  return request<T>(url, signal);
}

export const apiBaseUrl = BASE_URL;
