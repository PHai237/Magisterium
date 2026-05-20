import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

import { MAX_MANUAL_MONSTERS_PER_BATTLE } from '../battle.constants';

import { ENCOUNTER_IDS } from '../../encounter/encounter.definitions';
import type { EncounterId } from '../../encounter/encounter.types';

import { MONSTER_IDS } from '../../monster/monster.definitions';
import type { MonsterId } from '../../monster/monster.types';

export class CreateBattleMonsterDto {
  @IsIn(MONSTER_IDS, {
    message: `monsterId must be one of: ${MONSTER_IDS.join(', ')}.`,
  })
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

  @IsOptional()
  @IsIn(ENCOUNTER_IDS, {
    message: `encounterId must be one of: ${ENCOUNTER_IDS.join(', ')}.`,
  })
  encounterId?: EncounterId;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, {
    message: 'monsters must contain at least one monster when provided.',
  })
  @ArrayMaxSize(MAX_MANUAL_MONSTERS_PER_BATTLE, {
    message: `monsters must not contain more than ${MAX_MANUAL_MONSTERS_PER_BATTLE} entries.`,
  })
  @ValidateNested({ each: true })
  @Type(() => CreateBattleMonsterDto)
  monsters?: CreateBattleMonsterDto[];

  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;

  @IsOptional()
  @IsBoolean()
  autoResolveMonsterTurns?: boolean;

  @IsString()
  @IsNotEmpty({
    message: 'userId is required to create a battle.',
  })
  userId!: string;
}
