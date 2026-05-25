export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "/api";

export const DEFAULT_USER_ID =
  (import.meta.env.VITE_DEFAULT_USER_ID as string | undefined) || "user_1";
