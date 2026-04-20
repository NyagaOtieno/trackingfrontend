export type UserRole =
  | "admin"
  | "super_admin"
  | "office_admin"
  | "staff"
  | "sacco_user"
  | "corporate_user"
  | "individual_user";

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole | string;

  // frontend-preferred
  fullName?: string;

  // backend fallback variants
  full_name?: string;
  name?: string;
  phone?: string | null;
  status?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponseData {
  token: string;
  user: AuthUser | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}