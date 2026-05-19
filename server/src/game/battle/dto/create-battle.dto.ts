import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

import type { MonsterId } from '../../monster/monster.types';

export class CreateBattleMonsterDto {
  @IsIn(['slime', 'goblin'])
  monsterId!: MonsterId;

  @IsOptional()
  @IsString()
  instanceId?: string;
}

export class CreateBattleDto {
  @IsOptional()
  @IsString()
  battleId?: string;

  @IsOptional()
  @IsString()
  seed?: string;

  @IsString()
  characterId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBattleMonsterDto)
  monsters!: CreateBattleMonsterDto[];

  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;

  @IsOptional()
  @IsBoolean()
  autoResolveMonsterTurns?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;
}
