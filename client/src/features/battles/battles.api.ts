import { apiDelete, apiGet, apiPost } from "../../lib/api/api-client";

import type {
  AppliedBattleRewardResponse,
  BattleActionType,
  BattleEngineResult,
  BattleState,
  CharacterSnapshot,
  EncounterId,
  ItemId,
  MonsterId,
  SkillId
} from "../../domain/magisterium.types";

export interface CreateBattlePayload {
  battleId?: string;
  seed?: string;
  characterId: string;
  encounterId?: EncounterId;
  monsters?: Array<{
    monsterId: MonsterId;
    instanceId?: string;
  }>;
  autoStart?: boolean;
  autoResolveMonsterTurns?: boolean;
}

export interface ResolveBattleActionPayload {
  actorId: string;
  targetIds?: string[];
  actionType: BattleActionType;
  skillId?: SkillId;
  itemId?: ItemId;
  autoResolveMonsterTurns?: boolean;
}

export const battlesApi = {
  list(userId: string) {
    return apiGet<BattleState[]>("/battles", { userId });
  },

  get(userId: string, battleId: string) {
    return apiGet<BattleState>(`/battles/${battleId}`, { userId });
  },

  create(userId: string, payload: CreateBattlePayload) {
    return apiPost<BattleState>("/battles", payload, { userId });
  },

  resolveAction(userId: string, battleId: string, payload: ResolveBattleActionPayload) {
    return apiPost<BattleEngineResult>(`/battles/${battleId}/actions`, payload, {
      userId
    });
  },

  claimReward(userId: string, battleId: string, character: CharacterSnapshot) {
    return apiPost<AppliedBattleRewardResponse>(
      `/battles/${battleId}/reward/claim`,
      {
        characterId: character.id
      },
      { userId }
    );
  },

  delete(userId: string, battleId: string) {
    return apiDelete<{ deleted: boolean }>(`/battles/${battleId}`, { userId });
  }
};
