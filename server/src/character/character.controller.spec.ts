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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CharacterController],
      providers: [CharacterService],
    }).compile();

    controller = module.get<CharacterController>(CharacterController);
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

  it('should reject creating a character without userId', () => {
    expect(() =>
      controller.create({
        name: 'Magica',
        originId: 'scholar',
      } as never),
    ).toThrow(BadRequestException);
  });

  it('should create a character from name, originId, and userId', () => {
    const scholarOrigin = getOriginDefinition('scholar');
    const starterKit = getStarterKitDefinition('novice_adventurer_kit');

    const character = controller.create({
      name: 'Magica',
      originId: scholarOrigin.id,
      userId: 'user_1',
    });

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

  it('should return all created characters', () => {
    controller.create({
      name: 'Ais',
      originId: 'wanderer',
      userId: 'user_1',
    });

    controller.create({
      name: 'Lili',
      originId: 'street_urchin',
      userId: 'user_2',
    });

    const characters = controller.findAll();

    expect(characters).toHaveLength(2);
    expect(characters.map((character) => character.originId)).toEqual([
      'wanderer',
      'street_urchin',
    ]);
    expect(characters[0].baseStats).toBeDefined();
    expect(characters[1].derivedStats).toBeDefined();
  });

  it('should return characters filtered by userId', () => {
    controller.create({
      name: 'Ais',
      originId: 'wanderer',
      userId: 'user_1',
    });

    controller.create({
      name: 'Lili',
      originId: 'street_urchin',
      userId: 'user_2',
    });

    const characters = controller.findAll('user_1');

    expect(characters).toHaveLength(1);
    expect(characters[0].name).toBe('Ais');
    expect(characters[0].userId).toBe('user_1');
  });

  it('should return the current character for a user scope', () => {
    const created = controller.create({
      name: 'Bell',
      originId: 'mercenary',
      userId: 'user_1',
    });

    const current = controller.findCurrent('user_1');

    expect(current).not.toBeNull();
    expect(current?.id).toBe(created.id);
    expect(current?.originId).toBe('mercenary');
  });

  it('should reject finding current character without userId', () => {
    controller.create({
      name: 'Bell',
      originId: 'mercenary',
      userId: 'user_1',
    });

    expect(() => controller.findCurrent()).toThrow(BadRequestException);
  });

  it('should set current character by id within a user scope', () => {
    const first = controller.create({
      name: 'First',
      originId: 'scholar',
      userId: 'user_1',
    });

    const second = controller.create({
      name: 'Second',
      originId: 'acolyte',
      userId: 'user_1',
    });

    expect(controller.findCurrent('user_1')?.id).toBe(second.id);

    const current = controller.setCurrentCharacter(first.id, 'user_1');

    expect(current.id).toBe(first.id);
    expect(controller.findCurrent('user_1')?.id).toBe(first.id);
  });

  it('should find a character by id', () => {
    const created = controller.create({
      name: 'Haru',
      originId: 'acolyte',
      userId: 'user_1',
    });

    const found = controller.findById(created.id);

    expect(found.id).toBe(created.id);
    expect(found.userId).toBe('user_1');
    expect(found.name).toBe('Haru');
    expect(found.originId).toBe('acolyte');
    expect(found.derivedStats.healingPotency).toBeGreaterThan(0);
  });

  it('should delete a character by id', () => {
    const created = controller.create({
      name: 'DeleteMe',
      originId: 'wanderer',
      userId: 'user_1',
    });

    const result = controller.deleteById(created.id);

    expect(result).toEqual({
      deleted: true,
      id: created.id,
    });

    expect(controller.findCurrent('user_1')).toBeNull();
  });
});
