export interface DatabaseMigration {
  id: string;
  sql: string;
}

export const DATABASE_MIGRATIONS: readonly DatabaseMigration[] = [
  {
    id: '001_initial_schema',
    sql: `
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
    `,
  },
  {
    id: '002_session_expiry',
    sql: `
      ALTER TABLE auth_sessions
        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

      UPDATE auth_sessions
      SET expires_at = created_at + INTERVAL '7 days'
      WHERE expires_at IS NULL;

      ALTER TABLE auth_sessions
        ALTER COLUMN expires_at SET NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
        ON auth_sessions(expires_at);
    `,
  },
  {
    id: '003_character_integrity_and_version',
    sql: `
      ALTER TABLE characters
        ADD COLUMN IF NOT EXISTS version INTEGER;

      UPDATE characters
      SET version = GREATEST(
        1,
        CASE
          WHEN COALESCE(data->>'version', '') ~ '^[0-9]+$'
            THEN (data->>'version')::INTEGER
          ELSE 1
        END
      )
      WHERE version IS NULL;

      ALTER TABLE characters
        ALTER COLUMN version SET NOT NULL,
        ALTER COLUMN version SET DEFAULT 1;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'characters_user_id_fkey'
        ) THEN
          ALTER TABLE characters
            ADD CONSTRAINT characters_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES auth_users(id)
            ON DELETE CASCADE
            NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'current_characters_user_id_fkey'
        ) THEN
          ALTER TABLE current_characters
            ADD CONSTRAINT current_characters_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES auth_users(id)
            ON DELETE CASCADE
            NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'current_characters_character_id_fkey'
        ) THEN
          ALTER TABLE current_characters
            ADD CONSTRAINT current_characters_character_id_fkey
            FOREIGN KEY (character_id)
            REFERENCES characters(id)
            ON DELETE CASCADE
            NOT VALID;
        END IF;
      END
      $$;
    `,
  },
  {
    id: '004_battle_persistence',
    sql: `
      CREATE TABLE IF NOT EXISTS battles (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT,
        character_id TEXT,
        status TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_battles_owner_user_id
        ON battles(owner_user_id);

      CREATE INDEX IF NOT EXISTS idx_battles_character_id
        ON battles(character_id);

      CREATE INDEX IF NOT EXISTS idx_battles_expires_at
        ON battles(expires_at);
    `,
  },
];
