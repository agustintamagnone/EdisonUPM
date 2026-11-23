const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');

export type ApiPath = `/api/${string}`;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiUrl(path: ApiPath): string {
  if (!apiBaseUrl) {
    throw new ApiError('The API URL is missing. Set NEXT_PUBLIC_API_BASE_URL and restart the frontend.');
  }
  return `${apiBaseUrl}${path}`;
}

export async function apiRequest(path: ApiPath, options?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  let response: Response;
  try {
    response = await fetch(url, {
      cache: 'no-store',
      ...options,
      credentials: 'include',
    });
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : `The server returned HTTP ${response.status}.`;
    const errors = body && typeof body === 'object' && 'errors' in body && body.errors && typeof body.errors === 'object'
      ? Object.fromEntries(Object.entries(body.errors).filter(([, value]) =>
          Array.isArray(value) && value.every((entry) => typeof entry === 'string')))
      : {};
    throw new ApiError(message, response.status, errors);
  }

  return response;
}

export async function apiJson<T>(path: ApiPath, options?: RequestInit): Promise<T> {
  const response = await apiRequest(path, options);
  try {
    return (await response.json()) as T;
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    throw new ApiError('The server returned an unexpected response.');
  }
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 401) return 'Your session has ended. Sign in to continue.';
  return Object.values(error.errors).flat().join(' ') || error.message;
}
