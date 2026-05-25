import { IsIn, IsNotEmpty, IsString } from 'class-validator';

import { ORIGIN_DEFINITIONS } from '../../game/character/character.constants';

import type { OriginId } from '../../game/character/character.types';

const VALID_ORIGIN_IDS = ORIGIN_DEFINITIONS.map((origin) => origin.id);

export class PreviewCharacterDto {
  @IsString()
  @IsNotEmpty({
    message: 'Origin must not be empty.',
  })
  @IsIn(VALID_ORIGIN_IDS, {
    message: `Origin must be one of: ${VALID_ORIGIN_IDS.join(', ')}.`,
  })
  originId!: OriginId;
}
