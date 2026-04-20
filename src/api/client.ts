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
// BASE URL (IMPORTANT FIX FOR VERCEL)
// =========================
const API_ORIGIN = (() => {
  const envUrl = import.meta.env.VITE_API_URL;

  // IMPORTANT: force clean routing
  if (!envUrl) return "/api";

  return envUrl.replace(/\/+$/, "");
})();

// =========================
// AXIOS CLIENT
// =========================
export const apiClient = axios.create({
  baseURL: API_ORIGIN,
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
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
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
// RESPONSE NORMALIZER
// =========================
export function unwrapApiResponse<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as any).data !== undefined
  ) {
    return (payload as any).data;
  }

  return payload as T;
}

// =========================
// ERROR HELPER
// =========================
export function getApiMessage(
  error: unknown,
  fallback = "Request failed"
): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) return error.message;

  return fallback;
}