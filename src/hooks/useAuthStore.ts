import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loginRequest, fetchMe } from "@/api/auth";
import {
  clearStoredSession,
  getApiMessage,
  getStoredToken,
  setStoredToken,
} from "@/api/client";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  hydrateUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: getStoredToken(),
      isLoading: false,
      error: null,
      isAuthenticated: !!getStoredToken(),

      // =========================
      // LOGIN (FIXED)
      // =========================
      login: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          // 🔥 FIX: backend expects "login", not "email"
          const result = await loginRequest({
            login: email.trim(),
            password,
          });

          const token = result.token;

          setStoredToken(token);

          set({
            user: result.user ?? null,
            token,
            isLoading: false,
            error: null,
            isAuthenticated: true,
          });

          if (!result.user) {
            try {
              const me = await fetchMe();
              set({ user: me });
            } catch {}
          }

          return true;
        } catch (error) {
          clearStoredSession();

          set({
            user: null,
            token: null,
            isLoading: false,
            error: getApiMessage(error, "Login failed"),
            isAuthenticated: false,
          });

          return false;
        }
      },

      // =========================
      // HYDRATE SESSION
      // =========================
      hydrateUser: async () => {
        const token = getStoredToken();

        if (!token) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          return;
        }

        set({ isLoading: true });

        try {
          const me = await fetchMe();

          set({
            user: me,
            token,
            isLoading: false,
            error: null,
            isAuthenticated: true,
          });
        } catch (error) {
          clearStoredSession();

          set({
            user: null,
            token: null,
            isLoading: false,
            error: getApiMessage(error, "Session expired"),
            isAuthenticated: false,
          });
        }
      },

      // =========================
      // LOGOUT
      // =========================
      logout: () => {
        clearStoredSession();

        set({
          user: null,
          token: null,
          isLoading: false,
          error: null,
          isAuthenticated: false,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "fleet-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);