import { Injectable } from '@nestjs/common';

import {
  createBattleActorFromCharacterSnapshot,
  createBattleState,
  type CharacterBattleSnapshot,
} from './battle.factory';

import {
  resolveBattleAction,
  startBattle,
  type BattleEngineResult,
} from './battle.engine';

import type {
  BattleActionCommand,
  BattleActorState,
  BattleState,
} from './battle.types';

import {
  createMonsterBattleActor,
  createMonsterBattleActors,
} from '../monster/monster.factory';

import type { CreateMonsterBattleActorInput } from '../monster/monster.types';

const MAX_AUTO_MONSTER_ACTIONS = 20;

export interface CreateBattleFromCharacterInput {
  battleId?: string;
  seed?: string;

  character: CharacterBattleSnapshot;
  monsters: CreateMonsterBattleActorInput[];

  autoStart?: boolean;
  autoResolveMonsterTurns?: boolean;
}

export interface CreateBattleFromActorsInput {
  battleId?: string;
  seed?: string;

  actors: BattleActorState[];

  autoStart?: boolean;
  autoResolveMonsterTurns?: boolean;
}

export interface ResolveBattleActionInput extends BattleActionCommand {
  autoResolveMonsterTurns?: boolean;
}

@Injectable()
export class BattleService {
  private readonly battles = new Map<string, BattleState>();

  createBattleFromCharacter(
    input: CreateBattleFromCharacterInput,
  ): BattleState {
    if (input.monsters.length === 0) {
      throw new Error('Cannot create a battle without monsters.');
    }

    const characterActor = createBattleActorFromCharacterSnapshot(
      input.character,
    );

    const monsterActors = createMonsterBattleActors(input.monsters);

    return this.createBattleFromActors({
      battleId: input.battleId,
      seed: input.seed,
      actors: [characterActor, ...monsterActors],
      autoStart: input.autoStart,
      autoResolveMonsterTurns: input.autoResolveMonsterTurns,
    });
  }

  createBattleFromActors(input: CreateBattleFromActorsInput): BattleState {
    const battle = createBattleState({
      battleId: input.battleId,
      seed: input.seed,
      actors: input.actors,
    });

    const shouldAutoStart = input.autoStart ?? true;
    const shouldAutoResolveMonsterTurns = input.autoResolveMonsterTurns ?? true;

    const startedBattle = shouldAutoStart ? startBattle(battle) : battle;

    const nextBattle = shouldAutoResolveMonsterTurns
      ? this.resolveAutoMonsterTurns(startedBattle)
      : startedBattle;

    this.battles.set(nextBattle.battleId, nextBattle);

    return nextBattle;
  }

  createMonsterActor(input: CreateMonsterBattleActorInput): BattleActorState {
    return createMonsterBattleActor(input);
  }

  getBattle(battleId: string): BattleState | undefined {
    return this.battles.get(battleId);
  }

  getBattleOrThrow(battleId: string): BattleState {
    const battle = this.getBattle(battleId);

    if (!battle) {
      throw new Error(`Battle not found: ${battleId}`);
    }

    return battle;
  }

  listBattles(): BattleState[] {
    return Array.from(this.battles.values());
  }

  resolveAction(command: ResolveBattleActionInput): BattleEngineResult {
    const battle = this.getBattleOrThrow(command.battleId);

    this.assertClientCanControlActor(battle, command.actorId);

    const result = resolveBattleAction(battle, command);

    const shouldAutoResolveMonsterTurns =
      command.autoResolveMonsterTurns ?? true;

    const battleAfterMonsterTurns = shouldAutoResolveMonsterTurns
      ? this.resolveAutoMonsterTurns(result.battleState)
      : result.battleState;

    const finalResult: BattleEngineResult = {
      ...result,
      battleState: battleAfterMonsterTurns,
    };

    this.battles.set(finalResult.battleState.battleId, finalResult.battleState);

    return finalResult;
  }

  saveBattle(battle: BattleState): BattleState {
    this.battles.set(battle.battleId, battle);

    return battle;
  }

  deleteBattle(battleId: string): boolean {
    return this.battles.delete(battleId);
  }

  clearBattles(): void {
    this.battles.clear();
  }

  private assertClientCanControlActor(
    battle: BattleState,
    actorId: string,
  ): void {
    const actor = battle.actors[actorId];

    if (!actor) {
      throw new Error(`Battle actor not found: ${actorId}`);
    }

    if (actor.actorType !== 'character') {
      throw new Error(
        `Client cannot directly control monster actor: ${actorId}`,
      );
    }
  }

  private resolveAutoMonsterTurns(battle: BattleState): BattleState {
    let nextBattle = battle;
    let actionCount = 0;

    while (
      nextBattle.status === 'in_progress' &&
      nextBattle.activeActorId &&
      actionCount < MAX_AUTO_MONSTER_ACTIONS
    ) {
      const activeActor = nextBattle.actors[nextBattle.activeActorId];

      if (!activeActor || activeActor.actorType !== 'monster') {
        break;
      }

      const target = this.findMonsterTarget(nextBattle);

      if (!target) {
        break;
      }

      const result = resolveBattleAction(nextBattle, {
        battleId: nextBattle.battleId,
        actorId: activeActor.actorId,
        targetIds: [target.actorId],
        actionType: 'basic_attack',
      });

      nextBattle = result.battleState;
      actionCount += 1;
    }

    if (actionCount >= MAX_AUTO_MONSTER_ACTIONS) {
      throw new Error('Auto monster turn limit reached.');
    }

    return nextBattle;
  }

  private findMonsterTarget(battle: BattleState): BattleActorState | undefined {
    return Object.values(battle.actors)
      .filter((actor) => actor.actorType === 'character' && actor.hp > 0)
      .sort((left, right) => {
        if (left.hp !== right.hp) {
          return left.hp - right.hp;
        }

        return left.actorId.localeCompare(right.actorId);
      })[0];
  }
}
