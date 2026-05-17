import type { StatModifier } from '../passive/passive.types';

import type { SkillEffect, SkillRuneSlotType } from '../skill/skill.types';

export interface RuneDefinition {
  id: string;
  name: string;
  description: string;

  slotType: SkillRuneSlotType;
  capacityCost: number;

  modifiers: StatModifier[];
  addedEffects?: SkillEffect[];

  tags: string[];
}
