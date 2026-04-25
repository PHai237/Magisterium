import { useCallback, useMemo, useState } from 'react';

import type { Character } from '../character-creation/types';
import { BATTLE_BALANCE } from '../game-balance/balanceConstants';
// import type { DungeonDefinition } from '../dungeon/dungeonTypes';

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
  calculateZoneFleeChance,
  canUseSkill,
  createInitialBattleState,
  createLogEntry,
  getCriticalLogText,
  isMonsterDefeated,
  isPlayerDefeated,
  spendSkillResource,
  rollChance,
} from './battleCalculations';

import type { BattleContentSource, BattleState } from './battleTypes';

interface UseBattleParams {
  character: Character;
  source: BattleContentSource;
}

function getResourceText(
    player: BattleState['player'],
    resourceType: string | null,
): string {
    if (!resourceType) {
        return 'No resource required';
    }

    if (resourceType === 'MP') {
        return `${player.currentMp} MP`;
    }

    if (resourceType === 'Energy') {
        return `${player.currentEnergy} Energy`;
    }

    if (resourceType === 'HP') {
        return `${player.currentHp} HP`;
    }

    return 'Unknown resource';
}

export function useBattle({ character, source }: UseBattleParams) {
  const [battleState, setBattleState] = useState<BattleState>(() =>
    createInitialBattleState({
      character,
      source,
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
            message: `${currentBattle.player.name} cannot use ${selectedSkill.name}. Required: ${selectedSkill.resourceCost} ${selectedSkill.resourceType}. Current: ${getResourceText(
                currentBattle.player,
                selectedSkill.resourceType,
            )}.`,
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

      if (selectedSkill.effectType === 'buff') {
        let buffedPlayer = playerAfterCost;
        let buffMessage = `${currentBattle.player.name} uses ${selectedSkill.name}.`;

        if (selectedSkill.id === 'evasion') {
          buffedPlayer = {
            ...playerAfterCost,
            evasionChanceBonus: Math.max(
              playerAfterCost.evasionChanceBonus,
              BATTLE_BALANCE.utilitySkillEvasionChancePercent,
            ),
          };

          buffMessage = `${currentBattle.player.name} uses ${selectedSkill.name} and prepares to evade the next attack.`;
        }

        if (selectedSkill.id === 'hide') {
          buffedPlayer = {
            ...playerAfterCost,
            nextDamageReductionPercent: Math.max(
              playerAfterCost.nextDamageReductionPercent,
              BATTLE_BALANCE.utilitySkillHideDamageReductionPercent,
            ),
          };

          buffMessage = `${currentBattle.player.name} uses ${selectedSkill.name} and reduces the next incoming damage.`;
        }

          const buffLog = createLogEntry({
            turn: currentBattle.turn,
            actor: 'player',
            message: buffMessage,
          });

          return {
            ...currentBattle,
            player: buffedPlayer,
            currentActor: 'monster',
            turn: currentBattle.turn + 1,
            logs: [...currentBattle.logs, buffLog],
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

    const handlePlayerFlee = useCallback(() => {
      setBattleState((currentBattle) => {
        if (
          currentBattle.status !== 'active' ||
          currentBattle.currentActor !== 'player'
        ) {
          return currentBattle;
        }

        if (source.type !== 'zone') {
          const blockedLog = createLogEntry({
            turn: currentBattle.turn,
            actor: 'system',
            message: 'Escape is currently only available in zone battles.',
          });

          return {
            ...currentBattle,
            logs: [...currentBattle.logs, blockedLog],
          };
        }

        const fleeChance = calculateZoneFleeChance(currentBattle.player);
        const escaped = rollChance(fleeChance);

        if (escaped) {
          const fleeLog = createLogEntry({
            turn: currentBattle.turn,
            actor: 'player',
            message: `${currentBattle.player.name} escapes from ${currentBattle.monster.name} successfully (${fleeChance}% chance).`,
          });

          return {
            ...currentBattle,
            status: 'escaped',
            logs: [...currentBattle.logs, fleeLog],
          };
        }

        const failedFleeLog = createLogEntry({
          turn: currentBattle.turn,
          actor: 'system',
          message: `${currentBattle.player.name} fails to escape from ${currentBattle.monster.name} (${fleeChance}% chance).`,
        });

        return {
          ...currentBattle,
          currentActor: 'monster',
          turn: currentBattle.turn + 1,
          logs: [...currentBattle.logs, failedFleeLog],
        };
      });
    }, [source.type]);

  const handleMonsterAction = useCallback(() => {
    setBattleState((currentBattle) => {
      if (
        currentBattle.status !== 'active' ||
        currentBattle.currentActor !== 'monster'
      ) {
        return currentBattle;
      }

      const didEvade = rollChance(currentBattle.player.evasionChanceBonus);

      if (didEvade) {
        const updatedPlayer = {
          ...currentBattle.player,
          evasionChanceBonus: 0,
          nextDamageReductionPercent: 0,
        };

        const evadeLog = createLogEntry({
          turn: currentBattle.turn,
          actor: 'player',
          message: `${currentBattle.player.name} evades ${currentBattle.monster.name}'s attack.`,
        });

        return {
          ...currentBattle,
          player: updatedPlayer,
          currentActor: 'player',
          turn: currentBattle.turn + 1,
          logs: [...currentBattle.logs, evadeLog],
        };
      }

      const baseDamage = calculateMonsterBasicAttackDamage(
        currentBattle.monster,
        currentBattle.player,
      );

      const isCritical = rollChance(currentBattle.monster.critRate);
      const criticalDamage = applyCriticalDamage(baseDamage, isCritical);

      const damageReductionPercent =
        currentBattle.player.nextDamageReductionPercent;

      const damageAfterTemporaryReduction =
        damageReductionPercent > 0
          ? Math.max(
              BATTLE_BALANCE.minimumDamage,
              Math.round(criticalDamage * (1 - damageReductionPercent)),
            )
          : criticalDamage;

      const playerBeforeDamage = {
        ...currentBattle.player,
        evasionChanceBonus: 0,
        nextDamageReductionPercent: 0,
      };

      const updatedPlayer = applyDamageToPlayer(
        playerBeforeDamage,
        damageAfterTemporaryReduction,
      );

      const temporaryReductionText =
        damageReductionPercent > 0
          ? ` ${currentBattle.player.name}'s defensive effect reduces the incoming damage.`
          : '';

      const monsterAttackLog = createLogEntry({
        turn: currentBattle.turn,
        actor: 'monster',
        message: `${currentBattle.monster.name} attacks ${currentBattle.player.name} and deals ${damageAfterTemporaryReduction} damage.${getCriticalLogText(
          isCritical,
        )}${temporaryReductionText}`,
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
        source,
      }),
    );
  }, [character, source]);

  return {
    battleState,
    isBattleActive,
    isPlayerTurn,
    isMonsterTurn,
    playerSkills,
    handlePlayerBasicAttack,
    handlePlayerUseSkill,
    handlePlayerFlee,
    handleMonsterAction,
    resetBattle,
  };
}