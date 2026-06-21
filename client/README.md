# Magisterium Client

The active Magisterium frontend is a React + TypeScript application built with
Vite and plain CSS.

## Responsibilities

- Authentication screens and local bearer-token storage.
- Character creation, selection, and deletion.
- Town/world navigation.
- Exploration, battle presentation, inventory, market, inn, sanctuary, and
  smith interfaces.
- Rendering server-owned character and battle state.

The backend remains authoritative for gameplay mutations. Protected requests
send:

- `Authorization: Bearer <token>`
- `x-user-id: <authenticated user id>`

## Run locally

```bash
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:3000` during local development.

For deployment, set:

```text
VITE_API_BASE_URL=https://your-backend.example.com/api
```

## Commands

```bash
npm run dev
npm run typecheck
npm run build
npm run preview
```

## Structure

```text
src/
  app/          application/session flow
  components/   shared UI and branding
  config/       environment configuration
  domain/       frontend API contracts and display constants
  features/     auth and gameplay screens
  lib/          API transport, formatting, and local token storage
  styles/       global/shared styles
```

Navigation currently uses React state rather than React Router.

## Current limitations

- Frontend contracts are manually maintained alongside backend contracts.
- There are no frontend automated tests yet.
- `BattlePanel`, `InventoryOverlay`, and several CSS files are large and should
  be split gradually by feature boundary.
- The Grand Archive is a placeholder.
