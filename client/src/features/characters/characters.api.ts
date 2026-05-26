import { apiDelete, apiGet, apiPost, apiPut } from "../../lib/api/api-client";

import type {
  CharacterConsumableMutationResult,
  CharacterCreationPreview,
  CharacterEquipmentMutationResult,
  CharacterSnapshot,
  InventoryItemStack,
  ItemId,
  OriginId
} from "../../domain/magisterium.types";

export interface CreateCharacterPayload {
  name: string;
  originId: OriginId;
}

export interface PreviewCharacterPayload {
  originId: OriginId;
}

export interface UpdateCharacterPayload {
  name?: string;
}

export const charactersApi = {
  list(userId: string) {
    return apiGet<CharacterSnapshot[]>("/characters", { userId });
  },

  getCurrent(userId: string) {
    return apiGet<CharacterSnapshot | null>("/characters/current", { userId });
  },

  preview(userId: string, payload: PreviewCharacterPayload) {
    return apiPost<CharacterCreationPreview>("/characters/preview", payload, {
      userId
    });
  },

  create(userId: string, payload: CreateCharacterPayload) {
    return apiPost<CharacterSnapshot>("/characters", payload, { userId });
  },

  setCurrent(userId: string, characterId: string) {
    return apiPost<CharacterSnapshot>(
      `/characters/${characterId}/current`,
      undefined,
      {
        userId
      }
    );
  },

  getById(userId: string, characterId: string) {
    return apiGet<CharacterSnapshot>(`/characters/${characterId}`, { userId });
  },

  update(userId: string, characterId: string, payload: UpdateCharacterPayload) {
    return apiPut<CharacterSnapshot>(`/characters/${characterId}`, payload, {
      userId
    });
  },

  delete(userId: string, characterId: string) {
    return apiDelete<{ deleted: boolean; id: string }>(
      `/characters/${characterId}`,
      {
        userId
      }
    );
  },

  getInventory(userId: string, characterId: string) {
    return apiGet<InventoryItemStack[]>(
      `/characters/${characterId}/inventory`,
      {
        userId
      }
    );
  },

  equip(userId: string, characterId: string, itemId: ItemId) {
    return apiPost<CharacterEquipmentMutationResult>(
      `/characters/${characterId}/equipment/equip`,
      { itemId },
      { userId }
    );
  },

  unequip(userId: string, characterId: string, itemId: ItemId) {
    return apiPost<CharacterEquipmentMutationResult>(
      `/characters/${characterId}/equipment/unequip`,
      { itemId },
      { userId }
    );
  },

  useConsumable(userId: string, characterId: string, itemId: ItemId) {
    return apiPost<CharacterConsumableMutationResult>(
      `/characters/${characterId}/consumables/use`,
      { itemId },
      { userId }
    );
  }
};