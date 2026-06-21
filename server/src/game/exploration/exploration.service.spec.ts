import { BadRequestException } from '@nestjs/common';
import { randomInt } from 'crypto';

import { CharacterService } from '../../character/character.service';
import type { CharacterSnapshot } from '../character/character.types';
import { ExplorationService } from './exploration.service';

jest.mock('crypto', () => ({
  ...jest.requireActual<typeof import('crypto')>('crypto'),
  randomInt: jest.fn(),
}));

describe('ExplorationService', () => {
  const character = {
    id: 'hero',
    currentState: {
      hp: 10,
      mp: 10,
      stamina: 20,
    },
  } as CharacterSnapshot;

  let service: ExplorationService;
  let characterService: {
    applyExplorationSearchResult: jest.Mock;
  };
  const randomIntMock = randomInt as jest.MockedFunction<typeof randomInt>;

  beforeEach(() => {
    characterService = {
      applyExplorationSearchResult: jest.fn().mockReturnValue(character),
    };
    service = new ExplorationService(
      characterService as unknown as CharacterService,
    );
  });

  afterEach(() => {
    randomIntMock.mockReset();
  });

  it('returns an encounter and charges the zone stamina cost', () => {
    randomIntMock.mockReturnValueOnce(1).mockReturnValueOnce(1);

    const result = service.searchZone({
      characterId: 'hero',
      userId: 'user_1',
      zoneId: 'town_outskirts',
    });

    expect(result).toMatchObject({
      outcomeType: 'encounter',
      encounterId: 'town_outskirts_slime',
      staminaCost: 5,
      character,
    });
    expect(characterService.applyExplorationSearchResult).toHaveBeenCalledWith(
      'hero',
      'user_1',
      {
        staminaCost: 5,
        moneyBronze: 0,
        items: [],
      },
    );
  });

  it('applies deterministic bronze and item outcomes from the selected zone', () => {
    randomIntMock.mockReturnValueOnce(41).mockReturnValueOnce(2);

    const bronzeResult = service.searchZone({
      characterId: 'hero',
      userId: 'user_1',
      zoneId: 'town_outskirts',
    });

    expect(bronzeResult).toMatchObject({
      outcomeType: 'bronze',
      bronzeFound: 2,
    });

    randomIntMock
      .mockReturnValueOnce(56)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(1);

    const itemResult = service.searchZone({
      characterId: 'hero_2',
      userId: 'user_1',
      zoneId: 'town_outskirts',
    });

    expect(itemResult).toMatchObject({
      outcomeType: 'item',
      itemFound: {
        itemId: 'stamina_bread',
        quantity: 1,
      },
    });
  });

  it('enforces the server-side cooldown per user, character, and zone', () => {
    randomIntMock.mockReturnValue(61);

    service.searchZone({
      characterId: 'hero',
      userId: 'user_1',
      zoneId: 'town_outskirts',
    });

    expect(() =>
      service.searchZone({
        characterId: 'hero',
        userId: 'user_1',
        zoneId: 'town_outskirts',
      }),
    ).toThrow(BadRequestException);
  });
});
