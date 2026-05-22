import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimBattleRewardDto {
  @IsString()
  @IsNotEmpty({
    message: 'characterId is required to claim battle reward.',
  })
  characterId!: string;

  @IsString()
  @IsNotEmpty({
    message: 'userId is required to claim battle reward.',
  })
  userId!: string;
}
