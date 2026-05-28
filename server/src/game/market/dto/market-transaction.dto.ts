import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

import type { ItemId } from '../../character/character.types';

export class MarketTransactionDto {
  @IsString()
  @IsNotEmpty({
    message: 'Character id must not be empty.',
  })
  characterId!: string;

  @IsString()
  @IsNotEmpty({
    message: 'Item id must not be empty.',
  })
  itemId!: ItemId;

  @IsInt()
  @Min(1, {
    message: 'Item quantity must be at least 1.',
  })
  quantity!: number;
}
