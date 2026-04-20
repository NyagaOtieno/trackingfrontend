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

  const data = unwrapApiResponse<LoginResponseData>(response.data);

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

  return normalizeAuthUser(
    unwrapApiResponse<AuthUser>(response.data)
  ) as AuthUser;
}