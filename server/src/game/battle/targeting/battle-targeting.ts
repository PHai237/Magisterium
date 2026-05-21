import {
  areOpposingActors,
  getActorOrThrow,
  getLivingAlliesOf,
  getLivingEnemiesOf,
  isActorDefeated,
} from '../utils/battle-state.utils';

import type { BattleActorState, BattleState } from '../battle.types';

import type { SkillTargetType } from '../../skill/skill.types';

export function resolveBasicAttackTarget(
  battleState: BattleState,
  actor: BattleActorState,
  targetIds: string[],
): BattleActorState {
  const targetId = targetIds[0];

  if (!targetId) {
    throw new Error('Basic attack requires a target.');
  }

  const target = getActorOrThrow(battleState, targetId);

  if (actor.actorId === target.actorId) {
    throw new Error('Basic attack cannot target self.');
  }

  if (!areOpposingActors(actor, target)) {
    throw new Error('Basic attack cannot target an ally.');
  }

  if (isActorDefeated(target)) {
    throw new Error('Basic attack cannot target a defeated actor.');
  }

  return target;
}

export function resolveSkillTargets(
  battleState: BattleState,
  actor: BattleActorState,
  targetType: SkillTargetType,
  targetIds: string[],
): BattleActorState[] {
  switch (targetType) {
    case 'self':
      return [actor];

    case 'enemy_single': {
      const targetId = targetIds[0];

      if (!targetId) {
        throw new Error('Skill requires an enemy target.');
      }

      const target = getActorOrThrow(battleState, targetId);

      if (actor.actorId === target.actorId) {
        throw new Error('Skill cannot target self as an enemy.');
      }

      if (!areOpposingActors(actor, target)) {
        throw new Error('Skill enemy target must be an opposing actor.');
      }

      if (isActorDefeated(target)) {
        throw new Error('Skill cannot target a defeated enemy.');
      }

      return [target];
    }

    case 'ally_single': {
      const targetId = targetIds[0] ?? actor.actorId;
      const target = getActorOrThrow(battleState, targetId);

      if (areOpposingActors(actor, target)) {
        throw new Error('Skill ally target must be on the same side.');
      }

      if (isActorDefeated(target)) {
        throw new Error('Skill cannot target a defeated ally.');
      }

      return [target];
    }

    case 'enemy_all': {
      const targets = getLivingEnemiesOf(battleState, actor);

      if (targets.length === 0) {
        throw new Error('Skill requires at least one living enemy target.');
      }

      return targets;
    }

    case 'ally_all': {
      const targets = getLivingAlliesOf(battleState, actor);

      if (targets.length === 0) {
        throw new Error('Skill requires at least one living ally target.');
      }

      return targets;
    }
  }
}
