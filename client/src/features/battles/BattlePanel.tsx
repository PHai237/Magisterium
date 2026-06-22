import type {
  BattleActorState,
  CharacterSnapshot,
  EncounterId,
} from "../../domain/magisterium.types";
import { compactLabel, formatNumber } from "../../lib/format";
import { hasMonsterImage, renderMonsterIcon } from "../monsters/monsterAssets";
import {
  MobileResourcePill,
  ResourceBar,
  clampPercent,
  getCharacterProgressionLabel,
  getEventTone,
  getItemDisplay,
  getItemQuantity,
  getMonsterDisplay,
  getSkillDisplay,
  getVisibleBattleLogEvents,
  renderBattleLogEvent,
  shouldShowClaimReward,
} from "./battlePresentation";
import { MobileBattleLog } from "./MobileBattleLog";
import { useBattlePanelController } from "./useBattlePanelController";
import "./battle.css";

interface BattlePanelProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  initialEncounterId: EncounterId;
  onExitBattle: () => void;
  onCharacterUpdated?: (character: CharacterSnapshot) => void;
}
export function BattlePanel({
  userId,
  currentCharacter,
  initialEncounterId,
  onExitBattle,
  onCharacterUpdated,
}: BattlePanelProps) {
  const {
    activeActor,
    activeDrawer,
    attackSkillIds,
    battle,
    battleFinished,
    battleLogGroups,
    battleLogScrollRef,
    busy,
    claimReward,
    error,
    focusedEnemy,
    focusedEnemyDisplay,
    isPlayerTurn,
    latestMobileBattleLogGroup,
    liveEnemies,
    magicSkillIds,
    notice,
    playerActor,
    runAction,
    setActiveDrawer,
    setTargetId,
    targetId,
    usableBattleItems,
  } = useBattlePanelController({
    userId,
    currentCharacter,
    initialEncounterId,
    onCharacterUpdated,
  });

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
          <span>
            {error ?? (busy ? "Entering encounter..." : "Preparing battle...")}
          </span>
          {error ? (
            <button
              type="button"
              className="battle-drawer-button battle-drawer-button--wide"
              onClick={onExitBattle}
            >
              Return to Exploration
            </button>
          ) : null}
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
              disabled={busy}
              onClick={() => void runAction("flee")}
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
            <span>{getCharacterProgressionLabel(currentCharacter)}</span>
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
            <span>{getCharacterProgressionLabel(currentCharacter)}</span>

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

                <div
                  className={[
                    "battle-enemy-orb",
                    hasMonsterImage(focusedEnemy?.monsterId)
                      ? "battle-enemy-orb--image"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                >
                  {renderMonsterIcon({
                    monsterId: focusedEnemy?.monsterId,
                    fallback: focusedEnemyDisplay.icon,
                  })}
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
                            className={[
                              "battle-target-card__icon",
                              hasMonsterImage(enemy.monsterId)
                                ? "battle-target-card__icon--image"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            aria-hidden="true"
                          >
                            {renderMonsterIcon({
                              monsterId: enemy.monsterId,
                              fallback: enemyDisplay.icon,
                            })}
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
                <h2>{error ? "Battle Failed" : "Entering Battle"}</h2>
                <span>{error ?? "Preparing monster data..."}</span>
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
