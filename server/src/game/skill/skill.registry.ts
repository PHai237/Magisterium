import { SKILL_DEFINITIONS } from './skill.definitions';

import type { SkillDefinition, SkillEffect } from './skill.types';

import type { SkillId } from '../character/character.types';

function cloneSkillEffect(effect: Readonly<SkillEffect>): SkillEffect {
  return {
    ...effect,

    ...(effect.scaling
      ? {
          scaling: {
            ...effect.scaling,
          },
        }
      : {}),

    ...(effect.modifiers
      ? {
          modifiers: effect.modifiers.map((modifier) => ({
            ...modifier,
          })),
        }
      : {}),

    tags: [...effect.tags],
  };
}

export function cloneSkillDefinition(
  skill: Readonly<SkillDefinition>,
): SkillDefinition {
  return {
    ...skill,

    cost: {
      ...skill.cost,
    },

    effects: skill.effects.map((effect) => cloneSkillEffect(effect)),

    runeSlots: [...skill.runeSlots],
    attachedRuneIds: [...skill.attachedRuneIds],

    tags: [...skill.tags],
  };
}

export function getSkillDefinitionById(skillId: SkillId): SkillDefinition {
  const skill = SKILL_DEFINITIONS.find(
    (definition) => definition.id === skillId,
  );

  if (!skill) {
    throw new Error(`Skill definition not found: ${skillId}`);
  }

  return cloneSkillDefinition(skill);
}

export function getSkillDefinitionsByIds(
  skillIds: readonly SkillId[],
): SkillDefinition[] {
  return skillIds.map((skillId) => getSkillDefinitionById(skillId));
}

export function hasSkillDefinition(skillId: SkillId): boolean {
  return SKILL_DEFINITIONS.some((definition) => definition.id === skillId);
}

export function assertSkillDefinitionExists(skillId: SkillId): void {
  if (!hasSkillDefinition(skillId)) {
    throw new Error(`Skill definition not found: ${skillId}`);
  }
}
