import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { Pool, type PoolClient } from 'pg';

import { DATABASE_MIGRATIONS } from './database.migrations';

import type { StoredAuthUser } from '../auth/auth.types';
import type { BattleState } from '../game/battle/battle.types';
import type { Character } from '../game/character/character.types';

const BATTLE_RETENTION_MS = 1000 * 60 * 60 * 24;
const DATABASE_CLEANUP_INTERVAL_MS = 1000 * 60 * 60;

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
  expires_at: Date | string;
}

interface CharacterRow {
  data: Character;
  version: number;
}

interface CurrentCharacterRow {
  user_id: string;
  character_id: string;
}

interface BattleRow {
  data: BattleState;
}

function resolveSslConfig(databaseUrl?: string) {
  const sslMode = process.env.DATABASE_SSL?.trim().toLowerCase();

  if (sslMode === 'false' || sslMode === '0' || sslMode === 'off') {
    return false;
  }

  if (sslMode === 'true' || sslMode === '1' || sslMode === 'on') {
    return { rejectUnauthorized: false };
  }

  if (databaseUrl?.includes('sslmode=require')) {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool?: Pool;

  private initialized = false;
  private initializationPromise?: Promise<void>;
  private cleanupTimer?: NodeJS.Timeout;

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
    if (this.pool && !this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => {
        void this.runScheduledCleanup();
      }, DATABASE_CLEANUP_INTERVAL_MS);
      this.cleanupTimer.unref();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    await this.pool?.end();
  }

  isEnabled(): boolean {
    return Boolean(this.pool);
  }

  async initialize(): Promise<void> {
    if (!this.pool || this.initialized) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = this.runMigrations()
        .then(async () => {
          await this.cleanupExpiredAuthSessions();
          await this.cleanupExpiredBattles();
          this.initialized = true;
          this.logger.log('Database migrations are up to date.');
        })
        .catch((error: unknown) => {
          this.initializationPromise = undefined;
          const message =
            error instanceof Error ? error.message : 'Unknown database error.';
          this.logger.error(`Failed to initialize database: ${message}`);
          throw error;
        });
    }

    await this.initializationPromise;
  }

  async loadAuthUsers(): Promise<StoredAuthUser[]> {
    if (!this.pool) return [];
    await this.initialize();

    const result = await this.pool.query<AuthUserRow>(`
      SELECT id, username, email, role, password_salt, password_hash, created_at
      FROM auth_users
      ORDER BY created_at ASC
    `);

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

  async loadAuthSessions(): Promise<
    Array<{ token: string; userId: string; expiresAt: string }>
  > {
    if (!this.pool) return [];
    await this.initialize();

    const result = await this.pool.query<AuthSessionRow>(`
      SELECT token, user_id, expires_at
      FROM auth_sessions
      WHERE expires_at > NOW()
      ORDER BY created_at ASC
    `);

    return result.rows.map((row) => ({
      token: row.token,
      userId: row.user_id,
      expiresAt: toIsoString(row.expires_at),
    }));
  }

  async upsertAuthUser(user: StoredAuthUser): Promise<void> {
    if (!this.pool) return;
    await this.initialize();

    await this.pool.query(
      `
      INSERT INTO auth_users (
        id, username, email, role, password_salt, password_hash, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
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

  async upsertAuthSession(
    token: string,
    userId: string,
    expiresAt: string,
  ): Promise<void> {
    if (!this.pool) return;
    await this.initialize();

    await this.pool.query(
      `
      INSERT INTO auth_sessions (token, user_id, created_at, expires_at)
      VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (token) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        created_at = NOW(),
        expires_at = EXCLUDED.expires_at
      `,
      [token, userId, expiresAt],
    );
  }

  async deleteAuthSession(token: string): Promise<void> {
    if (!this.pool) return;
    await this.initialize();
    await this.pool.query('DELETE FROM auth_sessions WHERE token = $1', [
      token,
    ]);
  }

  async cleanupExpiredAuthSessions(): Promise<number> {
    if (!this.pool) return 0;
    const result = await this.pool.query(
      'DELETE FROM auth_sessions WHERE expires_at <= NOW()',
    );
    return result.rowCount ?? 0;
  }

  async clearAuthState(): Promise<void> {
    if (!this.pool) return;
    await this.initialize();
    await this.withTransaction(async (client) => {
      await client.query('DELETE FROM auth_sessions');
      await client.query('DELETE FROM auth_users');
    });
  }

  async loadCharacters(): Promise<Character[]> {
    if (!this.pool) return [];
    await this.initialize();

    const result = await this.pool.query<CharacterRow>(`
      SELECT data, version
      FROM characters
      ORDER BY updated_at ASC
    `);

    return result.rows.map((row) => ({
      ...row.data,
      version: row.version,
    }));
  }

  async loadCharacter(characterId: string): Promise<Character | undefined> {
    if (!this.pool) return undefined;
    await this.initialize();
    const result = await this.pool.query<CharacterRow>(
      `
      SELECT data, version
      FROM characters
      WHERE id = $1
      `,
      [characterId],
    );
    const row = result.rows[0];
    return row
      ? {
          ...row.data,
          version: row.version,
        }
      : undefined;
  }

  async loadCurrentCharacters(): Promise<
    Array<{ userId: string; characterId: string }>
  > {
    if (!this.pool) return [];
    await this.initialize();

    const result = await this.pool.query<CurrentCharacterRow>(`
      SELECT user_id, character_id
      FROM current_characters
    `);

    return result.rows.map((row) => ({
      userId: row.user_id,
      characterId: row.character_id,
    }));
  }

  async saveCharacter(
    character: Character,
    expectedVersion?: number,
  ): Promise<void> {
    if (!this.pool) return;
    await this.initialize();

    if (expectedVersion === undefined) {
      const result = await this.pool.query(
        `
        INSERT INTO characters (
          id, user_id, version, data, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6)
        ON CONFLICT (id) DO NOTHING
        `,
        [
          character.id,
          character.userId,
          character.version,
          JSON.stringify(character),
          character.createdAt,
          character.updatedAt,
        ],
      );
      if ((result.rowCount ?? 0) !== 1) {
        throw new ConflictException(
          `Character already exists: ${character.id}`,
        );
      }
      return;
    }

    const result = await this.pool.query(
      `
      UPDATE characters
      SET
        user_id = $2,
        version = $3,
        data = $4::jsonb,
        updated_at = $5
      WHERE id = $1 AND version = $6
      `,
      [
        character.id,
        character.userId,
        character.version,
        JSON.stringify(character),
        character.updatedAt,
        expectedVersion,
      ],
    );

    if ((result.rowCount ?? 0) !== 1) {
      throw new ConflictException(
        `Character was modified by another request: ${character.id}`,
      );
    }
  }

  async deleteCharacter(characterId: string): Promise<void> {
    if (!this.pool) return;
    await this.initialize();

    await this.withTransaction(async (client) => {
      await client.query(
        'DELETE FROM current_characters WHERE character_id = $1',
        [characterId],
      );
      await client.query('DELETE FROM battles WHERE character_id = $1', [
        characterId,
      ]);
      await client.query('DELETE FROM characters WHERE id = $1', [characterId]);
    });
  }

  async setCurrentCharacter(
    userId: string,
    characterId: string,
  ): Promise<void> {
    if (!this.pool) return;
    await this.initialize();

    await this.pool.query(
      `
      INSERT INTO current_characters (user_id, character_id, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        character_id = EXCLUDED.character_id,
        updated_at = NOW()
      `,
      [userId, characterId],
    );
  }

  async deleteCurrentCharacter(userId: string): Promise<void> {
    if (!this.pool) return;
    await this.initialize();
    await this.pool.query('DELETE FROM current_characters WHERE user_id = $1', [
      userId,
    ]);
  }

  async clearCharacterState(): Promise<void> {
    if (!this.pool) return;
    await this.initialize();
    await this.withTransaction(async (client) => {
      await client.query('DELETE FROM battles');
      await client.query('DELETE FROM current_characters');
      await client.query('DELETE FROM characters');
    });
  }

  async loadBattles(): Promise<BattleState[]> {
    if (!this.pool) return [];
    await this.initialize();
    const result = await this.pool.query<BattleRow>(`
      SELECT data
      FROM battles
      WHERE expires_at > NOW()
      ORDER BY updated_at ASC
    `);
    return result.rows.map((row) => row.data);
  }

  async loadBattle(battleId: string): Promise<BattleState | undefined> {
    if (!this.pool) return undefined;
    await this.initialize();
    const result = await this.pool.query<BattleRow>(
      `
      SELECT data
      FROM battles
      WHERE id = $1 AND expires_at > NOW()
      `,
      [battleId],
    );
    return result.rows[0]?.data;
  }

  async upsertBattle(battle: BattleState): Promise<void> {
    if (!this.pool) return;
    await this.initialize();

    const characterId = Object.values(battle.actors).find(
      (actor) => actor.actorType === 'character',
    )?.actorId;
    const expiresAt = new Date(
      new Date(battle.updatedAt).getTime() + BATTLE_RETENTION_MS,
    ).toISOString();

    await this.pool.query(
      `
      INSERT INTO battles (
        id, owner_user_id, character_id, status, data,
        created_at, updated_at, expires_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        owner_user_id = EXCLUDED.owner_user_id,
        character_id = EXCLUDED.character_id,
        status = EXCLUDED.status,
        data = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at,
        expires_at = EXCLUDED.expires_at
      `,
      [
        battle.battleId,
        battle.ownerUserId ?? null,
        characterId ?? null,
        battle.status,
        JSON.stringify(battle),
        battle.createdAt,
        battle.updatedAt,
        expiresAt,
      ],
    );
  }

  async deleteBattle(battleId: string): Promise<void> {
    if (!this.pool) return;
    await this.initialize();
    await this.pool.query('DELETE FROM battles WHERE id = $1', [battleId]);
  }

  async clearBattles(): Promise<void> {
    if (!this.pool) return;
    await this.initialize();
    await this.pool.query('DELETE FROM battles');
  }

  async cleanupExpiredBattles(): Promise<number> {
    if (!this.pool) return 0;
    const result = await this.pool.query(
      'DELETE FROM battles WHERE expires_at <= NOW()',
    );
    return result.rowCount ?? 0;
  }

  private async runMigrations(): Promise<void> {
    if (!this.pool) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migration of DATABASE_MIGRATIONS) {
      const applied = await this.pool.query<{ id: string }>(
        'SELECT id FROM schema_migrations WHERE id = $1',
        [migration.id],
      );

      if (applied.rowCount) continue;

      await this.withTransaction(async (client) => {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [
          migration.id,
        ]);
      });
      this.logger.log(`Applied database migration ${migration.id}.`);
    }
  }

  private async runScheduledCleanup(): Promise<void> {
    try {
      const [sessionCount, battleCount] = await Promise.all([
        this.cleanupExpiredAuthSessions(),
        this.cleanupExpiredBattles(),
      ]);
      if (sessionCount + battleCount > 0) {
        this.logger.log(
          `Cleaned ${sessionCount} expired sessions and ${battleCount} expired battles.`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown database error.';
      this.logger.error(`Scheduled database cleanup failed: ${message}`);
    }
  }

  private async withTransaction<T>(
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('Database is not enabled.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
