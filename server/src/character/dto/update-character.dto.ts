import { Transform } from 'class-transformer';

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

import {
  CHARACTER_NAME_MAX_LENGTH,
  CHARACTER_NAME_MIN_LENGTH,
  CHARACTER_NAME_PATTERN,
  CHARACTER_NAME_PATTERN_MESSAGE,
  normalizeCharacterNameInput,
} from '../character.validation';

export class UpdateCharacterDto {
  @IsOptional()
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
  name?: string;
}
