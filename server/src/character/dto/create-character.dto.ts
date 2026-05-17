import { Transform, type TransformFnParams } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, Length } from 'class-validator';

import { ORIGIN_DEFINITIONS } from '../../game/character/character.constants';
import type { OriginId } from '../../game/character/character.types';

const VALID_ORIGIN_IDS: OriginId[] = ORIGIN_DEFINITIONS.map(
  (origin) => origin.id,
);

function trimString({ value }: TransformFnParams): unknown {
  const rawValue: unknown = value;

  if (typeof rawValue === 'string') {
    return rawValue.trim();
  }

  return rawValue;
}

export class CreateCharacterDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({
    message: 'Character name must not be empty.',
  })
  @Length(3, 20, {
    message: 'Character name must be between 3 and 20 characters.',
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
