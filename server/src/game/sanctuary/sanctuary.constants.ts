import type { ItemId, StatKey } from '../character/character.types';

import type { RankDefinition } from './sanctuary.types';

export const SANCTUARY_FRAGMENT_COST_PER_RUNE = 10;

export const SANCTUARY_STAT_KEYS: readonly StatKey[] = [
  'STR',
  'DEX',
  'CON',
  'INT',
  'WIS',
  'LUK',
];

export const STAT_FRAGMENT_ITEM_ID_BY_STAT: Record<StatKey, ItemId> = {
  STR: 'str_fragment',
  DEX: 'dex_fragment',
  CON: 'con_fragment',
  INT: 'int_fragment',
  WIS: 'wis_fragment',
  LUK: 'luk_fragment',
};

export const STAT_RUNE_ITEM_ID_BY_STAT: Record<StatKey, ItemId> = {
  STR: 'str_rune',
  DEX: 'dex_rune',
  CON: 'con_rune',
  INT: 'int_rune',
  WIS: 'wis_rune',
  LUK: 'luk_rune',
};

export const RANK_DEFINITIONS: readonly RankDefinition[] = Object.freeze([
  Object.freeze({
    id: 'novice',
    index: 0,
    name: 'Novice',
    averageStatRequired: 0,
  }),
  Object.freeze({
    id: 'initiate',
    index: 1,
    name: 'Initiate',
    averageStatRequired: 10,
  }),
  Object.freeze({
    id: 'acolyte',
    index: 2,
    name: 'Acolyte',
    averageStatRequired: 20,
  }),
  Object.freeze({
    id: 'adept',
    index: 3,
    name: 'Adept',
    averageStatRequired: 35,
  }),
  Object.freeze({
    id: 'magus',
    index: 4,
    name: 'Magus',
    averageStatRequired: 50,
  }),
  Object.freeze({
    id: 'magister',
    index: 5,
    name: 'Magister',
    averageStatRequired: 75,
  }),
  Object.freeze({
    id: 'archmagister',
    index: 6,
    name: 'Archmagister',
    averageStatRequired: 100,
  }),
]);
