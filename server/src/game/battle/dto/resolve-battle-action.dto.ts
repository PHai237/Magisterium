import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

import type { BattleActionType } from '../battle.types';

export class ResolveBattleActionDto {
  @IsString()
  actorId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetIds?: string[];

  @IsIn(['basic_attack', 'use_skill', 'guard', 'use_item', 'flee', 'skip_turn'])
  actionType!: BattleActionType;

  @IsOptional()
  @IsString()
  skillId?: string;

  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsBoolean()
  autoResolveMonsterTurns?: boolean;
}
