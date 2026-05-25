import { resolveUseItem } from './use-item.action';

import {
  createBattleActorState,
  createBattleState,
} from '../factory/battle.factory';

import { startBattle } from '../turn/battle-turn.engine';

import type { BattleActorState, BattleActorType } from '../battle.types';

import type {
  BaseStats,
  DerivedStats,
  ItemId,
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
  inventoryItemIds?: ItemId[];

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
    inventoryItemIds: input.inventoryItemIds ?? [],

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

describe('resolveUseItem', () => {
  it('should use an HP potion, restore HP, consume the item, and end the turn', () => {
    const battleId = 'use_item_hp_potion_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      inventoryItemIds: ['minor_hp_potion'],
      hp: 70,
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

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'use_item_hp_seed',
      actors: [hero, slime],
    });

    expect(startedBattle.activeActorId).toBe('hero');

    const result = resolveUseItem(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: [],
      actionType: 'use_item',
      itemId: 'minor_hp_potion',
    });

    expect(result.actionResult.phase).toBe('completed');

    expect(result.battleState.actors.hero.hp).toBe(100);
    expect(result.battleState.actors.hero.inventoryItemIds).toEqual([]);

    expect(result.actionResult.actorState.actorId).toBe('hero');
    expect(
      result.actionResult.targetStates.map((target) => target.actorId),
    ).toEqual(['hero']);

    expect(result.actionResult.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        'ACTION_STARTED',
        'ITEM_USED',
        'RESOURCE_RESTORED',
        'TURN_ENDED',
      ]),
    );

    expect(result.actionResult.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ITEM_USED',
          actorId: 'hero',
          targetId: 'hero',
          itemId: 'minor_hp_potion',
          metadata: {
            consumesOnUse: true,
            previousQuantity: 1,
            nextQuantity: 0,
          },
        }),
        expect.objectContaining({
          type: 'RESOURCE_RESTORED',
          actorId: 'hero',
          targetId: 'hero',
          itemId: 'minor_hp_potion',
          value: 30,
          metadata: {
            resourceType: 'HP',
            previousValue: 70,
            nextValue: 100,
            amountApplied: 30,
          },
        }),
      ]),
    );

    expect(result.actionResult.randomRolls).toEqual([]);
  });

  it('should use an MP potion and consume only one copy', () => {
    const battleId = 'use_item_mp_potion_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      inventoryItemIds: ['minor_mp_potion', 'minor_mp_potion'],
      mp: 0,
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

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'use_item_mp_seed',
      actors: [hero, slime],
    });

    const result = resolveUseItem(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: [],
      actionType: 'use_item',
      itemId: 'minor_mp_potion',
    });

    expect(result.battleState.actors.hero.mp).toBe(20);
    expect(result.battleState.actors.hero.inventoryItemIds).toEqual([
      'minor_mp_potion',
    ]);

    expect(result.actionResult.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ITEM_USED',
          itemId: 'minor_mp_potion',
          metadata: {
            consumesOnUse: true,
            previousQuantity: 2,
            nextQuantity: 1,
          },
        }),
      ]),
    );
  });

  it('should use stamina bread in battle', () => {
    const battleId = 'use_item_stamina_bread_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      inventoryItemIds: ['stamina_bread'],
      stamina: 10,
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

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'use_item_stamina_seed',
      actors: [hero, slime],
    });

    const result = resolveUseItem(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: [],
      actionType: 'use_item',
      itemId: 'stamina_bread',
    });

    expect(result.battleState.actors.hero.stamina).toBe(35);
    expect(result.battleState.actors.hero.inventoryItemIds).toEqual([]);

    expect(result.actionResult.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'RESOURCE_RESTORED',
          itemId: 'stamina_bread',
          value: 25,
          metadata: {
            resourceType: 'Stamina',
            previousValue: 10,
            nextValue: 35,
            amountApplied: 25,
          },
        }),
      ]),
    );
  });

  it('should recover exhaustion when stamina bread restores enough stamina', () => {
    const battleId = 'use_item_recover_exhaustion_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      inventoryItemIds: ['stamina_bread'],
      stamina: 0,
      derivedStats: {
        actionSpeed: 100,
        staminaRegen: 0,
      },
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
      derivedStats: {
        actionSpeed: 10,
      },
    });

    expect(hero.isExhausted).toBe(true);

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'use_item_recover_exhaustion_seed',
      actors: [hero, slime],
    });

    const result = resolveUseItem(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: [],
      actionType: 'use_item',
      itemId: 'stamina_bread',
    });

    expect(result.battleState.actors.hero.stamina).toBe(25);
    expect(result.battleState.actors.hero.isExhausted).toBe(false);

    expect(result.actionResult.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'RECOVERED_FROM_EXHAUSTION',
          actorId: 'hero',
          itemId: 'stamina_bread',
          metadata: {
            stamina: 25,
            maxStamina: 100,
          },
        }),
      ]),
    );
  });

  it('should cancel when itemId is missing', () => {
    const battleId = 'use_item_missing_item_id_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      inventoryItemIds: ['minor_hp_potion'],
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'missing_item_id_seed',
      actors: [hero, slime],
    });

    const result = resolveUseItem(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: [],
      actionType: 'use_item',
    });

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        message: 'use_item requires itemId.',
      }),
    ]);
  });

  it('should cancel when actor does not have the item', () => {
    const battleId = 'use_item_not_owned_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      inventoryItemIds: [],
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'not_owned_seed',
      actors: [hero, slime],
    });

    const result = resolveUseItem(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: [],
      actionType: 'use_item',
      itemId: 'minor_hp_potion',
    });

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        itemId: 'minor_hp_potion',
        message: 'Actor hero does not have item: minor_hp_potion.',
      }),
    ]);
  });

  it('should cancel when item is not consumable', () => {
    const battleId = 'use_item_not_consumable_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      inventoryItemIds: ['rusty_sword'],
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'not_consumable_seed',
      actors: [hero, slime],
    });

    const result = resolveUseItem(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: [],
      actionType: 'use_item',
      itemId: 'rusty_sword',
    });

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        itemId: 'rusty_sword',
        message: 'Item rusty_sword is not consumable.',
      }),
    ]);
  });

  it('should cancel when item cannot be used in battle', () => {
    const battleId = 'use_item_context_fail_test';

    const hero = createActor({
      actorId: 'hero',
      actorType: 'character',
      inventoryItemIds: ['one_night_inn_voucher'],
    });

    const slime = createActor({
      actorId: 'slime',
      actorType: 'monster',
    });

    const startedBattle = createStartedBattle({
      battleId,
      seed: 'context_fail_seed',
      actors: [hero, slime],
    });

    const result = resolveUseItem(startedBattle, {
      battleId,
      actorId: 'hero',
      targetIds: [],
      actionType: 'use_item',
      itemId: 'one_night_inn_voucher',
    });

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        itemId: 'one_night_inn_voucher',
        message: 'Item one_night_inn_voucher cannot be used in battle.',
      }),
    ]);
  });

  it('should cancel when actor is defeated', () => {
    const battleId = 'use_item_defeated_actor_test';

    const defeatedHero = createActor({
      actorId: 'hero',
      actorType: 'character',
      inventoryItemIds: ['minor_hp_potion'],
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

    const result = resolveUseItem(
      {
        ...battle,
        status: 'in_progress',
        activeActorId: 'hero',
      },
      {
        battleId,
        actorId: 'hero',
        targetIds: [],
        actionType: 'use_item',
        itemId: 'minor_hp_potion',
      },
    );

    expect(result.actionResult.phase).toBe('cancelled');
    expect(result.battleState.activeActorId).toBe('hero');

    expect(result.actionResult.events).toEqual([
      expect.objectContaining({
        type: 'ACTION_CANCELLED',
        actorId: 'hero',
        itemId: 'minor_hp_potion',
        message: 'Defeated actor cannot use items.',
      }),
    ]);
  });
});
