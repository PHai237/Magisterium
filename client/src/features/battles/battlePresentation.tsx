import type { ReactNode } from "react";

import type {
  BattleActorState,
  BattleEvent,
  BattleState,
  CharacterSnapshot,
  ItemId,
  MonsterId,
  SkillId,
} from "../../domain/magisterium.types";
import { compactLabel, formatNumber } from "../../lib/format";
export type DrawerType = "MAIN" | "ATTACK" | "MAGIC" | "ITEM";
export type SkillDrawerGroup = "attack" | "magic";

export interface SkillDisplayDefinition {
  label: string;
  icon: string;
  cost: string;
  group: SkillDrawerGroup;
  needsEnemyTarget: boolean;
}

export interface ItemDisplayDefinition {
  label: string;
  icon: string;
}

export interface MonsterDisplayDefinition {
  label: string;
  icon: string;
  level: number;
}

export interface BattleLogGroup {
  label: string;
  events: BattleEvent[];
  current: boolean;
}

export const SKILL_DISPLAY_DEFINITIONS: Record<string, SkillDisplayDefinition> =
  {
    spark: {
      label: "Magic Spark",
      icon: "🔥",
      cost: "Costs 5 MP",
      group: "magic",
      needsEnemyTarget: true,
    },
    heavy_strike: {
      label: "Heavy Strike",
      icon: "💥",
      cost: "Costs 12 Stamina",
      group: "attack",
      needsEnemyTarget: true,
    },
    steady_strike: {
      label: "Steady Strike",
      icon: "⚔️",
      cost: "Costs 7 Stamina",
      group: "attack",
      needsEnemyTarget: true,
    },
    quick_stab: {
      label: "Quick Stab",
      icon: "🗡️",
      cost: "Costs 8 Stamina",
      group: "attack",
      needsEnemyTarget: true,
    },
    minor_heal: {
      label: "Minor Heal",
      icon: "✦",
      cost: "Costs 8 MP",
      group: "magic",
      needsEnemyTarget: false,
    },
  };

export const ITEM_DISPLAY_DEFINITIONS: Record<string, ItemDisplayDefinition> = {
  minor_hp_potion: {
    label: "Minor HP Potion",
    icon: "🧪",
  },
  minor_mp_potion: {
    label: "Minor MP Potion",
    icon: "🔷",
  },
  stamina_bread: {
    label: "Stamina Bread",
    icon: "🍞",
  },
  spider_silk: {
    label: "Spider Silk",
    icon: "S",
  },
  spider_eye: {
    label: "Spider Eye",
    icon: "E",
  },
  venom_sac: {
    label: "Venom Sac",
    icon: "V",
  },
};

export const MONSTER_DISPLAY_DEFINITIONS: Record<
  MonsterId,
  MonsterDisplayDefinition
> = {
  slime: {
    label: "Slime",
    icon: "🟢",
    level: 1,
  },
  horned_rabbit: {
    label: "Horned Rabbit",
    icon: "R",
    level: 1,
  },
  razorwing_hawk: {
    label: "Razorwing Hawk",
    icon: "H",
    level: 1,
  },
  wild_boar: {
    label: "Wild Boar",
    icon: "🐗",
    level: 1,
  },
  wild_wolf: {
    label: "Wild Wolf",
    icon: "🐺",
    level: 2,
  },
  bear: {
    label: "Bear",
    icon: "B",
    level: 3,
  },
  goblin: {
    label: "Goblin",
    icon: "👺",
    level: 2,
  },
  spider: {
    label: "Spider",
    icon: "S",
    level: 2,
  },
  ore_mite: {
    label: "Ore Mite",
    icon: "O",
    level: 2,
  },
};

export function clampPercent(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / max) * 100));
}

export function getCharacterActor(
  battle: BattleState | null,
): BattleActorState | null {
  if (!battle) {
    return null;
  }

  return (
    Object.values(battle.actors).find(
      (actor) => actor.actorType === "character",
    ) ?? null
  );
}

export function getMonsterActors(
  battle: BattleState | null,
): BattleActorState[] {
  if (!battle) {
    return [];
  }

  return Object.values(battle.actors).filter(
    (actor) => actor.actorType === "monster",
  );
}

export function getLiveMonsterActors(
  battle: BattleState | null,
): BattleActorState[] {
  return getMonsterActors(battle).filter((actor) => actor.hp > 0);
}

export function getMonsterDisplay(
  actor: BattleActorState | null | undefined,
): MonsterDisplayDefinition {
  if (!actor?.monsterId) {
    return {
      label: "Unknown Enemy",
      icon: "◇",
      level: 1,
    };
  }

  return MONSTER_DISPLAY_DEFINITIONS[actor.monsterId];
}

export function getSkillDisplay(skillId: SkillId): SkillDisplayDefinition {
  return (
    SKILL_DISPLAY_DEFINITIONS[skillId] ?? {
      label: compactLabel(skillId),
      icon: "✦",
      cost: "Skill",
      group: "magic",
      needsEnemyTarget: true,
    }
  );
}

export function getItemDisplay(itemId: ItemId): ItemDisplayDefinition {
  return (
    ITEM_DISPLAY_DEFINITIONS[itemId] ?? {
      label: compactLabel(itemId),
      icon: "◇",
    }
  );
}

export function getItemQuantity(
  actor: BattleActorState | null,
  itemId: ItemId,
): number {
  if (!actor) {
    return 0;
  }

  return actor.inventoryItemIds.filter(
    (currentItemId) => currentItemId === itemId,
  ).length;
}

export function isBattleFinished(battle: BattleState | null): boolean {
  return (
    battle?.status === "victory" ||
    battle?.status === "defeat" ||
    battle?.status === "escaped" ||
    battle?.status === "cancelled"
  );
}

export function shouldShowClaimReward(battle: BattleState | null): boolean {
  return battle?.status === "victory" && !battle.rewardClaim;
}

export function getCharacterProgressionLabel(
  character: CharacterSnapshot,
): string {
  return `${compactLabel(character.progression.rankId ?? "novice")} · ${compactLabel(
    character.originId,
  )}`;
}

export function groupBattleEvents(
  battle: BattleState | null,
): BattleLogGroup[] {
  if (!battle) {
    return [];
  }

  const groups: BattleLogGroup[] = [];
  let currentGroup: BattleLogGroup | null = null;
  let fallbackRoundNumber = 1;

  for (const event of battle.events) {
    if (event.type === "TURN_STARTED") {
      currentGroup = {
        label: getTurnGroupLabel(battle, event, fallbackRoundNumber),
        events: [],
        current: false,
      };

      groups.push(currentGroup);
      fallbackRoundNumber = getEventRoundNumber(event, fallbackRoundNumber);

      continue;
    }

    if (HIDDEN_BATTLE_LOG_EVENT_TYPES.has(event.type)) {
      continue;
    }

    if (!currentGroup) {
      continue;
    }

    currentGroup.events.push(event);
  }

  if (groups.length > 0 && !isBattleFinished(battle)) {
    groups[groups.length - 1]!.current = true;
  }

  return groups.filter((group) => group.events.length > 0 || group.current);
}

export function groupBattleEventsByRound(
  battle: BattleState | null,
): BattleLogGroup[] {
  if (!battle) {
    return [];
  }

  const groups: BattleLogGroup[] = [];
  let currentGroup: BattleLogGroup | null = null;
  let currentRoundNumber = 1;

  function ensureRoundGroup(roundNumber: number): BattleLogGroup {
    const safeRoundNumber = Math.max(1, Math.floor(roundNumber));

    if (!currentGroup || currentGroup.label !== `Turn ${safeRoundNumber}`) {
      currentGroup = {
        label: `Turn ${safeRoundNumber}`,
        events: [],
        current: false,
      };

      groups.push(currentGroup);
    }

    return currentGroup;
  }

  for (const event of battle.events) {
    if (event.type === "TURN_STARTED") {
      currentRoundNumber = getEventRoundNumber(event, currentRoundNumber);
      ensureRoundGroup(currentRoundNumber);
      continue;
    }

    if (HIDDEN_BATTLE_LOG_EVENT_TYPES.has(event.type)) {
      continue;
    }

    ensureRoundGroup(currentRoundNumber).events.push(event);
  }

  const latestGroupWithEvents = [...groups]
    .reverse()
    .find((group) => group.events.length > 0);

  if (latestGroupWithEvents && !isBattleFinished(battle)) {
    latestGroupWithEvents.current = true;
  }

  return groups.filter((group) => group.events.length > 0 || group.current);
}

export function getTurnGroupLabel(
  battle: BattleState,
  event: BattleEvent,
  fallbackRoundNumber: number,
): string {
  const actor = event.actorId ? battle.actors[event.actorId] : undefined;
  const actorName =
    actor?.actorType === "character"
      ? "You"
      : actor?.actorType === "monster"
        ? getMonsterDisplay(actor).label
        : undefined;
  const roundNumber = getEventRoundNumber(event, fallbackRoundNumber);

  return actorName
    ? `Turn ${roundNumber} - ${actorName}`
    : `Turn ${roundNumber}`;
}

export function getEventRoundNumber(
  event: BattleEvent,
  fallbackRoundNumber: number,
): number {
  const roundNumber = event.metadata?.roundNumber;

  return typeof roundNumber === "number" && Number.isFinite(roundNumber)
    ? Math.max(1, Math.floor(roundNumber))
    : fallbackRoundNumber;
}

export function getEventTone(
  event: BattleEvent,
): "damage" | "enemy" | "resource" | "cancelled" | "miss" | "neutral" {
  if (event.type === "MISS") {
    return "miss";
  }

  if (event.type === "DAMAGE_APPLIED") {
    return "damage";
  }

  if (event.type === "HEAL_APPLIED") {
    return "resource";
  }

  if (event.type === "ACTION_CANCELLED") {
    return "cancelled";
  }

  if (event.type === "ACTOR_DEFEATED") {
    return "enemy";
  }

  return "neutral";
}

export const HIDDEN_BATTLE_LOG_EVENT_TYPES = new Set([
  "BATTLE_STARTED",
  "BATTLE_ENDED",
  "ROUND_STARTED",
  "ROUND_ENDED",
  "TURN_STARTED",
  "TURN_ENDED",
  "ACTION_STARTED",
  "ACTION_COMPLETED",
  "ITEM_USED",
  "HIT",
  "CRIT",
  "DAMAGE_CALCULATED",
  "DAMAGE_MITIGATED",
  "RESOURCE_SPENT",
  "ITEM_CONSUMED",
]);

export function getActorName(
  battle: BattleState | null,
  actorId: string | undefined,
  currentCharacter: CharacterSnapshot,
): string {
  if (!actorId || !battle) {
    return "Unknown";
  }

  const actor = battle.actors[actorId];

  if (!actor) {
    return actorId;
  }

  if (actor.actorType === "character") {
    return currentCharacter.name;
  }

  return getMonsterDisplay(actor).label;
}

export function getActorLogRole(
  battle: BattleState | null,
  actorId: string | undefined,
): "player" | "enemy" | "system" {
  if (!actorId || !battle) {
    return "system";
  }

  const actor = battle.actors[actorId];

  if (!actor) {
    return "system";
  }

  return actor.actorType === "character" ? "player" : "enemy";
}

export function renderActorName(
  battle: BattleState | null,
  actorId: string | undefined,
  currentCharacter: CharacterSnapshot,
  forcedTone?: "miss",
): ReactNode {
  const actorName = getActorName(battle, actorId, currentCharacter);
  const actorRole = getActorLogRole(battle, actorId);

  const tone =
    forcedTone ??
    (actorRole === "enemy"
      ? "enemy"
      : actorRole === "player"
        ? "player"
        : "neutral");

  return (
    <span className={`battle-log-actor battle-log-actor--${tone}`}>
      {actorName}
    </span>
  );
}

export function getVisibleBattleLogEvents(
  events: BattleEvent[],
): BattleEvent[] {
  return events.filter(
    (event) => !HIDDEN_BATTLE_LOG_EVENT_TYPES.has(event.type),
  );
}

export function renderBattleLogEvent(
  event: BattleEvent,
  battle: BattleState | null,
  currentCharacter: CharacterSnapshot,
): ReactNode {
  const actorRole = getActorLogRole(battle, event.actorId);

  if (event.type === "DAMAGE_APPLIED") {
    const damageValue = Math.max(0, Math.floor(event.value ?? 0));

    return (
      <>
        {renderActorName(battle, event.actorId, currentCharacter)}
        <span> deals </span>
        <span
          className={
            actorRole === "enemy"
              ? "battle-log-value battle-log-value--enemy"
              : "battle-log-value battle-log-value--player"
          }
        >
          {damageValue} damage
        </span>
        <span> to </span>
        {renderActorName(battle, event.targetId, currentCharacter)}
        <span>.</span>
      </>
    );
  }

  if (event.type === "MISS") {
    return (
      <>
        {renderActorName(battle, event.actorId, currentCharacter, "miss")}
        <span> misses </span>
        {renderActorName(battle, event.targetId, currentCharacter, "miss")}
        <span>.</span>
      </>
    );
  }

  if (event.type === "HEAL_APPLIED") {
    return (
      <>
        {renderActorName(battle, event.targetId, currentCharacter)}
        <span> recovers </span>
        <span className="battle-log-value battle-log-value--heal">
          {Math.max(0, Math.floor(event.value ?? 0))} HP
        </span>
        <span>.</span>
      </>
    );
  }

  if (event.type === "RESOURCE_RESTORED") {
    const restoredValue = Math.max(0, Math.floor(event.value ?? 0));
    const resourceType =
      typeof event.metadata?.resourceType === "string"
        ? event.metadata.resourceType
        : "resource";
    const targetActorId = event.targetId ?? event.actorId;

    return (
      <>
        {renderActorName(battle, targetActorId, currentCharacter)}
        <span> recovers </span>
        <span className="battle-log-value battle-log-value--heal">
          {restoredValue} {resourceType}
        </span>
        <span>.</span>
      </>
    );
  }

  if (event.type === "SHIELD_DAMAGED") {
    return (
      <>
        {renderActorName(battle, event.targetId, currentCharacter)}
        <span>'s shield absorbs damage.</span>
      </>
    );
  }

  if (event.type === "SHIELD_BROKEN") {
    return (
      <>
        {renderActorName(battle, event.targetId, currentCharacter)}
        <span>'s shield breaks.</span>
      </>
    );
  }

  if (event.type === "ACTOR_DEFEATED") {
    const defeatedActorId = event.targetId || event.actorId;

    return (
      <>
        {renderActorName(battle, defeatedActorId, currentCharacter)}
        <span> is defeated.</span>
      </>
    );
  }

  if (event.type === "ACTION_CANCELLED") {
    return event.message || "Action cancelled.";
  }

  return event.message || compactLabel(event.type);
}

export function ResourceBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "hp" | "mp" | "stamina";
}) {
  return (
    <div className={`battle-resource battle-resource--${tone}`}>
      <span className="battle-resource__label">{label}</span>

      <div className="battle-resource__track">
        <div
          className="battle-resource__fill"
          style={{ width: `${clampPercent(value, max)}%` }}
        />

        <strong className="battle-resource__value">
          {formatNumber(value)} / {formatNumber(max)}
        </strong>
      </div>
    </div>
  );
}

export function MobileResourcePill({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "hp" | "mp" | "stamina";
}) {
  return (
    <div className={`battle-mobile-resource battle-mobile-resource--${tone}`}>
      <div className="battle-mobile-resource__top">
        <span>{label}</span>
        <strong>
          {formatNumber(value)} / {formatNumber(max)}
        </strong>
      </div>

      <div className="battle-mobile-resource__track">
        <span style={{ width: `${clampPercent(value, max)}%` }} />
      </div>
    </div>
  );
}
