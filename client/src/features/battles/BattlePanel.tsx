import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type {
  BattleActionType,
  BattleActorState,
  BattleEvent,
  BattleState,
  CharacterSnapshot,
  EncounterId,
  ItemId,
  MonsterId,
  SkillId,
} from "../../domain/magisterium.types";
import { compactLabel, formatNumber, uniqueValues } from "../../lib/format";
import { battlesApi } from "./battles.api";
import { MobileBattleLog } from "./MobileBattleLog";
import "./battle.css";

interface BattlePanelProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  initialEncounterId: EncounterId;
  onExitBattle: () => void;
  onCharacterUpdated?: (character: CharacterSnapshot) => void;
}

type DrawerType = "MAIN" | "ATTACK" | "MAGIC" | "ITEM";
type SkillDrawerGroup = "attack" | "magic";

interface SkillDisplayDefinition {
  label: string;
  icon: string;
  cost: string;
  group: SkillDrawerGroup;
  needsEnemyTarget: boolean;
}

interface ItemDisplayDefinition {
  label: string;
  icon: string;
}

interface MonsterDisplayDefinition {
  label: string;
  icon: string;
  level: number;
}

interface BattleLogGroup {
  label: string;
  events: BattleEvent[];
  current: boolean;
}

const SKILL_DISPLAY_DEFINITIONS: Record<string, SkillDisplayDefinition> = {
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
    cost: "Costs 8 Stamina",
    group: "attack",
    needsEnemyTarget: true,
  },
  quick_stab: {
    label: "Quick Stab",
    icon: "🗡️",
    cost: "Costs 6 Stamina",
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

const ITEM_DISPLAY_DEFINITIONS: Record<string, ItemDisplayDefinition> = {
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

const MONSTER_DISPLAY_DEFINITIONS: Record<MonsterId, MonsterDisplayDefinition> =
  {
    slime: {
      label: "Slime",
      icon: "🟢",
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
  };

function clampPercent(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / max) * 100));
}

function getCharacterActor(
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

function getMonsterActors(battle: BattleState | null): BattleActorState[] {
  if (!battle) {
    return [];
  }

  return Object.values(battle.actors).filter(
    (actor) => actor.actorType === "monster",
  );
}

function getLiveMonsterActors(battle: BattleState | null): BattleActorState[] {
  return getMonsterActors(battle).filter((actor) => actor.hp > 0);
}

function getMonsterDisplay(
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

function getSkillDisplay(skillId: SkillId): SkillDisplayDefinition {
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

function getItemDisplay(itemId: ItemId): ItemDisplayDefinition {
  return (
    ITEM_DISPLAY_DEFINITIONS[itemId] ?? {
      label: compactLabel(itemId),
      icon: "◇",
    }
  );
}

function getItemQuantity(
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

function isBattleFinished(battle: BattleState | null): boolean {
  return (
    battle?.status === "victory" ||
    battle?.status === "defeat" ||
    battle?.status === "fled"
  );
}

function shouldShowClaimReward(battle: BattleState | null): boolean {
  return battle?.status === "victory" && !battle.rewardClaim;
}

function groupBattleEvents(battle: BattleState | null): BattleLogGroup[] {
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

function groupBattleEventsByRound(
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

function getTurnGroupLabel(
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

function getEventRoundNumber(
  event: BattleEvent,
  fallbackRoundNumber: number,
): number {
  const roundNumber = event.metadata?.roundNumber;

  return typeof roundNumber === "number" && Number.isFinite(roundNumber)
    ? Math.max(1, Math.floor(roundNumber))
    : fallbackRoundNumber;
}

function getEventTone(
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

const HIDDEN_BATTLE_LOG_EVENT_TYPES = new Set([
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

function getActorName(
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

function getActorLogRole(
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

function renderActorName(
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

function getVisibleBattleLogEvents(events: BattleEvent[]): BattleEvent[] {
  return events.filter(
    (event) => !HIDDEN_BATTLE_LOG_EVENT_TYPES.has(event.type),
  );
}

function renderBattleLogEvent(
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

function ResourceBar({
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

function MobileResourcePill({
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

export function BattlePanel({
  userId,
  currentCharacter,
  initialEncounterId,
  onExitBattle,
  onCharacterUpdated,
}: BattlePanelProps) {
  const hasStartedRef = useRef(false);
  const battleLogScrollRef = useRef<HTMLDivElement | null>(null);

  const [battle, setBattle] = useState<BattleState | null>(null);
  const [targetId, setTargetId] = useState("");
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>("MAIN");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeActor = battle?.activeActorId
    ? battle.actors[battle.activeActorId]
    : undefined;

  const playerActor = getCharacterActor(battle);
  const liveEnemies = useMemo(() => getLiveMonsterActors(battle), [battle]);

  const focusedEnemy = useMemo(() => {
    if (!battle) {
      return null;
    }

    return (
      liveEnemies.find((actor) => actor.actorId === targetId) ??
      liveEnemies[0] ??
      getMonsterActors(battle)[0] ??
      null
    );
  }, [battle, liveEnemies, targetId]);

  const focusedEnemyDisplay = getMonsterDisplay(focusedEnemy);

  const skillIds = useMemo(
    () => uniqueValues(playerActor?.skillIds ?? []),
    [playerActor],
  );

  const attackSkillIds = useMemo(
    () =>
      skillIds.filter((skillId) => getSkillDisplay(skillId).group === "attack"),
    [skillIds],
  );

  const magicSkillIds = useMemo(
    () =>
      skillIds.filter((skillId) => getSkillDisplay(skillId).group === "magic"),
    [skillIds],
  );

  const usableBattleItems = useMemo(
    () =>
      uniqueValues(playerActor?.inventoryItemIds ?? []).filter(
        (itemId) => ITEM_DISPLAY_DEFINITIONS[itemId] !== undefined,
      ),
    [playerActor],
  );

  const battleFinished = isBattleFinished(battle);
  const isPlayerTurn = activeActor?.actorType === "character";

  const battleLogGroups = useMemo(() => groupBattleEvents(battle), [battle]);

  const mobileBattleLogGroups = useMemo(
    () => groupBattleEventsByRound(battle),
    [battle],
  );

  const latestMobileBattleLogGroup = useMemo(() => {
    for (
      let groupIndex = mobileBattleLogGroups.length - 1;
      groupIndex >= 0;
      groupIndex -= 1
    ) {
      const visibleEvents = getVisibleBattleLogEvents(
        mobileBattleLogGroups[groupIndex]!.events,
      );

      if (
        visibleEvents.length > 0 ||
        mobileBattleLogGroups[groupIndex]!.current
      ) {
        return mobileBattleLogGroups[groupIndex]!;
      }
    }

    return null;
  }, [mobileBattleLogGroups]);

  useLayoutEffect(() => {
    const logElement = battleLogScrollRef.current;

    if (!logElement) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      logElement.scrollTo({
        top: logElement.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [battle?.battleId, battle?.events.length, battleLogGroups.length]);

  useEffect(() => {
    if (hasStartedRef.current) {
      return undefined;
    }

    hasStartedRef.current = true;

    let cancelled = false;

    async function createBattle() {
      setBusy(true);
      setNotice(null);
      setError(null);

      try {
        const createdBattle = await battlesApi.create(userId, {
          characterId: currentCharacter.id,
          encounterId: initialEncounterId,
          autoStart: true,
          autoResolveMonsterTurns: true,
        });

        if (cancelled) {
          return;
        }

        setBattle(createdBattle);
        setTargetId(getLiveMonsterActors(createdBattle)[0]?.actorId ?? "");
      } catch (createError) {
        if (cancelled) {
          return;
        }

        setError(
          createError instanceof Error
            ? createError.message
            : "Failed to start battle.",
        );
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    }

    void createBattle();

    return () => {
      cancelled = true;
    };
  }, [currentCharacter.id, initialEncounterId, userId]);

  useEffect(() => {
    const targetStillAvailable = liveEnemies.some(
      (actor) => actor.actorId === targetId,
    );

    if (!targetStillAvailable) {
      setTargetId(liveEnemies[0]?.actorId ?? "");
    }
  }, [liveEnemies, targetId]);

  useEffect(() => {
    if (!notice && !error) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setNotice(null);
      setError(null);
    }, 3000);

    return () => window.clearTimeout(timerId);
  }, [notice, error]);

  async function runAction(
    actionType: BattleActionType,
    options: {
      skillId?: SkillId;
      itemId?: ItemId;
      targetRequired?: boolean;
    } = {},
  ) {
    if (!battle || !activeActor || busy || battleFinished) {
      return;
    }

    if (!isPlayerTurn) {
      setError("Waiting for enemy turns to resolve.");
      return;
    }

    if (options.targetRequired && !targetId) {
      setError("Choose a target first.");
      return;
    }

    setBusy(true);
    setNotice(null);
    setError(null);

    try {
      const result = await battlesApi.resolveAction(userId, battle.battleId, {
        actorId: activeActor.actorId,
        actionType,
        targetIds: options.targetRequired && targetId ? [targetId] : [],
        skillId: options.skillId,
        itemId: options.itemId,
        autoResolveMonsterTurns: true,
      });

      setBattle(result.battleState);
      setActiveDrawer("MAIN");
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Action failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function claimReward() {
    if (!battle || busy || battle.status !== "victory") {
      return;
    }

    setBusy(true);
    setNotice(null);
    setError(null);

    try {
      const result = await battlesApi.claimReward(
        userId,
        battle.battleId,
        currentCharacter,
      );

      setBattle(result.battle);
      onCharacterUpdated?.(result.character);

      const rewardItems = result.reward.items
        .map((item) => `${compactLabel(item.itemId)} x${item.quantity}`)
        .join(", ");

      setNotice(
        rewardItems
          ? `Reward claimed: ${result.reward.exp} EXP, ${result.reward.moneyBronze} Bronze, ${rewardItems}.`
          : `Reward claimed: ${result.reward.exp} EXP, ${result.reward.moneyBronze} Bronze.`,
      );
    } catch (claimError) {
      setError(
        claimError instanceof Error
          ? claimError.message
          : "Reward claim failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function renderActiveEffects(actor: BattleActorState | null) {
    if (!actor || actor.activeStatusEffects.length === 0) {
      return (
        <div className="battle-effects-empty">
          <span>No active effects</span>
        </div>
      );
    }

    return (
      <div className="battle-effects-list">
        {actor.activeStatusEffects.map((_effect, index) => (
          <div key={index} className="battle-effect-chip">
            <span>✦ Active Effect</span>
            <small>Pending status UI</small>
          </div>
        ))}
      </div>
    );
  }

  function renderCommandPanel() {
    if (!battle) {
      return (
        <div className="battle-loading-card">
          {busy ? "Entering encounter..." : "Preparing battle..."}
        </div>
      );
    }

    if (battleFinished) {
      const canClaimReward = shouldShowClaimReward(battle);

      return (
        <div
          className={
            canClaimReward
              ? "battle-result-card"
              : "battle-result-card battle-result-card--return-only"
          }
        >
          <strong>{compactLabel(battle.status)}</strong>

          {battle.status === "victory" ? null : (
            <span>The battle has ended.</span>
          )}

          <div className="battle-result-actions">
            {canClaimReward ? (
              <button
                type="button"
                className="battle-primary-button"
                disabled={busy}
                onClick={() => void claimReward()}
              >
                {busy ? "Claiming..." : "Claim Reward"}
              </button>
            ) : null}

            <button
              type="button"
              className="battle-secondary-button"
              disabled={busy}
              onClick={onExitBattle}
            >
              Return
            </button>
          </div>
        </div>
      );
    }

    if (!activeActor || !isPlayerTurn) {
      return (
        <div className="battle-loading-card">Enemy turn is resolving...</div>
      );
    }

    return (
      <>
        <div className="battle-command-top">
          <div>Control Panel</div>

          {activeDrawer !== "MAIN" ? (
            <button
              type="button"
              className="battle-command-back"
              onClick={() => setActiveDrawer("MAIN")}
            >
              ← Back
            </button>
          ) : null}
        </div>

        {activeDrawer === "MAIN" ? (
          <div className="battle-main-actions">
            <button
              type="button"
              className="battle-main-action battle-main-action--attack"
              disabled={busy}
              onClick={() => setActiveDrawer("ATTACK")}
            >
              <strong>⚔️ ATTACK</strong>
              <span>Basic & Physical Skills</span>
            </button>

            <button
              type="button"
              className="battle-main-action battle-main-action--magic"
              disabled={busy}
              onClick={() => setActiveDrawer("MAGIC")}
            >
              <strong>🔮 MAGIC</strong>
              <span>Falna & Spell Skills</span>
            </button>

            <button
              type="button"
              className="battle-main-action battle-main-action--item"
              disabled={busy}
              onClick={() => setActiveDrawer("ITEM")}
            >
              <strong>🧪 ITEMS & OTHERS</strong>
              <span>Consumables & Flee</span>
            </button>
          </div>
        ) : null}

        {activeDrawer === "ATTACK" ? (
          <div className="battle-drawer-grid">
            <button
              type="button"
              className="battle-drawer-button"
              disabled={busy || !targetId}
              onClick={() =>
                void runAction("basic_attack", { targetRequired: true })
              }
            >
              ⚔️ Basic Strike
            </button>

            {attackSkillIds.map((skillId) => {
              const skill = getSkillDisplay(skillId);

              return (
                <button
                  key={skillId}
                  type="button"
                  className="battle-drawer-button"
                  disabled={busy || (skill.needsEnemyTarget && !targetId)}
                  onClick={() =>
                    void runAction("use_skill", {
                      skillId,
                      targetRequired: skill.needsEnemyTarget,
                    })
                  }
                >
                  <span>
                    {skill.icon} {skill.label}
                  </span>
                  <em>{skill.cost}</em>
                </button>
              );
            })}

            {attackSkillIds.length === 0 ? (
              <div className="battle-drawer-empty">
                No physical skill equipped.
              </div>
            ) : null}
          </div>
        ) : null}

        {activeDrawer === "MAGIC" ? (
          <div className="battle-drawer-grid">
            {magicSkillIds.map((skillId) => {
              const skill = getSkillDisplay(skillId);

              return (
                <button
                  key={skillId}
                  type="button"
                  className="battle-drawer-button battle-drawer-button--magic"
                  disabled={busy || (skill.needsEnemyTarget && !targetId)}
                  onClick={() =>
                    void runAction("use_skill", {
                      skillId,
                      targetRequired: skill.needsEnemyTarget,
                    })
                  }
                >
                  <span>
                    {skill.icon} {skill.label}
                  </span>
                  <em>{skill.cost}</em>
                </button>
              );
            })}

            {magicSkillIds.length === 0 ? (
              <div className="battle-drawer-empty">
                No magic skill equipped.
              </div>
            ) : null}
          </div>
        ) : null}

        {activeDrawer === "ITEM" ? (
          <div className="battle-drawer-grid">
            {usableBattleItems.map((itemId) => {
              const item = getItemDisplay(itemId);
              const quantity = getItemQuantity(playerActor, itemId);

              return (
                <button
                  key={itemId}
                  type="button"
                  className="battle-drawer-button battle-drawer-button--item"
                  disabled={busy || quantity <= 0}
                  onClick={() =>
                    void runAction("use_item", {
                      itemId,
                      targetRequired: false,
                    })
                  }
                >
                  <span>
                    {item.icon} {item.label}
                  </span>
                  <em>x{formatNumber(quantity)}</em>
                </button>
              );
            })}

            <button
              type="button"
              className="battle-drawer-button battle-drawer-button--danger battle-drawer-button--wide"
              disabled
            >
              🏃 Flee From Battle
            </button>

            {usableBattleItems.length === 0 ? (
              <div className="battle-drawer-empty">
                No battle item available.
              </div>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section className="battle-panel">
      <header className="battle-topbar battle-topbar--desktop">
        <div className="battle-topbar__spacer" />

        <div className="battle-topbar__vitals">
          <ResourceBar
            label="HP"
            value={playerActor?.hp ?? currentCharacter.currentState.hp}
            max={
              playerActor?.derivedStats.maxHp ??
              currentCharacter.derivedStats.maxHp
            }
            tone="hp"
          />

          <ResourceBar
            label="MP"
            value={playerActor?.mp ?? currentCharacter.currentState.mp}
            max={
              playerActor?.derivedStats.maxMp ??
              currentCharacter.derivedStats.maxMp
            }
            tone="mp"
          />

          <ResourceBar
            label="STA"
            value={
              playerActor?.stamina ?? currentCharacter.currentState.stamina
            }
            max={
              playerActor?.derivedStats.maxStamina ??
              currentCharacter.derivedStats.maxStamina
            }
            tone="stamina"
          />
        </div>

        <div className="battle-topbar__spacer" />
      </header>

      <section className="battle-mobile-hud" aria-label="Mobile battle HUD">
        <div className="battle-mobile-identity">
          <div className="battle-mobile-identity__avatar" aria-hidden="true">
            {currentCharacter.name.charAt(0).toUpperCase()}
          </div>

          <div className="battle-mobile-identity__copy">
            <strong>{currentCharacter.name}</strong>
            <span>
              Lv. {currentCharacter.progression.level} ·{" "}
              {compactLabel(currentCharacter.originId)}
            </span>
          </div>

          <div
            className={
              isPlayerTurn
                ? "battle-mobile-turn battle-mobile-turn--ready"
                : "battle-mobile-turn"
            }
          >
            {battleFinished
              ? compactLabel(battle?.status ?? "ended")
              : isPlayerTurn
                ? "Your Turn"
                : "Enemy Turn"}
          </div>
        </div>

        <div className="battle-mobile-resources">
          <MobileResourcePill
            label="HP"
            value={playerActor?.hp ?? currentCharacter.currentState.hp}
            max={
              playerActor?.derivedStats.maxHp ??
              currentCharacter.derivedStats.maxHp
            }
            tone="hp"
          />

          <MobileResourcePill
            label="MP"
            value={playerActor?.mp ?? currentCharacter.currentState.mp}
            max={
              playerActor?.derivedStats.maxMp ??
              currentCharacter.derivedStats.maxMp
            }
            tone="mp"
          />

          <MobileResourcePill
            label="STA"
            value={
              playerActor?.stamina ?? currentCharacter.currentState.stamina
            }
            max={
              playerActor?.derivedStats.maxStamina ??
              currentCharacter.derivedStats.maxStamina
            }
            tone="stamina"
          />
        </div>

        <details className="battle-mobile-status-card">
          <summary>
            <span>Character Status</span>
            <strong>
              {playerActor?.activeStatusEffects.length
                ? `${playerActor.activeStatusEffects.length} active effect(s)`
                : "No active effects"}
            </strong>
          </summary>

          <div className="battle-mobile-stat-grid">
            <div>
              <span>P.ATK</span>
              <strong>
                {formatNumber(
                  playerActor?.derivedStats.pAtk ??
                    currentCharacter.derivedStats.pAtk,
                )}
              </strong>
            </div>

            <div>
              <span>M.ATK</span>
              <strong>
                {formatNumber(
                  playerActor?.derivedStats.mAtk ??
                    currentCharacter.derivedStats.mAtk,
                )}
              </strong>
            </div>

            <div>
              <span>SPD</span>
              <strong>
                {formatNumber(
                  playerActor?.derivedStats.actionSpeed ??
                    currentCharacter.derivedStats.actionSpeed,
                )}
              </strong>
            </div>

            <div>
              <span>CRIT</span>
              <strong>
                {formatNumber(
                  playerActor?.derivedStats.critRate ??
                    currentCharacter.derivedStats.critRate,
                )}
                %
              </strong>
            </div>
          </div>

          <div className="battle-mobile-effects">
            {renderActiveEffects(playerActor)}
          </div>
        </details>
      </section>

      <div className="battle-shell">
        <aside className="battle-side battle-side--character">
          <div className="battle-panel-eyebrow">Character Status</div>

          <section className="battle-character-card">
            <div className="battle-character-card__avatar">
              {currentCharacter.name.charAt(0).toUpperCase()}
            </div>

            <strong>{currentCharacter.name}</strong>
            <span>
              Lv. {currentCharacter.progression.level} ·{" "}
              {compactLabel(currentCharacter.originId)}
            </span>

            <div className="battle-stat-grid">
              <div>
                <span>P.ATK</span>
                <strong>
                  {formatNumber(
                    playerActor?.derivedStats.pAtk ??
                      currentCharacter.derivedStats.pAtk,
                  )}
                </strong>
              </div>

              <div>
                <span>M.ATK</span>
                <strong>
                  {formatNumber(
                    playerActor?.derivedStats.mAtk ??
                      currentCharacter.derivedStats.mAtk,
                  )}
                </strong>
              </div>

              <div>
                <span>A.SPEED</span>
                <strong>
                  {formatNumber(
                    playerActor?.derivedStats.actionSpeed ??
                      currentCharacter.derivedStats.actionSpeed,
                  )}
                </strong>
              </div>

              <div>
                <span>CRIT</span>
                <strong>
                  {formatNumber(
                    playerActor?.derivedStats.critRate ??
                      currentCharacter.derivedStats.critRate,
                  )}
                  %
                </strong>
              </div>
            </div>
          </section>

          <section className="battle-effect-box">
            <div className="battle-effect-title">Active Effects</div>
            {renderActiveEffects(playerActor)}
          </section>
        </aside>

        <main className="battle-center">
          <section className="battle-enemy-effect-box">
            <div className="battle-effect-title">Enemy Effects</div>
            {renderActiveEffects(focusedEnemy)}
          </section>

          <details className="battle-mobile-enemy-effects">
            <summary>
              <span>Enemy Effects</span>
              <strong>
                {focusedEnemy?.activeStatusEffects.length
                  ? `${focusedEnemy.activeStatusEffects.length} active effect(s)`
                  : "No active effects"}
              </strong>
            </summary>

            {renderActiveEffects(focusedEnemy)}
          </details>

          <div className="battlefield-focus">
            {battle ? (
              <>
                <div className="battlefield-label">Encounter</div>

                <div className="battle-enemy-orb" aria-hidden="true">
                  {focusedEnemyDisplay.icon}
                </div>

                <h2>{focusedEnemyDisplay.label}</h2>

                <span>Level {focusedEnemyDisplay.level}</span>

                {focusedEnemy ? (
                  <div className="battle-enemy-health">
                    <ResourceBar
                      label="Enemy HP"
                      value={focusedEnemy.hp}
                      max={focusedEnemy.derivedStats.maxHp}
                      tone="hp"
                    />
                  </div>
                ) : null}

                {liveEnemies.length > 1 ? (
                  <div
                    className="battle-target-strip"
                    aria-label="Enemy targets"
                  >
                    {liveEnemies.map((enemy) => {
                      const enemyDisplay = getMonsterDisplay(enemy);
                      const isSelected =
                        focusedEnemy?.actorId === enemy.actorId;

                      return (
                        <button
                          key={enemy.actorId}
                          type="button"
                          className={
                            isSelected
                              ? "battle-target-card battle-target-card--selected"
                              : "battle-target-card"
                          }
                          disabled={busy}
                          onClick={() => setTargetId(enemy.actorId)}
                        >
                          <span
                            className="battle-target-card__icon"
                            aria-hidden="true"
                          >
                            {enemyDisplay.icon}
                          </span>

                          <span className="battle-target-card__copy">
                            <strong>{enemyDisplay.label}</strong>
                            <em>
                              {formatNumber(enemy.hp)} /{" "}
                              {formatNumber(enemy.derivedStats.maxHp)} HP
                            </em>
                          </span>

                          <span className="battle-target-card__hp">
                            <span
                              style={{
                                width: `${clampPercent(
                                  enemy.hp,
                                  enemy.derivedStats.maxHp,
                                )}%`,
                              }}
                            />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="battlefield-loading">
                <div className="battlefield-label">Encounter</div>
                <h2>Entering Battle</h2>
                <span>Preparing monster data...</span>
              </div>
            )}
          </div>

          {battle ? (
            <MobileBattleLog
              battle={battle}
              battleFinished={battleFinished}
              currentCharacter={currentCharacter}
              getEventTone={getEventTone}
              getVisibleBattleLogEvents={getVisibleBattleLogEvents}
              group={latestMobileBattleLogGroup}
              renderBattleLogEvent={renderBattleLogEvent}
            />
          ) : null}

          <section className="battle-command-panel">
            {renderCommandPanel()}
          </section>
        </main>

        <aside className="battle-side battle-side--log">
          <div className="battle-panel-eyebrow">Combat Chronicle</div>

          <div className="battle-log-scroll" ref={battleLogScrollRef}>
            {battleLogGroups.length > 0 ? (
              battleLogGroups.map((group) => {
                const visibleEvents = getVisibleBattleLogEvents(group.events);

                if (visibleEvents.length === 0 && !group.current) {
                  return null;
                }

                return (
                  <section
                    key={group.label}
                    className={
                      group.current
                        ? "battle-log-turn battle-log-turn--current"
                        : "battle-log-turn"
                    }
                  >
                    <div className="battle-log-turn__tag">{group.label}</div>

                    {visibleEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`battle-log-line battle-log-line--${getEventTone(
                          event,
                        )}`}
                      >
                        {renderBattleLogEvent(event, battle, currentCharacter)}
                      </div>
                    ))}

                    {group.current && !battleFinished ? (
                      <div className="battle-log-awaiting">
                        ● Awaiting your command...
                      </div>
                    ) : null}
                  </section>
                );
              })
            ) : (
              <div className="battle-log-turn battle-log-turn--current">
                <div className="battle-log-turn__tag">Battle</div>
                <div className="battle-log-awaiting">
                  ● Preparing encounter...
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {notice ? (
        <div className="battle-toast battle-toast--success" role="status">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="battle-toast battle-toast--error" role="alert">
          {error}
        </div>
      ) : null}
    </section>
  );
}
