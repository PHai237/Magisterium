import {
  resolveBasicAttackTarget,
  resolveSkillTargets,
} from './battle-targeting';

import {
  createBattleActorState,
  createBattleState,
} from '../factory/battle.factory';

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
  accuracy: 95,
  evasionRate: 5,

  critRate: 5,
  critDamageBonus: 50,

  fleeRate: 10,

  statusResist: 5,
  spiritualPotency: 10,

  mpRegen: 2,
  staminaRegen: 5,

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
    inventoryItemIds: [],

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

describe('battle targeting', () => {
  describe('resolveBasicAttackTarget', () => {
    it('should resolve a living opposing target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_basic_attack_test',
        seed: 'targeting_seed',
        actors: [hero, slime],
      });

      const target = resolveBasicAttackTarget(battleState, hero, ['slime']);

      expect(target.actorId).toBe('slime');
    });

    it('should reject missing target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_missing_basic_attack_test',
        seed: 'targeting_seed',
        actors: [hero, slime],
      });

      expect(() => resolveBasicAttackTarget(battleState, hero, [])).toThrow(
        'Basic attack requires a target.',
      );
    });

    it('should reject self target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_self_basic_attack_test',
        seed: 'targeting_seed',
        actors: [hero, slime],
      });

      expect(() =>
        resolveBasicAttackTarget(battleState, hero, ['hero']),
      ).toThrow('Basic attack cannot target self.');
    });

    it('should reject ally target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_ally_basic_attack_test',
        seed: 'targeting_seed',
        actors: [hero, ally, slime],
      });

      expect(() =>
        resolveBasicAttackTarget(battleState, hero, ['ally']),
      ).toThrow('Basic attack cannot target an ally.');
    });

    it('should reject defeated target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const defeatedSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const goblin = createActor({
        actorId: 'goblin',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_defeated_basic_attack_test',
        seed: 'targeting_seed',
        actors: [hero, defeatedSlime, goblin],
      });

      expect(() =>
        resolveBasicAttackTarget(battleState, hero, ['slime']),
      ).toThrow('Basic attack cannot target a defeated actor.');
    });
  });

  describe('resolveSkillTargets', () => {
    it('should resolve self target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_self_skill_test',
        seed: 'targeting_seed',
        actors: [hero, slime],
      });

      const targets = resolveSkillTargets(battleState, hero, 'self', []);

      expect(targets.map((target) => target.actorId)).toEqual(['hero']);
    });

    it('should resolve a single living enemy target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_enemy_single_skill_test',
        seed: 'targeting_seed',
        actors: [hero, slime],
      });

      const targets = resolveSkillTargets(battleState, hero, 'enemy_single', [
        'slime',
      ]);

      expect(targets.map((target) => target.actorId)).toEqual(['slime']);
    });

    it('should reject missing enemy_single target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_missing_enemy_single_skill_test',
        seed: 'targeting_seed',
        actors: [hero, slime],
      });

      expect(() =>
        resolveSkillTargets(battleState, hero, 'enemy_single', []),
      ).toThrow('Skill requires an enemy target.');
    });

    it('should reject enemy_single self target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_enemy_single_self_skill_test',
        seed: 'targeting_seed',
        actors: [hero, slime],
      });

      expect(() =>
        resolveSkillTargets(battleState, hero, 'enemy_single', ['hero']),
      ).toThrow('Skill cannot target self as an enemy.');
    });

    it('should reject enemy_single ally target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_enemy_single_ally_skill_test',
        seed: 'targeting_seed',
        actors: [hero, ally, slime],
      });

      expect(() =>
        resolveSkillTargets(battleState, hero, 'enemy_single', ['ally']),
      ).toThrow('Skill enemy target must be an opposing actor.');
    });

    it('should reject enemy_single defeated target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const defeatedSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const goblin = createActor({
        actorId: 'goblin',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_enemy_single_defeated_skill_test',
        seed: 'targeting_seed',
        actors: [hero, defeatedSlime, goblin],
      });

      expect(() =>
        resolveSkillTargets(battleState, hero, 'enemy_single', ['slime']),
      ).toThrow('Skill cannot target a defeated enemy.');
    });

    it('should resolve ally_single target from explicit target id', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_ally_single_skill_test',
        seed: 'targeting_seed',
        actors: [hero, ally, slime],
      });

      const targets = resolveSkillTargets(battleState, hero, 'ally_single', [
        'ally',
      ]);

      expect(targets.map((target) => target.actorId)).toEqual(['ally']);
    });

    it('should fallback ally_single to self when target ids are empty', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_ally_single_self_fallback_skill_test',
        seed: 'targeting_seed',
        actors: [hero, ally, slime],
      });

      const targets = resolveSkillTargets(battleState, hero, 'ally_single', []);

      expect(targets.map((target) => target.actorId)).toEqual(['hero']);
    });

    it('should reject ally_single unknown explicit target id instead of silently falling back to self', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_ally_single_unknown_target_test',
        seed: 'targeting_seed',
        actors: [hero, ally, slime],
      });

      expect(() =>
        resolveSkillTargets(battleState, hero, 'ally_single', ['missing_ally']),
      ).toThrow('Battle actor not found: missing_ally');
    });

    it('should reject ally_single enemy target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_ally_single_enemy_target_test',
        seed: 'targeting_seed',
        actors: [hero, slime],
      });

      expect(() =>
        resolveSkillTargets(battleState, hero, 'ally_single', ['slime']),
      ).toThrow('Skill ally target must be on the same side.');
    });

    it('should reject ally_single defeated ally target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const defeatedAlly = createActor({
        actorId: 'ally',
        actorType: 'character',
        hp: 0,
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_ally_single_defeated_skill_test',
        seed: 'targeting_seed',
        actors: [hero, defeatedAlly, slime],
      });

      expect(() =>
        resolveSkillTargets(battleState, hero, 'ally_single', ['ally']),
      ).toThrow('Skill cannot target a defeated ally.');
    });

    it('should resolve all living enemies for enemy_all', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const goblin = createActor({
        actorId: 'goblin',
        actorType: 'monster',
      });

      const defeatedGoblin = createActor({
        actorId: 'defeated_goblin',
        actorType: 'monster',
        hp: 0,
      });

      const battleState = createBattleState({
        battleId: 'targeting_enemy_all_skill_test',
        seed: 'targeting_seed',
        actors: [hero, slime, goblin, defeatedGoblin],
      });

      const targets = resolveSkillTargets(battleState, hero, 'enemy_all', []);

      expect(targets.map((target) => target.actorId)).toEqual([
        'slime',
        'goblin',
      ]);
    });

    it('should reject enemy_all when no living enemies remain', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const defeatedSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const battleState = createBattleState({
        battleId: 'targeting_enemy_all_no_targets_skill_test',
        seed: 'targeting_seed',
        actors: [hero, defeatedSlime],
      });

      expect(() =>
        resolveSkillTargets(battleState, hero, 'enemy_all', []),
      ).toThrow('Skill requires at least one living enemy target.');
    });

    it('should resolve all living allies for ally_all including self', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      const defeatedAlly = createActor({
        actorId: 'defeated_ally',
        actorType: 'character',
        hp: 0,
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battleState = createBattleState({
        battleId: 'targeting_ally_all_skill_test',
        seed: 'targeting_seed',
        actors: [hero, ally, defeatedAlly, slime],
      });

      const targets = resolveSkillTargets(battleState, hero, 'ally_all', []);

      expect(targets.map((target) => target.actorId)).toEqual(['hero', 'ally']);
    });
  });
});
