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
      rankIndex: 0,
      rankId: 'novice',
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
      'one_night_inn_pass',
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
    inventoryItemIds: [
      'rusty_sword',
      'minor_mp_potion',
      'stamina_bread',
      'one_night_inn_pass',
    ],
    battleStartInventoryItemIds: [
      'rusty_sword',
      'minor_hp_potion',
      'minor_mp_potion',
      'stamina_bread',
      'one_night_inn_pass',
    ],

    baseStats: MOCK_BASE_STATS,
    derivedStats: MOCK_DERIVED_STATS,
    resistances: {},

    hp: 40,
    mp: 20,
    stamina: 90,

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
    ownerUserId: 'user_1',

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
      | 'listBattlesForUserScope'
      | 'getBattleOrThrowForUserScope'
      | 'resolveActionForUserScope'
      | 'prepareBattleRewardClaim'
      | 'commitBattleRewardClaim'
      | 'rollbackBattleRewardClaim'
      | 'deleteBattleForUserScope'
    >
  >;

  let characterService: jest.Mocked<
    Pick<CharacterService, 'findByIdForUserScope' | 'applyBattleReward'>
  >;

  beforeEach(() => {
    battleService = {
      createBattleFromCharacter: jest.fn(),
      createBattleFromEncounter: jest.fn(),
      listBattlesForUserScope: jest.fn(),
      getBattleOrThrowForUserScope: jest.fn(),
      resolveActionForUserScope: jest.fn(),
      prepareBattleRewardClaim: jest.fn(),
      commitBattleRewardClaim: jest.fn(),
      rollbackBattleRewardClaim: jest.fn(),
      deleteBattleForUserScope: jest.fn(),
    };

    characterService = {
      findByIdForUserScope: jest.fn(),
      applyBattleReward: jest.fn(),
    };

    controller = new BattleController(
      battleService as unknown as BattleService,
      characterService as unknown as CharacterService,
    );
  });

  it('should create a battle using x-user-id and scoped character lookup', () => {
    const character = createMockCharacter();
    const battle = createMockBattleState();

    characterService.findByIdForUserScope.mockReturnValue(character);
    battleService.createBattleFromCharacter.mockReturnValue(battle);

    const result = controller.createBattle(
      {
        battleId: 'battle_1',
        seed: 'seed_1',
        characterId: 'character_1',
        userId: 'attacker_body_user_ignored',
        monsters: [
          {
            monsterId: 'slime',
            instanceId: 'slime_1',
          },
        ],
        autoStart: true,
        autoResolveMonsterTurns: true,
      },
      'user_1',
    );

    expect(characterService.findByIdForUserScope).toHaveBeenCalledWith(
      'character_1',
      'user_1',
    );

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

  it('should reject battle creation without x-user-id header', () => {
    expect(() =>
      controller.createBattle({
        battleId: 'battle_1',
        seed: 'seed_1',
        characterId: 'character_1',
        monsters: [
          {
            monsterId: 'slime',
            instanceId: 'slime_1',
          },
        ],
      }),
    ).toThrow(BadRequestException);

    expect(characterService.findByIdForUserScope).not.toHaveBeenCalled();
    expect(battleService.createBattleFromCharacter).not.toHaveBeenCalled();
  });

  it('should reject battle creation when both encounterId and monsters are provided', () => {
    const character = createMockCharacter();

    characterService.findByIdForUserScope.mockReturnValue(character);

    expect(() =>
      controller.createBattle(
        {
          battleId: 'battle_1',
          seed: 'seed_1',
          characterId: 'character_1',
          encounterId: 'slime_training',
          monsters: [
            {
              monsterId: 'slime',
              instanceId: 'slime_1',
            },
          ],
        },
        'user_1',
      ),
    ).toThrow(BadRequestException);

    expect(characterService.findByIdForUserScope).toHaveBeenCalledWith(
      'character_1',
      'user_1',
    );
    expect(battleService.createBattleFromEncounter).not.toHaveBeenCalled();
    expect(battleService.createBattleFromCharacter).not.toHaveBeenCalled();
  });

  it('should create a battle from an encounter id', () => {
    const character = createMockCharacter();
    const battle = createMockBattleState({
      encounterId: 'slime_training',
      zoneId: 'training_ground',
    });

    characterService.findByIdForUserScope.mockReturnValue(character);
    battleService.createBattleFromEncounter.mockReturnValue(battle);

    const result = controller.createBattle(
      {
        battleId: 'battle_1',
        seed: 'seed_1',
        characterId: 'character_1',
        encounterId: 'slime_training',
        autoStart: true,
        autoResolveMonsterTurns: true,
      },
      'user_1',
    );

    expect(characterService.findByIdForUserScope).toHaveBeenCalledWith(
      'character_1',
      'user_1',
    );

    expect(battleService.createBattleFromEncounter).toHaveBeenCalledWith({
      battleId: 'battle_1',
      seed: 'seed_1',
      character,
      encounterId: 'slime_training',
      autoStart: true,
      autoResolveMonsterTurns: true,
    });

    expect(result).toBe(battle);
  });

  it('should list battles in the request user scope', () => {
    const battle = createMockBattleState();

    battleService.listBattlesForUserScope.mockReturnValue([battle]);

    expect(controller.listBattles('user_1')).toEqual([battle]);
    expect(battleService.listBattlesForUserScope).toHaveBeenCalledWith(
      'user_1',
    );
  });

  it('should get battle by id in the request user scope', () => {
    const battle = createMockBattleState();

    battleService.getBattleOrThrowForUserScope.mockReturnValue(battle);

    expect(controller.getBattle('battle_1', 'user_1')).toBe(battle);
    expect(battleService.getBattleOrThrowForUserScope).toHaveBeenCalledWith(
      'battle_1',
      'user_1',
    );
  });

  it('should resolve action in the request user scope', () => {
    const engineResult = createMockEngineResult();

    battleService.resolveActionForUserScope.mockReturnValue(engineResult);

    const result = controller.resolveAction(
      'battle_1',
      {
        actorId: 'character_1',
        actionType: 'skip_turn',
      },
      'user_1',
    );

    expect(battleService.resolveActionForUserScope).toHaveBeenCalledWith(
      {
        battleId: 'battle_1',
        actorId: 'character_1',
        targetIds: [],
        actionType: 'skip_turn',
        skillId: undefined,
        itemId: undefined,
        autoResolveMonsterTurns: undefined,
      },
      'user_1',
    );

    expect(result).toBe(engineResult);
  });

  it('should claim battle reward only after character reward application succeeds', () => {
    const character = createMockCharacter();
    const reward = createMockBattleRewardSummary();
    const characterActor = createMockBattleActorState({
      actorId: character.id,
      inventoryItemIds: character.inventoryItemIds.filter(
        (itemId) => itemId !== 'minor_hp_potion',
      ),
      hp: 35,
      mp: 12,
      stamina: 70,
    });

    const preparedBattle = createMockBattleState({
      status: 'victory',
      actors: {
        [character.id]: characterActor,
      },
    });

    const claimedBattle = {
      ...preparedBattle,
      rewardClaim: {
        claimedAt: '2026-01-01T00:00:00.000Z',
        claimedByCharacterId: character.id,
        reward,
      },
    };

    const appliedReward = createMockAppliedBattleRewardResult(
      character,
      reward,
    );

    characterService.findByIdForUserScope.mockReturnValue(character);

    battleService.prepareBattleRewardClaim.mockReturnValue({
      battle: preparedBattle,
      characterActor,
      reward,
    });

    characterService.applyBattleReward.mockReturnValue(appliedReward);

    battleService.commitBattleRewardClaim.mockReturnValue({
      battle: claimedBattle,
      reward,
    });

    const result = controller.claimReward(
      'battle_1',
      {
        characterId: character.id,
        userId: 'ignored_body_user',
      },
      'user_1',
    );

    expect(characterService.findByIdForUserScope).toHaveBeenCalledWith(
      character.id,
      'user_1',
    );

    expect(battleService.prepareBattleRewardClaim).toHaveBeenCalledWith({
      battleId: 'battle_1',
      characterId: character.id,
      userId: 'user_1',
    });

    expect(characterService.applyBattleReward).toHaveBeenCalledWith(
      character.id,
      'user_1',
      reward,
      {
        battleStartingInventoryItemIds:
          characterActor.battleStartInventoryItemIds,
        battleInventoryItemIds: characterActor.inventoryItemIds,
        battleCurrentState: {
          hp: characterActor.hp,
          mp: characterActor.mp,
          stamina: characterActor.stamina,
        },
      },
    );

    expect(battleService.commitBattleRewardClaim).toHaveBeenCalledWith({
      battleId: 'battle_1',
      characterId: character.id,
      userId: 'user_1',
      reward,
    });

    expect(result).toEqual({
      battle: claimedBattle,
      character: appliedReward.character,
      reward: appliedReward.reward,
    });
  });

  it('should not mark battle reward claimed if applying reward fails', () => {
    const character = createMockCharacter();
    const reward = createMockBattleRewardSummary();
    const characterActor = createMockBattleActorState({
      actorId: character.id,
    });
    const preparedBattle = createMockBattleState({
      status: 'victory',
      actors: {
        [character.id]: characterActor,
      },
    });

    characterService.findByIdForUserScope.mockReturnValue(character);
    battleService.prepareBattleRewardClaim.mockReturnValue({
      battle: preparedBattle,
      characterActor,
      reward,
    });

    characterService.applyBattleReward.mockImplementation(() => {
      throw new BadRequestException('Inventory capacity exceeded.');
    });

    expect(() =>
      controller.claimReward(
        'battle_1',
        {
          characterId: character.id,
        },
        'user_1',
      ),
    ).toThrow(BadRequestException);

    expect(battleService.commitBattleRewardClaim).toHaveBeenCalledWith({
      battleId: 'battle_1',
      characterId: character.id,
      userId: 'user_1',
      reward,
    });

    expect(battleService.rollbackBattleRewardClaim).toHaveBeenCalledWith({
      battleId: 'battle_1',
      characterId: character.id,
      userId: 'user_1',
    });
  });

  it('should delete battle in the request user scope', () => {
    battleService.deleteBattleForUserScope.mockReturnValue(true);

    expect(controller.deleteBattle('battle_1', 'user_1')).toEqual({
      deleted: true,
    });

    expect(battleService.deleteBattleForUserScope).toHaveBeenCalledWith(
      'battle_1',
      'user_1',
    );
  });
});
