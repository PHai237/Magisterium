import { apiGet, apiPost } from "../../lib/api/api-client";

import type {
  CharacterRankUpResult,
  CharacterRuneImbueResult,
  CharacterRuneRefinementResult,
  CharacterSanctuaryStatusResult,
  StatKey
} from "../../domain/magisterium.types";

export const sanctuaryApi = {
  getStatus(userId: string, characterId: string) {
    return apiGet<CharacterSanctuaryStatusResult>(
      `/sanctuary/${characterId}/status`,
      { userId }
    );
  },

  refineRune(
    userId: string,
    characterId: string,
    statKey: StatKey,
    quantity = 1
  ) {
    return apiPost<CharacterRuneRefinementResult>(
      `/sanctuary/${characterId}/refine-rune`,
      { statKey, quantity },
      { userId }
    );
  },

  imbueRune(
    userId: string,
    characterId: string,
    statKey: StatKey,
    quantity = 1
  ) {
    return apiPost<CharacterRuneImbueResult>(
      `/sanctuary/${characterId}/imbue-rune`,
      { statKey, quantity },
      { userId }
    );
  },

  rankUp(userId: string, characterId: string) {
    return apiPost<CharacterRankUpResult>(
      `/sanctuary/${characterId}/rank-up`,
      undefined,
      { userId }
    );
  }
};
