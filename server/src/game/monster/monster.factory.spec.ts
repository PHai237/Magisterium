import {
  calculateMonsterDerivedStats,
  createMonsterBattleActor,
  createMonsterBattleActorFromDefinition,
  createMonsterBattleActors,
  getMonsterDefinitionById,
} from './monster.factory';

import {
  createBattleActorState,
  createBattleState,
} from '../battle/factory/battle.factory';

import { startBattle } from '../battle/battle.engine';

import type { BaseStats, DerivedStats } from '../character/character.types';

const DEFAULT_HERO_BASE_STATS: BaseStats = {
  STR: 10,
  DEX: 10,
  CON: 10,
  INT: 10,
  WIS: 10,
  LUK: 10,
};

const DEFAULT_HERO_DERIVED_STATS: DerivedStats = {
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

describe('monster factory', () => {
  describe('getMonsterDefinitionById', () => {
    it('should return a monster definition by id', () => {
      const slime = getMonsterDefinitionById('slime');

      expect(slime.id).toBe('slime');
      expect(slime.name).toBe('Slime');
      expect(slime.rank).toBe('normal');
    });

    it('should throw when monster definition does not exist', () => {
      expect(() =>
        getMonsterDefinitionById('unknown_monster' as never),
      ).toThrow('Monster definition not found: unknown_monster');
    });
  });

  describe('calculateMonsterDerivedStats', () => {
    it('should calculate monster derived stats with definition overrides', () => {
      const slime = getMonsterDefinitionById('slime');

      const derivedStats = calculateMonsterDerivedStats(slime);

      expect(derivedStats.maxHp).toBe(28);
      expect(derivedStats.maxMp).toBe(0);
      expect(derivedStats.maxStamina).toBe(40);

      expect(derivedStats.pAtk).toBe(6);
      expect(derivedStats.mAtk).toBe(0);
      expect(derivedStats.healingPotency).toBe(0);

      expect(derivedStats.pDef).toBe(1);
      expect(derivedStats.mDef).toBe(0);

      expect(derivedStats.actionSpeed).toBe(8);
    });
  });

  describe('createMonsterBattleActorFromDefinition', () => {
    it('should create a battle actor from a monster definition', () => {
      const slimeDefinition = getMonsterDefinitionById('slime');

      const actor = createMonsterBattleActorFromDefinition(slimeDefinition, {
        instanceId: 'slime_test_1',
      });

      expect(actor.actorId).toBe('slime_test_1');
      expect(actor.actorType).toBe('monster');

      expect(actor.baseStats).toEqual(slimeDefinition.baseStats);
      expect(actor.baseStats).not.toBe(slimeDefinition.baseStats);

      expect(actor.derivedStats.maxHp).toBe(28);
      expect(actor.derivedStats.pAtk).toBe(6);

      expect(actor.hp).toBe(28);
      expect(actor.mp).toBe(0);
      expect(actor.stamina).toBe(40);

      expect(actor.shield).toBe(0);
      expect(actor.resistances).toEqual(slimeDefinition.resistances);

      expect(actor.activeStatusEffects).toEqual([]);
      expect(actor.activeModifiers).toEqual([]);
      expect(actor.procCountThisTurn).toBe(0);
      expect(actor.inventoryItemIds).toEqual([]);
    });

    it('should generate a deterministic fallback actor id when instanceId is omitted', () => {
      const slimeDefinition = getMonsterDefinitionById('slime');

      const actor = createMonsterBattleActorFromDefinition(slimeDefinition);

      expect(actor.actorId).toBe('slime_1');
      expect(actor.actorType).toBe('monster');
    });

    it('should use the provided fallback sequence number when instanceId is omitted', () => {
      const slimeDefinition = getMonsterDefinitionById('slime');

      const actor = createMonsterBattleActorFromDefinition(
        slimeDefinition,
        {},
        3,
      );

      expect(actor.actorId).toBe('slime_3');
      expect(actor.actorType).toBe('monster');
    });

    it('should allow battle-specific state overrides', () => {
      const goblinDefinition = getMonsterDefinitionById('goblin');

      const actor = createMonsterBattleActorFromDefinition(goblinDefinition, {
        instanceId: 'wounded_goblin',
        currentState: {
          hp: 10,
          stamina: 20,
        },
        shield: 5,
      });

      expect(actor.actorId).toBe('wounded_goblin');
      expect(actor.hp).toBe(10);
      expect(actor.mp).toBe(0);
      expect(actor.stamina).toBe(20);
      expect(actor.shield).toBe(5);
    });
  });

  describe('createMonsterBattleActor', () => {
    it('should create a monster battle actor by monster id', () => {
      const actor = createMonsterBattleActor({
        monsterId: 'goblin',
        instanceId: 'goblin_test_1',
      });

      expect(actor.actorId).toBe('goblin_test_1');
      expect(actor.actorType).toBe('monster');
      expect(actor.hp).toBe(45);
      expect(actor.derivedStats.pAtk).toBe(13);
    });

    it('should generate a deterministic actor id when instanceId is omitted', () => {
      const actor = createMonsterBattleActor({
        monsterId: 'slime',
      });

      expect(actor.actorId).toBe('slime_1');
      expect(actor.actorType).toBe('monster');
    });
  });

  describe('createMonsterBattleActors', () => {
    it('should create multiple monster battle actors', () => {
      const actors = createMonsterBattleActors([
        {
          monsterId: 'slime',
          instanceId: 'slime_1',
        },
        {
          monsterId: 'goblin',
          instanceId: 'goblin_1',
        },
      ]);

      expect(actors.map((actor) => actor.actorId)).toEqual([
        'slime_1',
        'goblin_1',
      ]);

      expect(actors.every((actor) => actor.actorType === 'monster')).toBe(true);
    });

    it('should generate deterministic unique actor ids for duplicate monster types', () => {
      const actors = createMonsterBattleActors([
        {
          monsterId: 'slime',
        },
        {
          monsterId: 'slime',
        },
        {
          monsterId: 'goblin',
        },
        {
          monsterId: 'slime',
        },
      ]);

      expect(actors.map((actor) => actor.actorId)).toEqual([
        'slime_1',
        'slime_2',
        'goblin_1',
        'slime_3',
      ]);

      expect(actors.map((actor) => actor.monsterId)).toEqual([
        'slime',
        'slime',
        'goblin',
        'slime',
      ]);
    });

    it('should preserve explicit instance ids while generating missing ids deterministically', () => {
      const actors = createMonsterBattleActors([
        {
          monsterId: 'slime',
          instanceId: 'custom_slime',
        },
        {
          monsterId: 'slime',
        },
        {
          monsterId: 'slime',
        },
      ]);

      expect(actors.map((actor) => actor.actorId)).toEqual([
        'custom_slime',
        'slime_2',
        'slime_3',
      ]);
    });
  });

  describe('battle integration', () => {
    it('should create monsters that can be used in battle state', () => {
      const hero = createBattleActorState({
        actorId: 'hero',
        actorType: 'character',

        baseStats: DEFAULT_HERO_BASE_STATS,
        derivedStats: DEFAULT_HERO_DERIVED_STATS,

        currentState: {
          hp: DEFAULT_HERO_DERIVED_STATS.maxHp,
          mp: DEFAULT_HERO_DERIVED_STATS.maxMp,
          stamina: DEFAULT_HERO_DERIVED_STATS.maxStamina,
        },
      });

      const slime = createMonsterBattleActor({
        monsterId: 'slime',
        instanceId: 'slime_1',
      });

      const battle = createBattleState({
        battleId: 'monster_factory_battle_test',
        seed: 'monster_factory_seed',
        actors: [hero, slime],
      });

      const startedBattle = startBattle(battle);

      expect(startedBattle.status).toBe('in_progress');
      expect(startedBattle.actors.hero.actorType).toBe('character');
      expect(startedBattle.actors.slime_1.actorType).toBe('monster');

      expect(startedBattle.events.map((event) => event.type)).toEqual(
        expect.arrayContaining([
          'BATTLE_STARTED',
          'ROUND_STARTED',
          'TURN_STARTED',
        ]),
      );
    });

    it('should create battle state with duplicate monster types using generated unique ids', () => {
      const hero = createBattleActorState({
        actorId: 'hero',
        actorType: 'character',

        baseStats: DEFAULT_HERO_BASE_STATS,
        derivedStats: DEFAULT_HERO_DERIVED_STATS,

        currentState: {
          hp: DEFAULT_HERO_DERIVED_STATS.maxHp,
          mp: DEFAULT_HERO_DERIVED_STATS.maxMp,
          stamina: DEFAULT_HERO_DERIVED_STATS.maxStamina,
        },
      });

      const monsters = createMonsterBattleActors([
        {
          monsterId: 'slime',
        },
        {
          monsterId: 'slime',
        },
      ]);

      const battle = createBattleState({
        battleId: 'duplicate_monster_actor_id_battle_test',
        seed: 'duplicate_monster_actor_id_seed',
        actors: [hero, ...monsters],
      });

      expect(Object.keys(battle.actors)).toEqual([
        'hero',
        'slime_1',
        'slime_2',
      ]);
    });
  });
});
