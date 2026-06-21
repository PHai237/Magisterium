# Magisterium

Magisterium is a browser-based medieval-fantasy RPG prototype built around
character growth, exploration, deterministic turn-based combat, loot,
crafting, and rank progression.

## Current architecture

```text
React + TypeScript + Vite frontend
                |
                | HTTP/JSON, Bearer token, x-user-id
                v
NestJS backend on Render
                |
                v
PostgreSQL database on Neon
```

- `client/` is the current React frontend.
- `server/` is the authoritative gameplay API and persistence layer.
- `client_demo_old/` is historical prototype/reference code and is not the
  active client.

The frontend is deployed on Vercel. The backend is deployed on Render and uses
Neon PostgreSQL when `DATABASE_URL` is configured. Without a database URL, the
backend falls back to process-local memory for development.

## Implemented gameplay

- Account registration, login, logout, and seven-day bearer sessions.
- Up to three characters per account.
- Five origins:
  - Scholar
  - Mercenary
  - Wanderer
  - Street Urchin
  - Acolyte
- Six core stats: STR, DEX, CON, INT, WIS, and LUK.
- Derived combat/resource stats calculated by the backend.
- Town and world maps.
- Three exploration zones:
  - Town Outskirts
  - Forest Edge
  - Abandoned Mine
- Nine active monsters and encounters.
- Server-authoritative turn-based combat:
  - basic attacks
  - starter skills
  - consumable items
  - flee and skip-turn actions
  - hit, evasion, critical, defense, resistance, shield, and resource logic
  - deterministic random rolls
  - automatic monster turns
- Loot, Bronze rewards, inventory, consumables, and equipment.
- Inn recovery paid with Bronze or an Inn Pass.
- Market:
  - purchase survival supplies from limited rotating stock
  - sell monster loot
- Smith crafting with seven current equipment recipes.
- Sanctuary progression:
  - refine ten stat fragments into one stat rune
  - imbue runes for permanent stat bonuses
  - rank progression from Novice to Archmagister

## Current game loop

```text
Register or log in
  -> create/select a character
  -> prepare in town
  -> choose an exploration zone
  -> spend Stamina to search
  -> encounter a monster or find a reward
  -> fight
  -> claim loot and Bronze
  -> rest, equip, sell, craft, refine runes, or rank up
  -> explore again
```

Character progression currently centers on stats, equipment, runes, and rank.
Traditional character level/EXP progression is not implemented.

## Persistence

PostgreSQL currently stores:

- users
- auth sessions
- characters as JSONB
- each user's selected character

Auth and character state are hydrated from PostgreSQL when the backend starts.
Active battle state, exploration cooldowns, and current market stock purchases
are process-local and reset when the backend restarts.

## Local development

### Backend

```bash
cd server
npm install
npm run start:dev
```

The API defaults to `http://localhost:3000/api`.

Optional environment variables:

```text
DATABASE_URL=postgresql://...
DATABASE_SSL=true
CORS_ORIGINS=http://localhost:5173
PORT=3000
```

Never commit real environment files or database credentials.

### Frontend

```bash
cd client
npm install
npm run dev
```

Vite defaults to `http://localhost:5173` and proxies `/api` to the local
backend. For a deployed frontend, configure `VITE_API_BASE_URL`.

## Verification

```bash
cd server
npm test -- --runInBand
npm run test:e2e
npm run build

cd ../client
npm run build
```

## Known prototype limitations

- Active battles are not persisted and can be lost on backend restart.
- Important database writes are still initiated asynchronously by services;
  stronger transaction/error handling is planned.
- Character updates do not yet use optimistic concurrency at the database
  level.
- Status effects, passives, proc effects, and skill-rune attachment are
  incomplete scaffolding.
- The Grand Archive is a placeholder.
- Quest chains, NPC dialogue, boss dungeons, and narrative progression are not
  implemented yet.
- Several large service/UI files should be split as their related features are
  expanded.

## Near-term direction

1. Improve persistence reliability and battle recovery.
2. Add database migrations, transactions, and optimistic concurrency.
3. Build one complete content slice:
   quest -> exploration -> crafting -> dungeon boss -> unique reward.
4. Add NPC dialogue and give the Grand Archive its first concrete purpose.
5. Expand status effects, passives, proc effects, and skill runes after the
   first content slice is stable.
