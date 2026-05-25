import { apiGet, apiPost } from "../../lib/api/api-client";

import type {
  AuthResponse,
  UserSessionSnapshot
} from "../../domain/magisterium.types";

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export const authApi = {
  login(payload: LoginPayload) {
    return apiPost<AuthResponse>("/auth/login", payload);
  },

  register(payload: RegisterPayload) {
    return apiPost<AuthResponse>("/auth/register", payload);
  },

  me() {
    return apiGet<UserSessionSnapshot | null>("/auth/me");
  },

  logout() {
    return apiPost<{ success: boolean }>("/auth/logout");
  }
};
