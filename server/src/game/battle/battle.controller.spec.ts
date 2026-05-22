import { BadRequestException } from '@nestjs/common';

import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';

import type { BattleEngineResult } from './battle.engine';

import type {
  BattleActionResult,
  BattleActorState,
  BattleState,
} from './battle.types';

import type {
  AppliedBattleRewardResult,
  BattleRewardSummary,
} from '../reward/reward.types';

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

    skillIds: ['heavy_strike'],

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

function createMockBattleRewardSummary(
  overrides: Partial<BattleRewardSummary> = {},
): BattleRewardSummary {
  return {
    exp: 5,
    moneyBronze: 2,

    items: [
      {
        itemId: 'slime_gel',
        quantity: 1,
      },
    ],

    defeatedMonsters: [
      {
        actorId: 'slime_1',
        monsterId: 'slime',
      },
    ],

    lootRolls: [],

    ...overrides,
  };
}

function createMockAppliedBattleRewardResult(
  character: CharacterSnapshot,
  reward: BattleRewardSummary,
  overrides: Partial<AppliedBattleRewardResult> = {},
): AppliedBattleRewardResult & {
  character: CharacterSnapshot;
} {
  return {
    character: {
      ...character,
      progression: {
        ...character.progression,
        exp: character.progression.exp + reward.exp,
      },
      moneyBronze: character.moneyBronze + reward.moneyBronze,
      inventoryItemIds: [
        ...character.inventoryItemIds,
        ...reward.items.flatMap((item) =>
          Array.from(
            {
              length: item.quantity,
            },
            () => item.itemId,
          ),
        ),
      ],
    },

    reward,

    progression: {
      previousLevel: character.progression.level,
      nextLevel: character.progression.level,

      previousExp: character.progression.exp,
      nextExp: character.progression.exp + reward.exp,

      expGained: reward.exp,

      leveledUp: false,
      levelsGained: 0,
    },

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
      | 'createBattleFromEncounter'
      | 'listBattles'
      | 'getBattleOrThrow'
      | 'resolveAction'
      | 'claimBattleReward'
      | 'deleteBattle'
    >
  >;

  let characterService: jest.Mocked<
    Pick<CharacterService, 'findById' | 'applyBattleReward'>
  >;

  beforeEach(() => {
    battleService = {
      createBattleFromCharacter: jest.fn(),
      createBattleFromEncounter: jest.fn(),
      listBattles: jest.fn(),
      getBattleOrThrow: jest.fn(),
      resolveAction: jest.fn(),
      claimBattleReward: jest.fn(),
      deleteBattle: jest.fn(),
    };

    characterService = {
      findById: jest.fn(),
      applyBattleReward: jest.fn(),
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

  it('should reject battle creation when both encounterId and monsters are provided', () => {
    const character = createMockCharacter();

    characterService.findById.mockReturnValue(character);

    expect(() =>
      controller.createBattle({
        battleId: 'battle_1',
        seed: 'seed_1',
        characterId: 'character_1',
        userId: 'user_1',
        encounterId: 'slime_training',
        monsters: [
          {
            monsterId: 'slime',
            instanceId: 'slime_1',
          },
        ],
      }),
    ).toThrow(BadRequestException);

    expect(characterService.findById).toHaveBeenCalledWith('character_1');
    expect(battleService.createBattleFromEncounter).not.toHaveBeenCalled();
    expect(battleService.createBattleFromCharacter).not.toHaveBeenCalled();
  });

  it('should reject battle creation when neither encounterId nor monsters are provided', () => {
    const character = createMockCharacter();

    characterService.findById.mockReturnValue(character);

    expect(() =>
      controller.createBattle({
        battleId: 'battle_1',
        seed: 'seed_1',
        characterId: 'character_1',
        userId: 'user_1',
      }),
    ).toThrow(BadRequestException);

    expect(characterService.findById).toHaveBeenCalledWith('character_1');
    expect(battleService.createBattleFromEncounter).not.toHaveBeenCalled();
    expect(battleService.createBattleFromCharacter).not.toHaveBeenCalled();
  });

  it('should create a battle from an encounter id', () => {
    const character = createMockCharacter();
    const battle = createMockBattleState({
      encounterId: 'slime_training',
      zoneId: 'training_ground',
    });

    characterService.findById.mockReturnValue(character);
    battleService.createBattleFromEncounter.mockReturnValue(battle);

    const result = controller.createBattle({
      battleId: 'battle_1',
      seed: 'seed_1',
      characterId: 'character_1',
      userId: 'user_1',
      encounterId: 'slime_training',
      autoStart: true,
      autoResolveMonsterTurns: true,
    });

    expect(characterService.findById).toHaveBeenCalledWith('character_1');

    expect(battleService.createBattleFromEncounter).toHaveBeenCalledWith({
      battleId: 'battle_1',
      seed: 'seed_1',
      character,
      encounterId: 'slime_training',
      autoStart: true,
      autoResolveMonsterTurns: true,
    });

    expect(battleService.createBattleFromCharacter).not.toHaveBeenCalled();

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

  it('should reject battle creation when character has no owner user scope', () => {
    const character = createMockCharacter({
      userId: undefined as never,
    });

    characterService.findById.mockReturnValue(character);

    expect(() =>
      controller.createBattle({
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
      }),
    ).toThrow(BadRequestException);

    expect(characterService.findById).toHaveBeenCalledWith('character_1');
    expect(battleService.createBattleFromCharacter).not.toHaveBeenCalled();
    expect(battleService.createBattleFromEncounter).not.toHaveBeenCalled();
  });

  it('should reject battle creation when dto userId is omitted for an owned character', () => {
    const character = createMockCharacter({
      userId: 'owner_user',
    });

    characterService.findById.mockReturnValue(character);

    expect(() =>
      controller.createBattle({
        battleId: 'battle_1',
        seed: 'seed_1',
        characterId: 'character_1',
        monsters: [
          {
            monsterId: 'goblin',
            instanceId: 'goblin_1',
          },
        ],
        userId: '',
      }),
    ).toThrow(BadRequestException);

    expect(characterService.findById).toHaveBeenCalledWith('character_1');
    expect(battleService.createBattleFromCharacter).not.toHaveBeenCalled();
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

  it('should claim battle reward and apply it to the character', () => {
    const character = createMockCharacter();
    const reward = createMockBattleRewardSummary();

    const claimedBattle = createMockBattleState({
      status: 'victory',
      rewardClaim: {
        claimedAt: '2026-01-01T00:00:00.000Z',
        claimedByCharacterId: character.id,
        reward,
      },
    });

    const appliedReward = createMockAppliedBattleRewardResult(
      character,
      reward,
    );

    characterService.findById.mockReturnValue(character);

    battleService.claimBattleReward.mockReturnValue({
      battle: claimedBattle,
      reward,
    });

    characterService.applyBattleReward.mockReturnValue(appliedReward);

    const result = controller.claimReward('battle_1', {
      characterId: character.id,
      userId: character.userId,
    });

    expect(characterService.findById).toHaveBeenCalledWith(character.id);

    expect(battleService.claimBattleReward).toHaveBeenCalledWith({
      battleId: 'battle_1',
      characterId: character.id,
    });

    expect(characterService.applyBattleReward).toHaveBeenCalledWith(
      character.id,
      character.userId,
      reward,
    );

    expect(result).toEqual({
      battle: claimedBattle,
      character: appliedReward.character,
      reward: appliedReward.reward,
      progression: appliedReward.progression,
    });
  });

  it('should reject reward claim when character belongs to another user scope', () => {
    const character = createMockCharacter({
      userId: 'owner_user',
    });

    characterService.findById.mockReturnValue(character);

    expect(() =>
      controller.claimReward('battle_1', {
        characterId: character.id,
        userId: 'different_user',
      }),
    ).toThrow(BadRequestException);

    expect(characterService.findById).toHaveBeenCalledWith(character.id);
    expect(battleService.claimBattleReward).not.toHaveBeenCalled();
    expect(characterService.applyBattleReward).not.toHaveBeenCalled();
  });

  it('should reject reward claim when character has no owner user scope', () => {
    const character = createMockCharacter({
      userId: undefined as never,
    });

    characterService.findById.mockReturnValue(character);

    expect(() =>
      controller.claimReward('battle_1', {
        characterId: character.id,
        userId: 'user_1',
      }),
    ).toThrow(BadRequestException);

    expect(characterService.findById).toHaveBeenCalledWith(character.id);
    expect(battleService.claimBattleReward).not.toHaveBeenCalled();
    expect(characterService.applyBattleReward).not.toHaveBeenCalled();
  });

  it('should delete battle by id', () => {
    battleService.deleteBattle.mockReturnValue(true);

    expect(controller.deleteBattle('battle_1')).toEqual({
      deleted: true,
    });

    expect(battleService.deleteBattle).toHaveBeenCalledWith('battle_1');
  });
});
