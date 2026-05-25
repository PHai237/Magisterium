import { API_BASE_URL } from "../../config/env";
import { readStoredAuthToken } from "../storage/auth-token";
import { ApiError } from "./api-error";

export interface ApiRequestOptions {
  userId?: string;
  body?: unknown;
  signal?: AbortSignal;
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message: unknown }).message;

    if (Array.isArray(message)) {
      return message.join("; ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
}

export async function apiRequest<T>(
  method: string,
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/json"
  };

  const token = readStoredAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.userId) {
    headers["x-user-id"] = options.userId;
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(payload, `Request failed with status ${response.status}.`),
      response.status,
      payload
    );
  }

  return payload as T;
}

export function apiGet<T>(path: string, options?: Omit<ApiRequestOptions, "body">) {
  return apiRequest<T>("GET", path, options);
}

export function apiPost<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "body">) {
  return apiRequest<T>("POST", path, {
    ...options,
    body
  });
}

export function apiPut<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "body">) {
  return apiRequest<T>("PUT", path, {
    ...options,
    body
  });
}

export function apiDelete<T>(path: string, options?: Omit<ApiRequestOptions, "body">) {
  return apiRequest<T>("DELETE", path, options);
}
