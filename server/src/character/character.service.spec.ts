import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CharacterService } from './character.service';

import {
  ORIGIN_DEFINITIONS,
  STARTER_KIT_DEFINITIONS,
} from '../game/character/character.constants';

import type { OriginId, StarterKitId } from '../game/character/character.types';

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
      level: 1,
      exp: 0,
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
});
