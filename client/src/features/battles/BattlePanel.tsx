import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatBar } from "../../components/ui/StatBar";
import { ENCOUNTER_OPTIONS } from "../../domain/magisterium.constants";
import "./battle.css";
import type {
  BattleActorState,
  BattleState,
  CharacterSnapshot,
  EncounterId,
  ItemId,
  SkillId
} from "../../domain/magisterium.types";
import { compactLabel, uniqueValues } from "../../lib/format";
import { battlesApi } from "./battles.api";

interface BattlePanelProps {
  userId: string;
  currentCharacter: CharacterSnapshot | null;
  onCharacterUpdated?: (character: CharacterSnapshot) => void;
}

interface BattleLoadState {
  battles: BattleState[];
  selectedBattle: BattleState | null;
}

const initialBattleState: BattleLoadState = {
  battles: [],
  selectedBattle: null
};

function getLiveActors(battle: BattleState | null): BattleActorState[] {
  if (!battle) {
    return [];
  }

  return Object.values(battle.actors).filter((actor) => actor.hp > 0);
}

function getEnemyTargets(activeActor: BattleActorState | undefined, battle: BattleState | null) {
  if (!activeActor || !battle) {
    return [];
  }

  return getLiveActors(battle).filter((actor) => actor.actorType !== activeActor.actorType);
}

export function BattlePanel({
  userId,
  currentCharacter,
  onCharacterUpdated
}: BattlePanelProps) {
  const [encounterId, setEncounterId] = useState<EncounterId>("slime_training");
  const [data, setData] = useState<BattleLoadState>(initialBattleState);
  const [targetId, setTargetId] = useState("");
  const [skillId, setSkillId] = useState<SkillId>("");
  const [itemId, setItemId] = useState<ItemId>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedBattle = data.selectedBattle;
  const activeActor = selectedBattle?.activeActorId
    ? selectedBattle.actors[selectedBattle.activeActorId]
    : undefined;

  const enemyTargets = useMemo(
    () => getEnemyTargets(activeActor, selectedBattle),
    [activeActor, selectedBattle]
  );

  const activeActorSkills = useMemo(
    () => uniqueValues(activeActor?.skillIds ?? []),
    [activeActor?.skillIds]
  );

  const activeActorItems = useMemo(
    () => uniqueValues(activeActor?.inventoryItemIds ?? []),
    [activeActor?.inventoryItemIds]
  );

  useEffect(() => {
    if (!targetId && enemyTargets[0]) {
      setTargetId(enemyTargets[0].actorId);
    }
  }, [enemyTargets, targetId]);

  useEffect(() => {
    if (!skillId && activeActorSkills[0]) {
      setSkillId(activeActorSkills[0]);
    }
  }, [activeActorSkills, skillId]);

  useEffect(() => {
    if (!itemId && activeActorItems[0]) {
      setItemId(activeActorItems[0]);
    }
  }, [activeActorItems, itemId]);

  const loadBattles = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      const battles = await battlesApi.list(userId);
      setData({
        battles,
        selectedBattle:
          selectedBattle && battles.some((battle) => battle.battleId === selectedBattle.battleId)
            ? battles.find((battle) => battle.battleId === selectedBattle.battleId) ?? null
            : battles[0] ?? null
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load battles.");
    } finally {
      setBusy(false);
    }
  }, [selectedBattle, userId]);

  useEffect(() => {
    void loadBattles();
  }, [loadBattles]);

  async function createBattle() {
    if (!currentCharacter) {
      setError("Create or select a character first.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const battle = await battlesApi.create(userId, {
        characterId: currentCharacter.id,
        encounterId,
        autoStart: true,
        autoResolveMonsterTurns: true
      });

      setData((previous) => ({
        battles: [battle, ...previous.battles.filter((item) => item.battleId !== battle.battleId)],
        selectedBattle: battle
      }));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create battle.");
    } finally {
      setBusy(false);
    }
  }

  async function selectBattle(battleId: string) {
    setBusy(true);
    setError(null);

    try {
      const battle = await battlesApi.get(userId, battleId);
      setData((previous) => ({
        ...previous,
        selectedBattle: battle
      }));
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Failed to select battle.");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(actionType: "basic_attack" | "use_skill" | "use_item" | "skip_turn") {
    if (!selectedBattle || !activeActor) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await battlesApi.resolveAction(userId, selectedBattle.battleId, {
        actorId: activeActor.actorId,
        actionType,
        targetIds:
          actionType === "basic_attack" || actionType === "use_skill"
            ? targetId
              ? [targetId]
              : []
            : [],
        skillId: actionType === "use_skill" ? skillId : undefined,
        itemId: actionType === "use_item" ? itemId : undefined,
        autoResolveMonsterTurns: true
      });

      setData((previous) => ({
        battles: previous.battles.map((battle) =>
          battle.battleId === result.battleState.battleId ? result.battleState : battle
        ),
        selectedBattle: result.battleState
      }));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function claimReward() {
    if (!selectedBattle || !currentCharacter) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await battlesApi.claimReward(userId, selectedBattle.battleId, currentCharacter);
      setData((previous) => ({
        battles: previous.battles.map((battle) =>
          battle.battleId === result.battle.battleId ? result.battle : battle
        ),
        selectedBattle: result.battle
      }));
      onCharacterUpdated?.(result.character);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Reward claim failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="feature-grid">
      <Card eyebrow="Battle" title="Create Encounter">
        <div className="form-grid">
          <label>
            Encounter
            <select
              value={encounterId}
              onChange={(event) => setEncounterId(event.target.value as EncounterId)}
            >
              {ENCOUNTER_OPTIONS.map((encounter) => (
                <option key={encounter.id} value={encounter.id}>
                  {encounter.label}
                </option>
              ))}
            </select>
          </label>

          <Button disabled={busy || !currentCharacter} onClick={createBattle}>
            Start battle
          </Button>
        </div>

        <div className="option-list">
          {ENCOUNTER_OPTIONS.map((encounter) => (
            <div key={encounter.id} className="option-card">
              <strong>{encounter.label}</strong>
              <span>{encounter.description}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card
        eyebrow="History"
        title="Battles"
        action={
          <Button variant="secondary" disabled={busy} onClick={loadBattles}>
            Refresh
          </Button>
        }
      >
        {error && <p className="error-banner">{error}</p>}

        {data.battles.length === 0 ? (
          <EmptyState
            title="No battle yet"
            description="Create an encounter from your current character."
          />
        ) : (
          <div className="roster-list">
            {data.battles.map((battle) => (
              <button
                key={battle.battleId}
                className={`roster-card ${
                  selectedBattle?.battleId === battle.battleId ? "roster-card--active" : ""
                }`}
                onClick={() => void selectBattle(battle.battleId)}
              >
                <strong>{battle.battleId}</strong>
                <span>
                  {compactLabel(battle.status)} · Round {battle.roundNumber} · Turn{" "}
                  {battle.turnNumber}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card eyebrow="Arena" title={selectedBattle?.battleId ?? "Battle State"}>
        {!selectedBattle ? (
          <EmptyState title="No selected battle" description="Create or select a battle." />
        ) : (
          <div className="battle-arena">
            <div className="battle-summary">
              <Badge>{compactLabel(selectedBattle.status)}</Badge>
              <Badge>Round {selectedBattle.roundNumber}</Badge>
              <Badge>Turn {selectedBattle.turnNumber}</Badge>
              {selectedBattle.activeActorId && <Badge>Active: {selectedBattle.activeActorId}</Badge>}
            </div>

            <div className="actor-grid">
              {Object.values(selectedBattle.actors).map((actor) => (
                <article
                  key={actor.actorId}
                  className={`actor-card ${
                    actor.actorId === selectedBattle.activeActorId ? "actor-card--active" : ""
                  }`}
                >
                  <div className="actor-card__header">
                    <strong>{actor.actorId}</strong>
                    <Badge>{actor.actorType}</Badge>
                  </div>

                  <StatBar label="HP" value={actor.hp} max={actor.derivedStats.maxHp} />
                  <StatBar label="MP" value={actor.mp} max={actor.derivedStats.maxMp} />
                  <StatBar
                    label="Stamina"
                    value={actor.stamina}
                    max={actor.derivedStats.maxStamina}
                  />

                  {actor.shield > 0 && <Badge>Shield {actor.shield}</Badge>}
                  {actor.isExhausted && <Badge>Exhausted</Badge>}
                </article>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card eyebrow="Command" title="Action Panel">
        {!selectedBattle || !activeActor ? (
          <EmptyState
            title="No active actor"
            description="Battle may be completed, not started, or waiting for next state."
          />
        ) : (
          <div className="command-panel">
            <label>
              Target
              <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                <option value="">No target</option>
                {enemyTargets.map((actor) => (
                  <option key={actor.actorId} value={actor.actorId}>
                    {actor.actorId}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Skill
              <select value={skillId} onChange={(event) => setSkillId(event.target.value)}>
                <option value="">No skill</option>
                {activeActorSkills.map((skill) => (
                  <option key={skill} value={skill}>
                    {compactLabel(skill)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Item
              <select value={itemId} onChange={(event) => setItemId(event.target.value)}>
                <option value="">No item</option>
                {activeActorItems.map((item) => (
                  <option key={item} value={item}>
                    {compactLabel(item)}
                  </option>
                ))}
              </select>
            </label>

            <div className="button-row">
              <Button disabled={busy || !targetId} onClick={() => void runAction("basic_attack")}>
                Basic attack
              </Button>
              <Button disabled={busy || !skillId} onClick={() => void runAction("use_skill")}>
                Use skill
              </Button>
              <Button disabled={busy || !itemId} onClick={() => void runAction("use_item")}>
                Use item
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void runAction("skip_turn")}>
                Skip turn
              </Button>
            </div>

            {selectedBattle.status === "victory" && !selectedBattle.rewardClaim && (
              <Button disabled={busy || !currentCharacter} onClick={claimReward}>
                Claim reward
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card eyebrow="Log" title="Recent Events">
        {!selectedBattle || selectedBattle.events.length === 0 ? (
          <EmptyState title="No events" description="Battle events will appear here." />
        ) : (
          <ol className="event-log">
            {selectedBattle.events
              .slice()
              .reverse()
              .slice(0, 20)
              .map((event) => (
                <li key={event.id}>
                  <span>{event.type}</span>
                  <p>{event.message || "No message."}</p>
                </li>
              ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
