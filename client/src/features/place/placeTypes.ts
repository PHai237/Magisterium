export type PlaceId = 'town' | 'tavern' | 'clinic' | 'lost_and_found';

export interface PlaceDefinition {
  id: PlaceId;
  name: string;
  description: string;
  unlocked: boolean;
}