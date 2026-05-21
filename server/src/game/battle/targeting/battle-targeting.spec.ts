import {
  resolveBasicAttackTarget,
  resolveSkillTargets,
} from './battle-targeting';

import type { BattleActorState, BattleState } from '../battle.types';

import type { BaseStats, DerivedStats } from '../../character/character.types';

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

  actionSpeed: 10,
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

function createActor(
  overrides: Partial<BattleActorState> = {},
): BattleActorState {
  return {
    actorId: 'actor_1',
    actorType: 'character',

    skillIds: [],

    baseStats: DEFAULT_BASE_STATS,
    derivedStats: DEFAULT_DERIVED_STATS,
    resistances: {},

    hp: DEFAULT_DERIVED_STATS.maxHp,
    mp: DEFAULT_DERIVED_STATS.maxMp,
    stamina: DEFAULT_DERIVED_STATS.maxStamina,

    shield: 0,
    isExhausted: false,

    activeStatusEffects: [],
    activeModifiers: [],

    procCountThisTurn: 0,

    ...overrides,
  };
}

function createBattleState(
  actors: BattleActorState[],
  overrides: Partial<BattleState> = {},
): BattleState {
  const now = new Date().toISOString();

  return {
    battleId: 'targeting_test_battle',
    status: 'in_progress',

    roundNumber: 1,
    turnNumber: 1,
    activeActorId: actors[0]?.actorId,

    actors: Object.fromEntries(actors.map((actor) => [actor.actorId, actor])),

    turnOrder: [],

    randomContext: {
      battleId: 'targeting_test_battle',
      seed: 'targeting_seed',
      rollIndex: 0,
    },

    events: [],

    createdAt: now,
    updatedAt: now,

    ...overrides,
  };
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

      const battle = createBattleState([hero, slime]);

      expect(resolveBasicAttackTarget(battle, hero, ['slime'])).toBe(slime);
    });

    it('should throw when no target is provided', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const battle = createBattleState([hero]);

      expect(() => resolveBasicAttackTarget(battle, hero, [])).toThrow(
        'Basic attack requires a target.',
      );
    });

    it('should throw when targeting self', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const battle = createBattleState([hero]);

      expect(() => resolveBasicAttackTarget(battle, hero, ['hero'])).toThrow(
        'Basic attack cannot target self.',
      );
    });

    it('should throw when targeting an ally', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      const battle = createBattleState([hero, ally]);

      expect(() => resolveBasicAttackTarget(battle, hero, ['ally'])).toThrow(
        'Basic attack cannot target an ally.',
      );
    });

    it('should throw when targeting a defeated actor', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const defeatedSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const battle = createBattleState([hero, defeatedSlime]);

      expect(() => resolveBasicAttackTarget(battle, hero, ['slime'])).toThrow(
        'Basic attack cannot target a defeated actor.',
      );
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

      const battle = createBattleState([hero, slime]);

      expect(resolveSkillTargets(battle, hero, 'self', ['slime'])).toEqual([
        hero,
      ]);
    });

    it('should resolve enemy_single target', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battle = createBattleState([hero, slime]);

      expect(
        resolveSkillTargets(battle, hero, 'enemy_single', ['slime']),
      ).toEqual([slime]);
    });

    it('should throw when enemy_single target is missing', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const battle = createBattleState([hero]);

      expect(() =>
        resolveSkillTargets(battle, hero, 'enemy_single', []),
      ).toThrow('Skill requires an enemy target.');
    });

    it('should throw when enemy_single targets self', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const battle = createBattleState([hero]);

      expect(() =>
        resolveSkillTargets(battle, hero, 'enemy_single', ['hero']),
      ).toThrow('Skill cannot target self as an enemy.');
    });

    it('should throw when enemy_single targets an ally', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      const battle = createBattleState([hero, ally]);

      expect(() =>
        resolveSkillTargets(battle, hero, 'enemy_single', ['ally']),
      ).toThrow('Skill enemy target must be an opposing actor.');
    });

    it('should throw when enemy_single targets a defeated enemy', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const defeatedSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const battle = createBattleState([hero, defeatedSlime]);

      expect(() =>
        resolveSkillTargets(battle, hero, 'enemy_single', ['slime']),
      ).toThrow('Skill cannot target a defeated enemy.');
    });

    it('should resolve ally_single target when provided', () => {
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

      const battle = createBattleState([hero, ally, slime]);

      expect(
        resolveSkillTargets(battle, hero, 'ally_single', ['ally']),
      ).toEqual([ally]);
    });

    it('should default ally_single to self when no target is provided', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      const battle = createBattleState([hero, ally]);

      expect(resolveSkillTargets(battle, hero, 'ally_single', [])).toEqual([
        hero,
      ]);
    });

    it('should throw when ally_single targets an enemy', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battle = createBattleState([hero, slime]);

      expect(() =>
        resolveSkillTargets(battle, hero, 'ally_single', ['slime']),
      ).toThrow('Skill ally target must be on the same side.');
    });

    it('should throw when ally_single targets a defeated ally', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const defeatedAlly = createActor({
        actorId: 'ally',
        actorType: 'character',
        hp: 0,
      });

      const battle = createBattleState([hero, defeatedAlly]);

      expect(() =>
        resolveSkillTargets(battle, hero, 'ally_single', ['ally']),
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

      const ally = createActor({
        actorId: 'ally',
        actorType: 'character',
      });

      const battle = createBattleState([
        hero,
        slime,
        goblin,
        defeatedGoblin,
        ally,
      ]);

      expect(resolveSkillTargets(battle, hero, 'enemy_all', [])).toEqual([
        slime,
        goblin,
      ]);
    });

    it('should throw when enemy_all has no living enemies', () => {
      const hero = createActor({
        actorId: 'hero',
        actorType: 'character',
      });

      const defeatedSlime = createActor({
        actorId: 'slime',
        actorType: 'monster',
        hp: 0,
      });

      const battle = createBattleState([hero, defeatedSlime]);

      expect(() => resolveSkillTargets(battle, hero, 'enemy_all', [])).toThrow(
        'Skill requires at least one living enemy target.',
      );
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

      const battle = createBattleState([hero, ally, defeatedAlly, slime]);

      expect(resolveSkillTargets(battle, hero, 'ally_all', [])).toEqual([
        hero,
        ally,
      ]);
    });

    it('should throw when ally_all has no living allies', () => {
      const defeatedHero = createActor({
        actorId: 'hero',
        actorType: 'character',
        hp: 0,
      });

      const slime = createActor({
        actorId: 'slime',
        actorType: 'monster',
      });

      const battle = createBattleState([defeatedHero, slime]);

      expect(() =>
        resolveSkillTargets(battle, defeatedHero, 'ally_all', []),
      ).toThrow('Skill requires at least one living ally target.');
    });
  });
});
