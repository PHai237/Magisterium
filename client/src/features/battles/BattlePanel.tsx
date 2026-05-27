import { useEffect, useMemo, useState } from "react";

import { ENCOUNTER_OPTIONS } from "../../domain/magisterium.constants";
import type {
  BattleActionType,
  BattleActorState,
  BattleEvent,
  BattleState,
  CharacterSnapshot,
  EncounterId,
  ItemId,
  MonsterId,
  SkillId
} from "../../domain/magisterium.types";
import { compactLabel, formatNumber, uniqueValues } from "../../lib/format";
import { battlesApi } from "./battles.api";
import "./battle.css";

interface BattlePanelProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  initialEncounterId?: EncounterId;
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
  description: string;
}

interface MonsterDisplayDefinition {
  label: string;
  icon: string;
  element: string;
  subtitle: string;
}

const DEFAULT_ENCOUNTER_ID: EncounterId = "town_outskirts_slime";

const SKILL_DISPLAY_DEFINITIONS: Record<string, SkillDisplayDefinition> = {
  spark: {
    label: "Spark",
    icon: "🔥",
    cost: "5 MP",
    group: "magic",
    needsEnemyTarget: true
  },
  heavy_strike: {
    label: "Heavy Strike",
    icon: "💥",
    cost: "12 STA",
    group: "attack",
    needsEnemyTarget: true
  },
  steady_strike: {
    label: "Steady Strike",
    icon: "⚔️",
    cost: "8 STA",
    group: "attack",
    needsEnemyTarget: true
  },
  quick_stab: {
    label: "Quick Stab",
    icon: "🗡️",
    cost: "6 STA",
    group: "attack",
    needsEnemyTarget: true
  },
  minor_heal: {
    label: "Minor Heal",
    icon: "✦",
    cost: "8 MP",
    group: "magic",
    needsEnemyTarget: false
  }
};

const ITEM_DISPLAY_DEFINITIONS: Record<string, ItemDisplayDefinition> = {
  minor_hp_potion: {
    label: "Minor HP Potion",
    icon: "🧪",
    description: "Restore HP during battle."
  },
  minor_mp_potion: {
    label: "Minor MP Potion",
    icon: "🔷",
    description: "Restore MP during battle."
  },
  stamina_bread: {
    label: "Stamina Bread",
    icon: "🍞",
    description: "Restore stamina during battle."
  }
};

const MONSTER_DISPLAY_DEFINITIONS: Record<MonsterId, MonsterDisplayDefinition> = {
  slime: {
    label: "Slime",
    icon: "🟢",
    element: "Water-leaning Beast",
    subtitle: "Soft-bodied starter monster"
  },
  wild_boar: {
    label: "Wild Boar",
    icon: "🐗",
    element: "Physical Beast",
    subtitle: "Tougher than a slime"
  },
  wild_wolf: {
    label: "Wild Wolf",
    icon: "🐺",
    element: "Physical Beast",
    subtitle: "Fast early predator"
  },
  goblin: {
    label: "Goblin",
    icon: "👺",
    element: "Humanoid",
    subtitle: "Forest-edge threat"
  }
};

function clampPercent(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / max) * 100));
}

function getEncounterOption(encounterId: EncounterId) {
  return (
    ENCOUNTER_OPTIONS.find((encounter) => encounter.id === encounterId) ??
    ENCOUNTER_OPTIONS[0]
  );
}

function getLiveActors(battle: BattleState | null): BattleActorState[] {
  if (!battle) {
    return [];
  }

  return Object.values(battle.actors).filter((actor) => actor.hp > 0);
}

function getCharacterActor(battle: BattleState | null): BattleActorState | null {
  if (!battle) {
    return null;
  }

  return (
    Object.values(battle.actors).find(
      (actor) => actor.actorType === "character"
    ) ?? null
  );
}

function getMonsterActors(battle: BattleState | null): BattleActorState[] {
  if (!battle) {
    return [];
  }

  return Object.values(battle.actors).filter(
    (actor) => actor.actorType === "monster"
  );
}

function getLiveMonsterActors(battle: BattleState | null): BattleActorState[] {
  return getMonsterActors(battle).filter((actor) => actor.hp > 0);
}

function getActorDisplayName(
  actor: BattleActorState | null | undefined,
  currentCharacter: CharacterSnapshot
): string {
  if (!actor) {
    return "Unknown";
  }

  if (actor.actorType === "character") {
    return currentCharacter.name;
  }

  if (actor.monsterId) {
    return MONSTER_DISPLAY_DEFINITIONS[actor.monsterId]?.label ?? actor.actorId;
  }

  return actor.actorId;
}

function getMonsterDisplay(actor: BattleActorState | null | undefined) {
  if (!actor?.monsterId) {
    return {
      label: actor?.actorId ?? "No Enemy",
      icon: "◇",
      element: "Unknown",
      subtitle: "No monster data"
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
      needsEnemyTarget: true
    }
  );
}

function getItemDisplay(itemId: ItemId): ItemDisplayDefinition {
  return (
    ITEM_DISPLAY_DEFINITIONS[itemId] ?? {
      label: compactLabel(itemId),
      icon: "◇",
      description: "This item cannot be used from the current battle drawer."
    }
  );
}

function getItemQuantity(actor: BattleActorState | null, itemId: ItemId): number {
  if (!actor) {
    return 0;
  }

  return actor.inventoryItemIds.filter((currentItemId) => currentItemId === itemId)
    .length;
}

function isBattleTerminal(battle: BattleState | null): boolean {
  return (
    battle?.status === "victory" ||
    battle?.status === "defeat" ||
    battle?.status === "fled"
  );
}

function shouldShowClaimReward(battle: BattleState | null): boolean {
  return battle?.status === "victory" && !battle.rewardClaim;
}

function formatEventLabel(event: BattleEvent): string {
  return compactLabel(event.type);
}

function formatEventMessage(event: BattleEvent): string {
  return event.message || "No message.";
}

function ResourceBar({
  label,
  value,
  max,
  tone
}: {
  label: string;
  value: number;
  max: number;
  tone: "hp" | "mp" | "stamina";
}) {
  return (
    <div className={`battle-resource battle-resource--${tone}`}>
      <div className="battle-resource__top">
        <span>{label}</span>
        <strong>
          {formatNumber(value)} / {formatNumber(max)}
        </strong>
      </div>

      <div className="battle-resource__track">
        <div
          className="battle-resource__fill"
          style={{ width: `${clampPercent(value, max)}%` }}
        />
      </div>
    </div>
  );
}

export function BattlePanel({
  userId,
  currentCharacter,
  initialEncounterId = DEFAULT_ENCOUNTER_ID,
  onExitBattle,
  onCharacterUpdated
}: BattlePanelProps) {
  const [encounterId, setEncounterId] =
    useState<EncounterId>(initialEncounterId);
  const [selectedBattle, setSelectedBattle] = useState<BattleState | null>(null);
  const [targetId, setTargetId] = useState("");
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>("MAIN");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const encounter = getEncounterOption(encounterId);

  const activeActor = selectedBattle?.activeActorId
    ? selectedBattle.actors[selectedBattle.activeActorId]
    : undefined;

  const playerActor = getCharacterActor(selectedBattle);
  const liveEnemies = useMemo(
    () => getLiveMonsterActors(selectedBattle),
    [selectedBattle]
  );

  const enemyTargets = useMemo(() => liveEnemies, [liveEnemies]);

  const focusedEnemy = useMemo(() => {
    if (!selectedBattle) {
      return null;
    }

    return (
      enemyTargets.find((actor) => actor.actorId === targetId) ??
      enemyTargets[0] ??
      getMonsterActors(selectedBattle)[0] ??
      null
    );
  }, [enemyTargets, selectedBattle, targetId]);

  const skillIds = useMemo(
    () => uniqueValues(playerActor?.skillIds ?? []),
    [playerActor]
  );

  const attackSkillIds = useMemo(
    () =>
      skillIds.filter(
        (skillId) => getSkillDisplay(skillId).group === "attack"
      ),
    [skillIds]
  );

  const magicSkillIds = useMemo(
    () =>
      skillIds.filter((skillId) => getSkillDisplay(skillId).group === "magic"),
    [skillIds]
  );

  const usableBattleItems = useMemo(
    () =>
      uniqueValues(playerActor?.inventoryItemIds ?? []).filter(
        (itemId) => ITEM_DISPLAY_DEFINITIONS[itemId] !== undefined
      ),
    [playerActor]
  );

  const isPlayerTurn = activeActor?.actorType === "character";
  const battleFinished = isBattleTerminal(selectedBattle);
  const focusedEnemyDisplay = getMonsterDisplay(focusedEnemy);

  useEffect(() => {
    if (!selectedBattle) {
      setEncounterId(initialEncounterId);
    }
  }, [initialEncounterId, selectedBattle]);

  useEffect(() => {
    const targetStillAvailable = enemyTargets.some(
      (actor) => actor.actorId === targetId
    );

    if (!targetStillAvailable) {
      setTargetId(enemyTargets[0]?.actorId ?? "");
    }
  }, [enemyTargets, targetId]);

  useEffect(() => {
    if (!notice && !error) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setNotice(null);
      setError(null);
    }, 3200);

    return () => window.clearTimeout(timerId);
  }, [notice, error]);

  async function createBattle(nextEncounterId = encounterId) {
    if (busy) {
      return;
    }

    setBusy(true);
    setNotice(null);
    setError(null);
    setActiveDrawer("MAIN");

    try {
      const battle = await battlesApi.create(userId, {
        characterId: currentCharacter.id,
        encounterId: nextEncounterId,
        autoStart: true,
        autoResolveMonsterTurns: true
      });

      setSelectedBattle(battle);
      setTargetId(getLiveMonsterActors(battle)[0]?.actorId ?? "");
      setNotice(`${getEncounterOption(nextEncounterId)?.label ?? "Battle"} started.`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to start battle."
      );
    } finally {
      setBusy(false);
    }
  }

  async function runAction(
    actionType: BattleActionType,
    options: {
      skillId?: SkillId;
      itemId?: ItemId;
      targetRequired?: boolean;
    } = {}
  ) {
    if (!selectedBattle || !activeActor || busy || battleFinished) {
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
      const result = await battlesApi.resolveAction(
        userId,
        selectedBattle.battleId,
        {
          actorId: activeActor.actorId,
          actionType,
          targetIds: options.targetRequired && targetId ? [targetId] : [],
          skillId: options.skillId,
          itemId: options.itemId,
          autoResolveMonsterTurns: true
        }
      );

      setSelectedBattle(result.battleState);
      setActiveDrawer("MAIN");
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Action failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function claimReward() {
    if (!selectedBattle || busy || selectedBattle.status !== "victory") {
      return;
    }

    setBusy(true);
    setNotice(null);
    setError(null);

    try {
      const result = await battlesApi.claimReward(
        userId,
        selectedBattle.battleId,
        currentCharacter
      );

      setSelectedBattle(result.battle);
      onCharacterUpdated?.(result.character);

      const rewardItems = result.reward.items
        .map((item) => `${compactLabel(item.itemId)} x${item.quantity}`)
        .join(", ");

      setNotice(
        rewardItems
          ? `Reward claimed: ${result.reward.exp} EXP, ${result.reward.moneyBronze} Bronze, ${rewardItems}.`
          : `Reward claimed: ${result.reward.exp} EXP, ${result.reward.moneyBronze} Bronze.`
      );
    } catch (claimError) {
      setError(
        claimError instanceof Error
          ? claimError.message
          : "Reward claim failed."
      );
    } finally {
      setBusy(false);
    }
  }

  function resetBattle() {
    setSelectedBattle(null);
    setTargetId("");
    setActiveDrawer("MAIN");
    setNotice(null);
    setError(null);
  }

  function renderPrepScreen() {
    return (
      <main className="battle-prep">
        <section className="battle-prep__hero">
          <p>Town Outskirts</p>
          <h2>Choose an encounter</h2>
          <span>
            Slimes, wild boars, and wild wolves roam the grasslands outside the
            stronghold. These are real encounters with real drops.
          </span>
        </section>

        <section className="battle-encounter-list">
          {ENCOUNTER_OPTIONS.filter((option) =>
            option.id.startsWith("town_outskirts")
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                encounterId === option.id
                  ? "battle-encounter-card battle-encounter-card--active"
                  : "battle-encounter-card"
              }
              onClick={() => setEncounterId(option.id)}
              disabled={busy}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </section>

        <section className="battle-prep__launch">
          <div>
            <p>Selected</p>
            <strong>{encounter?.label}</strong>
            <span>{encounter?.description}</span>
          </div>

          <button
            type="button"
            className="battle-primary-button"
            disabled={busy}
            onClick={() => void createBattle()}
          >
            {busy ? "Starting..." : "Start Battle"}
          </button>
        </section>
      </main>
    );
  }

  function renderActiveEffects(actor: BattleActorState | null) {
    if (!actor || actor.activeStatusEffects.length === 0) {
      return (
        <div className="battle-empty-effect">
          <span>No active effects</span>
        </div>
      );
    }

    return (
      <div className="battle-effect-list">
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
    if (!selectedBattle) {
      return null;
    }

    if (battleFinished) {
      return (
        <section className="battle-command-panel">
          <div className="battle-command-panel__top">
            <span>Battle Result</span>
          </div>

          <div className={`battle-result-card battle-result-card--${selectedBattle.status}`}>
            <strong>{compactLabel(selectedBattle.status)}</strong>

            {selectedBattle.status === "victory" ? (
              <span>
                The encounter has been cleared. Claim your reward before leaving.
              </span>
            ) : (
              <span>The battle has ended.</span>
            )}

            <div className="battle-result-card__actions">
              {shouldShowClaimReward(selectedBattle) ? (
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
                onClick={resetBattle}
              >
                New Encounter
              </button>

              <button
                type="button"
                className="battle-secondary-button"
                disabled={busy}
                onClick={onExitBattle}
              >
                Return to World Map
              </button>
            </div>
          </div>
        </section>
      );
    }

    if (!activeActor || !isPlayerTurn) {
      return (
        <section className="battle-command-panel">
          <div className="battle-command-panel__top">
            <span>Control Panel</span>
          </div>

          <div className="battle-waiting-card">
            <strong>Awaiting turn state</strong>
            <span>Enemy turns are being resolved by the backend.</span>
          </div>
        </section>
      );
    }

    return (
      <section className="battle-command-panel">
        <div className="battle-command-panel__top">
          <span>Control Panel</span>

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
          <div className="battle-command-grid battle-command-grid--main">
            <button
              type="button"
              className="battle-command-button battle-command-button--attack"
              disabled={busy}
              onClick={() => setActiveDrawer("ATTACK")}
            >
              <strong>⚔️ Attack</strong>
              <span>Basic & physical skills</span>
            </button>

            <button
              type="button"
              className="battle-command-button battle-command-button--magic"
              disabled={busy}
              onClick={() => setActiveDrawer("MAGIC")}
            >
              <strong>🔮 Magic</strong>
              <span>Spells & support skills</span>
            </button>

            <button
              type="button"
              className="battle-command-button battle-command-button--item"
              disabled={busy}
              onClick={() => setActiveDrawer("ITEM")}
            >
              <strong>🧪 Items</strong>
              <span>Consumables & options</span>
            </button>
          </div>
        ) : null}

        {activeDrawer === "ATTACK" ? (
          <div className="battle-command-grid">
            <button
              type="button"
              className="battle-skill-button"
              disabled={busy || !targetId}
              onClick={() =>
                void runAction("basic_attack", { targetRequired: true })
              }
            >
              <strong>⚔️ Basic Strike</strong>
              <span>No cost</span>
            </button>

            {attackSkillIds.map((currentSkillId) => {
              const skill = getSkillDisplay(currentSkillId);

              return (
                <button
                  key={currentSkillId}
                  type="button"
                  className="battle-skill-button"
                  disabled={busy || (skill.needsEnemyTarget && !targetId)}
                  onClick={() =>
                    void runAction("use_skill", {
                      skillId: currentSkillId,
                      targetRequired: skill.needsEnemyTarget
                    })
                  }
                >
                  <strong>
                    {skill.icon} {skill.label}
                  </strong>
                  <span>{skill.cost}</span>
                </button>
              );
            })}

            {attackSkillIds.length === 0 ? (
              <div className="battle-drawer-empty">No physical skill equipped.</div>
            ) : null}
          </div>
        ) : null}

        {activeDrawer === "MAGIC" ? (
          <div className="battle-command-grid">
            {magicSkillIds.map((currentSkillId) => {
              const skill = getSkillDisplay(currentSkillId);

              return (
                <button
                  key={currentSkillId}
                  type="button"
                  className="battle-skill-button battle-skill-button--magic"
                  disabled={busy || (skill.needsEnemyTarget && !targetId)}
                  onClick={() =>
                    void runAction("use_skill", {
                      skillId: currentSkillId,
                      targetRequired: skill.needsEnemyTarget
                    })
                  }
                >
                  <strong>
                    {skill.icon} {skill.label}
                  </strong>
                  <span>{skill.cost}</span>
                </button>
              );
            })}

            {magicSkillIds.length === 0 ? (
              <div className="battle-drawer-empty">No magic skill equipped.</div>
            ) : null}
          </div>
        ) : null}

        {activeDrawer === "ITEM" ? (
          <div className="battle-command-grid">
            {usableBattleItems.map((currentItemId) => {
              const item = getItemDisplay(currentItemId);
              const quantity = getItemQuantity(playerActor, currentItemId);

              return (
                <button
                  key={currentItemId}
                  type="button"
                  className="battle-skill-button battle-skill-button--item"
                  disabled={busy || quantity <= 0}
                  title={item.description}
                  onClick={() =>
                    void runAction("use_item", {
                      itemId: currentItemId,
                      targetRequired: false
                    })
                  }
                >
                  <strong>
                    {item.icon} {item.label}
                  </strong>
                  <span>x{formatNumber(quantity)}</span>
                </button>
              );
            })}

            <button
              type="button"
              className="battle-skill-button battle-skill-button--danger"
              disabled
            >
              <strong>🏃 Flee</strong>
              <span>Not available yet</span>
            </button>

            {usableBattleItems.length === 0 ? (
              <div className="battle-drawer-empty">No battle item available.</div>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  }

  function renderBattleScreen() {
    const player = playerActor;
    const enemy = focusedEnemy;
    const enemyDisplay = focusedEnemyDisplay;

    return (
      <main className="battle-arena-layout">
        <aside className="battle-side-panel battle-side-panel--character">
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
                  {formatNumber(player?.derivedStats.pAtk ?? currentCharacter.derivedStats.pAtk)}
                </strong>
              </div>
              <div>
                <span>M.ATK</span>
                <strong>
                  {formatNumber(player?.derivedStats.mAtk ?? currentCharacter.derivedStats.mAtk)}
                </strong>
              </div>
              <div>
                <span>A.SPD</span>
                <strong>
                  {formatNumber(
                    player?.derivedStats.actionSpeed ??
                      currentCharacter.derivedStats.actionSpeed
                  )}
                </strong>
              </div>
              <div>
                <span>CRIT</span>
                <strong>
                  {formatNumber(
                    player?.derivedStats.critRate ??
                      currentCharacter.derivedStats.critRate
                  )}
                  %
                </strong>
              </div>
            </div>
          </section>

          <section className="battle-effect-box">
            <div className="battle-effect-box__title">Active Effects</div>
            {renderActiveEffects(player)}
          </section>
        </aside>

        <section className="battlefield-panel">
          <div className="battlefield-focus">
            <div className="battlefield-encounter-label">Encounter</div>

            <div className="battle-enemy-sigil" aria-hidden="true">
              {enemyDisplay.icon}
            </div>

            <h2>{enemyDisplay.label}</h2>
            <span>
              {enemy
                ? `Level ${enemy.baseStats.CON > 6 ? 2 : 1} · ${enemyDisplay.element}`
                : "No active enemy"}
            </span>

            {enemy ? (
              <div className="battle-enemy-health">
                <ResourceBar
                  label="Enemy HP"
                  value={enemy.hp}
                  max={enemy.derivedStats.maxHp}
                  tone="hp"
                />
              </div>
            ) : null}

            {enemyTargets.length > 1 ? (
              <div className="battle-target-row">
                {enemyTargets.map((actor) => {
                  const display = getMonsterDisplay(actor);

                  return (
                    <button
                      key={actor.actorId}
                      type="button"
                      className={
                        targetId === actor.actorId
                          ? "battle-target-chip battle-target-chip--active"
                          : "battle-target-chip"
                      }
                      onClick={() => setTargetId(actor.actorId)}
                    >
                      <span aria-hidden="true">{display.icon}</span>
                      {display.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {renderCommandPanel()}
        </section>

        <aside className="battle-side-panel battle-side-panel--log">
          <div className="battle-panel-eyebrow">Battle Log</div>

          <ol className="battle-log-list">
            {selectedBattle?.events.length ? (
              selectedBattle.events
                .slice()
                .reverse()
                .slice(0, 24)
                .map((event) => (
                  <li key={event.id} className={`battle-log-event battle-log-event--${event.phase}`}>
                    <span>{formatEventLabel(event)}</span>
                    <p>{formatEventMessage(event)}</p>
                  </li>
                ))
            ) : (
              <li className="battle-log-empty">
                Battle events will appear here.
              </li>
            )}
          </ol>
        </aside>
      </main>
    );
  }

  return (
    <section className="battle-panel">
      <header className="battle-header">
        <div className="battle-header__left">
          <button
            type="button"
            className="battle-exit-button"
            onClick={onExitBattle}
            disabled={busy}
          >
            ← World Map
          </button>

          <div className="battle-header__identity">
            <strong>{currentCharacter.name}</strong>
            <span>
              Lv. {currentCharacter.progression.level} ·{" "}
              {compactLabel(currentCharacter.originId)}
            </span>
          </div>
        </div>

        <div className="battle-header__vitals">
          <ResourceBar
            label="HP"
            value={playerActor?.hp ?? currentCharacter.currentState.hp}
            max={currentCharacter.derivedStats.maxHp}
            tone="hp"
          />
          <ResourceBar
            label="MP"
            value={playerActor?.mp ?? currentCharacter.currentState.mp}
            max={currentCharacter.derivedStats.maxMp}
            tone="mp"
          />
          <ResourceBar
            label="STA"
            value={playerActor?.stamina ?? currentCharacter.currentState.stamina}
            max={currentCharacter.derivedStats.maxStamina}
            tone="stamina"
          />
        </div>

        <div className="battle-header__state">
          <span>{selectedBattle ? compactLabel(selectedBattle.status) : "Ready"}</span>
          {selectedBattle ? (
            <strong>
              R{selectedBattle.roundNumber} · T{selectedBattle.turnNumber}
            </strong>
          ) : (
            <strong>{encounter?.label}</strong>
          )}
        </div>
      </header>

      <div className="battle-body">
        {selectedBattle ? renderBattleScreen() : renderPrepScreen()}
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