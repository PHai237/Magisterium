import { apiGet } from "../../lib/api/api-client";
import type { ItemId, MonsterId } from "../../domain/magisterium.types";

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
  rank?: "normal" | "elite" | "boss";
  defeatCount: number;
  zoneNames: string[];
  drops: LibraryDropRecord[];
}

export interface LibraryBestiaryResult {
  totalRecords: number;
  unlockedRecords: number;
  monsters: LibraryMonsterRecord[];
}

export const libraryApi = {
  getBestiary(userId: string, characterId: string) {
    return apiGet<LibraryBestiaryResult>(`/library/${characterId}/bestiary`, {
      userId,
    });
  },
};
