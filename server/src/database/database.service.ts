import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { Pool } from 'pg';

import type { StoredAuthUser } from '../auth/auth.types';
import type { Character } from '../game/character/character.types';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
  ON auth_sessions(user_id);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_characters_user_id
  ON characters(user_id);

CREATE TABLE IF NOT EXISTS current_characters (
  user_id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

interface AuthUserRow {
  id: string;
  username: string;
  email: string;
  role: StoredAuthUser['role'];
  password_salt: string;
  password_hash: string;
  created_at: Date | string;
}

interface AuthSessionRow {
  token: string;
  user_id: string;
}

interface CharacterRow {
  id: string;
  user_id: string;
  data: Character;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CurrentCharacterRow {
  user_id: string;
  character_id: string;
}

function resolveSslConfig(databaseUrl?: string) {
  const sslMode = process.env.DATABASE_SSL?.trim().toLowerCase();

  if (sslMode === 'false' || sslMode === '0' || sslMode === 'off') {
    return false;
  }

  if (sslMode === 'true' || sslMode === '1' || sslMode === 'on') {
    return {
      rejectUnauthorized: false,
    };
  }

  if (databaseUrl?.includes('sslmode=require')) {
    return {
      rejectUnauthorized: false,
    };
  }

  return undefined;
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool?: Pool;

  private initialized = false;
  private initializationPromise?: Promise<void>;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      this.logger.warn(
        'DATABASE_URL is not set. Falling back to in-memory storage.',
      );

      return;
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: resolveSslConfig(databaseUrl),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  isEnabled(): boolean {
    return Boolean(this.pool);
  }

  async initialize(): Promise<void> {
    if (!this.pool) {
      return;
    }

    if (this.initialized) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = this.pool
        .query(SCHEMA_SQL)
        .then(() => {
          this.initialized = true;
          this.logger.log('Database schema is ready.');
        })
        .catch((error: unknown) => {
          this.initializationPromise = undefined;

          const message =
            error instanceof Error ? error.message : 'Unknown database error.';

          this.logger.error(`Failed to initialize database schema: ${message}`);

          throw error;
        });
    }

    await this.initializationPromise;
  }

  async loadAuthUsers(): Promise<StoredAuthUser[]> {
    if (!this.pool) {
      return [];
    }

    await this.initialize();

    const result = await this.pool.query<AuthUserRow>(
      `
      SELECT
        id,
        username,
        email,
        role,
        password_salt,
        password_hash,
        created_at
      FROM auth_users
      ORDER BY created_at ASC
      `,
    );

    return result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      createdAt: toIsoString(row.created_at),
      passwordSalt: row.password_salt,
      passwordHash: row.password_hash,
    }));
  }

  async loadAuthSessions(): Promise<Array<{ token: string; userId: string }>> {
    if (!this.pool) {
      return [];
    }

    await this.initialize();

    const result = await this.pool.query<AuthSessionRow>(
      `
      SELECT
        token,
        user_id
      FROM auth_sessions
      ORDER BY created_at ASC
      `,
    );

    return result.rows.map((row) => ({
      token: row.token,
      userId: row.user_id,
    }));
  }

  async upsertAuthUser(user: StoredAuthUser): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.initialize();

    await this.pool.query(
      `
      INSERT INTO auth_users (
        id,
        username,
        email,
        role,
        password_salt,
        password_hash,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id)
      DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        password_salt = EXCLUDED.password_salt,
        password_hash = EXCLUDED.password_hash
      `,
      [
        user.id,
        user.username,
        user.email,
        user.role,
        user.passwordSalt,
        user.passwordHash,
        user.createdAt,
      ],
    );
  }

  async upsertAuthSession(token: string, userId: string): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.initialize();

    await this.pool.query(
      `
      INSERT INTO auth_sessions (
        token,
        user_id,
        created_at
      )
      VALUES ($1, $2, NOW())
      ON CONFLICT (token)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        created_at = NOW()
      `,
      [token, userId],
    );
  }

  async deleteAuthSession(token: string): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.initialize();

    await this.pool.query(
      `
      DELETE FROM auth_sessions
      WHERE token = $1
      `,
      [token],
    );
  }

  async clearAuthState(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.initialize();

    await this.pool.query('DELETE FROM auth_sessions');
    await this.pool.query('DELETE FROM auth_users');
  }

  async loadCharacters(): Promise<Character[]> {
    if (!this.pool) {
      return [];
    }

    await this.initialize();

    const result = await this.pool.query<CharacterRow>(
      `
      SELECT
        id,
        user_id,
        data,
        created_at,
        updated_at
      FROM characters
      ORDER BY updated_at ASC
      `,
    );

    return result.rows.map((row) => row.data);
  }

  async loadCurrentCharacters(): Promise<
    Array<{ userId: string; characterId: string }>
  > {
    if (!this.pool) {
      return [];
    }

    await this.initialize();

    const result = await this.pool.query<CurrentCharacterRow>(
      `
      SELECT
        user_id,
        character_id
      FROM current_characters
      `,
    );

    return result.rows.map((row) => ({
      userId: row.user_id,
      characterId: row.character_id,
    }));
  }

  async upsertCharacter(character: Character): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.initialize();

    await this.pool.query(
      `
      INSERT INTO characters (
        id,
        user_id,
        data,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3::jsonb, $4, $5)
      ON CONFLICT (id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        data = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at
      `,
      [
        character.id,
        character.userId,
        JSON.stringify(character),
        character.createdAt,
        character.updatedAt,
      ],
    );
  }

  async deleteCharacter(characterId: string): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.initialize();

    await this.pool.query(
      `
      DELETE FROM current_characters
      WHERE character_id = $1
      `,
      [characterId],
    );

    await this.pool.query(
      `
      DELETE FROM characters
      WHERE id = $1
      `,
      [characterId],
    );
  }

  async setCurrentCharacter(
    userId: string,
    characterId: string,
  ): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.initialize();

    await this.pool.query(
      `
      INSERT INTO current_characters (
        user_id,
        character_id,
        updated_at
      )
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        character_id = EXCLUDED.character_id,
        updated_at = NOW()
      `,
      [userId, characterId],
    );
  }

  async deleteCurrentCharacter(userId: string): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.initialize();

    await this.pool.query(
      `
      DELETE FROM current_characters
      WHERE user_id = $1
      `,
      [userId],
    );
  }

  async clearCharacterState(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.initialize();

    await this.pool.query('DELETE FROM current_characters');
    await this.pool.query('DELETE FROM characters');
  }
}
