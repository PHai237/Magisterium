export type PlaceId = 'town' | 'tavern' | 'clinic';

export interface PlaceDefinition {
  id: PlaceId;
  name: string;
  description: string;
  unlocked: boolean;
}