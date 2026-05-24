import { SKILL_DEFINITIONS } from './skill.definitions';

import type { SkillDefinition, SkillEffect } from './skill.types';

import type { SkillId } from '../character/character.types';

function assertUniqueSkillDefinitions(
  skillDefinitions: readonly Readonly<SkillDefinition>[],
): void {
  const seenSkillIds = new Set<SkillId>();

  for (const skillDefinition of skillDefinitions) {
    if (seenSkillIds.has(skillDefinition.id)) {
      throw new Error(`Duplicate skill definition id: ${skillDefinition.id}`);
    }

    seenSkillIds.add(skillDefinition.id);
  }
}

assertUniqueSkillDefinitions(SKILL_DEFINITIONS);

const SKILL_DEFINITION_BY_ID: ReadonlyMap<
  SkillId,
  Readonly<SkillDefinition>
> = new Map(
  SKILL_DEFINITIONS.map((skillDefinition) => [
    skillDefinition.id,
    skillDefinition,
  ]),
);

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
  const skill = SKILL_DEFINITION_BY_ID.get(skillId);

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
  return SKILL_DEFINITION_BY_ID.has(skillId);
}

export function assertSkillDefinitionExists(skillId: SkillId): void {
  if (!hasSkillDefinition(skillId)) {
    throw new Error(`Skill definition not found: ${skillId}`);
  }
}
