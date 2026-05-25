import { Transform } from 'class-transformer';

import { IsIn, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

import type { OriginId } from '../../game/character/character.types';

import {
  CHARACTER_NAME_MAX_LENGTH,
  CHARACTER_NAME_MIN_LENGTH,
  CHARACTER_NAME_PATTERN,
  CHARACTER_NAME_PATTERN_MESSAGE,
  normalizeCharacterNameInput,
} from '../character.validation';

const VALID_ORIGIN_IDS: readonly OriginId[] = [
  'scholar',
  'mercenary',
  'wanderer',
  'street_urchin',
  'acolyte',
];

export class CreateCharacterDto {
  @Transform(({ value }) => normalizeCharacterNameInput(value))
  @IsString()
  @IsNotEmpty({
    message: 'Character name must not be empty.',
  })
  @Length(CHARACTER_NAME_MIN_LENGTH, CHARACTER_NAME_MAX_LENGTH, {
    message: `Character name must be between ${CHARACTER_NAME_MIN_LENGTH} and ${CHARACTER_NAME_MAX_LENGTH} characters.`,
  })
  @Matches(CHARACTER_NAME_PATTERN, {
    message: CHARACTER_NAME_PATTERN_MESSAGE,
  })
  name!: string;

  @IsString()
  @IsNotEmpty({
    message: 'Origin must not be empty.',
  })
  @IsIn(VALID_ORIGIN_IDS, {
    message: `Origin must be one of: ${VALID_ORIGIN_IDS.join(', ')}.`,
  })
  originId!: OriginId;
}
