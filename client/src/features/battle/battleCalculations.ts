import type { Character, SkillDefinition } from '../character-creation/types';
import type { DungeonDefinition } from '../dungeon/dungeonTypes';
import { MONSTERS } from '../monster/monsterConstants';
import { BATTLE_BALANCE } from '../game-balance/balanceConstants';
import type {
  MonsterBattleState,
  MonsterDefinition,
} from '../monster/monsterTypes';

import type {
  BattleLogEntry,
  BattleState,
  PlayerBattleState,
} from './battleTypes';

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
    skills: character.skills,
  };
}

export function createMonsterBattleState(
  monster: MonsterDefinition,
): MonsterBattleState {
  return {
    monsterId: monster.id,
    name: monster.name,
    level: monster.level,
    rank: monster.rank,
    currentHp: monster.stats.maxHp,
    maxHp: monster.stats.maxHp,
    attack: monster.stats.attack,
    defense: monster.stats.defense,
    actionSpeed: monster.stats.actionSpeed,
    critRate: monster.stats.critRate,
    damageType: monster.damageType,
    reward: monster.reward,
    tags: monster.tags,
  };
}

export function getPossibleMonstersForDungeon(
  dungeon: DungeonDefinition,
): MonsterDefinition[] {
  return MONSTERS.filter((monster) =>
    dungeon.possibleMonsterIds.includes(monster.id),
  );
}

export function getRandomMonsterForDungeon(
  dungeon: DungeonDefinition,
): MonsterDefinition {
  const possibleMonsters = getPossibleMonstersForDungeon(dungeon);

  if (possibleMonsters.length === 0) {
    throw new Error(`No monsters found for dungeon: ${dungeon.id}`);
  }

  const randomIndex = Math.floor(Math.random() * possibleMonsters.length);

  return possibleMonsters[randomIndex];
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
  dungeon: DungeonDefinition;
}): BattleState {
  const player = createPlayerBattleState(params.character);
  const monsterDefinition = getRandomMonsterForDungeon(params.dungeon);
  const monster = createMonsterBattleState(monsterDefinition);
  const firstActor = determineFirstActor(player, monster);

  return {
    id: createBattleId('battle'),
    dungeonId: params.dungeon.id,
    dungeonName: params.dungeon.name,
    player,
    monster,
    status: 'active',
    turn: 1,
    currentActor: firstActor,
    reward: {
      exp: monster.reward.exp,
      gold: monster.reward.gold,
    },
    logs: [
      createLogEntry({
        turn: 1,
        actor: 'system',
        message: `${params.character.name} encountered ${monster.name} in ${params.dungeon.name}.`,
      }),
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

export function calculatePlayerBasicAttackDamage(
  player: PlayerBattleState,
  monster: MonsterBattleState,
): number {
  const rawDamage = Math.round(
    BATTLE_BALANCE.playerBasicAttackBaseDamage +
    player.baseStats.STR * BATTLE_BALANCE.playerBasicAttackBaseDamage,
  );
  const reducedDamage = 
    rawDamage -
    Math.floor(
        monster.defense * BATTLE_BALANCE.monsterDefenseDamageReductionFactor,
    );

  return Math.max(1, reducedDamage);
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
  const scalingStatValue = getSkillScalingStatValue(player, skill);

  return Math.max(
    1,
    Math.round(skill.baseValue + scalingStatValue * skill.multiplier),
  );
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

  if (skill.damageType === 'pure') {
    return Math.max(1, rawDamage);
  }

  const reducedDamage =
    rawDamage -
    Math.floor(
        monster.defense * BATTLE_BALANCE.monsterDefenseDamageReductionFactor,
  );

  return Math.max(1, reducedDamage);
}

export function calculateMonsterBasicAttackDamage(
  monster: MonsterBattleState,
  player: PlayerBattleState,
): number {
  const reducedByPlayerDefense =
    monster.attack * (1 - player.derivedStats.damageReduction);

  return Math.max(1, Math.round(reducedByPlayerDefense));
}

export function canUseSkill(
  player: PlayerBattleState,
  skill: SkillDefinition,
): boolean {
  if (!skill.resourceType) {
    return true;
  }

  if (skill.resourceType === 'MP') {
    return player.currentMp >= skill.resourceCost;
  }

  if (skill.resourceType === 'Energy') {
    return player.currentEnergy >= skill.resourceCost;
  }

  if (skill.resourceType === 'HP') {
    return player.currentHp > skill.resourceCost;
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

  if (skill.resourceType === 'MP') {
    return {
      ...player,
      currentMp: Math.max(0, player.currentMp - skill.resourceCost),
    };
  }

  if (skill.resourceType === 'Energy') {
    return {
      ...player,
      currentEnergy: Math.max(0, player.currentEnergy - skill.resourceCost),
    };
  }

  if (skill.resourceType === 'HP') {
    return {
      ...player,
      currentHp: Math.max(1, player.currentHp - skill.resourceCost),
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

export function getNextActor(currentActor: 'player' | 'monster'): 'player' | 'monster' {
  return currentActor === 'player' ? 'monster' : 'player';
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
        1, 
        Math.round(damage * BATTLE_BALANCE.criticalDamageMultiplier));
}

export function getCriticalLogText(isCritical: boolean): string {
    return isCritical ? ' Critical hit!' : '';
}