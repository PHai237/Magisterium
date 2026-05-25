import { DEFAULT_USER_ID } from "../../config/env";

const USER_SCOPE_KEY = "magisterium:user-id";

export function readStoredUserId(): string {
  return window.localStorage.getItem(USER_SCOPE_KEY) || DEFAULT_USER_ID;
}

export function writeStoredUserId(userId: string): void {
  window.localStorage.setItem(USER_SCOPE_KEY, userId.trim());
}
