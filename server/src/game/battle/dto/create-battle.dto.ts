import { Type } from 'class-transformer';

import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { MAX_MANUAL_MONSTERS_PER_BATTLE } from '../battle.constants';

import { ENCOUNTER_IDS } from '../../encounter/encounter.definitions';
import type { EncounterId } from '../../encounter/encounter.types';

import { MONSTER_IDS } from '../../monster/monster.definitions';
import type { MonsterId } from '../../monster/monster.types';

export const BATTLE_ID_MAX_LENGTH = 128;
export const BATTLE_SEED_MAX_LENGTH = 128;

export class CreateBattleMonsterDto {
  @IsString()
  @IsNotEmpty({
    message: 'monsterId must not be empty.',
  })
  @IsIn(MONSTER_IDS, {
    message: `monsterId must be one of: ${MONSTER_IDS.join(', ')}.`,
  })
  monsterId!: MonsterId;

  @IsOptional()
  @IsString()
  @IsNotEmpty({
    message: 'instanceId must not be empty when provided.',
  })
  @MaxLength(BATTLE_ID_MAX_LENGTH)
  instanceId?: string;
}

export class CreateBattleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({
    message: 'battleId must not be empty when provided.',
  })
  @MaxLength(BATTLE_ID_MAX_LENGTH)
  battleId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({
    message: 'seed must not be empty when provided.',
  })
  @MaxLength(BATTLE_SEED_MAX_LENGTH)
  seed?: string;

  @IsString()
  @IsNotEmpty({
    message: 'characterId is required to create a battle.',
  })
  @MaxLength(BATTLE_ID_MAX_LENGTH)
  characterId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({
    message: 'encounterId must not be empty when provided.',
  })
  @MaxLength(BATTLE_ID_MAX_LENGTH)
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

  /**
   * Deprecated compatibility field. BattleController reads user scope from
   * x-user-id header only; this body field is ignored if clients still send it.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty({
    message: 'userId must not be empty when provided.',
  })
  @MaxLength(BATTLE_ID_MAX_LENGTH)
  userId?: string;
}
