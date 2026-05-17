import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CharacterService } from './character.service';

import {
  ORIGIN_DEFINITIONS,
  STARTER_KIT_DEFINITIONS,
} from '../game/character/character.constants';

function getOriginDefinition(originId: string) {
  const origin = ORIGIN_DEFINITIONS.find((item) => item.id === originId);

  if (!origin) {
    throw new Error(`Test origin not found: ${originId}`);
  }

  return origin;
}

function getStarterKitDefinition(starterKitId: string) {
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

  it('should create a character snapshot from an origin', () => {
    const scholarOrigin = getOriginDefinition('scholar');
    const starterKit = getStarterKitDefinition('novice_adventurer_kit');

    const character = service.create({
      name: 'Magica',
      originId: scholarOrigin.id,
    });

    expect(character.id).toBeDefined();
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

  it('should set the created character as current', () => {
    const created = service.create({
      name: 'Bell',
      originId: 'mercenary',
    });

    const current = service.findCurrent();

    expect(current).not.toBeNull();
    expect(current?.id).toBe(created.id);
    expect(current?.originId).toBe('mercenary');
  });

  it('should return all created character snapshots', () => {
    service.create({
      name: 'Ais',
      originId: 'wanderer',
    });

    service.create({
      name: 'Lili',
      originId: 'street_urchin',
    });

    const characters = service.findAll();

    expect(characters).toHaveLength(2);
    expect(characters.map((character) => character.originId)).toEqual([
      'wanderer',
      'street_urchin',
    ]);
    expect(characters[0].derivedStats).toBeDefined();
    expect(characters[1].baseStats).toBeDefined();
  });

  it('should find a character by id', () => {
    const created = service.create({
      name: 'Haruhime',
      originId: 'acolyte',
    });

    const found = service.findById(created.id);

    expect(found.id).toBe(created.id);
    expect(found.name).toBe('Haruhime');
    expect(found.originId).toBe('acolyte');
    expect(found.derivedStats.healingPotency).toBeGreaterThan(0);
  });

  it('should throw NotFoundException when finding an unknown character', () => {
    expect(() => service.findById('missing-character-id')).toThrow(
      NotFoundException,
    );
  });

  it('should set current character by id', () => {
    const first = service.create({
      name: 'First',
      originId: 'scholar',
    });

    const second = service.create({
      name: 'Second',
      originId: 'mercenary',
    });

    expect(service.findCurrent()?.id).toBe(second.id);

    const current = service.setCurrentCharacter(first.id);

    expect(current.id).toBe(first.id);
    expect(service.findCurrent()?.id).toBe(first.id);
  });

  it('should delete a character by id', () => {
    const created = service.create({
      name: 'DeleteMe',
      originId: 'wanderer',
    });

    const result = service.deleteById(created.id);

    expect(result).toEqual({
      deleted: true,
      id: created.id,
    });

    expect(() => service.findById(created.id)).toThrow(NotFoundException);
  });

  it('should clear current character when deleting the current one', () => {
    const created = service.create({
      name: 'Current',
      originId: 'street_urchin',
    });

    expect(service.findCurrent()?.id).toBe(created.id);

    service.deleteById(created.id);

    expect(service.findCurrent()).toBeNull();
  });
});
