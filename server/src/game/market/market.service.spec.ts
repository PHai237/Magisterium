import { BadRequestException } from '@nestjs/common';

import { CharacterService } from '../../character/character.service';
import { MarketService } from './market.service';

describe('MarketService', () => {
  let service: MarketService;
  let characterService: {
    buyMarketItem: jest.Mock;
    sellMarketItem: jest.Mock;
  };

  beforeEach(() => {
    characterService = {
      buyMarketItem: jest.fn().mockReturnValue({ character: { id: 'hero' } }),
      sellMarketItem: jest.fn().mockReturnValue({ character: { id: 'hero' } }),
    };

    service = new MarketService(
      characterService as unknown as CharacterService,
    );
  });

  it('publishes survival supplies across all open vendors', () => {
    const catalog = service.getCatalog(new Date('2026-06-22T12:00:00.000Z'));
    const itemIds = catalog.vendors.flatMap((vendor) =>
      vendor.items.map((item) => item.itemId),
    );

    expect(itemIds).toEqual(
      expect.arrayContaining([
        'stamina_bread',
        'minor_hp_potion',
        'minor_mp_potion',
        'one_night_inn_pass',
        'rough_wood',
        'rough_stone',
      ]),
    );
    expect(catalog.vendors.every((vendor) => vendor.items.length > 0)).toBe(
      true,
    );
  });

  it('delegates purchases and reduces stock for the current restock period', () => {
    const before = service.getCatalog();
    const potionBefore = before.vendors
      .flatMap((vendor) => vendor.items)
      .find((item) => item.itemId === 'minor_mp_potion');

    expect(potionBefore).toBeDefined();

    service.buyItem({
      characterId: 'hero',
      userId: 'user_1',
      itemId: 'minor_mp_potion',
      quantity: 1,
    });

    const after = service.getCatalog();
    const potionAfter = after.vendors
      .flatMap((vendor) => vendor.items)
      .find((item) => item.itemId === 'minor_mp_potion');

    expect(characterService.buyMarketItem).toHaveBeenCalledWith(
      'hero',
      'user_1',
      'minor_mp_potion',
      1,
      5,
    );
    expect(potionAfter?.currentStock).toBe(
      (potionBefore?.currentStock ?? 0) - 1,
    );
  });

  it('rejects purchases beyond available stock', () => {
    const catalog = service.getCatalog();
    const bread = catalog.vendors
      .flatMap((vendor) => vendor.items)
      .find((item) => item.itemId === 'stamina_bread');

    expect(() =>
      service.buyItem({
        characterId: 'hero',
        userId: 'user_1',
        itemId: 'stamina_bread',
        quantity: (bread?.currentStock ?? 0) + 1,
      }),
    ).toThrow(BadRequestException);
  });

  it('only buys back monster loot with a positive sell price', () => {
    service.sellItem({
      characterId: 'hero',
      userId: 'user_1',
      itemId: 'slime_gel',
      quantity: 2,
    });

    expect(characterService.sellMarketItem).toHaveBeenCalledWith(
      'hero',
      'user_1',
      'slime_gel',
      2,
      1,
    );

    expect(() =>
      service.sellItem({
        characterId: 'hero',
        userId: 'user_1',
        itemId: 'minor_hp_potion',
        quantity: 1,
      }),
    ).toThrow(BadRequestException);
  });
});
