import { IsIn } from 'class-validator';

import { STAT_KEYS } from '../../character/character.constants';

import type { StatKey } from '../../character/character.types';

export class SanctuaryStatDto {
  @IsIn(STAT_KEYS, {
    message: 'statKey must be one of STR, DEX, CON, INT, WIS, or LUK.',
  })
  statKey!: StatKey;
}
