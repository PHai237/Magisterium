import { apiPost } from "../../lib/api/api-client";

import type {
  ExplorationSearchResult,
  ExplorationZoneId
} from "../../domain/magisterium.types";

export interface SearchZonePayload {
  characterId: string;
  zoneId: ExplorationZoneId;
}

export const explorationApi = {
  search(userId: string, payload: SearchZonePayload) {
    return apiPost<ExplorationSearchResult>("/exploration/search", payload, {
      userId
    });
  }
};
