import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { BATTLE_ACTION_TYPES, type BattleActionType } from '../battle.types';

import type { ItemId, SkillId } from '../../character/character.types';

const MAX_TARGET_IDS_PER_ACTION = 12;
const BATTLE_ACTION_ID_MAX_LENGTH = 128;

export class ResolveBattleActionDto {
  @IsString()
  @IsNotEmpty({
    message: 'actorId must not be empty.',
  })
  @MaxLength(BATTLE_ACTION_ID_MAX_LENGTH)
  actorId!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TARGET_IDS_PER_ACTION, {
    message: `targetIds must not contain more than ${MAX_TARGET_IDS_PER_ACTION} entries.`,
  })
  @ArrayUnique({
    message: 'targetIds must not contain duplicate actor ids.',
  })
  @IsString({
    each: true,
    message: 'Each target id must be a string.',
  })
  @MaxLength(BATTLE_ACTION_ID_MAX_LENGTH, {
    each: true,
  })
  targetIds?: string[];

  @IsString()
  @IsNotEmpty({
    message: 'actionType must not be empty.',
  })
  @MaxLength(BATTLE_ACTION_ID_MAX_LENGTH)
  @IsIn(BATTLE_ACTION_TYPES, {
    message: `actionType must be one of: ${BATTLE_ACTION_TYPES.join(', ')}.`,
  })
  actionType!: BattleActionType;

  @IsOptional()
  @IsString()
  @IsNotEmpty({
    message: 'skillId must not be empty when provided.',
  })
  @MaxLength(BATTLE_ACTION_ID_MAX_LENGTH)
  skillId?: SkillId;

  @IsOptional()
  @IsString()
  @IsNotEmpty({
    message: 'itemId must not be empty when provided.',
  })
  @MaxLength(BATTLE_ACTION_ID_MAX_LENGTH)
  itemId?: ItemId;

  @IsOptional()
  @IsBoolean()
  autoResolveMonsterTurns?: boolean;
}
