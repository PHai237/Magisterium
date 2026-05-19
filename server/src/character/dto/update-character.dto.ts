import { Transform, Type, type TransformFnParams } from 'class-transformer';

import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  const rawValue: unknown = value;

  if (typeof rawValue === 'string') {
    return rawValue.trim();
  }

  return rawValue;
}

export class UpdateCurrentStateDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  hp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  mp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stamina?: number;
}

export class UpdateCharacterDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({
    message: 'Character name must not be empty.',
  })
  @Length(3, 20, {
    message: 'Character name must be between 3 and 20 characters.',
  })
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCurrentStateDto)
  currentState?: UpdateCurrentStateDto;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  userId?: string;
}
