import { IsNotEmpty, IsString } from 'class-validator';

import type { ItemId } from '../../game/character/character.types';

export class InventoryItemActionDto {
  @IsString()
  @IsNotEmpty({
    message: 'Item id must not be empty.',
  })
  itemId!: ItemId;
}
