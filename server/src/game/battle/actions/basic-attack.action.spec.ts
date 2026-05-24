import { resolveBasicAttack } from './basic-attack.action';

import {
  createBattleActorState,
  createBattleState,
} from '../factory/battle.factory';

import {
  calculateHitChance,
  hashStringToUnitInterval,
} from '../calculations/battle.calculations';

import { startBattle } from '../turn/battle-turn.engine';

import type { BattleActorState, BattleActorType } from '../battle.types';

import type {
  BaseStats,
  DerivedStats,
  ResistanceProfile,
  SkillId,
} from '../../character/character.types';

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
  accuracy: 98,
  evasionRate: 0,

  critRate: 0,
  critDamageBonus: 50,

  fleeRate: 10,

  statusResist: 5,
  spiritualPotency: 10,

  mpRegen: 0,
  staminaRegen: 0,

  secondChanceRate: 2,
  procRate: 5,
};

interface CreateActorInput {
  actorId: string;
  actorType?: BattleActorType;

  skillIds?: SkillId[];

  baseStats?: Partial<BaseStats>;
  derivedStats?: Partial<DerivedStats>;
  resistances?: ResistanceProfile;

  hp?: number;
  mp?: number;
  stamina?: number;
  shield?: number;
}

function createActor(input: CreateActorInput): BattleActorState {
  const derivedStats: DerivedStats = {
    ...DEFAULT_DERIVED_STATS,
    ...input.derivedStats,
  };

  return createBattleActorState({
    actorId: input.actorId,
    actorType: input.actorType ?? 'character',

    skillIds: input.skillIds ?? [],

    baseStats: {
      ...DEFAULT_BASE_STATS,
      ...input.baseStats,
    },
    derivedStats,
    resistances: input.resistances ?? {},

    currentState: {
      hp: input.hp ?? derivedStats.maxHp,
      mp: input.mp ?? derivedStats.maxMp,
      stamina: input.stamina ?? derivedStats.maxStamina,
    },

    shield: input.shield ?? 0,
  });
}

function findSeedForBasicAttackHitOutcome(input: {
  battleId: string;
  actorId: string;
  targetId: string;
  finalChance: number;
  shouldHit: boolean;
}): string {
  for (let index = 0; index < 10_000; index += 1) {
    const seed = `basic_attack_test_seed_${index}`;

    const rollUnit = hashStringToUnitInterval(
      [
        input.battleId,
        seed,
        0,
        'hit',
        input.actorId,
        input.targetId,
        '',
        '',
        '',
      ].join(':'),
    );

    const isHit = rollUnit < input.finalChance / 100;

    if (isHit === input.shouldHit) {
      return seed;
    }
  }

  throw new Error(
    `Unable to find deterministic seed for basic attack hit outcome: ${input.shouldHit}`,
  );
}

function createStartedBattle(input: {
  battleId: string;
  seed: string;
  actors: BattleActorState[];
}) {
  return startBattle(
    createBattleState({
      battleId: input.battleId,
      seed: input.seed,
      actors: input.actors,
    }),
  );
}

describe('resolveBasicAttack', () => {
  it('should resolve a hit and damage the target', () => {
    const battleId = 'basic_attack_hit_test';

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
      hp: 100,
    });

    const hitChance = calculateHitChance(hero, slime);
    const seed = findSeedForBasicAttackHitOutcome({
      battleId,
      actorId: hero.actorId,
      targetId: slime.actorId,
      finalChance: hitChance,
      shouldHit: true,
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed,
      actors: [hero, slime],
    });

    expect(startedBattle.activeActorId).toBe('hero');

    const result = resolveBasicAttack(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'basic_attack',
    });

    expect(result.actionResult.phase).toBe('completed');

    expect(result.battleState.actors.slime.hp).toBeLessThan(100);
    expect(result.actionResult.actorState.actorId).toBe('hero');
    expect(
      result.actionResult.targetStates.map((target) => target.actorId),
    ).toEqual(['slime']);

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

    expect(result.actionResult.randomRolls.map((roll) => roll.type)).toEqual([
      'hit',
      'crit',
      'damage_variance',
    ]);
  });

  it('should complete the turn without damage when attack misses', () => {
    const battleId = 'basic_attack_miss_test';

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
      hp: 100,
    });

    const hitChance = calculateHitChance(hero, slime);
    const seed = findSeedForBasicAttackHitOutcome({
      battleId,
      actorId: hero.actorId,
      targetId: slime.actorId,
      finalChance: hitChance,
      shouldHit: false,
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed,
      actors: [hero, slime],
    });

    const result = resolveBasicAttack(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'basic_attack',
    });

    expect(result.actionResult.phase).toBe('completed');
    expect(result.battleState.actors.slime.hp).toBe(100);

    expect(result.actionResult.events.map((event) => event.type)).toEqual(
      expect.arrayContaining(['ACTION_STARTED', 'MISS', 'TURN_ENDED']),
    );

    expect(result.actionResult.events.map((event) => event.type)).not.toContain(
      'DAMAGE_APPLIED',
    );

    expect(result.actionResult.randomRolls.map((roll) => roll.type)).toEqual([
      'hit',
    ]);
  });

  it('should apply shield damage before HP damage', () => {
    const battleId = 'basic_attack_shield_test';

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
      hp: 100,
      shield: 10,
    });

    const hitChance = calculateHitChance(hero, slime);
    const seed = findSeedForBasicAttackHitOutcome({
      battleId,
      actorId: hero.actorId,
      targetId: slime.actorId,
      finalChance: hitChance,
      shouldHit: true,
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed,
      actors: [hero, slime],
    });

    const result = resolveBasicAttack(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'basic_attack',
    });

    expect(result.actionResult.phase).toBe('completed');

    expect(result.battleState.actors.slime.shield).toBe(0);
    expect(result.battleState.actors.slime.hp).toBeLessThan(100);

    expect(result.actionResult.events.map((event) => event.type)).toEqual(
      expect.arrayContaining(['SHIELD_BROKEN', 'DAMAGE_APPLIED', 'TURN_ENDED']),
    );

    expect(result.actionResult.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'SHIELD_BROKEN',
          actorId: 'hero',
          targetId: 'slime',
          value: 10,
        }),
      ]),
    );
  });

  it('should end the battle with victory when attack defeats the last monster', () => {
    const battleId = 'basic_attack_victory_test';

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
    const seed = findSeedForBasicAttackHitOutcome({
      battleId,
      actorId: hero.actorId,
      targetId: slime.actorId,
      finalChance: hitChance,
      shouldHit: true,
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed,
      actors: [hero, slime],
    });

    const result = resolveBasicAttack(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'basic_attack',
    });

    expect(result.battleState.status).toBe('victory');
    expect(result.battleState.activeActorId).toBeUndefined();
    expect(result.battleState.actors.slime.hp).toBe(0);

    expect(result.battleState.events.map((event) => event.type)).toEqual(
      expect.arrayContaining(['ACTOR_DEFEATED', 'TURN_ENDED', 'BATTLE_ENDED']),
    );
  });

  it('should cancel when actor is defeated', () => {
    const battleId = 'basic_attack_defeated_actor_test';

    const defeatedHero = createActor({
      actorId: 'hero',
      actorType: 'character',
      hp: 0,
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
    });

    const battle = createBattleState({
      battleId,
      seed: 'defeated_actor_seed',
      actors: [defeatedHero, slime],
    });

    const result = resolveBasicAttack(
      {
        ...battle,
        status: 'in_progress',
        activeActorId: 'hero',
      },
      {
        battleId,
        actorId: 'hero',
        targetIds: ['slime'],
        actionType: 'basic_attack',
      },
    );

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        message: 'Defeated actor cannot act.',
      }),
    ]);
  });

  it('should cancel when target is missing', () => {
    const battleId = 'basic_attack_missing_target_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'missing_target_seed',
      actors: [hero, slime],
    });

    const result = resolveBasicAttack(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: [],
      actionType: 'basic_attack',
    });

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        message: 'Basic attack requires a target.',
      }),
    ]);
  });

  it('should cancel when targeting self', () => {
    const battleId = 'basic_attack_self_target_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'self_target_seed',
      actors: [hero, slime],
    });

    const result = resolveBasicAttack(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['hero'],
      actionType: 'basic_attack',
    });

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        targetId: 'hero',
        message: 'Basic attack cannot target self.',
      }),
    ]);
  });

  it('should cancel when targeting an ally', () => {
    const battleId = 'basic_attack_ally_target_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      derivedStats: {
        actionSpeed: 100,
      },
    });

    const ally = createActor({
      actorId: 'ally',
      actorType: 'character',
      derivedStats: {
        actionSpeed: 50,
      },
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
      derivedStats: {
        actionSpeed: 10,
      },
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'ally_target_seed',
      actors: [hero, ally, slime],
    });

    const result = resolveBasicAttack(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['ally'],
      actionType: 'basic_attack',
    });

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        targetId: 'ally',
        message: 'Basic attack cannot target an ally.',
      }),
    ]);
  });

  it('should cancel when targeting a defeated actor', () => {
    const battleId = 'basic_attack_defeated_target_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
    });

    const defeatedSlime = createActor({
      actorId: 'slime',
      actorType: 'monster',
      hp: 0,
    });

    const liveGoblin = createActor({
      actorId: 'goblin',
      actorType: 'monster',
      derivedStats: {
        actionSpeed: 10,
      },
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'defeated_target_seed',
      actors: [hero, defeatedSlime, liveGoblin],
    });

    const result = resolveBasicAttack(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'basic_attack',
    });

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        targetId: 'slime',
        message: 'Basic attack cannot target a defeated actor.',
      }),
    ]);
  });
});
