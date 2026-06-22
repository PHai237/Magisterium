import type { ItemId } from '../character/character.types';
import type { MonsterId, MonsterRank } from '../monster/monster.types';

export interface LibraryDropRecord {
  itemId?: ItemId;
  name: string;
  discovered: boolean;
}

export interface LibraryMonsterRecord {
  monsterId: MonsterId;
  unlocked: boolean;
  name: string;
  description?: string;
  rank?: MonsterRank;
  defeatCount: number;
  zoneNames: string[];
  drops: LibraryDropRecord[];
}

export interface LibraryBestiaryResult {
  totalRecords: number;
  unlockedRecords: number;
  monsters: LibraryMonsterRecord[];
}
