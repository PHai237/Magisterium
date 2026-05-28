import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { EXPLORATION_ZONE_IDS } from '../exploration.definitions';

import type { ExplorationZoneId } from '../exploration.types';

const CHARACTER_ID_MAX_LENGTH = 128;

export class SearchZoneDto {
  @IsString()
  @IsNotEmpty({
    message: 'Character id must not be empty.',
  })
  @MaxLength(CHARACTER_ID_MAX_LENGTH, {
    message: `Character id must not exceed ${CHARACTER_ID_MAX_LENGTH} characters.`,
  })
  characterId!: string;

  @IsString()
  @IsNotEmpty({
    message: 'Exploration zone id must not be empty.',
  })
  @IsIn(EXPLORATION_ZONE_IDS, {
    message: `Exploration zone id must be one of: ${EXPLORATION_ZONE_IDS.join(', ')}.`,
  })
  zoneId!: ExplorationZoneId;
}
