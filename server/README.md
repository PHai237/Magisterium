server/src/
├── app.controller.spec.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
├── main.ts
│
├── character/
│   ├── character.controller.spec.ts
│   ├── character.controller.ts
│   ├── character.module.ts
│   ├── character.service.spec.ts
│   ├── character.service.ts
│   ├── character.validation.ts              # NEW: validate name + user scope helpers
│   └── dto/
│       ├── create-character.dto.ts
│       └── update-character.dto.ts
│
└── game/
    ├── battle/
    │   ├── ai/
    │   │   └── monster-ai.service.ts
    │   │
    │   ├── calculations/
    │   │   ├── battle.calculations.spec.ts
    │   │   └── battle.calculations.ts
    │   │
    │   ├── dto/
    │   │   ├── create-battle.dto.ts
    │   │   └── resolve-battle-action.dto.ts
    │   │
    │   ├── factory/
    │   │   ├── battle.factory.spec.ts
    │   │   └── battle.factory.ts
    │   │
    │   ├── battle.constants.ts
    │   ├── battle.controller.spec.ts
    │   ├── battle.controller.ts
    │   ├── battle.engine.spec.ts
    │   ├── battle.engine.ts
    │   ├── battle.module.ts
    │   ├── battle.service.spec.ts
    │   ├── battle.service.ts
    │   └── battle.types.ts
    │
    ├── character/
    │   ├── character.calculations.ts
    │   ├── character.constants.ts
    │   ├── character.factory.ts
    │   └── character.types.ts
    │
    ├── encounter/
    │   ├── encounter.definitions.ts
    │   ├── encounter.factory.ts
    │   └── encounter.types.ts
    │
    ├── monster/
    │   ├── monster.definitions.ts
    │   ├── monster.factory.spec.ts
    │   ├── monster.factory.ts
    │   └── monster.types.ts
    │
    ├── passive/
    │   └── passive.types.ts
    │
    ├── rune/
    │   └── rune.types.ts
    │
    ├── skill/
    │   └── skill.types.ts
    │
    └── status/
        └── status.types.ts