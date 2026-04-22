import type {
  BaseStats,
  DerivedStats,
  SkillDefinition,
} from '../character-creation/types';

import type { DungeonId } from '../dungeon/dungeonTypes';
import type { MonsterBattleState } from '../monster/monsterTypes';

export type BattleStatus = 'active' | 'won' | 'lost';

export type BattleActor = 'player' | 'monster' | 'system';

export type BattleActionType = 'basic_attack' | 'skill';

export interface PlayerBattleState {
  name: string;
  className: string;
  level: number;
  baseStats: BaseStats;
  derivedStats: DerivedStats;
  currentHp: number;
  currentMp: number;
  currentEnergy: number;
  shield: number;
  evasionChanceBonus: number;
  nextDamageReductionPercent: number;
  skills: SkillDefinition[];
}

export interface BattleReward {
  exp: number;
  gold: number;
}

export interface BattleLogEntry {
  id: string;
  turn: number;
  actor: BattleActor;
  message: string;
}

export interface BattleState {
  id: string;
  dungeonId: DungeonId;
  dungeonName: string;
  player: PlayerBattleState;
  monster: MonsterBattleState;
  status: BattleStatus;
  turn: number;
  currentActor: Exclude<BattleActor, 'system'>;
  logs: BattleLogEntry[];
  reward: BattleReward;
}

export interface BattleAction {
  type: BattleActionType;
  skillId?: string;
}