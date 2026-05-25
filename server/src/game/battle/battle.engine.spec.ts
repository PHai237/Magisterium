import {
  advanceBattleToNextActor,
  resolveBattleAction,
  startBattle,
} from './battle.engine';

import {
  createBattleActorState,
  createBattleState,
} from './factory/battle.factory';

import {
  calculateHitChance,
  hashStringToUnitInterval,
} from './calculations/battle.calculations';

import type { BattleActorState, BattleActorType } from './battle.types';

import type {
  BaseStats,
  DerivedStats,
  ResistanceProfile,
} from '../character/character.types';

const DEFAULT_BASE_STATS: BaseStats = {
  STR: 10,
  DEX: 10,
  CON: 10,
  INT: 10,
  WIS: 10,
  LUK: 10,
};

const DEFAULT_DERIVED_STATS: DerivedStats = {
  maxHp: 100,
  maxMp: 50,
  maxStamina: 100,

  pAtk: 20,
  mAtk: 15,
  healingPotency: 10,

  pDef: 5,
  mDef: 4,

  actionSpeed: 100,
  accuracy: 90,
  evasionRate: 5,

  critRate: 10,
  critDamageBonus: 50,

  fleeRate: 10,

  statusResist: 5,
  spiritualPotency: 10,

  mpRegen: 2,
  staminaRegen: 5,

  secondChanceRate: 2,
  procRate: 5,
};

interface CreateActorTestInput {
  actorId?: string;
  actorType?: BattleActorType;

  monsterId?: BattleActorState['monsterId'];
  aiTargetingMode?: BattleActorState['aiTargetingMode'];

  skillIds?: BattleActorState['skillIds'];
  inventoryItemIds?: BattleActorState['inventoryItemIds'];

  baseStats?: Partial<BaseStats>;
  derivedStats?: Partial<DerivedStats>;
  resistances?: ResistanceProfile;

  hp?: number;
  mp?: number;
  stamina?: number;
  shield?: number;
  isExhausted?: boolean;

  activeStatusEffects?: BattleActorState['activeStatusEffects'];
  activeModifiers?: BattleActorState['activeModifiers'];

  procCountThisTurn?: number;
}

function createActor(overrides: CreateActorTestInput = {}): BattleActorState {
  const derivedStats: DerivedStats = {
    ...DEFAULT_DERIVED_STATS,
    ...overrides.derivedStats,
  };

  return createBattleActorState({
    actorId: overrides.actorId ?? 'actor',
    actorType: overrides.actorType ?? 'character',

    monsterId: overrides.monsterId,
    aiTargetingMode: overrides.aiTargetingMode,

    skillIds: overrides.skillIds ?? [],
    inventoryItemIds: overrides.inventoryItemIds ?? [],

    baseStats: {
      ...DEFAULT_BASE_STATS,
      ...overrides.baseStats,
    },

    derivedStats,

    resistances: overrides.resistances ?? {},

    currentState: {
      hp: overrides.hp ?? derivedStats.maxHp,
      mp: overrides.mp ?? derivedStats.maxMp,
      stamina: overrides.stamina ?? derivedStats.maxStamina,
    },

    shield: overrides.shield ?? 0,
    isExhausted: overrides.isExhausted,

    activeStatusEffects: overrides.activeStatusEffects ?? [],
    activeModifiers: overrides.activeModifiers ?? [],

    procCountThisTurn: overrides.procCountThisTurn ?? 0,
  });
}

function findSeedForHitOutcome(
  battleId: string,
  actorId: string,
  targetId: string,
  finalChance: number,
  shouldHit: boolean,
): string {
  for (let index = 0; index < 10_000; index += 1) {
    const seed = `engine_test_seed_${index}`;

    const rollUnit = hashStringToUnitInterval(
      [battleId, seed, 0, 'hit', actorId, targetId, '', '', ''].join(':'),
    );

    const isHit = rollUnit < finalChance / 100;

    if (isHit === shouldHit) {
      return seed;
    }
  }

  throw new Error(
    `Unable to find deterministic seed for hit outcome: ${shouldHit}`,
  );
}

describe('battle engine', () => {
  it('should start a created battle and select the first ready actor', () => {
    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      derivedStats: {
        actionSpeed: 100,
      },
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
      derivedStats: {
        actionSpeed: 50,
      },
    });

    const battle = createBattleState({
      battleId: 'battle_start_test',
      seed: 'start_seed',
      actors: [hero, slime],
    });

    const startedBattle = startBattle(battle);

    expect(startedBattle.status).toBe('in_progress');
    expect(startedBattle.activeActorId).toBe('hero');
    expect(startedBattle.turnNumber).toBe(1);

    expect(startedBattle.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        'BATTLE_STARTED',
        'ROUND_STARTED',
        'TURN_STARTED',
      ]),
    );
  });

  it('should resolve a basic attack and apply damage to the target', () => {
    const battleId = 'battle_basic_attack_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      derivedStats: {
        actionSpeed: 100,
        accuracy: 98,
        critRate: 0,
        pAtk: 30,
      },
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
      derivedStats: {
        actionSpeed: 10,
        evasionRate: 0,
        pDef: 0,
      },
      hp: 80,
    });

    const hitChance = calculateHitChance(hero, slime);
    const seed = findSeedForHitOutcome(
      battleId,
      hero.actorId,
      slime.actorId,
      hitChance,
      true,
    );

    const startedBattle = startBattle(
      createBattleState({
        battleId,
        seed,
        actors: [hero, slime],
      }),
    );

    const result = resolveBattleAction(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'basic_attack',
    });

    const updatedSlime = result.battleState.actors.slime;

    expect(updatedSlime.hp).toBeLessThan(80);
    expect(result.actionResult.phase).toBe('completed');

    expect(result.actionResult.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        'ACTION_STARTED',
        'HIT',
        'DAMAGE_CALCULATED',
        'DAMAGE_MITIGATED',
        'DAMAGE_APPLIED',
        'TURN_ENDED',
      ]),
    );

    expect(result.actionResult.randomRolls[0].type).toBe('hit');
  });

  it('should not damage the target when a basic attack misses', () => {
    const battleId = 'battle_miss_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      derivedStats: {
        actionSpeed: 100,
        accuracy: 0,
        critRate: 0,
        pAtk: 999,
      },
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
      derivedStats: {
        actionSpeed: 10,
        evasionRate: 999,
        pDef: 0,
      },
      hp: 80,
    });

    const hitChance = calculateHitChance(hero, slime);
    const seed = findSeedForHitOutcome(
      battleId,
      hero.actorId,
      slime.actorId,
      hitChance,
      false,
    );

    const startedBattle = startBattle(
      createBattleState({
        battleId,
        seed,
        actors: [hero, slime],
      }),
    );

    const result = resolveBattleAction(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'basic_attack',
    });

    expect(result.battleState.actors.slime.hp).toBe(80);

    expect(result.actionResult.events.map((event) => event.type)).toEqual(
      expect.arrayContaining(['ACTION_STARTED', 'MISS', 'TURN_ENDED']),
    );

    expect(result.actionResult.events.map((event) => event.type)).not.toContain(
      'DAMAGE_APPLIED',
    );
  });

  it('should end the battle with victory when all monsters are defeated', () => {
    const battleId = 'battle_victory_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      derivedStats: {
        actionSpeed: 100,
        accuracy: 98,
        critRate: 0,
        pAtk: 999,
      },
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
      derivedStats: {
        actionSpeed: 10,
        evasionRate: 0,
        pDef: 0,
      },
      hp: 10,
    });

    const hitChance = calculateHitChance(hero, slime);
    const seed = findSeedForHitOutcome(
      battleId,
      hero.actorId,
      slime.actorId,
      hitChance,
      true,
    );

    const startedBattle = startBattle(
      createBattleState({
        battleId,
        seed,
        actors: [hero, slime],
      }),
    );

    const result = resolveBattleAction(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'basic_attack',
    });

    expect(result.battleState.actors.slime.hp).toBe(0);
    expect(result.battleState.status).toBe('victory');
    expect(result.battleState.activeActorId).toBeUndefined();

    expect(result.battleState.events.map((event) => event.type)).toEqual(
      expect.arrayContaining(['ACTOR_DEFEATED', 'TURN_ENDED', 'BATTLE_ENDED']),
    );
  });

  it('should reject an action when the actor is not the active actor', () => {
    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      derivedStats: {
        actionSpeed: 100,
      },
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
      derivedStats: {
        actionSpeed: 10,
      },
    });

    const startedBattle = startBattle(
      createBattleState({
        battleId: 'battle_wrong_actor_test',
        seed: 'wrong_actor_seed',
        actors: [hero, slime],
      }),
    );

    expect(startedBattle.activeActorId).toBe('hero');

    expect(() =>
      resolveBattleAction(startedBattle, {
        battleId: startedBattle.battleId,
        actorId: 'slime',
        targetIds: ['hero'],
        actionType: 'basic_attack',
      }),
    ).toThrow('Actor slime is not the active actor. Active actor is hero.');
  });

  it('should consume turn gauge and pass the turn when actor skips', () => {
    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      derivedStats: {
        actionSpeed: 100,
      },
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
      derivedStats: {
        actionSpeed: 100,
      },
    });

    const startedBattle = startBattle(
      createBattleState({
        battleId: 'battle_skip_test',
        seed: 'skip_seed',
        actors: [hero, slime],
      }),
    );

    expect(startedBattle.activeActorId).toBe('hero');

    const result = resolveBattleAction(startedBattle, {
      battleId: startedBattle.battleId,
      actorId: 'hero',
      targetIds: [],
      actionType: 'skip_turn',
    });

    expect(result.actionResult.phase).toBe('completed');
    expect(result.actionResult.events.map((event) => event.type)).toContain(
      'TURN_ENDED',
    );

    expect(result.battleState.activeActorId).toBe('slime');
  });

  it('should skip dead ready actors and advance to the next living actor', () => {
    const deadGoblin = createActor({
      actorId: 'dead_goblin',
      actorType: 'monster',
      derivedStats: {
        actionSpeed: 100,
      },
      hp: 0,
    });

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      derivedStats: {
        actionSpeed: 1,
      },
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
      derivedStats: {
        actionSpeed: 1,
      },
    });

    const battle = createBattleState({
      battleId: 'battle_dead_ready_actor_test',
      seed: 'dead_ready_actor_seed',
      actors: [deadGoblin, hero, slime],
    });

    const battleWithDeadReadyActor = {
      ...battle,
      status: 'in_progress' as const,
      turnOrder: battle.turnOrder.map((entry) =>
        entry.actorId === 'dead_goblin'
          ? {
              ...entry,
              turnGauge: 150,
            }
          : {
              ...entry,
              turnGauge: 0,
            },
      ),
    };

    const advancedBattle = advanceBattleToNextActor(battleWithDeadReadyActor);

    expect(advancedBattle.status).toBe('in_progress');
    expect(advancedBattle.activeActorId).toBe('hero');

    expect(
      advancedBattle.turnOrder.map((entry) => entry.actorId),
    ).not.toContain('dead_goblin');

    expect(
      advancedBattle.turnOrder.some((entry) => entry.turnGauge >= 100),
    ).toBe(true);
  });

  it('should throw if resolving action before battle is started', () => {
    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
    });

    const battle = createBattleState({
      battleId: 'battle_not_started_test',
      seed: 'not_started_seed',
      actors: [hero, slime],
    });

    expect(() =>
      resolveBattleAction(battle, {
        battleId: battle.battleId,
        actorId: 'hero',
        targetIds: ['slime'],
        actionType: 'basic_attack',
      }),
    ).toThrow('Battle must be started before resolving actions.');
  });
});
