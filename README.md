# Magisterium

Magisterium is a text-based anime-style RPG web game project.

The project is inspired by anime RPG progression systems, dungeon fantasy, class-based identity, stat-driven character growth, world travel, risk-based exploration, and simple text-based battle loops.

## Current Direction

The project focuses on:

- class-based character identity
- stat-driven progression
- text-based RPG systems
- battle and progression loops
- explorable farming zones
- boss-oriented dungeon content
- future expansion into inventory, consumables, equipment, achievements, travel events, life skills, backend persistence, and social features

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
- dungeon entry is currently a frontend feature
- battle logic is currently a frontend prototype
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
- equipment persistence
- battle result saving
- achievement persistence
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

### Phase 2.1 - Battle Polish

Status: Completed as Prototype

Implemented:

- automatic monster turn after player action
- critical hit chance
- critical damage multiplier
- clearer skill resource feedback
- skill button disabled state when not enough resource
- basic level up system
- class-based stat growth on level up
- EXP threshold system
- continue adventure loop
- reward claim flow
- return to profile flow after battle
- basic utility skill effects
- improved battle log readability
- centralized balance constants

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

Player Action
  -> Monster Auto Action
  -> Repeat Until Win or Lose

Battle Won
  -> Claim Reward
  -> Gain EXP and Gold
  -> Check Level Up
  -> Update Character
  -> Return to Profile
  or
  -> Continue Adventure

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
- LUK: crit rate, drop rate bonus, and future flee scaling

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

This separation keeps the system easier to maintain when combat, equipment, buffs, debuffs, and progression systems are expanded later.

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

The current dungeon system currently includes one beginner dungeon.

Current dungeon:

- Verdant Outskirts

The dungeon currently contains:

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
- automatic monster turn
- skill resource cost checking
- shield damage blocking
- healing
- critical hit chance
- battle log
- win / lose result
- reward application after victory
- level up check after gaining EXP
- partial recovery after defeat
- continue adventure after victory
- basic utility skill effects such as evasion and temporary damage reduction

Current limitations:

- battle balance is still rough
- class identity still needs review
- some utility skills are still prototype-level
- buff / debuff / status effect systems are not fully implemented yet
- inventory and item drops are not implemented yet
- equipment is not implemented yet
- backend validation is not implemented yet
- all save data is still local to the browser

## Current Storage

At the current stage, character data is saved in the browser using localStorage.

This is suitable for early prototyping, personal testing, and small-scale feedback from friends.

Each user currently has their own local saved character in their own browser.

Later, when the project adds inventory, equipment, accounts, shared progression, chat, or multiplayer-like features, the data layer should move to the NestJS backend and PostgreSQL.

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

At the current phase, the deployed version allows each user to create, save, progress, and battle with their own character locally in their browser.

## Roadmap

### Completed

#### Phase 1 - Character Creation

Goal:

Create the first playable character foundation.

Completed:

- character name input
- class selection
- starter gift selection
- base stats
- derived stats
- current state
- passive metadata
- starter skills
- localStorage save

#### Phase 1.1 - Character Profile

Goal:

Display the created character and prepare the transition into dungeon and battle.

Completed:

- load character from localStorage
- display character profile
- display stats, skills, passive, and starter gift
- create new character flow

#### Phase 2 - Dungeon and Basic Battle Loop

Goal:

Create the first playable dungeon-to-battle loop.

Completed:

- monster data
- dungeon data
- dungeon entry screen
- random encounter
- basic battle state
- player action
- monster action
- battle log
- win / lose state
- reward update

#### Phase 2.1 - Battle Polish

Goal:

Improve battle flow and make the prototype feel smoother.

Completed:

- automatic monster turn
- critical hit logic
- better resource feedback
- basic level up
- continue adventure loop
- utility skill prototype effects
- improved battle log

### Current Focus

#### Phase 2.2 - Game Logic Review

Goal:

Review and adjust the current game rules before adding more systems.

Planned work:

- review stat balance
- review damage formula
- review defense formula
- review crit formula
- review class identity
- review starter skills
- review passive direction
- review battle pacing
- review post-battle recovery
- review EXP and level up pacing
- adjust monster stats
- adjust dungeon rewards
- review flee direction using LUK
- review long-term currency and economy direction

#### Phase 2.3 - UI / UX Rework

Goal:

Improve the main player-facing screens before expanding the game.

Planned work:

- improve Character Profile UI
- improve Battle Page UI
- improve Dungeon Entry UI
- improve Character Creation UI
- make the layout more game-like
- improve responsive behavior
- improve battle log readability
- improve action button clarity
- prepare the UI for future animation support

### Next

#### Phase 2.4 - Recovery / Place Systems

Goal:

Add non-combat recovery and place-based progression flow.

Planned work:

- town / place structure
- return to town flow
- tavern rest
- HP / MP recovery at a place
- possible rest cost
- support for future healing animation / value animation
- prepare non-combat loop between battles

#### Phase 2.5 - Death, Recovery, and Item Retrieval System

Goal:

Turn death into a meaningful risk loop instead of a simple reset.

Planned work:

- hospital as a fixed respawn point
- partial recovery after respawn
- item loss grouping after death
- NPC retrieval system
- monster looter retrieval system
- permanent item loss chance
- ransom / reclaim cost
- future insurance system
- connect death flow to economy and zone risk

Planned item loss groups:

- Group 1: Retrieved by NPC
- Group 2: Retrieved by monsters
- Group 3: Permanently lost

Planned balance directions:

- equipped gear should have lower drop chance than inventory items
- ransom cost should scale with item value and player level
- town services such as hospital and lost-and-found should become important recovery locations

#### Phase 3 - Zone / Farming System

Goal:

Move regular mob farming into explorable zones instead of boss-style dungeons.

Planned work:

- explorable zones / areas
- farm mobs in different areas
- deeper area progression
- repeated grinding loop
- zone-based encounter design
- prepare area progression before dungeon boss content

#### Phase 3.1 - Travel / Road Event System

Goal:

Add events during travel and movement between areas.

Planned work:

- road events during movement
- positive events
- risky events
- merchants, robbers, accident events, and help events
- future life skill integration
- event frequency setting
- low / normal / high encounter mode

#### Phase 3.2 - Inventory and Consumables

Goal:

Add the first inventory foundation and consumable support.

Planned work:

- inventory screen
- consumable items
- healing potion
- MP potion
- reward drops from battle
- use item action
- reward preview after battle

#### Phase 3.3 - Currency System

Goal:

Expand the economy into multiple coin tiers.

Planned work:

- Bronze Coin
- Silver Coin
- Gold Coin
- coin conversion rules
- economy formatting in UI
- future shop / tavern / repair / ransom integration

Planned currency rule:

- 100 Bronze = 1 Silver
- 100 Silver = 1 Gold

#### Phase 4 - Equipment System

Goal:

Allow character builds to grow through gear.

Planned work:

- weapon slots
- armor slots
- accessory slots
- equip / unequip logic
- equipment stat bonuses
- derived stat recalculation
- weapon scaling direction
- future hybrid build support

#### Phase 4.1 - Weapon Mastery and Durability

Goal:

Expand long-term gear progression.

Planned work:

- weapon mastery
- weapon-type progression
- mastery bonuses
- weapon durability
- repair systems
- future Guide Book integration

#### Phase 4.2 - Flee / Escape System

Goal:

Add escape decisions during battle.

Planned work:

- flee option in combat
- flee success chance based on LUK
- fail / success outcome
- low HP escape loop
- future travel and survival integration

#### Phase 5 - Achievement System

Goal:

Reward long-term milestones with light thematic bonuses.

Planned work:

- achievement tracking
- titles
- small thematic buffs
- monster-specific achievements
- example: slime-related kill achievements and slime damage bonus

#### Phase 5.1 - Skill / Mastery / Life Skill Expansion

Goal:

Expand non-basic progression systems.

Planned work:

- skill unlock by level
- skill upgrade
- class mastery
- weapon mastery expansion
- life skills
- event interaction with life skills
- passive upgrades
- build specialization

#### Phase 6 - Key-Gated Boss Dungeon System

Goal:

Redefine dungeons as boss-focused milestone content.

Planned work:

- dungeons require keys or access conditions
- dungeon as boss challenge content
- non-farming dungeon structure
- milestone reward direction
- progression gates
- boss preparation loop

#### Phase 7 - Quest and Progression Structure

Goal:

Add longer-term RPG structure around the world.

Planned work:

- quest data
- beginner quests
- kill quests
- collection quests
- dungeon clear progress
- unlock new zones and new boss dungeons
- simple story progression

#### Phase 8 - Backend Persistence Foundation

Goal:

Move stable gameplay data from localStorage to backend persistence.

Planned work:

- NestJS API design
- PostgreSQL setup
- guest save system
- character persistence
- inventory persistence
- equipment persistence
- progression persistence
- battle result persistence
- achievement persistence
- currency persistence
- frontend API integration
- replace localStorage save/load with backend save/load

#### Phase 9 - Account / Social Features

Goal:

Prepare for online RPG-style systems.

Planned work:

- account system
- guest-to-account migration
- chat
- guild
- party
- shared progression features
- server-side validation
- anti-cheat direction

## World Structure Direction

The world is planned to evolve into three main layers.

### Zones

Used for:

- regular mob farming
- repeated grinding
- travel events
- risk-based exploration

### Dungeons

Used for:

- key-gated boss content
- milestone encounters
- progression gates
- major challenge content

### Places / Town Structures

Used for:

- recovery
- tavern rest
- hospital respawn
- reclaiming lost items
- future repair and economy services

## Death and Recovery Direction

Death is planned to become part of the gameplay loop, not just a simple reset.

Planned death loop:

```text
Death
  -> Respawn at Hospital
  -> Recover partial HP
  -> Review lost items
  -> Decide between paying ransom or recovering items manually
  -> Return to exploration
```

Planned retrieval categories:

- items recovered by NPC
- items stolen by monsters
- items permanently lost

This direction is intended to make:

- towns more meaningful
- money more valuable
- death more memorable
- risk and preparation more important

## Backend Direction

Backend will not be deeply implemented immediately.

The current plan is to finish the core frontend gameplay prototype first, including:

- battle logic review
- UI rework
- recovery / place systems
- death and retrieval loop
- zone farming
- travel events
- inventory
- consumables
- currency
- equipment
- weapon mastery
- achievements
- key-gated boss dungeons
- quest and progression structure

After the core gameplay structure feels stable, the project will return to backend development.

When backend development starts, it should be rebuilt step-by-step from the foundation so the code remains understandable.

Backend migration direction:

```text
Frontend localStorage prototype
  -> Stable data model
  -> NestJS API
  -> PostgreSQL schema
  -> Guest save system
  -> Frontend API integration
  -> Replace localStorage gradually
```

This approach keeps the early game flexible while still preparing for long-term backend persistence.