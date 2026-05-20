import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CharacterController } from './character.controller';
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

describe('CharacterController', () => {
  let controller: CharacterController;
  let service: CharacterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CharacterController],
      providers: [CharacterService],
    }).compile();

    controller = module.get<CharacterController>(CharacterController);
    service = module.get<CharacterService>(CharacterService);
  });

  afterEach(() => {
    service.clearCharacters();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return character module ping', () => {
    expect(controller.ping()).toMatchObject({
      status: 'ok',
      module: 'character',
      message: 'Character module is ready.',
    });
  });

  it('should reject creating a character without x-user-id header', () => {
    expect(() =>
      controller.create({
        name: 'Magica',
        originId: 'scholar',
      }),
    ).toThrow(BadRequestException);
  });

  it('should create a character from name, originId, and x-user-id header', () => {
    const scholarOrigin = getOriginDefinition('scholar');
    const starterKit = getStarterKitDefinition('novice_adventurer_kit');

    const character = controller.create(
      {
        name: 'Magica',
        originId: scholarOrigin.id,
      },
      'user_1',
    );

    expect(character.id).toBeDefined();
    expect(character.userId).toBe('user_1');
    expect(character.name).toBe('Magica');
    expect(character.originId).toBe(scholarOrigin.id);

    expect(character.moneyBronze).toBe(starterKit.startingMoneyBronze);
    expect(character.starterKitId).toBe(starterKit.id);

    expect(character.stats.INT.currentValue).toBe(
      scholarOrigin.initialStatBonus.INT,
    );

    expect(character.inventoryItemIds).toEqual(
      expect.arrayContaining([
        ...scholarOrigin.startingItemIds,
        ...starterKit.startingItemIds,
      ]),
    );

    expect(character.learnedSkillIds).toEqual(scholarOrigin.startingSkillIds);
    expect(character.equippedSkillIds).toEqual(scholarOrigin.startingSkillIds);

    expect(character.baseStats).toBeDefined();
    expect(character.derivedStats).toBeDefined();
    expect(character.currentState.hp).toBe(character.derivedStats.maxHp);
    expect(character.currentState.mp).toBe(character.derivedStats.maxMp);
    expect(character.currentState.stamina).toBe(
      character.derivedStats.maxStamina,
    );
  });

  it('should read the first x-user-id header when header value is an array', () => {
    const character = controller.create(
      {
        name: 'Magica',
        originId: 'scholar',
      },
      ['user_1', 'user_2'],
    );

    expect(character.userId).toBe('user_1');
  });

  it('should return only characters owned by the request user scope', () => {
    controller.create(
      {
        name: 'Ais',
        originId: 'wanderer',
      },
      'user_1',
    );

    controller.create(
      {
        name: 'Lili',
        originId: 'street_urchin',
      },
      'user_2',
    );

    const userOneCharacters = controller.findAll('user_1');
    const userTwoCharacters = controller.findAll('user_2');

    expect(userOneCharacters).toHaveLength(1);
    expect(userOneCharacters[0].name).toBe('Ais');

    expect(userTwoCharacters).toHaveLength(1);
    expect(userTwoCharacters[0].name).toBe('Lili');
  });

  it('should reject listing characters without x-user-id header', () => {
    expect(() => controller.findAll()).toThrow(BadRequestException);
  });

  it('should return the current character for a user scope', () => {
    const created = controller.create(
      {
        name: 'Bell',
        originId: 'mercenary',
      },
      'user_1',
    );

    const current = controller.findCurrent('user_1');

    expect(current).not.toBeNull();
    expect(current?.id).toBe(created.id);
    expect(current?.originId).toBe('mercenary');
  });

  it('should reject finding current character without x-user-id header', () => {
    controller.create(
      {
        name: 'Bell',
        originId: 'mercenary',
      },
      'user_1',
    );

    expect(() => controller.findCurrent()).toThrow(BadRequestException);
  });

  it('should set current character by id within a user scope', () => {
    const first = controller.create(
      {
        name: 'First',
        originId: 'scholar',
      },
      'user_1',
    );

    const second = controller.create(
      {
        name: 'Second',
        originId: 'acolyte',
      },
      'user_1',
    );

    expect(controller.findCurrent('user_1')?.id).toBe(second.id);

    const current = controller.setCurrentCharacter(first.id, 'user_1');

    expect(current.id).toBe(first.id);
    expect(controller.findCurrent('user_1')?.id).toBe(first.id);
  });

  it('should reject setting current character without x-user-id header', () => {
    const created = controller.create(
      {
        name: 'First',
        originId: 'scholar',
      },
      'user_1',
    );

    expect(() => controller.setCurrentCharacter(created.id)).toThrow(
      BadRequestException,
    );
  });

  it('should find a character by id within a user scope', () => {
    const created = controller.create(
      {
        name: 'Haru',
        originId: 'acolyte',
      },
      'user_1',
    );

    const found = controller.findById(created.id, 'user_1');

    expect(found.id).toBe(created.id);
    expect(found.userId).toBe('user_1');
    expect(found.name).toBe('Haru');
    expect(found.originId).toBe('acolyte');
    expect(found.derivedStats.healingPotency).toBeGreaterThan(0);
  });

  it('should reject finding a character without x-user-id header', () => {
    const created = controller.create(
      {
        name: 'Haru',
        originId: 'acolyte',
      },
      'user_1',
    );

    expect(() => controller.findById(created.id)).toThrow(BadRequestException);
  });

  it('should update a character name within a user scope', () => {
    const created = controller.create(
      {
        name: 'OldName',
        originId: 'scholar',
      },
      'user_1',
    );

    const updated = controller.updateById(
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
  });

  it('should not allow public update to change owner or current state', () => {
    const created = controller.create(
      {
        name: 'SafeChar',
        originId: 'mercenary',
      },
      'owner_user',
    );

    const updated = controller.updateById(
      created.id,
      {
        name: 'Renamed',
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
    expect(updated.name).toBe('Renamed');
    expect(updated.currentState).toEqual(created.currentState);
  });

  it('should reject updating without x-user-id header', () => {
    const created = controller.create(
      {
        name: 'OldName',
        originId: 'scholar',
      },
      'user_1',
    );

    expect(() =>
      controller.updateById(created.id, {
        name: 'New Name',
      }),
    ).toThrow(BadRequestException);
  });

  it('should delete a character by id within a user scope', () => {
    const created = controller.create(
      {
        name: 'DeleteMe',
        originId: 'wanderer',
      },
      'user_1',
    );

    const result = controller.deleteById(created.id, 'user_1');

    expect(result).toEqual({
      deleted: true,
      id: created.id,
    });

    expect(controller.findCurrent('user_1')).toBeNull();
  });

  it('should fallback current character after deleting current when another character remains', () => {
    const first = controller.create(
      {
        name: 'First',
        originId: 'wanderer',
      },
      'user_1',
    );

    const second = controller.create(
      {
        name: 'Second',
        originId: 'street_urchin',
      },
      'user_1',
    );

    expect(controller.findCurrent('user_1')?.id).toBe(second.id);

    controller.deleteById(second.id, 'user_1');

    expect(controller.findCurrent('user_1')?.id).toBe(first.id);
  });

  it('should reject deleting without x-user-id header', () => {
    const created = controller.create(
      {
        name: 'DeleteMe',
        originId: 'wanderer',
      },
      'user_1',
    );

    expect(() => controller.deleteById(created.id)).toThrow(
      BadRequestException,
    );
  });
});
