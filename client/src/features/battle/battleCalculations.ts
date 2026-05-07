import { BATTLE_BALANCE } from '../game-balance/balanceConstants';
import type { DungeonDefinition } from '../dungeon/dungeonTypes';
import type { ZoneDefinition } from '../zone/zoneTypes';
import { getMonsterById } from '../monster/monsterConstants';
import type {
  MonsterBattleState,
  MonsterDefinition,
} from '../monster/monsterTypes';

import type {
  Character,
  DamageType,
  ElementType,
  ResistanceProfile,
  SkillDefinition,
} from '../character-creation/types';

import type {
  BattleContentSource,
  BattleLogEntry,
  BattleState,
  PlayerBattleState,
} from './battleTypes';

import {
  calculateEffectiveSkillPower,
  getEffectiveSkillDamageType,
  getEffectiveSkillElementType,
  getEffectiveSkillResourceCost,
} from '../skill/skillCalculations';

import {
  applyMonsterAffixes,
  getAffixedMonsterDisplayName,
  getMonsterAffixNameList,
  resolveMonsterAffixesByIds,
  rollMonsterAffixes,
} from '../monster-affix/monsterAffixCalculations';

import {
  applyPendingEncounterModifiersToMonster,
  getPendingEncounterModifierNameList,
} from '../encounter-modifier/encounterModifierCalculations';

export function createBattleId(prefix: string): string {
  if (crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createPlayerBattleState(
  character: Character,
): PlayerBattleState {
  return {
    name: character.name,
    className: character.className,
    level: character.level,
    baseStats: character.baseStats,
    derivedStats: character.derivedStats,
    currentHp: character.currentState.hp,
    currentMp: character.currentState.mp,
    currentEnergy: character.currentState.energy,
    shield: character.currentState.shield,
    evasionChanceBonus: 0,
    nextDamageReductionPercent: 0,
    resistances: {},
    skills: character.skills,
  };
}

export function createMonsterBattleState(
  monster: MonsterDefinition,
): MonsterBattleState {
  const rolledAffixes =
    monster.possibleAffixIds && monster.possibleAffixIds.length > 0
      ? resolveMonsterAffixesByIds(monster.possibleAffixIds)
      : rollMonsterAffixes(monster);

  const baseMonsterBattleState: MonsterBattleState = {
    monsterId: monster.id,
    name: monster.name,
    baseName: monster.name,
    level: monster.level,
    rank: monster.rank,
    currentHp: monster.stats.maxHp,
    maxHp: monster.stats.maxHp,
    attack: monster.stats.attack,
    defense: monster.stats.defense,
    actionSpeed: monster.stats.actionSpeed,
    critRate: monster.stats.critRate,
    damageType: monster.damageType,
    elementType: monster.elementType,
    resistances: monster.resistances,
    affixes: rolledAffixes,
    reward: monster.reward,
    tags: monster.tags,
  };

  const affixedMonster = applyMonsterAffixes(
    baseMonsterBattleState,
    rolledAffixes,
  );

  return {
    ...affixedMonster,
    name: getAffixedMonsterDisplayName(monster.name, rolledAffixes),
  };
}

export function getDungeonBossMonster(
  dungeon: DungeonDefinition,
): MonsterDefinition {
  const bossMonster = getMonsterById(dungeon.bossMonsterId);

  if (!bossMonster) {
    throw new Error(`Boss monster not found for dungeon: ${dungeon.id}`);
  }

  return bossMonster;
}

export function getPossibleMonstersForZone(
  zone: ZoneDefinition,
): MonsterDefinition[] {
  return zone.possibleMonsterIds
    .map((monsterId) => getMonsterById(monsterId))
    .filter((monster): monster is MonsterDefinition => Boolean(monster));
}

export function getRandomMonsterForZone(
  zone: ZoneDefinition,
): MonsterDefinition {
  const possibleMonsters = getPossibleMonstersForZone(zone);

  if (possibleMonsters.length === 0) {
    throw new Error(`No monsters found for zone: ${zone.id}`);
  }

  const randomIndex = Math.floor(Math.random() * possibleMonsters.length);

  return possibleMonsters[randomIndex];
}

export function resolveBattleMonster(
  source: BattleContentSource,
): MonsterDefinition {
  if (source.type === 'dungeon') {
    return getDungeonBossMonster(source.data);
  }

  if (source.type === 'zone') {
    return getRandomMonsterForZone(source.data);
  }

  const roadEventMonster = getMonsterById(source.data.monsterId);

  if (!roadEventMonster) {
    throw new Error(
      `Road event monster not found for battle: ${source.data.monsterId}`,
    );
  }

  return roadEventMonster;
}

export function determineFirstActor(
  player: PlayerBattleState,
  monster: MonsterBattleState,
): 'player' | 'monster' {
  if (player.derivedStats.actionSpeed >= monster.actionSpeed) {
    return 'player';
  }

  return 'monster';
}

export function createLogEntry(params: {
  turn: number;
  actor: BattleLogEntry['actor'];
  message: string;
}): BattleLogEntry {
  return {
    id: createBattleId('log'),
    turn: params.turn,
    actor: params.actor,
    message: params.message,
  };
}

export function createInitialBattleState(params: {
  character: Character;
  source: BattleContentSource;
}): BattleState {
  const player = createPlayerBattleState(params.character);
  const monsterDefinition = resolveBattleMonster(params.source);
  const baseMonster = createMonsterBattleState(monsterDefinition);

  const encounterModifiers =
    params.source.type === 'zone'
      ? params.source.encounterModifiers ?? []
      : [];

  const modifiedMonster = applyPendingEncounterModifiersToMonster(
    baseMonster,
    encounterModifiers,
  );

  const monster: MonsterBattleState = {
    ...modifiedMonster,
    name: getAffixedMonsterDisplayName(
      modifiedMonster.baseName,
      modifiedMonster.affixes,
    ),
  };

  const firstActor = determineFirstActor(player, monster);

  return {
    id: createBattleId('battle'),
    sourceType: params.source.type,
    sourceId: params.source.data.id,
    sourceName: params.source.data.name,
    player,
    monster,
    encounterModifiers,
    status: 'active',
    turn: 1,
    currentActor: firstActor,
    reward: {
      exp: monster.reward.exp,
      bronze: monster.reward.bronze,
    },
    logs: [
      createLogEntry({
        turn: 1,
        actor: 'system',
        message: `${params.character.name} encountered ${monster.name} in ${params.source.data.name}.`,
      }),
      ...(monster.affixes.length > 0
        ? [
            createLogEntry({
              turn: 1,
              actor: 'system' as const,
              message: `${monster.baseName} has affixes: ${getMonsterAffixNameList(
                monster.affixes,
              )}.`,
            }),
          ]
        : []),
      ...(encounterModifiers.length > 0
        ? [
            createLogEntry({
              turn: 1,
              actor: 'system' as const,
              message: `Pending encounter modifiers applied: ${getPendingEncounterModifierNameList(
                encounterModifiers,
              )}.`,
            }),
          ]
        : []),
      createLogEntry({
        turn: 1,
        actor: 'system',
        message:
          firstActor === 'player'
            ? `${params.character.name} acts first.`
            : `${monster.name} acts first.`,
      }),
    ],
  };
}

export function rollChance(percent: number): boolean {
  if (percent <= 0) {
    return false;
  }

  if (percent >= 100) {
    return true;
  }

  return Math.random() * 100 < percent;
}

export function applyCriticalDamage(
  damage: number,
  isCritical: boolean,
): number {
  if (!isCritical) {
    return damage;
  }

  return Math.max(
    BATTLE_BALANCE.minimumDamage,
    Math.round(damage * BATTLE_BALANCE.criticalDamageMultiplier),
  );
}

export function getCriticalLogText(isCritical: boolean): string {
  return isCritical ? ' Critical hit!' : '';
}

export function rollDamageVariance(
  damage: number,
  minMultiplier: number,
  maxMultiplier: number,
): number {
  const multiplier =
    minMultiplier + Math.random() * (maxMultiplier - minMultiplier);

  return Math.max(
    BATTLE_BALANCE.minimumDamage,
    Math.round(damage * multiplier),
  );
}

const BASIC_ATTACK_DAMAGE_TYPE: DamageType = 'physical';
const BASIC_ATTACK_ELEMENT_TYPE: ElementType = 'neutral';

export function clampResistanceValue(value: number): number {
  return Math.min(
    Math.max(value, BATTLE_BALANCE.resistanceMin),
    BATTLE_BALANCE.resistanceMax,
  );
}

export function getResistanceValue(
  resistances: ResistanceProfile | undefined,
  key: DamageType | ElementType,
): number {
  if (!resistances) {
    return 0;
  }

  return clampResistanceValue(resistances[key] ?? 0);
}

export function applyResistanceToDamage(
  damage: number,
  resistance: number,
): number {
  return Math.max(
    BATTLE_BALANCE.minimumDamage,
    Math.round(damage * (1 - resistance)),
  );
}

export function applyDamageTypeAndElementResistance(params: {
  damage: number;
  damageType: DamageType;
  elementType: ElementType;
  targetResistances: ResistanceProfile;
}): number {
  const baseDamage = Math.max(BATTLE_BALANCE.minimumDamage, params.damage);

  if (params.damageType === 'pure') {
    return baseDamage;
  }

  const damageTypeResistance = getResistanceValue(
    params.targetResistances,
    params.damageType,
  );

  const afterDamageTypeResistance = applyResistanceToDamage(
    baseDamage,
    damageTypeResistance,
  );

  const elementResistance = getResistanceValue(
    params.targetResistances,
    params.elementType,
  );

  return applyResistanceToDamage(
    afterDamageTypeResistance,
    elementResistance,
  );
}

export function reduceDamageByMonsterDefenseForDamageType(params: {
  rawDamage: number;
  monsterDefense: number;
  damageType: DamageType;
}): number {
  if (params.damageType !== 'physical') {
    return Math.max(BATTLE_BALANCE.minimumDamage, params.rawDamage);
  }

  return reduceDamageByMonsterDefense(
    params.rawDamage,
    params.monsterDefense,
  );
}

export function reduceDamageByPlayerDefenseForDamageType(params: {
  rawDamage: number;
  player: PlayerBattleState;
  damageType: DamageType;
}): number {
  if (params.damageType !== 'physical') {
    return Math.max(BATTLE_BALANCE.minimumDamage, params.rawDamage);
  }

  const reducedByPlayerDefense =
    params.rawDamage * (1 - params.player.derivedStats.damageReduction);

  return Math.max(
    BATTLE_BALANCE.minimumDamage,
    Math.round(reducedByPlayerDefense),
  );
}

export function getSkillDamageType(skill: SkillDefinition): DamageType {
  if (skill.damageType) {
    return skill.damageType;
  }

  if (skill.actionType === 'magical_spell') {
    return 'magical';
  }

  return 'physical';
}

export function getSkillElementType(skill: SkillDefinition): ElementType {
  return skill.elementType ?? 'neutral';
}

export function reduceDamageByMonsterDefense(
  rawDamage: number,
  monsterDefense: number,
): number {
  const reducedDamage =
    rawDamage -
    Math.floor(
      monsterDefense * BATTLE_BALANCE.monsterDefenseDamageReductionFactor,
    );

  return Math.max(BATTLE_BALANCE.minimumDamage, reducedDamage);
}

export function calculatePlayerBasicAttackDamage(
  player: PlayerBattleState,
  monster: MonsterBattleState,
): number {
  const rawDamage = Math.round(
    BATTLE_BALANCE.playerBasicAttackBaseDamage +
      player.baseStats.STR * BATTLE_BALANCE.playerBasicAttackStrMultiplier,
  );

  const damageAfterDefense = reduceDamageByMonsterDefenseForDamageType({
    rawDamage,
    monsterDefense: monster.defense,
    damageType: BASIC_ATTACK_DAMAGE_TYPE,
  });

  const damageAfterResistance = applyDamageTypeAndElementResistance({
    damage: damageAfterDefense,
    damageType: BASIC_ATTACK_DAMAGE_TYPE,
    elementType: BASIC_ATTACK_ELEMENT_TYPE,
    targetResistances: monster.resistances,
  });

  return rollDamageVariance(
    damageAfterResistance,
    BATTLE_BALANCE.playerAttackVarianceMin,
    BATTLE_BALANCE.playerAttackVarianceMax,
  );
}

export function getSkillScalingStatValue(
  player: PlayerBattleState,
  skill: SkillDefinition,
): number {
  if (!skill.scalingStat) {
    return 0;
  }

  return player.baseStats[skill.scalingStat];
}

export function calculateSkillPower(
  player: PlayerBattleState,
  skill: SkillDefinition,
): number {
  return calculateEffectiveSkillPower(player.baseStats, skill);
}

export function calculatePlayerSkillDamage(params: {
  player: PlayerBattleState;
  monster: MonsterBattleState;
  skill: SkillDefinition;
}): number {
  const { player, monster, skill } = params;

  if (skill.effectType !== 'damage') {
    return 0;
  }

  const rawDamage = calculateSkillPower(player, skill);
  const damageType = getEffectiveSkillDamageType(skill);
  const elementType = getEffectiveSkillElementType(skill);

  if (!damageType || !elementType) {
    return 0;
  }

  if (damageType === 'pure') {
    return Math.max(BATTLE_BALANCE.minimumDamage, rawDamage);
  }

  const damageAfterDefense = reduceDamageByMonsterDefenseForDamageType({
    rawDamage,
    monsterDefense: monster.defense,
    damageType,
  });

  const damageAfterResistance = applyDamageTypeAndElementResistance({
    damage: damageAfterDefense,
    damageType,
    elementType,
    targetResistances: monster.resistances,
  });

  return rollDamageVariance(
    damageAfterResistance,
    BATTLE_BALANCE.playerAttackVarianceMin,
    BATTLE_BALANCE.playerAttackVarianceMax,
  );
}

export function calculateMonsterBasicAttackDamage(
  monster: MonsterBattleState,
  player: PlayerBattleState,
): number {
  const damageAfterDefense = reduceDamageByPlayerDefenseForDamageType({
    rawDamage: monster.attack,
    player,
    damageType: monster.damageType,
  });

  const damageAfterResistance = applyDamageTypeAndElementResistance({
    damage: damageAfterDefense,
    damageType: monster.damageType,
    elementType: monster.elementType,
    targetResistances: player.resistances,
  });

  return rollDamageVariance(
    damageAfterResistance,
    BATTLE_BALANCE.monsterAttackVarianceMin,
    BATTLE_BALANCE.monsterAttackVarianceMax,
  );
}

export function canUseSkill(
  player: PlayerBattleState,
  skill: SkillDefinition,
): boolean {
  if (!skill.resourceType) {
    return true;
  }

  const resourceCost = getEffectiveSkillResourceCost(skill);

  if (skill.resourceType === 'MP') {
    return player.currentMp >= resourceCost;
  }

  if (skill.resourceType === 'Energy') {
    return player.currentEnergy >= resourceCost;
  }

  if (skill.resourceType === 'HP') {
    return player.currentHp > resourceCost;
  }

  return false;
}

export function spendSkillResource(
  player: PlayerBattleState,
  skill: SkillDefinition,
): PlayerBattleState {
  if (!skill.resourceType) {
    return player;
  }

  const resourceCost = getEffectiveSkillResourceCost(skill);

  if (skill.resourceType === 'MP') {
    return {
      ...player,
      currentMp: Math.max(0, player.currentMp - resourceCost),
    };
  }

  if (skill.resourceType === 'Energy') {
    return {
      ...player,
      currentEnergy: Math.max(0, player.currentEnergy - resourceCost),
    };
  }

  if (skill.resourceType === 'HP') {
    return {
      ...player,
      currentHp: Math.max(1, player.currentHp - resourceCost),
    };
  }

  return player;
}

export function applyDamageToMonster(
  monster: MonsterBattleState,
  damage: number,
): MonsterBattleState {
  return {
    ...monster,
    currentHp: Math.max(0, monster.currentHp - damage),
  };
}

export function applyDamageToPlayer(
  player: PlayerBattleState,
  damage: number,
): PlayerBattleState {
  const shieldBlockedDamage = Math.min(player.shield, damage);
  const remainingDamage = damage - shieldBlockedDamage;

  return {
    ...player,
    shield: Math.max(0, player.shield - shieldBlockedDamage),
    currentHp: Math.max(0, player.currentHp - remainingDamage),
  };
}

export function applyHealToPlayer(
  player: PlayerBattleState,
  healAmount: number,
): PlayerBattleState {
  return {
    ...player,
    currentHp: Math.min(
      player.derivedStats.maxHp,
      player.currentHp + healAmount,
    ),
  };
}

export function applyShieldToPlayer(
  player: PlayerBattleState,
  shieldAmount: number,
): PlayerBattleState {
  return {
    ...player,
    shield: player.shield + shieldAmount,
  };
}

export function isMonsterDefeated(monster: MonsterBattleState): boolean {
  return monster.currentHp <= 0;
}

export function isPlayerDefeated(player: PlayerBattleState): boolean {
  return player.currentHp <= 0;
}

export function calculateZoneFleeChance(
  player: PlayerBattleState,
): number {
  const hpRatio = player.currentHp / player.derivedStats.maxHp;
  const lowHpBonus =
    hpRatio <= 0.35 ? BATTLE_BALANCE.zoneFleeLowHpBonusPercent : 0;

  const rawChance =
    BATTLE_BALANCE.zoneFleeBaseChancePercent +
    player.baseStats.LUK * BATTLE_BALANCE.zoneFleeLuckScalingPercent +
    lowHpBonus;

  return Math.min(BATTLE_BALANCE.zoneFleeMaxChancePercent, rawChance);
}

export function getNextActor(
  currentActor: 'player' | 'monster',
): 'player' | 'monster' {
  return currentActor === 'player' ? 'monster' : 'player';
}