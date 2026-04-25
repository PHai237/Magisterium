import type {
  BaseStats,
  DerivedStats,
  SkillDefinition,
} from '../character-creation/types';

import type { DungeonDefinition } from '../dungeon/dungeonTypes';
import type { ZoneDefinition } from '../zone/zoneTypes';
import type { MonsterBattleState } from '../monster/monsterTypes';

export type BattleStatus = 'active' | 'won' | 'lost' | 'escaped';

export type BattleSourceType = 'dungeon' | 'zone';

export type BattleContentSource =
  | {
      type: 'dungeon';
      data: DungeonDefinition;
    }
  | {
      type: 'zone';
      data: ZoneDefinition;
    };

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
  bronze: number;
}

export interface BattleLogEntry {
  id: string;
  turn: number;
  actor: BattleActor;
  message: string;
}

export interface BattleState {
  id: string;
  sourceType: BattleSourceType;
  sourceId: string;
  sourceName: string;
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