# Magisterium

Magisterium is a text-based anime-style RPG web game project.

The project is inspired by anime RPG progression systems, dungeon fantasy, class-based identity, and stat-driven character growth.

## Current Direction

The project focuses on:

- class-based character identity
- stat-driven progression
- text-based RPG systems
- character growth and future combat mechanics
- future expansion into equipment, quests, dungeons, guild/chat, and social features

## Tech Stack

- Frontend: ReactJS + TypeScript + Tailwind CSS
- Backend: NestJS
- Language: TypeScript
- Current Storage: localStorage
- Future Storage: PostgreSQL

## Project Structure

```text
Magisterium/
├─ client/   # React frontend
├─ server/   # NestJS backend
├─ docs/     # Game design notes and phase documents
└─ README.md
```

## Current Status

### Phase 1 - Character Creation

Status: Completed

Implemented:

- character name input
- starter class selection
- starter gift selection
- base stats
- derived stats
- current state
- passive metadata
- starter skill metadata
- character preview UI
- localStorage persistence

## Phase 1 Character Creation Flow

```text
Enter Name
  -> Select Class
  -> Apply Class Stat Bonus
  -> Calculate Derived Stats
  -> Select Starter Gift
  -> Create Character Object
  -> Save to localStorage
```

## Core Stats

The current character system uses 5 core stats:

- STR: physical power
- INT: magical power and Max MP
- VIT: Max HP and defense
- DEX: action speed and turn priority
- LUK: crit rate and drop rate bonus

## Character Data Structure

The character system separates data into three main layers:

### Base Stats

Raw character stats:

- STR
- INT
- VIT
- DEX
- LUK

### Derived Stats

Stats calculated from base stats:

- Max HP
- Max MP
- Max Energy
- Defense
- Damage Reduction
- Action Speed
- Crit Rate
- Drop Rate Bonus

### Current State

Current character resources:

- HP
- MP
- Energy
- Shield

This separation keeps the system easier to maintain when combat, equipment, buffs, and debuffs are added later.

## Current Storage

At the current stage, character data is saved in the browser using localStorage.

This is suitable for early prototyping, personal testing, and small-scale feedback from friends.

Later, when the project adds accounts, shared progression, chat, inventory, or multiplayer-like features, the data layer should move to the NestJS backend and PostgreSQL.

## Documentation

More detailed design notes are stored in the `docs/` folder.

Important documents:

- `docs/project-overview.md`
- `docs/character-creation-phase1.md`

## Local Development

### Start Frontend

```bash
cd client
npm install
npm run dev
```

### Start Backend

```bash
cd server
npm install
npm run start:dev
```

## Deployment Plan

The current frontend can be deployed as a static React/Vite application.

Initial deployment target:

- Vercel
- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`

At the current phase, the deployed version allows each user to create and save their own character locally in their browser.

## Next Planned Phase

### Phase 1.1 - Character Profile / Character Summary

Planned features:

- load saved character from localStorage
- display character profile
- show class, level, EXP, and gold
- show base stats and derived stats
- show current HP, MP, Energy, and Shield
- show passive, starter skills, and starter gift
- prepare transition toward dungeon and combat systems

## Long-Term Planned Systems

Future systems may include:

- battle system
- monster system
- dungeon exploration
- inventory
- equipment
- item rarity
- quest system
- skill upgrades
- weapon mastery
- guild/chat/social features
- backend persistence
- PostgreSQL database
- user accounts or guest sessions