import { apiClient, unwrapApiResponse } from "@/api/client";
import { normalizeAuthUser } from "@/api/normalizers";
import type {
  ApiEnvelope,
  AuthUser,
  LoginPayload,
  LoginResponseData,
} from "@/types/auth";

type LoginApiResponse = ApiEnvelope<LoginResponseData> | LoginResponseData;

// =========================
// LOGIN
// =========================
export async function loginRequest(
  payload: LoginPayload
): Promise<LoginResponseData> {
  const response = await apiClient.post<LoginApiResponse>(
    "/auth/login",
    payload
  );

  // unwrap safely (handles both ApiEnvelope and raw response)
  const raw = unwrapApiResponse<any>(response.data);

  // backend wraps actual payload inside "data"
  const data = raw?.data ?? raw;

  // safety checks to avoid silent crashes
  if (!data?.token || !data?.user) {
    throw new Error("Invalid login response format");
  }

  return {
    token: data.token,
    user: normalizeAuthUser(data.user),
  };
}

// =========================
// GET CURRENT USER
// =========================
export async function fetchMe(): Promise<AuthUser> {
  const response = await apiClient.get<ApiEnvelope<AuthUser> | AuthUser>(
    "/auth/me"
  );

  const raw = unwrapApiResponse<any>(response.data);
  const data = raw?.data ?? raw;

  if (!data) {
    throw new Error("Invalid user response format");
  }

  return normalizeAuthUser(data) as AuthUser;
}