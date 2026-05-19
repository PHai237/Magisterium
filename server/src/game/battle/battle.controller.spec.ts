import { BadRequestException } from '@nestjs/common';

import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';

import type { BattleEngineResult } from './battle.engine';

import type {
  BattleActionResult,
  BattleActorState,
  BattleState,
} from './battle.types';

import { CharacterService } from '../../character/character.service';

import type {
  BaseStats,
  CharacterSnapshot,
  DerivedStats,
} from '../character/character.types';

const MOCK_BASE_STATS: BaseStats = {
  STR: 10,
  DEX: 3,
  CON: 6,
  INT: 1,
  WIS: 2,
  LUK: 2,
};

const MOCK_DERIVED_STATS: DerivedStats = {
  maxHp: 50,
  maxMp: 25,
  maxStamina: 119,

  pAtk: 21.5,
  mAtk: 7,
  healingPotency: 8.5,

  pDef: 5,
  mDef: 1.2,

  actionSpeed: 13,
  accuracy: 91.9,
  evasionRate: 1.4,

  critRate: 2.3,
  critDamageBonus: 55,

  fleeRate: 7.1,

  statusResist: 1.4,
  spiritualPotency: 2,

  mpRegen: 1,
  staminaRegen: 7,

  secondChanceRate: 0.4,
  procRate: 1,
};

function createMockCharacter(
  overrides: Partial<CharacterSnapshot> = {},
): CharacterSnapshot {
  const now = new Date().toISOString();

  return {
    id: 'character_1',
    version: 1,

    userId: 'user_1',

    name: 'Magica',
    originId: 'mercenary',

    progression: {
      level: 1,
      exp: 0,
      milestoneIds: [],
    },

    moneyBronze: 10,

    stats: {
      STR: {
        currentValue: 10,
        fragmentCount: 0,
        accumulatedBonus: 0,
      },
      DEX: {
        currentValue: 3,
        fragmentCount: 0,
        accumulatedBonus: 0,
      },
      CON: {
        currentValue: 6,
        fragmentCount: 0,
        accumulatedBonus: 0,
      },
      INT: {
        currentValue: 1,
        fragmentCount: 0,
        accumulatedBonus: 0,
      },
      WIS: {
        currentValue: 2,
        fragmentCount: 0,
        accumulatedBonus: 0,
      },
      LUK: {
        currentValue: 2,
        fragmentCount: 0,
        accumulatedBonus: 0,
      },
    },

    currentState: {
      hp: 50,
      mp: 25,
      stamina: 119,
    },

    passiveIds: [],

    learnedSkillIds: ['heavy_strike'],
    equippedSkillIds: ['heavy_strike'],

    starterKitId: 'novice_adventurer_kit',

    inventoryItemIds: [
      'rusty_sword',
      'stamina_bread',
      'minor_hp_potion',
      'minor_mp_potion',
      'one_night_inn_voucher',
    ],
    equippedItemIds: ['rusty_sword'],

    fatigue: 0,
    lastRestAt: now,

    createdAt: now,
    updatedAt: now,

    baseStats: MOCK_BASE_STATS,
    derivedStats: MOCK_DERIVED_STATS,

    ...overrides,
  };
}

function createMockBattleActorState(
  overrides: Partial<BattleActorState> = {},
): BattleActorState {
  return {
    actorId: 'character_1',
    actorType: 'character',

    baseStats: MOCK_BASE_STATS,
    derivedStats: MOCK_DERIVED_STATS,
    resistances: {},

    hp: 50,
    mp: 25,
    stamina: 119,

    shield: 0,
    isExhausted: false,

    activeStatusEffects: [],
    activeModifiers: [],

    procCountThisTurn: 0,

    ...overrides,
  };
}

function createMockBattleState(
  overrides: Partial<BattleState> = {},
): BattleState {
  const now = new Date().toISOString();

  return {
    battleId: 'battle_1',
    status: 'in_progress',

    roundNumber: 1,
    turnNumber: 1,
    activeActorId: 'character_1',

    actors: {
      character_1: createMockBattleActorState(),
    },
    turnOrder: [],

    randomContext: {
      battleId: 'battle_1',
      seed: 'seed_1',
      rollIndex: 0,
    },

    events: [],

    createdAt: now,
    updatedAt: now,

    ...overrides,
  };
}

function createMockActionResult(
  overrides: Partial<BattleActionResult> = {},
): BattleActionResult {
  const actorState = createMockBattleActorState();

  return {
    phase: 'completed',

    actorState,
    targetStates: [],

    events: [],
    randomRolls: [],

    procContext: {
      actorId: actorState.actorId,
      turnId: 'test_turn',
      currentProcCount: 0,
      maxProcCount: 5,
      sourceProcIds: [],
    },

    ...overrides,
  };
}

function createMockEngineResult(
  battleState = createMockBattleState(),
): BattleEngineResult {
  return {
    battleState,
    actionResult: createMockActionResult(),
  };
}

describe('BattleController', () => {
  let controller: BattleController;

  let battleService: jest.Mocked<
    Pick<
      BattleService,
      | 'createBattleFromCharacter'
      | 'listBattles'
      | 'getBattleOrThrow'
      | 'resolveAction'
      | 'deleteBattle'
    >
  >;

  let characterService: jest.Mocked<Pick<CharacterService, 'findById'>>;

  beforeEach(() => {
    battleService = {
      createBattleFromCharacter: jest.fn(),
      listBattles: jest.fn(),
      getBattleOrThrow: jest.fn(),
      resolveAction: jest.fn(),
      deleteBattle: jest.fn(),
    };

    characterService = {
      findById: jest.fn(),
    };

    controller = new BattleController(
      battleService as unknown as BattleService,
      characterService as unknown as CharacterService,
    );
  });

  it('should create a battle by loading character snapshot from CharacterService', () => {
    const character = createMockCharacter();
    const battle = createMockBattleState();

    characterService.findById.mockReturnValue(character);
    battleService.createBattleFromCharacter.mockReturnValue(battle);

    const result = controller.createBattle({
      battleId: 'battle_1',
      seed: 'seed_1',
      characterId: 'character_1',
      userId: 'user_1',
      monsters: [
        {
          monsterId: 'slime',
          instanceId: 'slime_1',
        },
      ],
      autoStart: true,
      autoResolveMonsterTurns: true,
    });

    expect(characterService.findById).toHaveBeenCalledWith('character_1');

    expect(battleService.createBattleFromCharacter).toHaveBeenCalledWith({
      battleId: 'battle_1',
      seed: 'seed_1',
      character,
      monsters: [
        {
          monsterId: 'slime',
          instanceId: 'slime_1',
        },
      ],
      autoStart: true,
      autoResolveMonsterTurns: true,
    });

    expect(result).toBe(battle);
  });

  it('should reject battle creation when character belongs to another user scope', () => {
    const character = createMockCharacter({
      userId: 'owner_user',
    });

    characterService.findById.mockReturnValue(character);

    expect(() =>
      controller.createBattle({
        battleId: 'battle_1',
        seed: 'seed_1',
        characterId: 'character_1',
        userId: 'different_user',
        monsters: [
          {
            monsterId: 'slime',
            instanceId: 'slime_1',
          },
        ],
      }),
    ).toThrow(BadRequestException);

    expect(characterService.findById).toHaveBeenCalledWith('character_1');
    expect(battleService.createBattleFromCharacter).not.toHaveBeenCalled();
  });

  it('should allow battle creation when dto userId is omitted', () => {
    const character = createMockCharacter({
      userId: 'owner_user',
    });

    const battle = createMockBattleState();

    characterService.findById.mockReturnValue(character);
    battleService.createBattleFromCharacter.mockReturnValue(battle);

    const result = controller.createBattle({
      battleId: 'battle_1',
      seed: 'seed_1',
      characterId: 'character_1',
      monsters: [
        {
          monsterId: 'goblin',
          instanceId: 'goblin_1',
        },
      ],
    });

    expect(result).toBe(battle);

    expect(battleService.createBattleFromCharacter).toHaveBeenCalledWith({
      battleId: 'battle_1',
      seed: 'seed_1',
      character,
      monsters: [
        {
          monsterId: 'goblin',
          instanceId: 'goblin_1',
        },
      ],
      autoStart: undefined,
      autoResolveMonsterTurns: undefined,
    });
  });

  it('should list battles', () => {
    const battle = createMockBattleState();

    battleService.listBattles.mockReturnValue([battle]);

    expect(controller.listBattles()).toEqual([battle]);
    expect(battleService.listBattles).toHaveBeenCalledTimes(1);
  });

  it('should get battle by id', () => {
    const battle = createMockBattleState();

    battleService.getBattleOrThrow.mockReturnValue(battle);

    expect(controller.getBattle('battle_1')).toBe(battle);
    expect(battleService.getBattleOrThrow).toHaveBeenCalledWith('battle_1');
  });

  it('should resolve action with default empty targetIds', () => {
    const engineResult = createMockEngineResult();

    battleService.resolveAction.mockReturnValue(engineResult);

    const result = controller.resolveAction('battle_1', {
      actorId: 'character_1',
      actionType: 'skip_turn',
    });

    expect(battleService.resolveAction).toHaveBeenCalledWith({
      battleId: 'battle_1',
      actorId: 'character_1',
      targetIds: [],
      actionType: 'skip_turn',
      skillId: undefined,
      itemId: undefined,
      autoResolveMonsterTurns: undefined,
    });

    expect(result).toBe(engineResult);
  });

  it('should resolve action with explicit targets and auto monster turn option', () => {
    const engineResult = createMockEngineResult();

    battleService.resolveAction.mockReturnValue(engineResult);

    const result = controller.resolveAction('battle_1', {
      actorId: 'character_1',
      targetIds: ['slime_1'],
      actionType: 'basic_attack',
      autoResolveMonsterTurns: false,
    });

    expect(battleService.resolveAction).toHaveBeenCalledWith({
      battleId: 'battle_1',
      actorId: 'character_1',
      targetIds: ['slime_1'],
      actionType: 'basic_attack',
      skillId: undefined,
      itemId: undefined,
      autoResolveMonsterTurns: false,
    });

    expect(result).toBe(engineResult);
  });

  it('should delete battle by id', () => {
    battleService.deleteBattle.mockReturnValue(true);

    expect(controller.deleteBattle('battle_1')).toEqual({
      deleted: true,
    });

    expect(battleService.deleteBattle).toHaveBeenCalledWith('battle_1');
  });
});
