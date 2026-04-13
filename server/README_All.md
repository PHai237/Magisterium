# Project Roadmap

## 1. Project Vision
A web-based anime MMORPG-inspired experience focused on progression, dungeon crawling, character growth, loot, and social interaction.

Main inspirations:
- SAO-style world progression and party feeling
- Danmachi-style dungeon exploration and adventurer growth
- Isekai / reincarnation / farming progression systems

The goal is not to build a full MMO at first, but to create a fun and expandable web game prototype with strong RPG vibes.

---

## 2. Core Design Direction
This project will prioritize:
- fast iteration
- fun gameplay loop
- anime MMORPG vibe
- scalable architecture for future expansion

Initial rule:
Build the smallest playable core first, then expand gradually.

---

## 3. MVP Goal
The first playable version should support this loop:

Create Character -> Enter Dungeon -> Fight Monster -> Gain EXP / Loot -> Level Up -> Repeat

If this loop feels satisfying, the project is already successful as an MVP.

---

## 4. Development Phases

### Phase 0 - Foundation
- [ ] Define project name and visual tone
- [ ] Define world concept and basic lore
- [ ] Choose starter classes
- [ ] Define core stats:
  - HP
  - MP
  - ATK
  - DEF
  - SPD
  - EXP
  - Level
- [ ] Define first monsters
- [ ] Define first dungeon/floor
- [ ] Define item rarity system

Deliverable:
- Clear design notes for the first playable build

---

### Phase 1 - Character Creation
- [ ] Create character screen
- [ ] Input character name
- [ ] Select starter class
- [ ] Generate base stats
- [ ] Save selected character locally or in database
- [ ] Create character summary page

Deliverable:
- A player can create a character and enter the game world

---

### Phase 2 - Core Gameplay Loop
- [ ] Create dungeon entry page
- [ ] Add random encounter system
- [ ] Implement simple turn-based battle logic
- [ ] Show battle log
- [ ] Add win / lose state
- [ ] Reward EXP after battle
- [ ] Add level up logic
- [ ] Restore or reset basic status after battle if needed

Deliverable:
- First playable combat loop

---

### Phase 3 - Progression System
- [ ] Add stat growth on level up
- [ ] Add class-based progression difference
- [ ] Add simple skill system
- [ ] Add skill unlock milestones
- [ ] Add gold / currency
- [ ] Add drop table for monsters

Deliverable:
- Character growth becomes visible and rewarding

---

### Phase 4 - Inventory and Equipment
- [ ] Inventory page
- [ ] Item list and item detail
- [ ] Equipment slots:
  - Weapon
  - Armor
  - Accessory
- [ ] Equip / unequip actions
- [ ] Update stats after equipping items
- [ ] Loot drop after dungeon runs

Deliverable:
- Player can farm, collect, and improve build

---

### Phase 5 - Quest System
- [ ] Add beginner quests
- [ ] Add kill quests
- [ ] Add collection quests
- [ ] Add rewards:
  - EXP
  - Gold
  - Equipment
- [ ] Quest status:
  - Available
  - Active
  - Completed

Deliverable:
- Players have direction instead of only grinding

---

### Phase 6 - World and Content Expansion
- [ ] Add more dungeon floors
- [ ] Add stronger monsters and bosses
- [ ] Add elite enemies
- [ ] Add world map or floor selection
- [ ] Add progression gates by level or quest
- [ ] Add more classes or advanced jobs

Deliverable:
- The game starts feeling like a real progression RPG

---

### Phase 7 - Social Features
- [ ] Global chat
- [ ] Guild chat
- [ ] Friend list
- [ ] Party system (basic)
- [ ] Simple online presence
- [ ] Basic notification system

Deliverable:
- Stronger MMORPG / community vibe

---

### Phase 8 - Account and Persistence
- [ ] Register / login
- [ ] Character save/load
- [ ] Store progression in database
- [ ] Session or token authentication
- [ ] Multiple characters per account

Deliverable:
- Stable long-term player data

---

### Phase 9 - Polish
- [ ] Improve UI consistency
- [ ] Add anime-style status panels
- [ ] Add sound effect hooks if needed
- [ ] Improve battle feedback
- [ ] Improve item rarity visuals
- [ ] Add loading states and transitions
- [ ] Fix balancing issues

Deliverable:
- A more complete and enjoyable web game experience

---

## 5. Architecture Plan

### Frontend
- ReactJS
- Component-based UI
- Pages:
  - Landing
  - Character Creation
  - Character Status
  - Dungeon
  - Inventory
  - Quest Log
  - Shop
  - Chat / Guild

### Backend
- NestJS
- Modular architecture
- Initial modules:
  - Character
  - Battle
  - Inventory
  - Item
  - Quest
  - Dungeon
  - Chat
  - Auth

### Database
- PostgreSQL

---

## 6. Build Priority
Priority order:

1. Character Creation
2. Character Status
3. Dungeon Battle
4. EXP / Level Up
5. Inventory / Equipment
6. Quest System
7. Save / Load
8. Chat / Social
9. Auth System

Important note:
Auth is not the first priority.
The first priority is to make the gameplay loop fun.

---

## 7. Project Philosophy
This project is built around one idea:

Make a small but satisfying anime MMORPG progression loop first.
Then expand it into a richer web RPG system over time.