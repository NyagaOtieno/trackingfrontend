import axios, { AxiosError } from "axios";

const API_ORIGIN =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "/api";
  
export const TOKEN_KEY = "fleet-auth-token";
export const AUTH_STORAGE_KEY = "fleet-auth";

export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setStoredToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const clearStoredSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const apiClient = axios.create({
  baseURL: API_ORIGIN,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearStoredSession();
    }
    return Promise.reject(error);
  }
);

/**
 * Handles both:
 * - { success: true, data: ... }
 * - { token: "...", user: {...} }
 * - raw arrays/objects
 */
export function unwrapApiResponse<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as { data?: unknown }).data !== undefined
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export function getApiMessage(error: unknown, fallback = "Request failed"): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { message?: string; error?: string }
      | undefined;

    return (
      responseData?.message ||
      responseData?.error ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}