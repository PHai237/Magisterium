# Magisterium Client

Clean frontend scaffold for Magisterium Phase 5.

## Setup

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Backend default expected at `http://localhost:3000`.

## Current assumptions

- Frontend sends `x-user-id` on every protected request.
- No real auth yet; `userId` is stored locally as a temporary development user scope.
- UI is not the old demo UI. This scaffold separates:
  - `src/lib/api`: transport layer
  - `src/domain`: shared frontend contracts
  - `src/features`: gameplay-facing screens
  - `src/components`: reusable UI primitives

## Suggested next UI phases

1. Lock UI information architecture with Gemini:
   - character creation
   - character sheet
   - inventory/equipment
   - battle arena
   - reward/result modal
2. Replace placeholder panels with final visuals.
3. Add proper routing when screens are stable.
4. Add generated API types later when backend DTOs stop changing.
