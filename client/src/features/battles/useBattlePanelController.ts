import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type {
  BattleActionType,
  BattleState,
  CharacterSnapshot,
  EncounterId,
  ItemId,
  SkillId,
} from "../../domain/magisterium.types";
import { compactLabel, uniqueValues } from "../../lib/format";
import { battlesApi } from "./battles.api";
import {
  ITEM_DISPLAY_DEFINITIONS,
  type DrawerType,
  getCharacterActor,
  getLiveMonsterActors,
  getMonsterActors,
  getMonsterDisplay,
  getSkillDisplay,
  getVisibleBattleLogEvents,
  groupBattleEvents,
  groupBattleEventsByRound,
  isBattleFinished,
} from "./battlePresentation";

interface BattlePanelControllerOptions {
  userId: string;
  currentCharacter: CharacterSnapshot;
  initialEncounterId: EncounterId;
  onCharacterUpdated?: (character: CharacterSnapshot) => void;
}

export function useBattlePanelController({
  userId,
  currentCharacter,
  initialEncounterId,
  onCharacterUpdated,
}: BattlePanelControllerOptions) {
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
      const group = mobileBattleLogGroups[groupIndex]!;
      const visibleEvents = getVisibleBattleLogEvents(group.events);

      if (visibleEvents.length > 0 || group.current) {
        return group;
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

        if (!cancelled) {
          setBattle(createdBattle);
          setTargetId(getLiveMonsterActors(createdBattle)[0]?.actorId ?? "");
        }
      } catch (createError) {
        if (!cancelled) {
          setError(
            createError instanceof Error
              ? createError.message
              : "Failed to start battle.",
          );
        }
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
    if (!liveEnemies.some((actor) => actor.actorId === targetId)) {
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
          ? `Reward claimed: ${result.reward.moneyBronze} Bronze, ${rewardItems}.`
          : `Reward claimed: ${result.reward.moneyBronze} Bronze.`,
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

  return {
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
  };
}
