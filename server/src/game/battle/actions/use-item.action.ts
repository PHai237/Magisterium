import {
  countInventoryItem,
  removeItemQuantityFromInventory,
} from '../../inventory/inventory.calculations';

import { applyBattleConsumableItemEffectsToActor } from '../items/battle-item.application';

import { createBattleEvent } from '../events/battle-event.factory';

import {
  advanceBattleToNextActor,
  advanceRoundIfNeeded,
  consumeActorTurnGauge,
} from '../turn/battle-turn.engine';

import {
  createCancelledActionResult,
  createDefaultProcContext,
} from '../utils/battle-action-result.utils';

import {
  appendEvents,
  cloneActorRecord,
  getActorOrThrow,
  isActorDefeated,
} from '../utils/battle-state.utils';

import type { BattleEngineResult } from '../battle-engine.types';

import type {
  BattleActionCommand,
  BattleActionResult,
  BattleActorState,
  BattleEvent,
  BattleState,
} from '../battle.types';

function createUseItemCancelledResult(
  battleState: BattleState,
  actor: BattleActorState,
  message: string,
  itemId?: BattleActionCommand['itemId'],
): BattleEngineResult {
  const events: BattleEvent[] = [
    createBattleEvent({
      type: 'ACTION_CANCELLED',
      phase: 'cancelled',
      actorId: actor.actorId,
      itemId,
      message,
    }),
  ];

  return {
    battleState: appendEvents(battleState, events),
    actionResult: createCancelledActionResult(actor, events, [actor]),
  };
}

export function resolveUseItem(
  battleState: BattleState,
  command: BattleActionCommand,
): BattleEngineResult {
  const actor = getActorOrThrow(battleState, command.actorId);

  if (isActorDefeated(actor)) {
    return createUseItemCancelledResult(
      battleState,
      actor,
      'Defeated actor cannot use items.',
      command.itemId,
    );
  }

  if (!command.itemId) {
    return createUseItemCancelledResult(
      battleState,
      actor,
      'use_item requires itemId.',
    );
  }

  const itemQuantity = countInventoryItem(
    actor.inventoryItemIds,
    command.itemId,
  );

  if (itemQuantity <= 0) {
    return createUseItemCancelledResult(
      battleState,
      actor,
      `Actor ${actor.actorId} does not have item: ${command.itemId}.`,
      command.itemId,
    );
  }

  let itemUseResult: ReturnType<typeof applyBattleConsumableItemEffectsToActor>;

  try {
    itemUseResult = applyBattleConsumableItemEffectsToActor(
      actor,
      command.itemId,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Item ${command.itemId} cannot be used in battle.`;

    return createUseItemCancelledResult(
      battleState,
      actor,
      message,
      command.itemId,
    );
  }

  if (itemUseResult.effects.length === 0) {
    return createUseItemCancelledResult(
      battleState,
      actor,
      `Item ${command.itemId} had no effect.`,
      command.itemId,
    );
  }

  const inventoryItemIds = itemUseResult.consumesOnUse
    ? removeItemQuantityFromInventory(actor.inventoryItemIds, command.itemId, 1)
        .inventoryItemIds
    : [...actor.inventoryItemIds];

  const updatedActor: BattleActorState = {
    ...itemUseResult.actorState,
    inventoryItemIds,
  };

  const events: BattleEvent[] = [
    createBattleEvent({
      type: 'ACTION_STARTED',
      phase: 'initiation',
      actorId: actor.actorId,
      itemId: command.itemId,
      message: `Item use started: ${command.itemId}.`,
    }),
    createBattleEvent({
      type: 'ITEM_USED',
      phase: 'apply_damage',
      actorId: actor.actorId,
      targetId: actor.actorId,
      itemId: command.itemId,
      message: `Item used: ${command.itemId}.`,
      metadata: {
        consumesOnUse: itemUseResult.consumesOnUse,
        previousQuantity: itemQuantity,
        nextQuantity: itemUseResult.consumesOnUse
          ? itemQuantity - 1
          : itemQuantity,
      },
    }),
  ];

  for (const effect of itemUseResult.effects) {
    if (effect.effectType === 'restore_resource') {
      events.push(
        createBattleEvent({
          type: 'RESOURCE_RESTORED',
          phase: 'apply_damage',
          actorId: actor.actorId,
          targetId: actor.actorId,
          itemId: command.itemId,
          value: effect.amountApplied,
          message: `${effect.target} restored by item.`,
          metadata: {
            resourceType: effect.target,
            previousValue: effect.previousValue,
            nextValue: effect.nextValue,
            amountApplied: effect.amountApplied,
          },
        }),
      );

      continue;
    }

    if (effect.effectType === 'damage') {
      events.push(
        createBattleEvent({
          type: 'DAMAGE_APPLIED',
          phase: 'apply_damage',
          actorId: actor.actorId,
          targetId: actor.actorId,
          itemId: command.itemId,
          value: effect.amountApplied,
          message: 'Item damage applied.',
          metadata: {
            previousValue: effect.previousValue,
            nextValue: effect.nextValue,
            amountApplied: effect.amountApplied,
          },
        }),
      );
    }
  }

  if (actor.isExhausted && !updatedActor.isExhausted) {
    events.push(
      createBattleEvent({
        type: 'RECOVERED_FROM_EXHAUSTION',
        phase: 'apply_damage',
        actorId: actor.actorId,
        itemId: command.itemId,
        message: 'Actor recovered from exhaustion after using item.',
        metadata: {
          stamina: updatedActor.stamina,
          maxStamina: updatedActor.derivedStats.maxStamina,
        },
      }),
    );
  }

  events.push(
    createBattleEvent({
      type: 'TURN_ENDED',
      phase: 'completed',
      actorId: actor.actorId,
      itemId: command.itemId,
      message: 'Turn ended.',
    }),
  );

  const nextActors = cloneActorRecord(battleState.actors);
  nextActors[actor.actorId] = updatedActor;

  const stateAfterAction = appendEvents(
    {
      ...battleState,
      actors: nextActors,
      activeActorId: undefined,
      turnOrder: consumeActorTurnGauge(battleState, actor.actorId),
      updatedAt: new Date().toISOString(),
    },
    events,
  );

  const nextState = advanceBattleToNextActor(
    advanceRoundIfNeeded(stateAfterAction),
  );

  const finalActorState =
    nextState.actors[actor.actorId] ?? nextActors[actor.actorId];

  const actionResult: BattleActionResult = {
    phase: 'completed',

    actorState: finalActorState,
    targetStates: [finalActorState],

    events,
    randomRolls: [],

    procContext: createDefaultProcContext(
      actor.actorId,
      `${battleState.battleId}:turn:${battleState.turnNumber}`,
    ),
  };

  return {
    battleState: nextState,
    actionResult,
  };
}
