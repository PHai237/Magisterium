import { useCallback, useMemo, useState } from 'react';

import type { Character } from '../character-creation/types';
import type { DungeonDefinition } from '../dungeon/dungeonTypes';

import {
  applyCriticalDamage,
  applyDamageToMonster,
  applyDamageToPlayer,
  applyHealToPlayer,
  applyShieldToPlayer,
  calculateMonsterBasicAttackDamage,
  calculatePlayerBasicAttackDamage,
  calculatePlayerSkillDamage,
  calculateSkillPower,
  canUseSkill,
  createInitialBattleState,
  createLogEntry,
  getCriticalLogText,
  isMonsterDefeated,
  isPlayerDefeated,
  spendSkillResource,
  rollChance,
} from './battleCalculations';

import type { BattleState } from './battleTypes';

interface UseBattleParams {
  character: Character;
  dungeon: DungeonDefinition;
}

export function useBattle({ character, dungeon }: UseBattleParams) {
  const [battleState, setBattleState] = useState<BattleState>(() =>
    createInitialBattleState({
      character,
      dungeon,
    }),
  );

  const isBattleActive = battleState.status === 'active';
  const isPlayerTurn =
    battleState.status === 'active' && battleState.currentActor === 'player';
  const isMonsterTurn =
    battleState.status === 'active' && battleState.currentActor === 'monster';

  const playerSkills = useMemo(() => {
    return battleState.player.skills;
  }, [battleState.player.skills]);

  const handlePlayerBasicAttack = useCallback(() => {
    setBattleState((currentBattle) => {
      if (
        currentBattle.status !== 'active' ||
        currentBattle.currentActor !== 'player'
      ) {
        return currentBattle;
      }

      const baseDamage = calculatePlayerBasicAttackDamage(
        currentBattle.player,
        currentBattle.monster,
      );

      const isCritical = rollChance(currentBattle.player.derivedStats.critRate);
      const damage = applyCriticalDamage(baseDamage, isCritical);

      const updatedMonster = applyDamageToMonster(
        currentBattle.monster,
        damage,
      );

      const attackLog = createLogEntry({
        turn: currentBattle.turn,
        actor: 'player',
        message: `${currentBattle.player.name} attacks ${currentBattle.monster.name} and deals ${damage} damage.${getCriticalLogText(isCritical)}`,
      });

      if (isMonsterDefeated(updatedMonster)) {
        const winLog = createLogEntry({
          turn: currentBattle.turn,
          actor: 'system',
          message: `${currentBattle.player.name} defeated ${currentBattle.monster.name}.`,
        });

        const rewardLog = createLogEntry({
          turn: currentBattle.turn,
          actor: 'system',
          message: `Gained ${currentBattle.reward.exp} EXP and ${currentBattle.reward.gold} Gold.`,
        });

        return {
          ...currentBattle,
          monster: updatedMonster,
          status: 'won',
          logs: [...currentBattle.logs, attackLog, winLog, rewardLog],
        };
      }

      return {
        ...currentBattle,
        monster: updatedMonster,
        currentActor: 'monster',
        turn: currentBattle.turn + 1,
        logs: [...currentBattle.logs, attackLog],
      };
    });
  }, []);

  const handlePlayerUseSkill = useCallback((skillId: string) => {
    setBattleState((currentBattle) => {
      if (
        currentBattle.status !== 'active' ||
        currentBattle.currentActor !== 'player'
      ) {
        return currentBattle;
      }

      const selectedSkill = currentBattle.player.skills.find(
        (skill) => skill.id === skillId,
      );

      if (!selectedSkill) {
        const missingSkillLog = createLogEntry({
          turn: currentBattle.turn,
          actor: 'system',
          message: 'Selected skill does not exist.',
        });

        return {
          ...currentBattle,
          logs: [...currentBattle.logs, missingSkillLog],
        };
      }

      if (!canUseSkill(currentBattle.player, selectedSkill)) {
        const noResourceLog = createLogEntry({
          turn: currentBattle.turn,
          actor: 'system',
          message: `${currentBattle.player.name} does not have enough ${selectedSkill.resourceType} to use ${selectedSkill.name}.`,
        });

        return {
          ...currentBattle,
          logs: [...currentBattle.logs, noResourceLog],
        };
      }

      const playerAfterCost = spendSkillResource(
        currentBattle.player,
        selectedSkill,
      );

      if (selectedSkill.effectType === 'damage') {
        const baseDamage = calculatePlayerSkillDamage({
          player: currentBattle.player,
          monster: currentBattle.monster,
          skill: selectedSkill,
        });

        const isCritical = rollChance(currentBattle.player.derivedStats.critRate);
        const damage = applyCriticalDamage(baseDamage, isCritical);

        const updatedMonster = applyDamageToMonster(
          currentBattle.monster,
          damage,
        );

        const skillLog = createLogEntry({
          turn: currentBattle.turn,
          actor: 'player',
          message: `${currentBattle.player.name} uses ${selectedSkill.name} and deals ${damage} damage.${getCriticalLogText(isCritical)}`,
        });

        if (isMonsterDefeated(updatedMonster)) {
          const winLog = createLogEntry({
            turn: currentBattle.turn,
            actor: 'system',
            message: `${currentBattle.player.name} defeated ${currentBattle.monster.name}.`,
          });

          const rewardLog = createLogEntry({
            turn: currentBattle.turn,
            actor: 'system',
            message: `Gained ${currentBattle.reward.exp} EXP and ${currentBattle.reward.gold} Gold.`,
          });

          return {
            ...currentBattle,
            player: playerAfterCost,
            monster: updatedMonster,
            status: 'won',
            logs: [...currentBattle.logs, skillLog, winLog, rewardLog],
          };
        }

        return {
          ...currentBattle,
          player: playerAfterCost,
          monster: updatedMonster,
          currentActor: 'monster',
          turn: currentBattle.turn + 1,
          logs: [...currentBattle.logs, skillLog],
        };
      }

      if (selectedSkill.effectType === 'heal') {
        const healAmount = calculateSkillPower(
          currentBattle.player,
          selectedSkill,
        );

        const healedPlayer = applyHealToPlayer(playerAfterCost, healAmount);

        const healLog = createLogEntry({
          turn: currentBattle.turn,
          actor: 'player',
          message: `${currentBattle.player.name} uses ${selectedSkill.name} and restores ${healAmount} HP.`,
        });

        return {
          ...currentBattle,
          player: healedPlayer,
          currentActor: 'monster',
          turn: currentBattle.turn + 1,
          logs: [...currentBattle.logs, healLog],
        };
      }

      if (selectedSkill.effectType === 'shield') {
        const shieldAmount = calculateSkillPower(
          currentBattle.player,
          selectedSkill,
        );

        const shieldedPlayer = applyShieldToPlayer(
          playerAfterCost,
          shieldAmount,
        );

        const shieldLog = createLogEntry({
          turn: currentBattle.turn,
          actor: 'player',
          message: `${currentBattle.player.name} uses ${selectedSkill.name} and gains ${shieldAmount} Shield.`,
        });

        return {
          ...currentBattle,
          player: shieldedPlayer,
          currentActor: 'monster',
          turn: currentBattle.turn + 1,
          logs: [...currentBattle.logs, shieldLog],
        };
      }

      const unsupportedEffectLog = createLogEntry({
        turn: currentBattle.turn,
        actor: 'player',
        message: `${currentBattle.player.name} uses ${selectedSkill.name}, but this effect is not implemented yet.`,
      });

      return {
        ...currentBattle,
        player: playerAfterCost,
        currentActor: 'monster',
        turn: currentBattle.turn + 1,
        logs: [...currentBattle.logs, unsupportedEffectLog],
      };
    });
  }, []);

  const handleMonsterAction = useCallback(() => {
    setBattleState((currentBattle) => {
      if (
        currentBattle.status !== 'active' ||
        currentBattle.currentActor !== 'monster'
      ) {
        return currentBattle;
      }

      const baseDamage = calculateMonsterBasicAttackDamage(
        currentBattle.monster,
        currentBattle.player,
      );

      const isCritical = rollChance(currentBattle.monster.critRate);
      const damage = applyCriticalDamage(baseDamage, isCritical);

      const updatedPlayer = applyDamageToPlayer(
        currentBattle.player,
        damage,
      );

      const monsterAttackLog = createLogEntry({
        turn: currentBattle.turn,
        actor: 'monster',
        message: `${currentBattle.monster.name} attacks ${currentBattle.player.name} and deals ${damage} damage.${getCriticalLogText(isCritical)}`,
      });

      if (isPlayerDefeated(updatedPlayer)) {
        const loseLog = createLogEntry({
          turn: currentBattle.turn,
          actor: 'system',
          message: `${currentBattle.player.name} was defeated by ${currentBattle.monster.name}.`,
        });

        return {
          ...currentBattle,
          player: updatedPlayer,
          status: 'lost',
          logs: [...currentBattle.logs, monsterAttackLog, loseLog],
        };
      }

      return {
        ...currentBattle,
        player: updatedPlayer,
        currentActor: 'player',
        turn: currentBattle.turn + 1,
        logs: [...currentBattle.logs, monsterAttackLog],
      };
    });
  }, []);

  const resetBattle = useCallback(() => {
    setBattleState(
      createInitialBattleState({
        character,
        dungeon,
      }),
    );
  }, [character, dungeon]);

  return {
    battleState,
    isBattleActive,
    isPlayerTurn,
    isMonsterTurn,
    playerSkills,
    handlePlayerBasicAttack,
    handlePlayerUseSkill,
    handleMonsterAction,
    resetBattle,
  };
}