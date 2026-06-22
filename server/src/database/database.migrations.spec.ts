import { DATABASE_MIGRATIONS } from './database.migrations';

describe('DATABASE_MIGRATIONS', () => {
  it('uses stable unique migration identifiers', () => {
    const ids = DATABASE_MIGRATIONS.map((migration) => migration.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      '001_initial_schema',
      '002_session_expiry',
      '003_character_integrity_and_version',
      '004_battle_persistence',
    ]);
  });

  it('defines session expiry, optimistic character versioning, and battles', () => {
    const sql = DATABASE_MIGRATIONS.map((migration) => migration.sql).join(
      '\n',
    );

    expect(sql).toContain('expires_at TIMESTAMPTZ');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS version INTEGER');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS battles');
    expect(sql).toContain('ADD CONSTRAINT');
  });
});
