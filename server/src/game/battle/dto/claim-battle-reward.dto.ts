import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { BATTLE_ID_MAX_LENGTH } from './create-battle.dto';

export class ClaimBattleRewardDto {
  @IsString()
  @IsNotEmpty({
    message: 'characterId is required to claim battle reward.',
  })
  @MaxLength(BATTLE_ID_MAX_LENGTH)
  characterId!: string;

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
