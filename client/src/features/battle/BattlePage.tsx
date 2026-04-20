import { useEffect } from 'react';

import type { Character } from '../character-creation/types';
import type { DungeonDefinition } from '../dungeon/dungeonTypes';

import { useBattle } from './useBattle';
import type { BattleState, PlayerBattleState } from './battleTypes';

interface BattlePageProps {
  character: Character;
  dungeon: DungeonDefinition;
  onBackToDungeon: () => void;
  onBattleFinished: (updatedCharacter: Character) => void;
}

function getPercent(currentValue: number, maxValue: number): number {
  if (maxValue <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (currentValue / maxValue) * 100));
}

function ResourceBar({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number;
}) {
  const percent = getPercent(current, max);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-slate-200">
          {current} / {max}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function buildCharacterAfterWin(
  character: Character,
  battleState: BattleState,
): Character {
  const postBattleHeal =
    character.starterGift.effectType === 'post_battle_heal_percent'
      ? Math.ceil(
          character.derivedStats.maxHp *
            (character.starterGift.effectValue / 100),
        )
      : 0;

  return {
    ...character,
    exp: character.exp + battleState.reward.exp,
    gold: character.gold + battleState.reward.gold,
    currentState: {
      hp: Math.min(
        character.derivedStats.maxHp,
        battleState.player.currentHp + postBattleHeal,
      ),
      mp: battleState.player.currentMp,
      energy: battleState.player.currentEnergy,
      shield: 0,
    },
  };
}

function buildCharacterAfterLoss(
  character: Character,
  battleState: BattleState,
): Character {
  return {
    ...character,
    currentState: {
      hp: Math.max(1, Math.ceil(character.derivedStats.maxHp * 0.3)),
      mp: battleState.player.currentMp,
      energy: battleState.player.currentEnergy,
      shield: 0,
    },
  };
}

function canPlayerUseSkill(player: PlayerBattleState, skillId: string): boolean {
  const skill = player.skills.find((item) => item.id === skillId);

  if (!skill) {
    return false;
  }

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

export function BattlePage({
  character,
  dungeon,
  onBackToDungeon,
  onBattleFinished,
}: BattlePageProps) {
  const {
    battleState,
    isBattleActive,
    isPlayerTurn,
    isMonsterTurn,
    playerSkills,
    handlePlayerBasicAttack,
    handlePlayerUseSkill,
    handleMonsterAction,
    resetBattle,
  } = useBattle({
    character,
    dungeon,
  });

  useEffect(() => {
    if (!isMonsterTurn) {
        return;
    }

    const timerId = window.setTimeout(() => {
        handleMonsterAction();
    }, 700);

    return () => {
        window.clearTimeout(timerId);
    };
    }, [isMonsterTurn, handleMonsterAction]);

  const { player, monster } = battleState;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
              Magisterium
            </p>

            <h1 className="mt-2 text-4xl font-bold">Battle</h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              {dungeon.name} — {battleState.status === 'active'
                ? `Current turn: ${battleState.currentActor}`
                : `Battle result: ${battleState.status}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToDungeon}
            disabled={battleState.status === 'active'}
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back to Dungeon
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-sm uppercase tracking-wide text-violet-300">
              Player
            </p>

            <h2 className="mt-2 text-3xl font-bold text-white">
              {player.name}
            </h2>

            <p className="mt-1 text-slate-400">
              {player.className} · Level {player.level}
            </p>

            <div className="mt-5 space-y-4">
              <ResourceBar
                label="HP"
                current={player.currentHp}
                max={player.derivedStats.maxHp}
              />

              <ResourceBar
                label="MP"
                current={player.currentMp}
                max={player.derivedStats.maxMp}
              />

              <ResourceBar
                label="Energy"
                current={player.currentEnergy}
                max={player.derivedStats.maxEnergy}
              />

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Shield</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {player.shield}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-sm uppercase tracking-wide text-red-300">
              Monster
            </p>

            <h2 className="mt-2 text-3xl font-bold text-white">
              {monster.name}
            </h2>

            <p className="mt-1 text-slate-400">
              Level {monster.level} · {monster.rank}
            </p>

            <div className="mt-5 space-y-4">
              <ResourceBar
                label="HP"
                current={monster.currentHp}
                max={monster.maxHp}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Attack</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {monster.attack}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Defense</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {monster.defense}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Speed</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {monster.actionSpeed}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Reward</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {monster.reward.exp} EXP
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-xl font-semibold text-white">Actions</h2>

            {battleState.status === 'active' && (
              <p className="mt-2 text-sm text-slate-400">
                {isPlayerTurn
                  ? 'Choose your action.'
                  : 'Monster is acting...'}
              </p>
            )}

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={handlePlayerBasicAttack}
                disabled={!isPlayerTurn}
                className="w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                Basic Attack
              </button>

              <div className="space-y-3">
                {playerSkills.map((skill) => {
                  const usable = canPlayerUseSkill(player, skill.id);

                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => handlePlayerUseSkill(skill.id)}
                      disabled={!isPlayerTurn || !usable}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-left transition hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {skill.name}
                          </p>

                          <p className="mt-1 text-sm text-slate-400">
                            {skill.description}
                          </p>
                        </div>

                        <span className="rounded-full border border-violet-500/40 px-2 py-1 text-xs text-violet-300">
                          {skill.resourceCost} {skill.resourceType ?? ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
                {isMonsterTurn && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        {monster.name} is preparing an attack...
                    </div>
                )}
            </div>

            {battleState.status === 'won' && (
              <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                <p className="font-semibold text-emerald-200">
                  Victory!
                </p>

                <p className="mt-2 text-sm text-emerald-100">
                  You gained {battleState.reward.exp} EXP and{' '}
                  {battleState.reward.gold} Gold.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    const updatedCharacter = buildCharacterAfterWin(
                      character,
                      battleState,
                    );

                    onBattleFinished(updatedCharacter);
                  }}
                  className="mt-4 w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-400"
                >
                  Claim Reward & Return
                </button>
              </div>
            )}

            {battleState.status === 'lost' && (
              <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
                <p className="font-semibold text-red-200">
                  Defeat
                </p>

                <p className="mt-2 text-sm text-red-100">
                  Your character will return with partial HP.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    const updatedCharacter = buildCharacterAfterLoss(
                      character,
                      battleState,
                    );

                    onBattleFinished(updatedCharacter);
                  }}
                  className="mt-4 w-full rounded-xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-400"
                >
                  Return to Profile
                </button>
              </div>
            )}

            {!isBattleActive && (
              <button
                type="button"
                onClick={resetBattle}
                className="mt-4 w-full rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500"
              >
                Start Another Battle
              </button>
            )}
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-xl font-semibold text-white">Battle Log</h2>

            <div className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
              {battleState.logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3"
                >
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Turn {log.turn}</span>
                    <span>{log.actor}</span>
                  </div>

                  <p className="text-sm text-slate-200">
                    {log.message}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}