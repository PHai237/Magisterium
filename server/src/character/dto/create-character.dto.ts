import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import type {
  ClassId,
  GiftId,
} from '../../game/character/character.types';

const VALID_CLASS_IDS: ClassId[] = [
  'warrior',
  'mage',
  'archer',
  'rogue',
  'healer',
];

const VALID_GIFT_IDS: GiftId[] = [
  'stale_bread',
  'guide_book',
  'small_pouch',
];

export class CreateCharacterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name!: string;

  @IsString()
  @IsIn(VALID_CLASS_IDS)
  classId!: ClassId;

  @IsString()
  @IsIn(VALID_GIFT_IDS)
  giftId!: GiftId;
}