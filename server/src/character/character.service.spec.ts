import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CharacterService } from './character.service';

import {
  ORIGIN_DEFINITIONS,
  STARTER_KIT_DEFINITIONS,
} from '../game/character/character.constants';

import type {
  Character,
  OriginId,
  StarterKitId,
} from '../game/character/character.types';

import type { BattleRewardSummary } from '../game/reward/reward.types';

function getOriginDefinition(originId: OriginId) {
  const origin = ORIGIN_DEFINITIONS.find((item) => item.id === originId);

  if (!origin) {
    throw new Error(`Test origin not found: ${originId}`);
  }

  return origin;
}

function getStarterKitDefinition(starterKitId: StarterKitId) {
  const starterKit = STARTER_KIT_DEFINITIONS.find(
    (item) => item.id === starterKitId,
  );

  if (!starterKit) {
    throw new Error(`Test starter kit not found: ${starterKitId}`);
  }

  return starterKit;
}

function createBattleRewardSummary(
  overrides: Partial<BattleRewardSummary> = {},
): BattleRewardSummary {
  return {
    moneyBronze: 7,

    items: [
      {
        itemId: 'slime_gel',
        quantity: 2,
      },
      {
        itemId: 'goblin_ear',
        quantity: 1,
      },
    ],

    defeatedMonsters: [
      {
        actorId: 'slime_1',
        monsterId: 'slime',
      },
      {
        actorId: 'goblin_1',
        monsterId: 'goblin',
      },
    ],

    lootRolls: [],

    ...overrides,
  };
}

function updateStoredCharacterForTest(
  service: CharacterService,
  characterId: string,
  updater: (character: Character) => Character,
): void {
  const testService = service as unknown as {
    characters: Map<string, Character>;
  };

  const existingCharacter = testService.characters.get(characterId);

  if (!existingCharacter) {
    throw new Error(`Test character not found: ${characterId}`);
  }

  testService.characters.set(characterId, updater(existingCharacter));
}

describe('CharacterService', () => {
  let service: CharacterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CharacterService],
    }).compile();

    service = module.get<CharacterService>(CharacterService);
  });

  afterEach(() => {
    service.clearCharacters();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return character module ping', () => {
    expect(service.ping()).toMatchObject({
      status: 'ok',
      module: 'character',
      message: 'Character module is ready.',
    });
  });

  it('should reject character creation without userId', () => {
    expect(() =>
      service.create({
        name: 'Magica',
        originId: 'scholar',
      } as never),
    ).toThrow(BadRequestException);
  });

  it('should reject an invisible zero-width character name', () => {
    expect(() =>
      service.create({
        name: '\u200B\u200B\u200B\u200B\u200B',
        originId: 'scholar',
        userId: 'user_1',
      }),
    ).toThrow(BadRequestException);
  });

  it('should reject a character name containing script-like symbols', () => {
    expect(() =>
      service.create({
        name: '<script>',
        originId: 'scholar',
        userId: 'user_1',
      }),
    ).toThrow(BadRequestException);
  });

  it('should normalize character name whitespace', () => {
    const character = service.create({
      name: '  Magica   Luna  ',
      originId: 'scholar',
      userId: 'user_1',
    });

    expect(character.name).toBe('Magica Luna');
  });

  it('should create a character snapshot from an origin', () => {
    const scholarOrigin = getOriginDefinition('scholar');
    const starterKit = getStarterKitDefinition('novice_adventurer_kit');

    const character = service.create({
      name: 'Magica',
      originId: scholarOrigin.id,
      userId: 'user_1',
    });

    expect(character.id).toBeDefined();
    expect(character.userId).toBe('user_1');
    expect(character.name).toBe('Magica');
    expect(character.originId).toBe(scholarOrigin.id);

    expect(character.progression).toMatchObject({
      rankIndex: 0,
      rankId: 'novice',
      milestoneIds: [],
    });

    expect(character.moneyBronze).toBe(starterKit.startingMoneyBronze);
    expect(character.starterKitId).toBe(starterKit.id);

    expect(character.stats.INT.currentValue).toBe(
      scholarOrigin.initialStatBonus.INT,
    );

    expect(character.stats.WIS.currentValue).toBe(
      scholarOrigin.initialStatBonus.WIS,
    );

    expect(character.stats.CON.currentValue).toBe(
      scholarOrigin.initialStatBonus.CON,
    );

    expect(character.inventoryItemIds).toEqual(
      expect.arrayContaining([
        ...scholarOrigin.startingItemIds,
        ...starterKit.startingItemIds,
      ]),
    );

    expect(character.equippedItemIds).toEqual(scholarOrigin.startingItemIds);
    expect(character.learnedSkillIds).toEqual(scholarOrigin.startingSkillIds);
    expect(character.equippedSkillIds).toEqual(scholarOrigin.startingSkillIds);

    expect(character.baseStats.INT).toBe(scholarOrigin.initialStatBonus.INT);
    expect(character.derivedStats.maxHp).toBeGreaterThan(0);
    expect(character.currentState.hp).toBe(character.derivedStats.maxHp);
    expect(character.currentState.mp).toBe(character.derivedStats.maxMp);
    expect(character.currentState.stamina).toBe(
      character.derivedStats.maxStamina,
    );
  });

  it('should set the created character as current for its user', () => {
    const created = service.create({
      name: 'Bell',
      originId: 'mercenary',
      userId: 'user_1',
    });

    const current = service.findCurrent('user_1');

    expect(current).not.toBeNull();
    expect(current?.id).toBe(created.id);
    expect(current?.originId).toBe('mercenary');
  });

  it('should reject finding current character without userId', () => {
    service.create({
      name: 'Bell',
      originId: 'mercenary',
      userId: 'user_1',
    });

    expect(() => service.findCurrent(undefined as never)).toThrow(
      BadRequestException,
    );
  });

  it('should return only character snapshots for the requested user scope', () => {
    service.create({
      name: 'Ais',
      originId: 'wanderer',
      userId: 'user_1',
    });

    service.create({
      name: 'Lili',
      originId: 'street_urchin',
      userId: 'user_2',
    });

    const userOneCharacters = service.findAll('user_1');
    const userTwoCharacters = service.findAll('user_2');

    expect(userOneCharacters).toHaveLength(1);
    expect(userOneCharacters[0].name).toBe('Ais');
    expect(userOneCharacters[0].userId).toBe('user_1');

    expect(userTwoCharacters).toHaveLength(1);
    expect(userTwoCharacters[0].name).toBe('Lili');
    expect(userTwoCharacters[0].userId).toBe('user_2');
  });

  it('should reject listing characters without userId', () => {
    expect(() => service.findAll(undefined as never)).toThrow(
      BadRequestException,
    );
  });

  it('should find a character by id for internal service usage', () => {
    const created = service.create({
      name: 'Haru',
      originId: 'acolyte',
      userId: 'user_1',
    });

    const found = service.findById(created.id);

    expect(found.id).toBe(created.id);
    expect(found.userId).toBe('user_1');
    expect(found.name).toBe('Haru');
    expect(found.originId).toBe('acolyte');
    expect(found.derivedStats.healingPotency).toBeGreaterThan(0);
  });

  it('should find a character by id within the correct user scope', () => {
    const created = service.create({
      name: 'Haru',
      originId: 'acolyte',
      userId: 'user_1',
    });

    const found = service.findByIdForUserScope(created.id, 'user_1');

    expect(found.id).toBe(created.id);
    expect(found.userId).toBe('user_1');
  });

  it('should reject finding a character from another user scope', () => {
    const created = service.create({
      name: 'Haru',
      originId: 'acolyte',
      userId: 'owner_user',
    });

    expect(() =>
      service.findByIdForUserScope(created.id, 'different_user'),
    ).toThrow(NotFoundException);
  });

  it('should throw NotFoundException when finding an unknown character', () => {
    expect(() => service.findById('missing-character-id')).toThrow(
      NotFoundException,
    );
  });

  it('should update a character name within the correct user scope', () => {
    const created = service.create({
      name: 'FirstName',
      originId: 'scholar',
      userId: 'user_1',
    });

    const updated = service.updateById(
      created.id,
      {
        name: 'New Name',
      },
      'user_1',
    );

    expect(updated.id).toBe(created.id);
    expect(updated.userId).toBe('user_1');
    expect(updated.name).toBe('New Name');
    expect(updated.currentState).toEqual(created.currentState);
    expect(updated.moneyBronze).toBe(created.moneyBronze);
  });

  describe('inventory operations', () => {
    it('should return inventory stacks for a character', () => {
      const created = service.create({
        name: 'Inventory',
        originId: 'mercenary',
        userId: 'user_1',
      });

      const stacks = service.getInventoryStacks(created.id, 'user_1');

      expect(stacks.length).toBeGreaterThan(0);

      expect(stacks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            itemId: 'rusty_sword',
            quantity: 1,
          }),
          expect.objectContaining({
            itemId: 'stamina_bread',
            quantity: 1,
          }),
          expect.objectContaining({
            itemId: 'minor_hp_potion',
            quantity: 1,
          }),
          expect.objectContaining({
            itemId: 'minor_mp_potion',
            quantity: 1,
          }),
        ]),
      );
    });

    it('should count a known inventory item for a character', () => {
      const created = service.create({
        name: 'Counter',
        originId: 'mercenary',
        userId: 'user_1',
      });

      expect(
        service.countInventoryItem(created.id, 'user_1', 'minor_hp_potion'),
      ).toBe(1);

      expect(
        service.countInventoryItem(created.id, 'user_1', 'slime_gel'),
      ).toBe(0);
    });

    it('should add stackable item quantity to a character inventory', () => {
      const created = service.create({
        name: 'Collector',
        originId: 'mercenary',
        userId: 'user_1',
      });

      const result = service.addInventoryItem(
        created.id,
        'user_1',
        'slime_gel',
        3,
      );

      expect(result.character.id).toBe(created.id);
      expect(result.character.userId).toBe('user_1');

      expect(result.inventoryChange).toEqual({
        itemId: 'slime_gel',
        previousQuantity: 0,
        nextQuantity: 3,
        quantityChanged: 3,
        inventoryItemIds: result.character.inventoryItemIds,
      });

      expect(
        result.character.inventoryItemIds.filter(
          (itemId) => itemId === 'slime_gel',
        ),
      ).toHaveLength(3);
    });

    it('should remove stackable item quantity from a character inventory', () => {
      const created = service.create({
        name: 'Consumer',
        originId: 'mercenary',
        userId: 'user_1',
      });

      service.addInventoryItem(created.id, 'user_1', 'slime_gel', 3);

      const result = service.removeInventoryItem(
        created.id,
        'user_1',
        'slime_gel',
        2,
      );

      expect(result.inventoryChange).toMatchObject({
        itemId: 'slime_gel',
        previousQuantity: 3,
        nextQuantity: 1,
        quantityChanged: -2,
      });

      expect(
        result.character.inventoryItemIds.filter(
          (itemId) => itemId === 'slime_gel',
        ),
      ).toHaveLength(1);
    });

    it('should consume one item from character inventory', () => {
      const created = service.create({
        name: 'PotionUser',
        originId: 'mercenary',
        userId: 'user_1',
      });

      const result = service.consumeInventoryItem(
        created.id,
        'user_1',
        'minor_hp_potion',
      );

      expect(result.inventoryChange).toMatchObject({
        itemId: 'minor_hp_potion',
        previousQuantity: 1,
        nextQuantity: 0,
        quantityChanged: -1,
      });

      expect(
        result.character.inventoryItemIds.filter(
          (itemId) => itemId === 'minor_hp_potion',
        ),
      ).toHaveLength(0);
    });

    it('should reject adding an unknown item to inventory', () => {
      const created = service.create({
        name: 'UnknownItem',
        originId: 'mercenary',
        userId: 'user_1',
      });

      expect(() =>
        service.addInventoryItem(created.id, 'user_1', 'missing_item', 1),
      ).toThrow(BadRequestException);
    });

    it('should reject non-positive inventory mutation quantity', () => {
      const created = service.create({
        name: 'BadQuantity',
        originId: 'mercenary',
        userId: 'user_1',
      });

      expect(() =>
        service.addInventoryItem(created.id, 'user_1', 'slime_gel', 0),
      ).toThrow(BadRequestException);

      expect(() =>
        service.removeInventoryItem(created.id, 'user_1', 'slime_gel', -1),
      ).toThrow(BadRequestException);
    });

    it('should reject removing more items than available', () => {
      const created = service.create({
        name: 'NoStock',
        originId: 'mercenary',
        userId: 'user_1',
      });

      expect(() =>
        service.removeInventoryItem(created.id, 'user_1', 'slime_gel', 1),
      ).toThrow(BadRequestException);
    });

    it('should reject inventory mutation from another user scope', () => {
      const created = service.create({
        name: 'Owner',
        originId: 'mercenary',
        userId: 'owner_user',
      });

      expect(() =>
        service.addInventoryItem(created.id, 'attacker_user', 'slime_gel', 1),
      ).toThrow(NotFoundException);

      expect(() =>
        service.removeInventoryItem(
          created.id,
          'attacker_user',
          'minor_hp_potion',
          1,
        ),
      ).toThrow(NotFoundException);
    });
  });

  describe('equipment operations', () => {
    it('should equip an inventory equipment item', () => {
      const created = service.create({
        name: 'EquipMe',
        originId: 'mercenary',
        userId: 'user_1',
      });

      expect(created.equippedItemIds).toEqual(['rusty_sword']);

      const result = service.equipInventoryItem(
        created.id,
        'user_1',
        'rusty_sword',
      );

      expect(result.character.id).toBe(created.id);
      expect(result.character.equippedItemIds).toEqual(['rusty_sword']);

      expect(result.equipmentChange).toEqual({
        itemId: 'rusty_sword',
        equippedItemIds: ['rusty_sword'],
        removedItemIds: [],
      });
    });

    it('should replace equipment in the same slot', () => {
      const created = service.create({
        name: 'SwapWeapon',
        originId: 'mercenary',
        userId: 'user_1',
      });

      service.addInventoryItem(created.id, 'user_1', 'small_dagger', 1);

      const result = service.equipInventoryItem(
        created.id,
        'user_1',
        'small_dagger',
      );

      expect(result.character.equippedItemIds).toEqual(['small_dagger']);

      expect(result.equipmentChange).toEqual({
        itemId: 'small_dagger',
        equippedItemIds: ['small_dagger'],
        removedItemIds: ['rusty_sword'],
      });
    });

    it('should allow equipping items in different slots together', () => {
      const created = service.create({
        name: 'CharmUser',
        originId: 'mercenary',
        userId: 'user_1',
      });

      service.addInventoryItem(created.id, 'user_1', 'simple_wooden_charm', 1);

      const result = service.equipInventoryItem(
        created.id,
        'user_1',
        'simple_wooden_charm',
      );

      expect(result.character.equippedItemIds).toEqual([
        'rusty_sword',
        'simple_wooden_charm',
      ]);

      expect(result.equipmentChange).toEqual({
        itemId: 'simple_wooden_charm',
        equippedItemIds: ['rusty_sword', 'simple_wooden_charm'],
        removedItemIds: [],
      });
    });

    it('should unequip an equipped item', () => {
      const created = service.create({
        name: 'UnequipMe',
        originId: 'mercenary',
        userId: 'user_1',
      });

      const result = service.unequipInventoryItem(
        created.id,
        'user_1',
        'rusty_sword',
      );

      expect(result.character.equippedItemIds).toEqual([]);

      expect(result.equipmentChange).toEqual({
        itemId: 'rusty_sword',
        equippedItemIds: [],
        removedItemIds: ['rusty_sword'],
      });
    });

    it('should do nothing when unequipping an equipment item that is not equipped', () => {
      const created = service.create({
        name: 'NoopUnequip',
        originId: 'mercenary',
        userId: 'user_1',
      });

      service.addInventoryItem(created.id, 'user_1', 'small_dagger', 1);

      const result = service.unequipInventoryItem(
        created.id,
        'user_1',
        'small_dagger',
      );

      expect(result.character.equippedItemIds).toEqual(['rusty_sword']);

      expect(result.equipmentChange).toEqual({
        itemId: 'small_dagger',
        equippedItemIds: ['rusty_sword'],
        removedItemIds: [],
      });
    });

    it('should reject equipping an item that is not in inventory', () => {
      const created = service.create({
        name: 'MissingGear',
        originId: 'mercenary',
        userId: 'user_1',
      });

      expect(() =>
        service.equipInventoryItem(created.id, 'user_1', 'small_dagger'),
      ).toThrow(BadRequestException);
    });

    it('should reject equipping a non-equipment item', () => {
      const created = service.create({
        name: 'PotionEquip',
        originId: 'mercenary',
        userId: 'user_1',
      });

      expect(() =>
        service.equipInventoryItem(created.id, 'user_1', 'minor_hp_potion'),
      ).toThrow(BadRequestException);
    });

    it('should reject equipment mutation from another user scope', () => {
      const created = service.create({
        name: 'OwnerGear',
        originId: 'mercenary',
        userId: 'owner_user',
      });

      expect(() =>
        service.equipInventoryItem(created.id, 'attacker_user', 'rusty_sword'),
      ).toThrow(NotFoundException);

      expect(() =>
        service.unequipInventoryItem(
          created.id,
          'attacker_user',
          'rusty_sword',
        ),
      ).toThrow(NotFoundException);
    });

    it('should refresh derived stats after equipping an item with modifiers', () => {
      const created = service.create({
        name: 'StatRefresh',
        originId: 'mercenary',
        userId: 'user_1',
      });

      const beforeEquip = service.findByIdForUserScope(created.id, 'user_1');

      service.addInventoryItem(created.id, 'user_1', 'simple_wooden_charm', 1);

      const afterEquip = service.equipInventoryItem(
        created.id,
        'user_1',
        'simple_wooden_charm',
      ).character;

      expect(afterEquip.derivedStats.healingPotency).toBe(
        beforeEquip.derivedStats.healingPotency + 2,
      );
    });
  });

  describe('out-of-battle consumable usage', () => {
    it('should use HP potion, restore HP, and consume one item', () => {
      const created = service.create({
        name: 'PotionUser',
        originId: 'mercenary',
        userId: 'user_1',
      });

      updateStoredCharacterForTest(service, created.id, (character) => ({
        ...character,
        currentState: {
          ...character.currentState,
          hp: created.derivedStats.maxHp - 10,
        },
      }));

      const result = service.useConsumableItemOutOfBattle(
        created.id,
        'user_1',
        'minor_hp_potion',
      );

      expect(result.character.currentState.hp).toBe(
        result.character.derivedStats.maxHp,
      );

      expect(result.inventoryChange).toMatchObject({
        itemId: 'minor_hp_potion',
        previousQuantity: 1,
        nextQuantity: 0,
        quantityChanged: -1,
      });

      expect(result.itemUse).toMatchObject({
        itemId: 'minor_hp_potion',
        context: 'out_of_battle',
        consumesOnUse: true,
      });

      expect(result.itemUse.effects).toEqual([
        {
          effectType: 'restore_resource',
          target: 'HP',
          previousValue: created.derivedStats.maxHp - 10,
          nextValue: created.derivedStats.maxHp,
          amountApplied: 10,
        },
      ]);
    });

    it('should use MP potion and restore MP', () => {
      const created = service.create({
        name: 'ManaUser',
        originId: 'scholar',
        userId: 'user_1',
      });

      updateStoredCharacterForTest(service, created.id, (character) => ({
        ...character,
        currentState: {
          ...character.currentState,
          mp: 0,
        },
      }));

      const result = service.useConsumableItemOutOfBattle(
        created.id,
        'user_1',
        'minor_mp_potion',
      );

      expect(result.character.currentState.mp).toBeGreaterThan(0);
      expect(result.character.currentState.mp).toBeLessThanOrEqual(
        result.character.derivedStats.maxMp,
      );

      expect(result.inventoryChange.nextQuantity).toBe(0);
      expect(result.itemUse.effects[0]).toMatchObject({
        effectType: 'restore_resource',
        target: 'MP',
        previousValue: 0,
      });
    });

    it('should use stamina bread and restore stamina', () => {
      const created = service.create({
        name: 'BreadUser',
        originId: 'wanderer',
        userId: 'user_1',
      });

      updateStoredCharacterForTest(service, created.id, (character) => ({
        ...character,
        currentState: {
          ...character.currentState,
          stamina: 0,
        },
      }));

      const result = service.useConsumableItemOutOfBattle(
        created.id,
        'user_1',
        'stamina_bread',
      );

      expect(result.character.currentState.stamina).toBeGreaterThan(0);
      expect(result.character.currentState.stamina).toBeLessThanOrEqual(
        result.character.derivedStats.maxStamina,
      );

      expect(result.inventoryChange.nextQuantity).toBe(0);
      expect(result.itemUse.effects[0]).toMatchObject({
        effectType: 'restore_resource',
        target: 'Stamina',
        previousValue: 0,
      });
    });

    it('should reject using an inn voucher from the generic consumable endpoint', () => {
      const created = service.create({
        name: 'RestUser',
        originId: 'mercenary',
        userId: 'user_1',
      });

      expect(() =>
        service.useConsumableItemOutOfBattle(
          created.id,
          'user_1',
          'one_night_inn_voucher',
        ),
      ).toThrow(BadRequestException);
    });

    it('should use an inn voucher only through the inn service', () => {
      const created = service.create({
        name: 'InnVoucherUser',
        originId: 'mercenary',
        userId: 'user_1',
      });

      updateStoredCharacterForTest(service, created.id, (character) => ({
        ...character,
        fatigue: 0.75,
        currentState: {
          hp: 1,
          mp: 0,
          stamina: 0,
        },
      }));

      const result = service.restAtInnWithVoucher(created.id, 'user_1');

      expect(result.character.currentState).toEqual({
        hp: result.character.derivedStats.maxHp,
        mp: result.character.derivedStats.maxMp,
        stamina: result.character.derivedStats.maxStamina,
      });

      expect(result.character.fatigue).toBe(0);
      expect(result.character.moneyBronze).toBe(created.moneyBronze);
      expect(result.character.inventoryItemIds).not.toContain(
        'one_night_inn_voucher',
      );

      expect(result.rest).toMatchObject({
        paymentMethod: 'voucher',
        priceBronze: 0,
        voucherItemId: 'one_night_inn_voucher',
        previousMoneyBronze: created.moneyBronze,
        nextMoneyBronze: created.moneyBronze,
      });
    });

    it('should reject using non-consumable item outside battle', () => {
      const created = service.create({
        name: 'SwordSnack',
        originId: 'mercenary',
        userId: 'user_1',
      });

      expect(() =>
        service.useConsumableItemOutOfBattle(
          created.id,
          'user_1',
          'rusty_sword',
        ),
      ).toThrow(BadRequestException);
    });

    it('should reject using consumable item that is not in inventory', () => {
      const created = service.create({
        name: 'NoPotion',
        originId: 'mercenary',
        userId: 'user_1',
      });

      service.consumeInventoryItem(created.id, 'user_1', 'minor_hp_potion');

      expect(() =>
        service.useConsumableItemOutOfBattle(
          created.id,
          'user_1',
          'minor_hp_potion',
        ),
      ).toThrow(BadRequestException);
    });

    it('should reject consumable usage from another user scope', () => {
      const created = service.create({
        name: 'OwnerPotion',
        originId: 'mercenary',
        userId: 'owner_user',
      });

      expect(() =>
        service.useConsumableItemOutOfBattle(
          created.id,
          'attacker_user',
          'minor_hp_potion',
        ),
      ).toThrow(NotFoundException);
    });
  });

  describe('applyBattleReward', () => {
    it('should apply bronze and reward items to a character', () => {
      const created = service.create({
        name: 'Rewarded',
        originId: 'mercenary',
        userId: 'user_1',
      });

      const initialInventoryLength = created.inventoryItemIds.length;
      const initialMoneyBronze = created.moneyBronze;

      const result = service.applyBattleReward(
        created.id,
        'user_1',
        createBattleRewardSummary(),
      );

      expect(result.character.id).toBe(created.id);
      expect(result.character.userId).toBe('user_1');

      expect(result.character.progression).toEqual(created.progression);

      expect(result.character.moneyBronze).toBe(initialMoneyBronze + 7);

      expect(result.character.inventoryItemIds).toHaveLength(
        initialInventoryLength + 3,
      );

      expect(
        result.character.inventoryItemIds.filter(
          (itemId) => itemId === 'slime_gel',
        ),
      ).toHaveLength(2);

      expect(
        result.character.inventoryItemIds.filter(
          (itemId) => itemId === 'goblin_ear',
        ),
      ).toHaveLength(1);

      expect(result.reward.moneyBronze).toBe(7);
    });

    it('should use battle inventory as the reward base when provided', () => {
      const created = service.create({
        name: 'BattleInventory',
        originId: 'mercenary',
        userId: 'user_1',
      });

      expect(created.inventoryItemIds).toEqual(
        expect.arrayContaining(['minor_hp_potion']),
      );

      const battleInventoryItemIds = created.inventoryItemIds.filter(
        (itemId) => itemId !== 'minor_hp_potion',
      );

      const result = service.applyBattleReward(
        created.id,
        'user_1',
        createBattleRewardSummary({
          moneyBronze: 0,
          items: [
            {
              itemId: 'slime_gel',
              quantity: 1,
            },
          ],
        }),
        {
          battleInventoryItemIds,
        },
      );

      expect(result.character.inventoryItemIds).not.toContain(
        'minor_hp_potion',
      );

      expect(
        result.character.inventoryItemIds.filter(
          (itemId) => itemId === 'slime_gel',
        ),
      ).toHaveLength(1);
    });

    it('should ignore non-positive reward item quantities', () => {
      const created = service.create({
        name: 'NoBadLoot',
        originId: 'mercenary',
        userId: 'user_1',
      });

      const initialInventoryLength = created.inventoryItemIds.length;

      const result = service.applyBattleReward(
        created.id,
        'user_1',
        createBattleRewardSummary({
          moneyBronze: 0,
          items: [
            {
              itemId: 'slime_gel',
              quantity: 0,
            },
            {
              itemId: 'goblin_ear',
              quantity: -5,
            },
          ],
        }),
      );

      expect(result.character.inventoryItemIds).toHaveLength(
        initialInventoryLength,
      );

      expect(result.character.progression).toEqual(created.progression);
      expect(result.character.moneyBronze).toBe(created.moneyBronze);
    });

    it('should reject applying reward to a character from another user scope', () => {
      const created = service.create({
        name: 'Owner',
        originId: 'mercenary',
        userId: 'owner_user',
      });

      expect(() =>
        service.applyBattleReward(
          created.id,
          'attacker_user',
          createBattleRewardSummary(),
        ),
      ).toThrow(NotFoundException);
    });

    it('should reject applying reward without userId', () => {
      const created = service.create({
        name: 'Owner',
        originId: 'mercenary',
        userId: 'owner_user',
      });

      expect(() =>
        service.applyBattleReward(
          created.id,
          undefined as never,
          createBattleRewardSummary(),
        ),
      ).toThrow(BadRequestException);
    });
  });

  it('should reject updating a character from another user scope', () => {
    const created = service.create({
      name: 'Owner',
      originId: 'scholar',
      userId: 'owner_user',
    });

    expect(() =>
      service.updateById(
        created.id,
        {
          name: 'Hijacked',
        },
        'attacker_user',
      ),
    ).toThrow(NotFoundException);
  });

  it('should ignore overposted userId and currentState fields during update', () => {
    const created = service.create({
      name: 'SafeName',
      originId: 'mercenary',
      userId: 'owner_user',
    });

    const updated = service.updateById(
      created.id,
      {
        name: 'Still Safe',
        userId: 'attacker_user',
        currentState: {
          hp: 0,
          mp: 0,
          stamina: 0,
        },
      } as never,
      'owner_user',
    );

    expect(updated.userId).toBe('owner_user');
    expect(updated.name).toBe('Still Safe');
    expect(updated.currentState).toEqual(created.currentState);
  });

  it('should set current character by id within the same user scope', () => {
    const first = service.create({
      name: 'First',
      originId: 'scholar',
      userId: 'user_1',
    });

    const second = service.create({
      name: 'Second',
      originId: 'mercenary',
      userId: 'user_1',
    });

    expect(service.findCurrent('user_1')?.id).toBe(second.id);

    const current = service.setCurrentCharacter(first.id, 'user_1');

    expect(current.id).toBe(first.id);
    expect(service.findCurrent('user_1')?.id).toBe(first.id);
  });

  it('should reject setting current character from another user scope', () => {
    const created = service.create({
      name: 'First',
      originId: 'scholar',
      userId: 'owner_user',
    });

    expect(() =>
      service.setCurrentCharacter(created.id, 'different_user'),
    ).toThrow(NotFoundException);
  });

  it('should reject setting current character without userId', () => {
    const created = service.create({
      name: 'First',
      originId: 'scholar',
      userId: 'owner_user',
    });

    expect(() =>
      service.setCurrentCharacter(created.id, undefined as never),
    ).toThrow(BadRequestException);
  });

  it('should delete a character by id within the correct user scope', () => {
    const created = service.create({
      name: 'DeleteMe',
      originId: 'wanderer',
      userId: 'user_1',
    });

    const result = service.deleteById(created.id, 'user_1');

    expect(result).toEqual({
      deleted: true,
      id: created.id,
    });

    expect(() => service.findById(created.id)).toThrow(NotFoundException);
  });

  it('should reject deleting a character from another user scope', () => {
    const created = service.create({
      name: 'OwnerChar',
      originId: 'wanderer',
      userId: 'owner_user',
    });

    expect(() => service.deleteById(created.id, 'attacker_user')).toThrow(
      NotFoundException,
    );

    expect(service.findById(created.id)).toBeDefined();
  });

  it('should fallback to another character when deleting the current one', () => {
    const first = service.create({
      name: 'First',
      originId: 'wanderer',
      userId: 'user_1',
    });

    const second = service.create({
      name: 'Second',
      originId: 'street_urchin',
      userId: 'user_1',
    });

    expect(service.findCurrent('user_1')?.id).toBe(second.id);

    service.deleteById(second.id, 'user_1');

    expect(service.findCurrent('user_1')?.id).toBe(first.id);
  });

  it('should return null when deleting the only current character', () => {
    const created = service.create({
      name: 'Solo',
      originId: 'street_urchin',
      userId: 'user_1',
    });

    expect(service.findCurrent('user_1')?.id).toBe(created.id);

    service.deleteById(created.id, 'user_1');

    expect(service.findCurrent('user_1')).toBeNull();
  });
  it('should reject adding an item quantity above its max stack size', () => {
    const created = service.create({
      name: 'StackLimit',
      originId: 'mercenary',
      userId: 'user_1',
    });

    expect(() =>
      service.addInventoryItem(created.id, 'user_1', 'minor_hp_potion', 21),
    ).toThrow(BadRequestException);
  });

  it('should sanitize dirty current state before applying out-of-battle consumables', () => {
    const created = service.create({
      name: 'DirtyPotionUser',
      originId: 'mercenary',
      userId: 'user_1',
    });

    updateStoredCharacterForTest(service, created.id, (character) => ({
      ...character,
      currentState: {
        ...character.currentState,
        hp: 999_999,
      },
    }));

    const result = service.useConsumableItemOutOfBattle(
      created.id,
      'user_1',
      'minor_hp_potion',
    );

    expect(result.character.currentState.hp).toBe(
      result.character.derivedStats.maxHp,
    );

    expect(result.itemUse.effects).toEqual([]);
  });

  it('should merge battle inventory deltas without dropping out-of-battle inventory changes', () => {
    const created = service.create({
      name: 'BattleMerge',
      originId: 'mercenary',
      userId: 'user_1',
    });

    const battleStartingInventoryItemIds = [...created.inventoryItemIds];
    const battleInventoryItemIds = created.inventoryItemIds.filter(
      (itemId) => itemId !== 'minor_hp_potion',
    );

    updateStoredCharacterForTest(service, created.id, (character) => ({
      ...character,
      inventoryItemIds: [...character.inventoryItemIds, 'goblin_ear'],
    }));

    const result = service.applyBattleReward(
      created.id,
      'user_1',
      createBattleRewardSummary({
        moneyBronze: 0,
        items: [],
      }),
      {
        battleStartingInventoryItemIds,
        battleInventoryItemIds,
      },
    );

    expect(result.character.inventoryItemIds).not.toContain('minor_hp_potion');
    expect(result.character.inventoryItemIds).toContain('goblin_ear');
  });

});
