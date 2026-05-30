import { Injectable } from '@nestjs/common';

import { CharacterService } from '../../character/character.service';

import type { StatKey } from '../character/character.types';

@Injectable()
export class SanctuaryService {
  constructor(private readonly characterService: CharacterService) {}

  getStatus(characterId: string, userId: string) {
    return this.characterService.getSanctuaryStatus(characterId, userId);
  }

  refineRune(characterId: string, userId: string, statKey: StatKey) {
    return this.characterService.refineStatRune(characterId, userId, statKey);
  }

  imbueRune(characterId: string, userId: string, statKey: StatKey) {
    return this.characterService.imbueStatRune(characterId, userId, statKey);
  }

  rankUp(characterId: string, userId: string) {
    return this.characterService.rankUpAtSanctuary(characterId, userId);
  }
}
