import {
  calculateResourceCheck,
  spendResources,
} from '../calculations/battle.calculations';

import type { BattleResourceCost } from '../battle.types';

import type { SkillDefinition } from '../../skill/skill.types';

export { calculateResourceCheck, spendResources };

export function buildSkillResourceCosts(
  skill: SkillDefinition,
): BattleResourceCost[] {
  const costs: BattleResourceCost[] = [];

  if ((skill.cost.hpCost ?? 0) > 0) {
    costs.push({
      resourceType: 'HP',
      amount: skill.cost.hpCost ?? 0,
    });
  }

  if (skill.cost.mpCost > 0) {
    costs.push({
      resourceType: 'MP',
      amount: skill.cost.mpCost,
    });
  }

  if (skill.cost.staminaCost > 0) {
    costs.push({
      resourceType: 'Stamina',
      amount: skill.cost.staminaCost,
    });
  }

  return costs;
}

