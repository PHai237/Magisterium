import { SKILL_DEFINITIONS, SKILL_IDS } from './skill.definitions';

import {
  assertSkillDefinitionExists,
  cloneSkillDefinition,
  getSkillDefinitionById,
  getSkillDefinitionsByIds,
  hasSkillDefinition,
} from './skill.registry';

import type { SkillDefinition } from './skill.types';

function getRawSkillDefinition(skillId: string): Readonly<SkillDefinition> {
  const skill = SKILL_DEFINITIONS.find(
    (definition) => definition.id === skillId,
  );

  if (!skill) {
    throw new Error(`Raw test skill not found: ${skillId}`);
  }

  return skill;
}

describe('skill registry', () => {
  describe('SKILL_DEFINITIONS', () => {
    it('should contain all starter skills used by origins', () => {
      expect(SKILL_IDS).toEqual(
        expect.arrayContaining([
          'spark',
          'heavy_strike',
          'steady_strike',
          'quick_stab',
          'minor_heal',
        ]),
      );
    });

    it('should freeze raw skill definitions to prevent accidental balance mutation', () => {
      const rawSpark = getRawSkillDefinition('spark');

      expect(Object.isFrozen(rawSpark)).toBe(true);
      expect(Object.isFrozen(rawSpark.cost)).toBe(true);
      expect(Object.isFrozen(rawSpark.effects)).toBe(true);
      expect(Object.isFrozen(rawSpark.effects[0])).toBe(true);
      expect(Object.isFrozen(rawSpark.runeSlots)).toBe(true);
      expect(Object.isFrozen(rawSpark.attachedRuneIds)).toBe(true);
      expect(Object.isFrozen(rawSpark.tags)).toBe(true);
    });
  });

  describe('getSkillDefinitionById', () => {
    it('should return a cloned skill definition by id', () => {
      const rawSpark = getRawSkillDefinition('spark');
      const spark = getSkillDefinitionById('spark');

      expect(spark).toEqual(rawSpark);
      expect(spark).not.toBe(rawSpark);

      expect(spark.cost).toEqual(rawSpark.cost);
      expect(spark.cost).not.toBe(rawSpark.cost);

      expect(spark.effects).toEqual(rawSpark.effects);
      expect(spark.effects).not.toBe(rawSpark.effects);
      expect(spark.effects[0]).not.toBe(rawSpark.effects[0]);

      expect(spark.runeSlots).toEqual(rawSpark.runeSlots);
      expect(spark.runeSlots).not.toBe(rawSpark.runeSlots);

      expect(spark.attachedRuneIds).toEqual(rawSpark.attachedRuneIds);
      expect(spark.attachedRuneIds).not.toBe(rawSpark.attachedRuneIds);

      expect(spark.tags).toEqual(rawSpark.tags);
      expect(spark.tags).not.toBe(rawSpark.tags);
    });

    it('should protect registry data from mutation through returned clones', () => {
      const spark = getSkillDefinitionById('spark');

      spark.cost.mpCost = 999;

      const freshSpark = getSkillDefinitionById('spark');

      expect(freshSpark.cost.mpCost).toBe(5);
    });

    it('should throw when skill definition does not exist', () => {
      expect(() => getSkillDefinitionById('unknown_skill')).toThrow(
        'Skill definition not found: unknown_skill',
      );
    });
  });

  describe('getSkillDefinitionsByIds', () => {
    it('should return multiple skill definitions in the requested order', () => {
      const skills = getSkillDefinitionsByIds([
        'heavy_strike',
        'minor_heal',
        'spark',
      ]);

      expect(skills.map((skill) => skill.id)).toEqual([
        'heavy_strike',
        'minor_heal',
        'spark',
      ]);
    });
  });

  describe('hasSkillDefinition', () => {
    it('should return true for known skills and false for unknown skills', () => {
      expect(hasSkillDefinition('spark')).toBe(true);
      expect(hasSkillDefinition('minor_heal')).toBe(true);
      expect(hasSkillDefinition('unknown_skill')).toBe(false);
    });
  });

  describe('assertSkillDefinitionExists', () => {
    it('should pass for an existing skill', () => {
      expect(() => assertSkillDefinitionExists('quick_stab')).not.toThrow();
    });

    it('should throw for a missing skill', () => {
      expect(() => assertSkillDefinitionExists('missing_skill')).toThrow(
        'Skill definition not found: missing_skill',
      );
    });
  });

  describe('cloneSkillDefinition', () => {
    it('should deeply clone mutable child objects and arrays', () => {
      const rawHeavyStrike = getRawSkillDefinition('heavy_strike');
      const clonedHeavyStrike = cloneSkillDefinition(rawHeavyStrike);

      expect(clonedHeavyStrike).toEqual(rawHeavyStrike);
      expect(clonedHeavyStrike).not.toBe(rawHeavyStrike);

      expect(clonedHeavyStrike.cost).not.toBe(rawHeavyStrike.cost);
      expect(clonedHeavyStrike.effects).not.toBe(rawHeavyStrike.effects);
      expect(clonedHeavyStrike.effects[0]).not.toBe(rawHeavyStrike.effects[0]);
      expect(clonedHeavyStrike.runeSlots).not.toBe(rawHeavyStrike.runeSlots);
      expect(clonedHeavyStrike.attachedRuneIds).not.toBe(
        rawHeavyStrike.attachedRuneIds,
      );
      expect(clonedHeavyStrike.tags).not.toBe(rawHeavyStrike.tags);
    });
  });
});
