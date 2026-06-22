import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';

import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';

import { DatabaseService } from '../database/database.service';

import type {
  AuthResponse,
  StoredAuthUser,
  UserSessionSnapshot,
} from './auth.types';

const TOKEN_BYTES = 32;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_HASH_BYTES = 64;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  private readonly usersById = new Map<string, StoredAuthUser>();
  private readonly userIdsByUsername = new Map<string, string>();
  private readonly userIdsByEmail = new Map<string, string>();
  private readonly userIdsByToken = new Map<string, string>();
  private readonly pendingPersistence = new Set<Promise<void>>();
  private persistenceChain: Promise<void> = Promise.resolve();

  constructor(
    @Optional()
    private readonly databaseService?: DatabaseService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.hydrateAuthStateFromDatabase();
  }

  register(dto: RegisterAuthDto): AuthResponse {
    const usernameKey = this.normalizeUsernameKey(dto.username);
    const emailKey = this.normalizeEmailKey(dto.email);

    if (this.userIdsByUsername.has(usernameKey)) {
      throw new BadRequestException('Username is already taken.');
    }

    if (this.userIdsByEmail.has(emailKey)) {
      throw new BadRequestException('Email is already registered.');
    }

    const now = new Date().toISOString();
    const passwordSalt = this.createPasswordSalt();

    const user: StoredAuthUser = {
      id: this.createUserId(),
      username: dto.username.trim(),
      email: emailKey,
      role: 'player',
      createdAt: now,
      passwordSalt,
      passwordHash: this.hashPassword(dto.password, passwordSalt),
    };

    this.usersById.set(user.id, user);
    this.userIdsByUsername.set(usernameKey, user.id);
    this.userIdsByEmail.set(emailKey, user.id);

    this.persistAuthUser(user);

    return this.createAuthResponse(user);
  }

  login(dto: LoginAuthDto): AuthResponse {
    const user = this.findUserByIdentifier(dto.identifier);

    if (!user || !this.verifyPassword(dto.password, user)) {
      throw new UnauthorizedException('Invalid username/email or password.');
    }

    return this.createAuthResponse(user);
  }

  me(authorizationHeader?: string | string[]): UserSessionSnapshot | null {
    const token = this.extractBearerToken(authorizationHeader);

    if (!token) {
      return null;
    }

    if (this.isSessionTokenExpired(token)) {
      this.userIdsByToken.delete(token);
      this.deleteAuthSession(token);

      return null;
    }

    const userId = this.userIdsByToken.get(token);

    if (!userId) {
      return null;
    }

    const user = this.usersById.get(userId);

    if (!user) {
      this.userIdsByToken.delete(token);
      this.deleteAuthSession(token);

      return null;
    }

    return this.toSessionSnapshot(user);
  }

  logout(authorizationHeader?: string | string[]) {
    const token = this.extractBearerToken(authorizationHeader);

    if (token) {
      this.userIdsByToken.delete(token);
      this.deleteAuthSession(token);
    }

    return {
      success: true,
    };
  }

  clearAuthState(): void {
    this.usersById.clear();
    this.userIdsByUsername.clear();
    this.userIdsByEmail.clear();
    this.userIdsByToken.clear();

    this.persistClearAuthState();
  }

  completePersistence<T>(result: T): T | Promise<T> {
    if (!this.databaseService?.isEnabled()) {
      return result;
    }

    return this.flushPersistence().then(() => result);
  }

  async flushPersistence(): Promise<void> {
    await Promise.all(Array.from(this.pendingPersistence));
  }

  private async hydrateAuthStateFromDatabase(): Promise<void> {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    try {
      await this.databaseService.initialize();

      const users = await this.databaseService.loadAuthUsers();

      this.usersById.clear();
      this.userIdsByUsername.clear();
      this.userIdsByEmail.clear();

      for (const user of users) {
        this.usersById.set(user.id, user);
        this.userIdsByUsername.set(
          this.normalizeUsernameKey(user.username),
          user.id,
        );
        this.userIdsByEmail.set(this.normalizeEmailKey(user.email), user.id);
      }

      const sessions = await this.databaseService.loadAuthSessions();

      this.userIdsByToken.clear();

      for (const session of sessions) {
        if (this.isSessionTokenExpired(session.token)) {
          this.deleteAuthSession(session.token);
          continue;
        }

        if (this.usersById.has(session.userId)) {
          this.userIdsByToken.set(session.token, session.userId);
        }
      }

      await this.flushPersistence();

      this.logger.log(
        `Hydrated ${users.length} auth users and ${sessions.length} sessions from database.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown database error.';

      this.logger.error(`Failed to hydrate auth state: ${message}`);

      throw error;
    }
  }

  private createAuthResponse(user: StoredAuthUser): AuthResponse {
    const token = this.createSessionToken();
    const expiresAt = this.getSessionTokenExpiry(token);

    this.userIdsByToken.set(token, user.id);
    this.persistAuthSession(token, user.id, expiresAt ?? Date.now());

    return {
      user: this.toSessionSnapshot(user),
      token,
    };
  }

  private toSessionSnapshot(user: StoredAuthUser): UserSessionSnapshot {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private findUserByIdentifier(identifier: string): StoredAuthUser | undefined {
    const normalizedIdentifier = identifier.trim();
    const usernameKey = this.normalizeUsernameKey(normalizedIdentifier);
    const emailKey = this.normalizeEmailKey(normalizedIdentifier);

    const userId =
      this.userIdsByUsername.get(usernameKey) ??
      this.userIdsByEmail.get(emailKey);

    if (!userId) {
      return undefined;
    }

    return this.usersById.get(userId);
  }

  private verifyPassword(password: string, user: StoredAuthUser): boolean {
    const candidateHash = this.hashPassword(password, user.passwordSalt);

    const candidateBuffer = Buffer.from(candidateHash, 'hex');
    const storedBuffer = Buffer.from(user.passwordHash, 'hex');

    if (candidateBuffer.length !== storedBuffer.length) {
      return false;
    }

    return timingSafeEqual(candidateBuffer, storedBuffer);
  }

  private hashPassword(password: string, salt: string): string {
    return scryptSync(password, salt, PASSWORD_HASH_BYTES).toString('hex');
  }

  private createPasswordSalt(): string {
    return randomBytes(PASSWORD_SALT_BYTES).toString('hex');
  }

  private createSessionToken(): string {
    const expiresAt = Date.now() + SESSION_TTL_MS;
    return `${randomBytes(TOKEN_BYTES).toString('hex')}.${expiresAt.toString(36)}`;
  }

  private getSessionTokenExpiry(token: string): number | undefined {
    const [, encodedExpiresAt] = token.split('.');

    if (!encodedExpiresAt) {
      return undefined;
    }

    const expiresAt = Number.parseInt(encodedExpiresAt, 36);

    return Number.isFinite(expiresAt) ? expiresAt : undefined;
  }

  private isSessionTokenExpired(token: string): boolean {
    const expiresAt = this.getSessionTokenExpiry(token);

    if (!expiresAt) {
      return true;
    }

    return expiresAt <= Date.now();
  }

  private createUserId(): string {
    return `user_${randomUUID()}`;
  }

  private normalizeUsernameKey(username: string): string {
    return username.trim().toLowerCase();
  }

  private normalizeEmailKey(email: string): string {
    return email.trim().toLowerCase();
  }

  private extractBearerToken(
    authorizationHeader?: string | string[],
  ): string | undefined {
    const rawHeader = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;

    if (!rawHeader) {
      return undefined;
    }

    const [scheme, token] = rawHeader.trim().split(/\s+/u);

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }

    return token;
  }

  private persistAuthUser(user: StoredAuthUser): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    this.trackPersistence(async () => {
      try {
        await this.databaseService!.upsertAuthUser(user);
      } catch (error) {
        this.usersById.delete(user.id);
        this.userIdsByUsername.delete(this.normalizeUsernameKey(user.username));
        this.userIdsByEmail.delete(this.normalizeEmailKey(user.email));
        for (const [token, userId] of this.userIdsByToken.entries()) {
          if (userId === user.id) this.userIdsByToken.delete(token);
        }
        throw error;
      }
    }, `persist auth user ${user.id}`);
  }

  private persistAuthSession(
    token: string,
    userId: string,
    expiresAt: number,
  ): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    this.trackPersistence(async () => {
      try {
        await this.databaseService!.upsertAuthSession(
          token,
          userId,
          new Date(expiresAt).toISOString(),
        );
      } catch (error) {
        this.userIdsByToken.delete(token);
        throw error;
      }
    }, `persist auth session for user ${userId}`);
  }

  private deleteAuthSession(token: string): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    this.trackPersistence(
      () => this.databaseService!.deleteAuthSession(token),
      'delete auth session',
    );
  }

  private persistClearAuthState(): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    this.trackPersistence(
      () => this.databaseService!.clearAuthState(),
      'clear auth state',
    );
  }

  private trackPersistence(
    persistenceOperation: () => Promise<void>,
    operationLabel: string,
  ): void {
    const trackedPromise: Promise<void> = this.persistenceChain
      .then(persistenceOperation)
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown database error.';
        this.logger.error(`Failed to ${operationLabel}: ${message}`);
        throw error;
      })
      .finally(() => {
        this.pendingPersistence.delete(trackedPromise);
      });
    this.persistenceChain = trackedPromise;
    this.pendingPersistence.add(trackedPromise);
  }
}
