import axios, { AxiosError } from "axios";

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
// BASE URL (FIXED FOR VERCEL + LOCAL DEV)
// =========================
const API_BASE_URL = (() => {
  const env = import.meta.env.VITE_API_URL;

  // CASE 1: backend explicitly set (production)
  if (env && env.trim() !== "") {
    return env.replace(/\/+$/, "");
  }

  // CASE 2: Vercel rewrite fallback (/api → backend proxy)
  return "/api";
})();

// =========================
// AXIOS INSTANCE
// =========================
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// =========================
// REQUEST INTERCEPTOR
// =========================
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// =========================
// RESPONSE INTERCEPTOR
// =========================
apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearStoredSession();
    }
    return Promise.reject(error);
  }
);

// =========================
// SAFE RESPONSE UNWRAPPER
// =========================
export function unwrapApiResponse<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as any).data !== undefined
  ) {
    return (payload as any).data as T;
  }

  return payload as T;
}

// =========================
// ERROR NORMALIZER
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
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) return error.message;

  return fallback;
}