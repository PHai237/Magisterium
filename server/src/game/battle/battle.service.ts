import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { randomUUID } from 'crypto';

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

import {
  MAX_AUTO_MONSTER_ACTIONS,
  MAX_BATTLE_EVENTS_RETAINED,
  MAX_MANUAL_MONSTERS_PER_BATTLE,
  MIN_ACTION_SPEED,
  TURN_GAUGE_READY_VALUE,
} from './battle.constants';

import { hashStringToUnitInterval } from './battle.calculations';

import type {
  BattleActionCommand,
  BattleActorState,
  BattleEvent,
  BattleEventType,
  BattleState,
  BattleTurnOrderEntry,
} from './battle.types';

import {
  buildEncounterMonsterInputs,
  getEncounterDefinitionById,
} from '../encounter/encounter.factory';

import type {
  EncounterId,
  EncounterZoneId,
} from '../encounter/encounter.types';

import {
  createMonsterBattleActor,
  createMonsterBattleActors,
} from '../monster/monster.factory';

import type {
  CreateMonsterBattleActorInput,
  MonsterAiTargetingMode,
} from '../monster/monster.types';

const PINNED_BATTLE_EVENT_TYPES = new Set<BattleEventType>([
  'BATTLE_STARTED',
  'BATTLE_ENDED',
]);

export interface CreateBattleFromCharacterInput {
  battleId?: string;
  seed?: string;

  encounterId?: EncounterId;
  zoneId?: EncounterZoneId;

  character: CharacterBattleSnapshot;
  monsters: CreateMonsterBattleActorInput[];

  autoStart?: boolean;
  autoResolveMonsterTurns?: boolean;
}

export interface CreateBattleFromEncounterInput {
  battleId?: string;
  seed?: string;

  character: CharacterBattleSnapshot;
  encounterId: EncounterId;

  autoStart?: boolean;
  autoResolveMonsterTurns?: boolean;
}

export interface CreateBattleFromActorsInput {
  battleId?: string;
  seed?: string;

  encounterId?: EncounterId;
  zoneId?: EncounterZoneId;

  actors: BattleActorState[];

  autoStart?: boolean;
  autoResolveMonsterTurns?: boolean;
}

export interface ResolveBattleActionInput extends BattleActionCommand {
  autoResolveMonsterTurns?: boolean;
}

@Injectable()
export class BattleService {
  private readonly logger = new Logger(BattleService.name);
  private readonly battles = new Map<string, BattleState>();

  createBattleFromCharacter(
    input: CreateBattleFromCharacterInput,
  ): BattleState {
    if (input.monsters.length === 0) {
      throw new BadRequestException('Cannot create a battle without monsters.');
    }

    if (input.monsters.length > MAX_MANUAL_MONSTERS_PER_BATTLE) {
      throw new BadRequestException(
        `Cannot create a battle with more than ${MAX_MANUAL_MONSTERS_PER_BATTLE} monsters.`,
      );
    }

    const characterActor = createBattleActorFromCharacterSnapshot(
      input.character,
    );

    const monsterActors = createMonsterBattleActors(input.monsters);

    return this.createBattleFromActors({
      battleId: input.battleId,
      seed: input.seed,
      encounterId: input.encounterId,
      zoneId: input.zoneId,
      actors: [characterActor, ...monsterActors],
      autoStart: input.autoStart,
      autoResolveMonsterTurns: input.autoResolveMonsterTurns,
    });
  }

  createBattleFromEncounter(
    input: CreateBattleFromEncounterInput,
  ): BattleState {
    const encounter = getEncounterDefinitionById(input.encounterId);
    const monsterInputs = buildEncounterMonsterInputs(encounter);

    return this.createBattleFromCharacter({
      battleId: input.battleId,
      seed: input.seed,
      encounterId: encounter.id,
      zoneId: encounter.zoneId,
      character: input.character,
      monsters: monsterInputs,
      autoStart: input.autoStart,
      autoResolveMonsterTurns: input.autoResolveMonsterTurns,
    });
  }

  createBattleFromActors(input: CreateBattleFromActorsInput): BattleState {
    const battle = createBattleState({
      battleId: input.battleId,
      seed: input.seed,
      encounterId: input.encounterId,
      zoneId: input.zoneId,
      actors: input.actors,
    });

    const shouldAutoStart = input.autoStart ?? true;
    const shouldAutoResolveMonsterTurns = input.autoResolveMonsterTurns ?? true;

    const startedBattle = shouldAutoStart ? startBattle(battle) : battle;

    const nextBattle =
      shouldAutoStart && shouldAutoResolveMonsterTurns
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
      throw new NotFoundException(`Battle not found: ${battleId}`);
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
      throw new NotFoundException(`Battle actor not found: ${actorId}`);
    }

    if (actor.actorType !== 'character') {
      throw new ForbiddenException(
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

      const target = this.findMonsterTarget(nextBattle, activeActor);

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
      this.logger.warn(
        `Auto monster turn limit reached for battle ${nextBattle.battleId}. Returning latest safe battle state.`,
      );

      return this.forceHandControlToLivingCharacterIfNeeded(nextBattle);
    }

    return nextBattle;
  }

  private forceHandControlToLivingCharacterIfNeeded(
    battle: BattleState,
  ): BattleState {
    if (battle.status !== 'in_progress') {
      return battle;
    }

    const activeActor = battle.activeActorId
      ? battle.actors[battle.activeActorId]
      : undefined;

    if (!activeActor || activeActor.actorType !== 'monster') {
      return battle;
    }

    const livingCharacter = Object.values(battle.actors)
      .filter((actor) => actor.actorType === 'character' && actor.hp > 0)
      .sort((left, right) => left.actorId.localeCompare(right.actorId))[0];

    if (!livingCharacter) {
      return battle;
    }

    this.logger.warn(
      `Force passing control to character ${livingCharacter.actorId} in battle ${battle.battleId} to avoid client softlock.`,
    );

    const nextBattle: BattleState = {
      ...battle,
      activeActorId: livingCharacter.actorId,
      turnOrder: this.ensureReadyTurnOrderEntryForActor(
        battle.turnOrder,
        livingCharacter,
      ),
      updatedAt: new Date().toISOString(),
    };

    return this.appendEvents(nextBattle, [
      this.createBattleEvent({
        type: 'CONTROL_FORCED',
        phase: 'initiation',
        actorId: livingCharacter.actorId,
        message:
          'Battle control was forced back to a living character to avoid softlock.',
        metadata: {
          previousActiveActorId: activeActor.actorId,
          reason: 'auto_monster_turn_limit',
        },
      }),
      this.createBattleEvent({
        type: 'TURN_STARTED',
        phase: 'initiation',
        actorId: livingCharacter.actorId,
        message: 'Turn started after forced control handoff.',
        metadata: {
          forced: true,
          previousActiveActorId: activeActor.actorId,
        },
      }),
    ]);
  }

  private ensureReadyTurnOrderEntryForActor(
    turnOrder: BattleTurnOrderEntry[],
    actor: BattleActorState,
  ): BattleTurnOrderEntry[] {
    const existingEntry = turnOrder.find(
      (entry) => entry.actorId === actor.actorId,
    );

    if (!existingEntry) {
      return [
        ...turnOrder,
        {
          actorId: actor.actorId,
          actionSpeed: Math.max(
            MIN_ACTION_SPEED,
            actor.derivedStats.actionSpeed,
          ),
          initiative: turnOrder.length,
          turnGauge: TURN_GAUGE_READY_VALUE,
          hasActedThisRound: false,
        },
      ];
    }

    return turnOrder.map((entry) =>
      entry.actorId === actor.actorId
        ? {
            ...entry,
            actionSpeed: Math.max(MIN_ACTION_SPEED, entry.actionSpeed),
            turnGauge: Math.max(entry.turnGauge, TURN_GAUGE_READY_VALUE),
            hasActedThisRound: false,
          }
        : entry,
    );
  }

  private findMonsterTarget(
    battle: BattleState,
    monsterActor: BattleActorState,
  ): BattleActorState | undefined {
    const livingCharacters = Object.values(battle.actors).filter(
      (actor) => actor.actorType === 'character' && actor.hp > 0,
    );

    if (livingCharacters.length === 0) {
      return undefined;
    }

    const targetingMode =
      (monsterActor.aiTargetingMode as MonsterAiTargetingMode | undefined) ??
      'lowest_hp';

    switch (targetingMode) {
      case 'highest_threat':
        return this.findHighestThreatTarget(livingCharacters);

      case 'random':
        return this.findDeterministicRandomTarget(
          battle,
          monsterActor,
          livingCharacters,
        );

      case 'lowest_hp':
      default:
        return this.findLowestHpTarget(livingCharacters);
    }
  }

  private findHighestThreatTarget(
    livingCharacters: BattleActorState[],
  ): BattleActorState {
    return [...livingCharacters].sort((left, right) => {
      const rightThreat = right.derivedStats.pAtk + right.derivedStats.mAtk;
      const leftThreat = left.derivedStats.pAtk + left.derivedStats.mAtk;

      if (rightThreat !== leftThreat) {
        return rightThreat - leftThreat;
      }

      if (left.hp !== right.hp) {
        return left.hp - right.hp;
      }

      return left.actorId.localeCompare(right.actorId);
    })[0];
  }

  private findLowestHpTarget(
    livingCharacters: BattleActorState[],
  ): BattleActorState {
    return [...livingCharacters].sort((left, right) => {
      if (left.hp !== right.hp) {
        return left.hp - right.hp;
      }

      return left.actorId.localeCompare(right.actorId);
    })[0];
  }

  private findDeterministicRandomTarget(
    battle: BattleState,
    monsterActor: BattleActorState,
    livingCharacters: BattleActorState[],
  ): BattleActorState {
    const targetIndex = Math.floor(
      hashStringToUnitInterval(
        [
          battle.battleId,
          battle.randomContext.seed,
          battle.turnNumber,
          monsterActor.actorId,
          'monster_target',
        ].join(':'),
      ) * livingCharacters.length,
    );

    return livingCharacters[targetIndex] ?? livingCharacters[0];
  }

  private createBattleEvent(input: Omit<BattleEvent, 'id'>): BattleEvent {
    return {
      id: randomUUID(),
      ...input,
    };
  }

  private appendEvents(
    battle: BattleState,
    events: BattleEvent[],
  ): BattleState {
    const combinedEvents = [...battle.events, ...events];

    const pinnedEvents = combinedEvents.filter((event) =>
      PINNED_BATTLE_EVENT_TYPES.has(event.type),
    );

    const nonPinnedEvents = combinedEvents.filter(
      (event) => !PINNED_BATTLE_EVENT_TYPES.has(event.type),
    );

    const recentEventLimit = Math.max(
      0,
      MAX_BATTLE_EVENTS_RETAINED - pinnedEvents.length,
    );

    return {
      ...battle,
      events: [
        ...pinnedEvents.slice(0, MAX_BATTLE_EVENTS_RETAINED),
        ...nonPinnedEvents.slice(-recentEventLimit),
      ],
      updatedAt: new Date().toISOString(),
    };
  }
}
