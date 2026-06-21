# Magisterium Server

The Magisterium backend is a NestJS 11 REST API. It owns authentication,
character mutations, exploration outcomes, battle rules, rewards, inventory,
equipment, the market, sanctuary progression, and smith crafting.

## Run locally

```bash
npm install
npm run start:dev
```

The API defaults to `http://localhost:3000/api`.

Environment variables:

```text
DATABASE_URL=postgresql://...
DATABASE_SSL=true
CORS_ORIGINS=http://localhost:5173
PORT=3000
```

If `DATABASE_URL` is absent, persistence falls back to process-local memory.

## Modules

```text
src/
  auth/          registration, login, bearer sessions, user-scope middleware
  character/     character CRUD and character-owned mutations
  database/      PostgreSQL pool, schema initialization, persistence methods
  game/
    battle/      deterministic turn engine, actions, targeting, rewards
    character/   character model, origins, stats, derived calculations
    encounter/   encounter definitions and factories
    exploration/ zone search outcomes and cooldown
    inventory/   stacks, equipment, consumables
    item/        item definitions and registry
    market/      rotating vendor stock and buy/sell operations
    monster/     monster definitions and factories
    reward/      deterministic loot calculation
    sanctuary/   stat runes and rank progression
    skill/       skill definitions and registry
    smith/       equipment recipes and crafting
```

## Authentication

Public routes:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Gameplay routes require both a valid bearer token and an `x-user-id` header
matching that authenticated session.

## Persistence model

PostgreSQL stores users, sessions, characters, and selected-character records.
Character data is stored as a JSONB `Character` object; derived snapshots are
calculated at runtime.

Active battles, exploration cooldowns, and market purchase counters are
currently process-local and reset on backend restart.

## Commands

```bash
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e
```

## Known limitations

- Active battles are not persisted.
- Database writes from gameplay services are not yet fully awaited or
  transactional.
- Character `version` is not yet used for database optimistic locking.
- Schema evolution still relies on startup SQL rather than versioned
  migrations.
- Status effects, passives, proc effects, and skill-rune attachment are
  incomplete.
