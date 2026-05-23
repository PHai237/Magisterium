import {
  applyConsumableItemEffectsToCharacter,
  getConsumableItemDefinitionForUse,
} from './consumable.calculations';

import { createCharacterSnapshot } from '../character/character.calculations';

import { createCharacter } from '../character/character.factory';

describe('consumable calculations', () => {
  it('should return a consumable item definition for valid context', () => {
    const item = getConsumableItemDefinitionForUse(
      'minor_hp_potion',
      'out_of_battle',
    );

    expect(item.id).toBe('minor_hp_potion');
    expect(item.consumable?.usableOutOfBattle).toBe(true);
  });

  it('should reject non-consumable items', () => {
    expect(() =>
      getConsumableItemDefinitionForUse('rusty_sword', 'out_of_battle'),
    ).toThrow('Item rusty_sword is not consumable.');
  });

  it('should reject item usage in an unsupported context', () => {
    expect(() =>
      getConsumableItemDefinitionForUse('one_night_inn_voucher', 'battle'),
    ).toThrow('Item one_night_inn_voucher cannot be used in battle.');
  });

  it('should restore HP without exceeding max HP', () => {
    const character = createCharacter({
      name: 'PotionUser',
      originId: 'mercenary',
      userId: 'user_1',
    });

    const snapshot = createCharacterSnapshot(character);

    const damagedCharacter = {
      ...character,
      currentState: {
        ...character.currentState,
        hp: snapshot.derivedStats.maxHp - 10,
      },
    };

    const result = applyConsumableItemEffectsToCharacter(
      damagedCharacter,
      snapshot.derivedStats,
      'minor_hp_potion',
      'out_of_battle',
    );

    expect(result.itemId).toBe('minor_hp_potion');
    expect(result.consumesOnUse).toBe(true);
    expect(result.character.currentState.hp).toBe(snapshot.derivedStats.maxHp);

    expect(result.effects).toEqual([
      {
        effectType: 'restore_resource',
        target: 'HP',
        previousValue: snapshot.derivedStats.maxHp - 10,
        nextValue: snapshot.derivedStats.maxHp,
        amountApplied: 10,
      },
    ]);
  });

  it('should restore MP', () => {
    const character = createCharacter({
      name: 'ManaUser',
      originId: 'scholar',
      userId: 'user_1',
    });

    const snapshot = createCharacterSnapshot(character);

    const drainedCharacter = {
      ...character,
      currentState: {
        ...character.currentState,
        mp: 0,
      },
    };

    const result = applyConsumableItemEffectsToCharacter(
      drainedCharacter,
      snapshot.derivedStats,
      'minor_mp_potion',
      'out_of_battle',
    );

    expect(result.character.currentState.mp).toBeGreaterThan(0);
    expect(result.character.currentState.mp).toBeLessThanOrEqual(
      snapshot.derivedStats.maxMp,
    );

    expect(result.effects[0]).toMatchObject({
      effectType: 'restore_resource',
      target: 'MP',
      previousValue: 0,
    });
  });

  it('should restore stamina', () => {
    const character = createCharacter({
      name: 'BreadUser',
      originId: 'wanderer',
      userId: 'user_1',
    });

    const snapshot = createCharacterSnapshot(character);

    const tiredCharacter = {
      ...character,
      currentState: {
        ...character.currentState,
        stamina: 0,
      },
    };

    const result = applyConsumableItemEffectsToCharacter(
      tiredCharacter,
      snapshot.derivedStats,
      'stamina_bread',
      'out_of_battle',
    );

    expect(result.character.currentState.stamina).toBeGreaterThan(0);
    expect(result.character.currentState.stamina).toBeLessThanOrEqual(
      snapshot.derivedStats.maxStamina,
    );

    expect(result.effects[0]).toMatchObject({
      effectType: 'restore_resource',
      target: 'Stamina',
      previousValue: 0,
    });
  });

  it('should apply rest effects from inn voucher', () => {
    const character = createCharacter({
      name: 'RestUser',
      originId: 'mercenary',
      userId: 'user_1',
    });

    const snapshot = createCharacterSnapshot(character);

    const exhaustedCharacter = {
      ...character,
      fatigue: 0.75,
      currentState: {
        hp: 1,
        mp: 0,
        stamina: 0,
      },
    };

    const result = applyConsumableItemEffectsToCharacter(
      exhaustedCharacter,
      snapshot.derivedStats,
      'one_night_inn_voucher',
      'out_of_battle',
    );

    expect(result.character.currentState).toEqual({
      hp: snapshot.derivedStats.maxHp,
      mp: snapshot.derivedStats.maxMp,
      stamina: snapshot.derivedStats.maxStamina,
    });

    expect(result.character.fatigue).toBe(0);

    expect(result.effects.map((effect) => effect.target)).toEqual([
      'HP',
      'MP',
      'Stamina',
      'Fatigue',
    ]);
  });
});
