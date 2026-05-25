import type { SkillDefinition, SkillEffect } from './skill.types';

function freezeSkillEffect(effect: SkillEffect): Readonly<SkillEffect> {
  return Object.freeze({
    ...effect,
    scaling: effect.scaling
      ? Object.freeze({
          ...effect.scaling,
        })
      : undefined,
    modifiers: effect.modifiers
      ? Object.freeze(
          effect.modifiers.map((modifier) =>
            Object.freeze({
              ...modifier,
            }),
          ),
        )
      : undefined,
    tags: Object.freeze([...effect.tags]),
  });
}

function freezeSkillDefinition(
  skill: SkillDefinition,
): Readonly<SkillDefinition> {
  return Object.freeze({
    ...skill,
    cost: Object.freeze({
      ...skill.cost,
    }),
    effects: Object.freeze(
      skill.effects.map((effect) => freezeSkillEffect(effect)),
    ),
    runeSlots: Object.freeze([...skill.runeSlots]),
    attachedRuneIds: Object.freeze([...skill.attachedRuneIds]),
    tags: Object.freeze([...skill.tags]),
  });
}

const RAW_SKILL_DEFINITIONS: readonly SkillDefinition[] = [
  {
    id: 'spark',
    name: 'Spark',
    description:
      'A simple arcane spark. Weak, reliable, and suitable for a beginner who is learning how to shape mana into direct damage.',

    family: 'arcane',
    actionType: 'magical_spell',
    actionCategory: 'offensive',
    targetType: 'enemy_single',

    cost: {
      mpCost: 5,
      staminaCost: 0,
    },

    effects: [
      {
        id: 'spark_damage',
        type: 'damage',
        targetType: 'enemy_single',

        damageType: 'magical',
        elementType: 'fire',

        baseValue: 6,
        scaling: {
          mode: 'single_stat',
          primaryStat: 'mAtk',
          primaryMultiplier: 1.25,
        },

        tags: ['starter', 'damage', 'magic', 'fire'],
      },
    ],

    runeCapacity: 1,
    runeSlots: ['element'],
    attachedRuneIds: [],

    tags: ['starter', 'offensive', 'spell', 'int-scaling'],
  },
  {
    id: 'heavy_strike',
    name: 'Heavy Strike',
    description:
      'A committed physical blow. It consumes stamina to deliver stronger weapon damage, making it suitable for frontline fighters.',

    family: 'weapon',
    actionType: 'physical_skill',
    actionCategory: 'offensive',
    targetType: 'enemy_single',

    cost: {
      mpCost: 0,
      staminaCost: 12,
    },

    effects: [
      {
        id: 'heavy_strike_damage',
        type: 'damage',
        targetType: 'enemy_single',

        damageType: 'physical',

        baseValue: 6,
        scaling: {
          mode: 'single_stat',
          primaryStat: 'pAtk',
          primaryMultiplier: 1.3,
        },

        tags: ['starter', 'damage', 'physical'],
      },
    ],

    runeCapacity: 1,
    runeSlots: ['power'],
    attachedRuneIds: [],

    tags: ['starter', 'offensive', 'weapon', 'str-scaling'],
  },
  {
    id: 'steady_strike',
    name: 'Steady Strike',
    description:
      'A balanced attack that uses both body control and weapon handling. It is weaker than Heavy Strike but easier to sustain.',

    family: 'weapon',
    actionType: 'physical_skill',
    actionCategory: 'offensive',
    targetType: 'enemy_single',

    cost: {
      mpCost: 0,
      staminaCost: 7,
    },

    effects: [
      {
        id: 'steady_strike_damage',
        type: 'damage',
        targetType: 'enemy_single',

        damageType: 'physical',

        baseValue: 4,
        scaling: {
          mode: 'dual_stat',
          primaryStat: 'pAtk',
          primaryMultiplier: 0.9,
          secondaryStat: 'actionSpeed',
          secondaryMultiplier: 0.15,
        },

        tags: ['starter', 'damage', 'physical'],
      },
    ],

    runeCapacity: 1,
    runeSlots: ['power'],
    attachedRuneIds: [],

    tags: ['starter', 'offensive', 'weapon', 'balanced-scaling'],
  },
  {
    id: 'quick_stab',
    name: 'Quick Stab',
    description:
      'A fast precision attack. It rewards dexterity more than raw strength and is designed for agile characters.',

    family: 'shadow',
    actionType: 'finesse_skill',
    actionCategory: 'offensive',
    targetType: 'enemy_single',

    cost: {
      mpCost: 0,
      staminaCost: 8,
    },

    effects: [
      {
        id: 'quick_stab_damage',
        type: 'damage',
        targetType: 'enemy_single',

        damageType: 'physical',

        baseValue: 4,
        scaling: {
          mode: 'dual_stat',
          primaryStat: 'actionSpeed',
          primaryMultiplier: 1,
          secondaryStat: 'pAtk',
          secondaryMultiplier: 0.25,
        },

        tags: ['starter', 'damage', 'physical', 'precision'],
      },
    ],

    runeCapacity: 1,
    runeSlots: ['utility'],
    attachedRuneIds: [],

    tags: ['starter', 'offensive', 'dex-scaling', 'fast'],
  },
  {
    id: 'minor_heal',
    name: 'Minor Heal',
    description:
      'A basic restorative spell. It converts mana and spiritual focus into direct healing for the caster.',

    family: 'divine',
    actionType: 'support_spell',
    actionCategory: 'support',
    targetType: 'self',

    cost: {
      mpCost: 8,
      staminaCost: 0,
    },

    effects: [
      {
        id: 'minor_heal_restore',
        type: 'heal',
        targetType: 'self',

        baseValue: 10,
        scaling: {
          mode: 'single_stat',
          primaryStat: 'healingPotency',
          primaryMultiplier: 1.15,
        },

        tags: ['starter', 'heal', 'support'],
      },
    ],

    runeCapacity: 1,
    runeSlots: ['support'],
    attachedRuneIds: [],

    tags: ['starter', 'support', 'healing', 'wis-scaling'],
  },
];

export const SKILL_DEFINITIONS = Object.freeze(
  RAW_SKILL_DEFINITIONS.map((skill) => freezeSkillDefinition(skill)),
) satisfies readonly Readonly<SkillDefinition>[];

export const SKILL_IDS = Object.freeze(
  SKILL_DEFINITIONS.map((skill) => skill.id),
) satisfies readonly string[];
