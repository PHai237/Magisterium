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
- Current Deployment: Vercel frontend deployment

## Project Structure

```text
Magisterium/
├─ client/   # React frontend
├─ server/   # NestJS backend
├─ docs/     # Game design notes and phase documents
└─ README.md
```

## Architecture Note

The current gameplay prototype is implemented mostly in the `client/` folder.

Reason:

- character creation is currently a frontend feature
- character profile is currently a frontend feature
- current save/load uses browser localStorage
- the deployed Vercel version currently serves the React frontend

The `server/` folder already exists as a NestJS backend foundation, but it is not yet deeply connected to gameplay.

The backend will become important when the project needs:

- real database persistence
- PostgreSQL integration
- accounts or guest sessions
- shared progression
- server-side validation
- inventory persistence
- battle result saving
- chat, guild, or party systems

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
- frontend deployment on Vercel

### Phase 1.1 - Character Profile / Character Summary

Status: Completed

Implemented:

- load saved character from localStorage
- display character profile
- show class, level, EXP, and gold
- show base stats and derived stats
- show current HP, MP, Energy, and Shield
- show passive, starter skills, and starter gift
- create new character flow
- profile flow after character creation

## Current Gameplay Flow

```text
No Saved Character
  -> Character Creation

Create Character
  -> Save to localStorage
  -> Character Profile

Saved Character Exists
  -> Character Profile

Create New Character
  -> Clear current character
  -> Character Creation
```

## Core Stats

The current character system uses 5 core stats:

- STR: physical power
- INT: magical power and Max MP
- VIT: Max HP and defense
- DEX: action speed and turn priority
- LUK: crit rate and drop rate bonus

## Character Data Structure

The character system separates data into three main layers.

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

Each user currently has their own local saved character in their own browser.

Later, when the project adds accounts, shared progression, chat, inventory, or multiplayer-like features, the data layer should move to the NestJS backend and PostgreSQL.

## Documentation

More detailed design notes are stored in the `docs/` folder.

Important documents:

- `docs/project-overview.md`
- `docs/character-creation-phase1.md`
- `docs/character-profile-phase1-1.md`
- `docs/dungeon-battle-phase2.md`

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

## Deployment

The current frontend is deployed as a static React/Vite application on Vercel.

Vercel settings:

- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`

At the current phase, the deployed version allows each user to create and save their own character locally in their browser.

## Next Phase

### Phase 2 - Dungeon and Basic Battle System

Status: Planning

Goal:

Build the first playable text-based battle loop.

Planned features:

- dungeon entry screen
- basic monster data
- random encounter
- turn order based on action speed
- basic attack
- starter skill usage
- battle log
- win / lose result
- simple EXP and gold reward update

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