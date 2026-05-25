export type UserRole = 'player';

export interface UserSessionSnapshot {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  user: UserSessionSnapshot;
  token: string;
}

export interface StoredAuthUser extends UserSessionSnapshot {
  passwordSalt: string;
  passwordHash: string;
}
