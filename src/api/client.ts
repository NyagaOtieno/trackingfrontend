import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const TOKEN_KEY = "fleet-auth-token";
export const AUTH_STORAGE_KEY = "fleet-auth";

// =========================
// STORAGE
// =========================
export const getStoredToken = (): string | null =>
  localStorage.getItem(TOKEN_KEY);

export const setStoredToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

// =========================
// BASE URL (IMPROVED SAFE RESOLUTION)
// =========================
const normalizeUrl = (url: string) => url.replace(/\/+$/, "");

const API_BASE_URL = (() => {
  const env = import.meta.env.VITE_API_URL;

  if (env && env.trim()) {
    return normalizeUrl(env);
  }

  // IMPORTANT FIX:
  // In dev/proxy mode, ensure we don't accidentally hit wrong path
  return "/api";
})();

// =========================
// AXIOS INSTANCE
// =========================
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000, // slightly safer for mobile/remote server latency
  headers: {
    "Content-Type": "application/json",
  },
});

// =========================
// REQUEST INTERCEPTOR (IMPROVED TYPESAFE)
// =========================
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();

    config.headers = config.headers ?? {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =========================
// RESPONSE INTERCEPTOR
// =========================
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      clearStoredSession();
    }

    return Promise.reject(error);
  }
);

// =========================
// SAFE RESPONSE UNWRAPPER (MORE ROBUST)
// =========================
export function unwrapApiResponse<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object") {
    return payload as T;
  }

  const p = payload as any;

  // handles: { data: {...} }
  if (p.data !== undefined) return p.data as T;

  // handles: direct backend response
  return payload as T;
}

// =========================
// ERROR NORMALIZER (IMPROVED EDGE HANDLING)
// =========================
export function getApiMessage(
  error: unknown,
  fallback = "Request failed"
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;

    return (
      data?.message ||
      data?.error ||
      data?.msg ||
      error.response?.statusText ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) return error.message;

  return fallback;
}