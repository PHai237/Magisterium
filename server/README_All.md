# Magisterium

Magisterium is a text-based anime-style RPG web game project.

The project is inspired by anime RPG progression systems, dungeon fantasy, class-based identity, stat-driven character growth, and simple text-based battle loops.

## Current Direction

The project focuses on:

- class-based character identity
- stat-driven progression
- text-based RPG systems
- character growth and battle mechanics
- dungeon exploration
- monster encounters
- future expansion into equipment, quests, inventory, guild/chat, and social features

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
├─ client/   # React frontend and current gameplay prototype
├─ server/   # NestJS backend foundation
└─ README.md
```

## Architecture Note

The current gameplay prototype is implemented mostly in the `client/` folder.

Reason:

- character creation is currently a frontend feature
- character profile is currently a frontend feature
- dungeon selection is currently a frontend feature
- basic battle logic is currently a frontend prototype
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
- anti-cheat / server-owned game state

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

### Phase 2 - Dungeon and Basic Battle Loop

Status: Completed as Prototype

Implemented:

- dungeon entry screen
- basic dungeon data
- basic monster data
- random monster encounter
- turn order based on action speed
- player basic attack
- player starter skill usage
- skill resource cost handling
- damage skill handling
- heal skill handling
- shield skill handling
- monster basic attack
- battle log
- victory state
- defeat state
- EXP reward update
- gold reward update
- post-battle character update
- return to profile after battle

## Current Gameplay Flow

```text
No Saved Character
  -> Character Creation

Create Character
  -> Save to localStorage
  -> Character Profile

Saved Character Exists
  -> Character Profile

Start Adventure
  -> Dungeon Entry

Enter Dungeon
  -> Random Monster Encounter
  -> Battle

Battle Won
  -> Gain EXP and Gold
  -> Update Character
  -> Return to Character Profile

Battle Lost
  -> Return with Partial HP
  -> Update Character
  -> Return to Character Profile

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

## Current Starter Classes

The current starter classes are:

- Warrior
- Mage
- Archer
- Rogue
- Healer

Each class currently has:

- class identity
- stat bonus
- passive metadata
- two starter skills

## Current Starter Gifts

The current starter gifts are:

- Stale Bread
- Guide Book
- Small Coin Pouch

Current implemented gift behavior:

- Stale Bread restores bonus HP after battle victory
- Small Coin Pouch gives starting gold during character creation
- Guide Book is stored as metadata for future weapon mastery systems

## Current Monster System

The current monster system includes basic monster data.

Current monsters:

- Training Slime
- Wild Rat
- Lesser Goblin

Each monster currently has:

- id
- name
- description
- level
- rank
- damage type
- stats
- EXP reward
- gold reward
- tags

## Current Dungeon System

The current dungeon system includes one beginner dungeon.

Current dungeon:

- Verdant Outskirts

The dungeon contains:

- name
- description
- recommended level
- difficulty
- possible monster IDs
- entry cost
- tags

## Current Battle System

The current battle system supports a simple text-based battle loop.

Current battle features:

- player vs one monster
- random monster selection from dungeon data
- first actor determined by action speed
- player basic attack
- player skill usage
- monster basic attack
- skill resource cost checking
- shield damage blocking
- healing
- battle log
- win / lose result
- reward application after victory
- partial recovery after defeat

Current limitation:

- monster turn is manually resolved with a button
- crit is not implemented yet
- level up is not implemented yet
- inventory and item drops are not implemented yet
- backend validation is not implemented yet

## Current Storage

At the current stage, character data is saved in the browser using localStorage.

This is suitable for early prototyping, personal testing, and small-scale feedback from friends.

Each user currently has their own local saved character in their own browser.

Later, when the project adds accounts, shared progression, chat, inventory, or multiplayer-like features, the data layer should move to the NestJS backend and PostgreSQL.

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

At the current phase, the deployed version allows each user to create, save, and battle with their own character locally in their browser.

## Next Phase

### Phase 2.1 - Battle Polish

Status: Planned

Goal:

Improve the basic battle loop so combat feels smoother, clearer, and more RPG-like.

Planned features:

- automatic monster turn after player action
- crit chance implementation
- clearer damage type display
- clearer not-enough-resource feedback
- better battle result UI
- continue adventure button
- simple level up system
- basic EXP threshold
- basic post-battle recovery rules
- better battle balance testing

## Future Phase

### Phase 3 - Inventory and Equipment

Planned features:

- item data
- item rarity
- item drops from monsters
- inventory screen
- equipment slots
- weapon / armor stat bonuses
- equipment-based stat recalculation
- basic item reward after battle

## Long-Term Planned Systems

Future systems may include:

- advanced battle system
- monster skills
- dungeon floors
- boss encounters
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