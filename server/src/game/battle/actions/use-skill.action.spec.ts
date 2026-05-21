import { resolveUseSkill } from './use-skill.action';

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

function findSeedForSkillHitOutcome(input: {
  battleId: string;
  actorId: string;
  targetId: string;
  skillId: SkillId;
  finalChance: number;
  shouldHit: boolean;
}): string {
  for (let index = 0; index < 10_000; index += 1) {
    const seed = `use_skill_test_seed_${index}`;

    const rollUnit = hashStringToUnitInterval(
      [
        input.battleId,
        seed,
        0,
        'hit',
        input.actorId,
        input.targetId,
        input.skillId,
        '',
      ].join(':'),
    );

    const isHit = rollUnit < input.finalChance / 100;

    if (isHit === input.shouldHit) {
      return seed;
    }
  }

  throw new Error(
    `Unable to find deterministic seed for skill hit outcome: ${input.shouldHit}`,
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

describe('resolveUseSkill', () => {
  it('should resolve an equipped damage skill, spend resources, and damage the target', () => {
    const battleId = 'use_skill_damage_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      skillIds: ['heavy_strike'],
      baseStats: {
        STR: 20,
      },
      derivedStats: {
        actionSpeed: 100,
        accuracy: 98,
        critRate: 0,
      },
      stamina: 100,
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
    const seed = findSeedForSkillHitOutcome({
      battleId,
      actorId: hero.actorId,
      targetId: slime.actorId,
      skillId: 'heavy_strike',
      finalChance: hitChance,
      shouldHit: true,
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed,
      actors: [hero, slime],
    });

    expect(startedBattle.activeActorId).toBe('hero');

    const result = resolveUseSkill(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'use_skill',
      skillId: 'heavy_strike',
    });

    expect(result.actionResult.phase).toBe('completed');

    expect(result.battleState.actors.hero.stamina).toBe(88);
    expect(result.battleState.actors.slime.hp).toBeLessThan(100);

    expect(result.actionResult.actorState.actorId).toBe('hero');
    expect(
      result.actionResult.targetStates.map((target) => target.actorId),
    ).toEqual(['slime']);

    expect(result.actionResult.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        'ACTION_STARTED',
        'RESOURCE_SPENT',
        'HIT',
        'DAMAGE_CALCULATED',
        'DAMAGE_MITIGATED',
        'DAMAGE_APPLIED',
        'TURN_ENDED',
      ]),
    );

    expect(result.actionResult.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ACTION_STARTED',
          skillId: 'heavy_strike',
        }),
        expect.objectContaining({
          type: 'RESOURCE_SPENT',
          skillId: 'heavy_strike',
          value: 12,
          metadata: {
            resourceType: 'Stamina',
            amount: 12,
          },
        }),
      ]),
    );

    expect(result.actionResult.randomRolls.map((roll) => roll.type)).toEqual([
      'hit',
      'crit',
      'damage_variance',
    ]);
  });

  it('should resolve a self heal skill and spend MP', () => {
    const battleId = 'use_skill_heal_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      skillIds: ['minor_heal'],
      baseStats: {
        WIS: 20,
        INT: 10,
      },
      hp: 40,
      mp: 50,
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
      seed: 'use_skill_heal_seed',
      actors: [hero, slime],
    });

    const result = resolveUseSkill(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: [],
      actionType: 'use_skill',
      skillId: 'minor_heal',
    });

    expect(result.actionResult.phase).toBe('completed');

    expect(result.battleState.actors.hero.mp).toBe(42);
    expect(result.battleState.actors.hero.hp).toBeGreaterThan(40);
    expect(result.battleState.actors.hero.hp).toBeLessThanOrEqual(100);

    expect(
      result.actionResult.targetStates.map((target) => target.actorId),
    ).toEqual(['hero']);

    expect(result.actionResult.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        'ACTION_STARTED',
        'RESOURCE_SPENT',
        'HEAL_APPLIED',
        'TURN_ENDED',
      ]),
    );

    expect(result.actionResult.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'HEAL_APPLIED',
          skillId: 'minor_heal',
          targetId: 'hero',
        }),
      ]),
    );

    expect(result.actionResult.randomRolls).toEqual([]);
  });

  it('should cancel when skillId is missing', () => {
    const battleId = 'use_skill_missing_skill_id_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      skillIds: ['heavy_strike'],
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'missing_skill_id_seed',
      actors: [hero, slime],
    });

    const result = resolveUseSkill(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'use_skill',
    });

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        message: 'use_skill requires skillId.',
      }),
    ]);
  });

  it('should cancel when skill definition does not exist', () => {
    const battleId = 'use_skill_unknown_skill_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      skillIds: ['unknown_skill'],
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'unknown_skill_seed',
      actors: [hero, slime],
    });

    const result = resolveUseSkill(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'use_skill',
      skillId: 'unknown_skill',
    });

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        skillId: 'unknown_skill',
        message: 'Skill definition not found: unknown_skill.',
      }),
    ]);
  });

  it('should cancel when actor has not equipped the skill', () => {
    const battleId = 'use_skill_unequipped_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      skillIds: ['spark'],
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'unequipped_skill_seed',
      actors: [hero, slime],
    });

    const result = resolveUseSkill(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'use_skill',
      skillId: 'heavy_strike',
    });

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        skillId: 'heavy_strike',
        message: 'Actor hero has not equipped skill: heavy_strike.',
      }),
    ]);
  });

  it('should cancel when target is invalid', () => {
    const battleId = 'use_skill_invalid_target_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      skillIds: ['heavy_strike'],
    });

    const ally = createActor({
      actorId: 'ally',
      actorType: 'character',
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'invalid_target_seed',
      actors: [hero, ally, slime],
    });

    const result = resolveUseSkill(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['ally'],
      actionType: 'use_skill',
      skillId: 'heavy_strike',
    });

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        skillId: 'heavy_strike',
        message: 'Skill enemy target must be an opposing actor.',
      }),
    ]);
  });

  it('should cancel when actor cannot pay skill resource costs', () => {
    const battleId = 'use_skill_resource_fail_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      skillIds: ['minor_heal'],
      hp: 40,
      mp: 0,
      derivedStats: {
        mpRegen: 0,
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
      seed: 'resource_fail_seed',
      actors: [hero, slime],
    });

    const result = resolveUseSkill(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: [],
      actionType: 'use_skill',
      skillId: 'minor_heal',
    });

    expect(result.actionResult.phase).toBe('cancelled');

    expect(result.battleState.activeActorId).toBe('hero');
    expect(result.battleState.actors.hero.mp).toBe(0);
    expect(result.battleState.actors.hero.hp).toBe(40);

    expect(
      result.actionResult.targetStates.map((target) => target.actorId),
    ).toEqual(['hero']);

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'RESOURCE_CHECK_FAILED',
        phase: 'resource_check',
        actorId: 'hero',
        skillId: 'minor_heal',
        metadata: {
          missingResources: [
            {
              resourceType: 'MP',
              amount: 8,
            },
          ],
        },
      }),
    ]);
  });

  it('should complete the turn even when a damage skill misses', () => {
    const battleId = 'use_skill_miss_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      skillIds: ['heavy_strike'],
      derivedStats: {
        accuracy: 0,
        critRate: 0,
      },
      stamina: 100,
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
      derivedStats: {
        evasionRate: 999,
      },
      hp: 100,
    });

    const hitChance = calculateHitChance(hero, slime);
    const seed = findSeedForSkillHitOutcome({
      battleId,
      actorId: hero.actorId,
      targetId: slime.actorId,
      skillId: 'heavy_strike',
      finalChance: hitChance,
      shouldHit: false,
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed,
      actors: [hero, slime],
    });

    const result = resolveUseSkill(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: ['slime'],
      actionType: 'use_skill',
      skillId: 'heavy_strike',
    });

    expect(result.actionResult.phase).toBe('completed');

    expect(result.battleState.actors.hero.stamina).toBe(88);
    expect(result.battleState.actors.slime.hp).toBe(100);

    expect(result.actionResult.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        'ACTION_STARTED',
        'RESOURCE_SPENT',
        'MISS',
        'TURN_ENDED',
      ]),
    );

    expect(result.actionResult.events.map((event) => event.type)).not.toContain(
      'DAMAGE_APPLIED',
    );
  });
});
