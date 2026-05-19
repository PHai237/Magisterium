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

export interface CreateBattleFromCharacterInput {
  battleId?: string;
  seed?: string;

  character: CharacterBattleSnapshot;
  monsters: CreateMonsterBattleActorInput[];

  autoStart?: boolean;
}

export interface CreateBattleFromActorsInput {
  battleId?: string;
  seed?: string;

  actors: BattleActorState[];

  autoStart?: boolean;
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
    });
  }

  createBattleFromActors(input: CreateBattleFromActorsInput): BattleState {
    const battle = createBattleState({
      battleId: input.battleId,
      seed: input.seed,
      actors: input.actors,
    });

    const shouldAutoStart = input.autoStart ?? true;
    const nextBattle = shouldAutoStart ? startBattle(battle) : battle;

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

  resolveAction(command: BattleActionCommand): BattleEngineResult {
    const battle = this.getBattleOrThrow(command.battleId);

    const result = resolveBattleAction(battle, command);

    this.battles.set(result.battleState.battleId, result.battleState);

    return result;
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
}
