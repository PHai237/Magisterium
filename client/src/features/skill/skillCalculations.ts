import type {
  ActionType,
  BaseStats,
  DamageType,
  ElementType,
  SkillDefinition,
  SkillModifierProfile,
  SkillRuneDefinition,
} from '../character-creation/types';

import { getSkillRuneById } from './skillConstants';

export function createEmptySkillModifierProfile(): SkillModifierProfile {
  return {
    flatPowerBonus: 0,
    powerMultiplierBonus: 0,
    resourceCostDelta: 0,
    critRateBonus: 0,
    elementOverride: null,
    damageTypeOverride: null,
    lifestealPercent: 0,
    shieldOnDamagePercent: 0,
  };
}

export function getAttachedRuneIds(skill: SkillDefinition): string[] {
  return skill.attachedRuneIds ?? [];
}

export function getRuneSlots(skill: SkillDefinition): string[] {
  return skill.runeSlots ?? [];
}

export function canSocketRuneIntoSkill(
  skill: SkillDefinition,
  rune: SkillRuneDefinition,
): boolean {
  const runeSlots = getRuneSlots(skill);

  if (runeSlots.length === 0) {
    return false;
  }

  return runeSlots.includes(rune.slotType);
}

export function resolveSkillRunes(
  skill: SkillDefinition,
): SkillRuneDefinition[] {
  return getAttachedRuneIds(skill)
    .map((runeId) => getSkillRuneById(runeId))
    .filter((rune): rune is SkillRuneDefinition => {
      if (!rune) {
        return false;
      }

      return canSocketRuneIntoSkill(skill, rune);
    });
}

export function buildSkillModifierProfile(
  skill: SkillDefinition,
): SkillModifierProfile {
  const profile = createEmptySkillModifierProfile();
  const runes = resolveSkillRunes(skill);

  for (const rune of runes) {
    for (const effect of rune.effects) {
      if (effect.type === 'flat_power_bonus') {
        profile.flatPowerBonus += effect.value;
      }

      if (effect.type === 'power_multiplier_bonus') {
        profile.powerMultiplierBonus += effect.value;
      }

      if (effect.type === 'resource_cost_delta') {
        profile.resourceCostDelta += effect.value;
      }

      if (effect.type === 'crit_rate_bonus') {
        profile.critRateBonus += effect.value;
      }

      if (effect.type === 'element_override') {
        profile.elementOverride = effect.value;
      }

      if (effect.type === 'damage_type_override') {
        profile.damageTypeOverride = effect.value;
      }

      if (effect.type === 'lifesteal_percent') {
        profile.lifestealPercent += effect.value;
      }

      if (effect.type === 'shield_on_damage_percent') {
        profile.shieldOnDamagePercent += effect.value;
      }
    }
  }

  return profile;
}

export function getSkillScalingStatValue(
  baseStats: BaseStats,
  skill: SkillDefinition,
): number {
  if (!skill.scalingStat) {
    return 0;
  }

  return baseStats[skill.scalingStat];
}

export function calculateBaseSkillPower(
  baseStats: BaseStats,
  skill: SkillDefinition,
): number {
  const scalingStatValue = getSkillScalingStatValue(baseStats, skill);

  return Math.max(
    1,
    Math.round(skill.baseValue + scalingStatValue * skill.multiplier),
  );
}

export function calculateEffectiveSkillPower(
  baseStats: BaseStats,
  skill: SkillDefinition,
): number {
  const basePower = calculateBaseSkillPower(baseStats, skill);
  const modifierProfile = buildSkillModifierProfile(skill);

  const powerAfterFlatBonus =
    basePower + modifierProfile.flatPowerBonus;

  const powerAfterMultiplier =
    powerAfterFlatBonus * (1 + modifierProfile.powerMultiplierBonus);

  return Math.max(1, Math.round(powerAfterMultiplier));
}

export function getDefaultDamageTypeForAction(
  actionType: ActionType,
): DamageType {
  if (actionType === 'magical_spell') {
    return 'magical';
  }

  return 'physical';
}

export function getEffectiveSkillDamageType(
  skill: SkillDefinition,
): DamageType | null {
  if (skill.effectType !== 'damage') {
    return null;
  }

  const modifierProfile = buildSkillModifierProfile(skill);

  return (
    modifierProfile.damageTypeOverride ??
    skill.damageType ??
    getDefaultDamageTypeForAction(skill.actionType)
  );
}

export function getEffectiveSkillElementType(
  skill: SkillDefinition,
): ElementType | null {
  if (skill.effectType !== 'damage') {
    return null;
  }

  const modifierProfile = buildSkillModifierProfile(skill);

  return modifierProfile.elementOverride ?? skill.elementType ?? 'neutral';
}

export function getEffectiveSkillResourceCost(
  skill: SkillDefinition,
): number {
  const modifierProfile = buildSkillModifierProfile(skill);

  return Math.max(
    0,
    Math.round(skill.resourceCost + modifierProfile.resourceCostDelta),
  );
}

export function getEffectiveSkillCritRate(
  baseCritRate: number,
  skill: SkillDefinition,
): number {
  const modifierProfile = buildSkillModifierProfile(skill);

  return Math.max(
    0,
    Math.min(100, baseCritRate + modifierProfile.critRateBonus),
  );
}

export function calculateSkillFollowUpEffects(params: {
  finalDamage: number;
  skill: SkillDefinition;
}): {
  healToPlayer: number;
  shieldToPlayer: number;
} {
  const modifierProfile = buildSkillModifierProfile(params.skill);

  return {
    healToPlayer: Math.max(
      0,
      Math.round(params.finalDamage * modifierProfile.lifestealPercent),
    ),
    shieldToPlayer: Math.max(
      0,
      Math.round(params.finalDamage * modifierProfile.shieldOnDamagePercent),
    ),
  };
}

export function getSkillRuneSummaryText(skill: SkillDefinition): string {
  const runes = resolveSkillRunes(skill);

  if (runes.length === 0) {
    return '';
  }

  return ` Runes: ${runes.map((rune) => rune.name).join(', ')}.`;
}