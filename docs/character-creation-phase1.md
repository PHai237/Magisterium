# Character Creation - Phase 1

## 1. Goal
Phase 1 focuses on building a strong character creation foundation.

This phase does not build full combat yet.
This phase creates a structured character object that already contains:
- identity
- class
- core stats
- derived stats
- passive
- starter skills
- starter gift
- current state

---

## 2. Scope of Phase 1

### Included
- character name input
- class selection
- starter gift selection
- base stat generation
- derived stat calculation
- passive assignment
- starter skill assignment
- localStorage save

### Not included yet
- full combat execution
- passive trigger resolution
- timeline simulation
- target priority system
- loot system
- mastery progression logic
- market / economy logic

---

## 3. Core Stats
The game uses 5 core stats:

- STR: increases physical damage
- INT: increases magical damage and Max MP
- VIT: increases Max HP and Defense
- DEX: determines action priority and will later support agile classes
- LUK: increases Crit Rate and Drop Rate Bonus, but must be capped

---

## 4. Data Separation Rule
Character data must be separated into 3 layers:

### Base Stats
The raw stat values:
- STR
- INT
- VIT
- DEX
- LUK

### Derived Stats
The calculated values:
- maxHp
- maxMp
- defense
- damageReduction
- actionSpeed
- critRate
- dropRateBonus

### Current State
The current combat resource state:
- hp
- mp
- shield
- energy

This separation is required so the system remains maintainable later.

---

## 5. Base Starting Stats
All classes start from the same shared base:

- STR = 5
- INT = 5
- VIT = 5
- DEX = 5
- LUK = 5

Then each class receives class-specific bonus stats.

---

## 6. Starter Classes

### Warrior
Role:
- frontline physical fighter
- high toughness

Stat bonus:
- STR +3
- VIT +2

### Mage
Role:
- magical burst and mana scaling

Stat bonus:
- INT +4
- DEX +1

### Archer
Role:
- ranged tempo and precision

Stat bonus:
- STR +2
- DEX +2
- LUK +1

### Rogue
Role:
- fast opportunist and early-turn pressure

Stat bonus:
- DEX +3
- LUK +2

### Acolyte
Role:
- support-oriented caster with sustain

Stat bonus:
- INT +3
- VIT +1
- LUK +1

---

## 7. Derived Stat Formulas

### Max HP
MaxHP = 50 + (VIT * 10)

### Max MP
MaxMP = 20 + (INT * 5)

### Defense
Defense = VIT * 2

### Damage Reduction
DamageReduction = Defense / (100 + Defense)

This formula is used so Defense remains useful without becoming too broken.

### Action Speed
ActionSpeed = 100 + (DEX * 2)

At the current phase, DEX mainly determines who acts first.

### Crit Rate
CritRate = min(3 + LUK * 0.35, 25)

### Drop Rate Bonus
DropRateBonus = min(LUK * 0.2, 15)

LUK is intentionally capped early to avoid future balance problems.

---

## 8. Class Identity Rule
Each class should contain:
- 1 passive
- 2 starter skills

At Phase 1, passive and skills are stored as metadata only.
They do not need full combat execution yet.

This means each skill should already define:
- name
- description
- damage type
- scaling stat
- cost
- basic tags

---

## 9. Adaptive Scaling Rule
The system must support flexible scaling in the future.

This means:
- a skill defines which stat it scales with
- weapon type does not permanently lock scaling forever

Future examples:
- a magic sword may scale with INT
- a rogue skill may scale with DEX
- an archer skill may scale with STR or DEX

Phase 1 only needs to preserve this direction in the data model.

---

## 10. Starter Gifts
The player chooses 1 starter gift.

Current ideas:
- Stale Bread
- Guide Book
- Small Coin Pouch

Each gift should contain:
- id
- name
- description
- effectType
- effectValue

This is required so the gift system stays expandable later.

---

## 11. Character Creation Flow
The current flow is:

1. Enter character name
2. Select class
3. Apply class stat bonus
4. Calculate derived stats
5. Assign passive
6. Assign starter skills
7. Select starter gift
8. Build final character object
9. Save to localStorage

---

## 12. Implementation Reminder
The first goal is not complexity.
The first goal is clarity.

The code should be written so the creator can understand:
- where raw data is stored
- where formulas are calculated
- where state is managed
- where UI is rendered