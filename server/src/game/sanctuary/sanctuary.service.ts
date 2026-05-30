import { Injectable } from '@nestjs/common';

import { CharacterService } from '../../character/character.service';

import type { StatKey } from '../character/character.types';

@Injectable()
export class SanctuaryService {
  constructor(private readonly characterService: CharacterService) {}

  getStatus(characterId: string, userId: string) {
    return this.characterService.getSanctuaryStatus(characterId, userId);
  }

  refineRune(
    characterId: string,
    userId: string,
    statKey: StatKey,
    quantity = 1,
  ) {
    return this.characterService.refineStatRune(
      characterId,
      userId,
      statKey,
      quantity,
    );
  }

  imbueRune(
    characterId: string,
    userId: string,
    statKey: StatKey,
    quantity = 1,
  ) {
    return this.characterService.imbueStatRune(
      characterId,
      userId,
      statKey,
      quantity,
    );
  }

  rankUp(characterId: string, userId: string) {
    return this.characterService.rankUpAtSanctuary(characterId, userId);
  }
}
