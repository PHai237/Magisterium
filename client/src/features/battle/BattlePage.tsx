import { useEffect, useRef } from 'react';

import { PageHeader } from '../../components/ui/PageHeader';
import type { Character, SkillDefinition } from '../character-creation/types';
import { applyExpReward } from '../character-progression/progressionCalculations';
import { addBronze, formatCurrency } from '../economy/currencyUtils';
// import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
// import type { DungeonDefinition } from '../dungeon/dungeonTypes';
import { BATTLE_BALANCE } from '../game-balance/balanceConstants';

import { useBattle } from './useBattle';
import type {
  BattleContentSource,
  BattleState,
  PlayerBattleState,
} from './battleTypes';

interface BattlePageProps {
  character: Character;
  source: BattleContentSource;
  onBackToSource: () => void;
  onReturnToSourceAfterWin: (updatedCharacter: Character) => void;
  onReturnToProfileAfterLoss: (updatedCharacter: Character) => void;
  onEscapeFromBattle: (updatedCharacter: Character) => void;
  onContinueAdventure: (updatedCharacter: Character) => void;
}

function getPercent(currentValue: number, maxValue: number): number {
  if (maxValue <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (currentValue / maxValue) * 100));
}

type ResourceBarVariant = 'hp' | 'mp' | 'energy';

function getResourceBarFillClass(variant: ResourceBarVariant): string {
  if (variant === 'hp') {
    return 'bg-emerald-500';
  }

  if (variant === 'mp') {
    return 'bg-sky-500';
  }

  return 'bg-amber-500';
}

function ResourceBar({
  label,
  current,
  max,
  variant,
}: {
  label: string;
  current: number;
  max: number;
  variant: ResourceBarVariant;
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
          className={`h-full rounded-full transition-all duration-500 ${getResourceBarFillClass(
            variant,
          )}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function getBattleStatusText(battleState: BattleState): string {
  if (battleState.status === 'won') {
    return 'Victory';
  }

  if (battleState.status === 'lost') {
    return 'Defeat';
  }

  if (battleState.status === 'escaped') {
    return 'Escaped';
  }

  return battleState.currentActor === 'player' ? 'Your Turn' : 'Enemy Turn';
}

function getBattleStatusClass(battleState: BattleState): string {
  if (battleState.status === 'won') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  if (battleState.status === 'lost') {
    return 'border-red-500/40 bg-red-500/10 text-red-300';
  }

  if (battleState.status === 'escaped') {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  }

  return battleState.currentActor === 'player'
    ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
    : 'border-amber-500/40 bg-amber-500/10 text-amber-300';
}

function getBattleStatusAnimationClass(battleState: BattleState): string {
  return battleState.status === 'active' ? 'ui-soft-pulse' : '';
}

function getSkillEffectBadgeClass(
  effectType: SkillDefinition['effectType'],
): string {
  if (effectType === 'damage') {
    return 'border-red-500/40 bg-red-500/10 text-red-300';
  }

  if (effectType === 'heal') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  if (effectType === 'shield') {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  }

  return 'border-violet-500/40 bg-violet-500/10 text-violet-300';
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

  const characterAfterBattleState: Character = {
    ...character,
    moneyBronze: addBronze(
      character.moneyBronze,
      battleState.reward.bronze,
    ),
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

  const expResult = applyExpReward(
    characterAfterBattleState,
    battleState.reward.exp,
  );

  return expResult.updatedCharacter;
}

function buildCharacterAfterLoss(
  character: Character,
  battleState: BattleState,
): Character {
  return {
    ...character,
    currentState: {
      hp: Math.max(
        1,
        Math.ceil(
            character.derivedStats.maxHp * BATTLE_BALANCE.defeatRecoveryHpPercent,
        ),
      ),
      mp: battleState.player.currentMp,
      energy: battleState.player.currentEnergy,
      shield: 0,
    },
  };
}

function buildCharacterAfterEscape(
  character: Character,
  battleState: BattleState,
): Character {
  return {
    ...character,
    currentState: {
      hp: battleState.player.currentHp,
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

function getLogActorLabel(actor: BattleState['logs'][number]['actor']): string {
  if (actor === 'player') {
    return 'Player';
  }

  if (actor === 'monster') {
    return 'Monster';
  }

  return 'System';
}

function getLogCardClass(actor: BattleState['logs'][number]['actor']): string {
  if (actor === 'player') {
    return 'border-violet-500/30 bg-violet-500/10';
  }

  if (actor === 'monster') {
    return 'border-red-500/30 bg-red-500/10';
  }

  return 'border-slate-800 bg-slate-950';
}

function getLogBadgeClass(actor: BattleState['logs'][number]['actor']): string {
  if (actor === 'player') {
    return 'border-violet-500/40 bg-violet-500/10 text-violet-300';
  }

  if (actor === 'monster') {
    return 'border-red-500/40 bg-red-500/10 text-red-300';
  }

  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function getSkillCostText(skill: SkillDefinition): string {
  if (!skill.resourceType || skill.resourceCost <= 0) {
    return 'Free';
  }

  return `${skill.resourceCost} ${skill.resourceType}`;
}

function getSkillResourceWarning(
  player: PlayerBattleState,
  skill: SkillDefinition,
): string {
  if (!skill.resourceType || skill.resourceCost <= 0) {
    return '';
  }

  if (skill.resourceType === 'MP' && player.currentMp < skill.resourceCost) {
    return `Not enough MP. Current: ${player.currentMp}, Required: ${skill.resourceCost}.`;
  }

  if (
    skill.resourceType === 'Energy' &&
    player.currentEnergy < skill.resourceCost
  ) {
    return `Not enough Energy. Current: ${player.currentEnergy}, Required: ${skill.resourceCost}.`;
  }

  if (skill.resourceType === 'HP' && player.currentHp <= skill.resourceCost) {
    return `Not enough HP. Current: ${player.currentHp}, Required: more than ${skill.resourceCost}.`;
  }

  return '';
}

export function BattlePage({
  character,
  source,
  onBackToSource,
  onReturnToSourceAfterWin,
  onReturnToProfileAfterLoss,
  onEscapeFromBattle,
  onContinueAdventure,
}: BattlePageProps) {
  const {
    battleState,
    isPlayerTurn,
    isMonsterTurn,
    playerSkills,
    handlePlayerBasicAttack,
    handlePlayerUseSkill,
    handlePlayerFlee,
    handleMonsterAction,
  } = useBattle({
    character,
    source,
  });

  useEffect(() => {
    if (!isMonsterTurn) {
        return;
    }

    const timerId = window.setTimeout(() => {
        handleMonsterAction();
    }, BATTLE_BALANCE.autoMonsterTurnDelayMs);

    return () => {
        window.clearTimeout(timerId);
    };
    }, [isMonsterTurn, handleMonsterAction]);

  const { player, monster } = battleState;
  const sourceLabel =
    source.type === 'dungeon'
      ? 'Dungeon'
      : source.type === 'road_event'
      ? 'Road Event'
      : 'Zone';

  const backButtonLabel =
    source.type === 'dungeon'
      ? 'Back to Dungeons'
      : source.type === 'road_event'
      ? 'Back to Travel'
      : 'Back to Zones';

  const returnToSourceAfterWinLabel =
    source.type === 'dungeon'
      ? 'Claim Reward & Return to Dungeons'
      : source.type === 'road_event'
      ? 'Claim Reward & Continue Travel'
      : 'Claim Reward & Return to Zones';

  const continueAdventureLabel =
    source.type === 'dungeon'
      ? 'Claim Reward & Challenge Again'
      : source.type === 'road_event'
      ? 'Claim Reward & Continue Travel'
      : 'Claim Reward & Continue Farming';
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const logContainer = logContainerRef.current;

    if (!logContainer) {
      return;
    }

    logContainer.scrollTop = logContainer.scrollHeight;
  }, [battleState.logs.length]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Magisterium"
          title="Battle"
          description={`${source.data.name} — ${
            battleState.status === 'active'
              ? `Current turn: ${battleState.currentActor}`
              : `Battle result: ${battleState.status}`
          }`}
          actions={
            <button
              type="button"
              onClick={onBackToSource}
              disabled={battleState.status === 'active'}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {backButtonLabel}
            </button>
          }
        />
        
        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {sourceLabel}
            </p>
            <p className="mt-2 text-lg font-bold text-white">
              {source.data.name}
            </p>
          </div>

          <div className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Enemy
            </p>
            <p className="mt-2 text-lg font-bold text-white">
              {monster.name}
            </p>
          </div>

          <div className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Reward
            </p>
            <p className="mt-2 text-lg font-bold text-white">
              {battleState.reward.exp} EXP / {formatCurrency(battleState.reward.bronze)}
            </p>
          </div>

          <div
            className={`ui-card-enter rounded-2xl border p-4 ${getBattleStatusClass(
              battleState,
            )} ${getBattleStatusAnimationClass(battleState)}`}
          >
            <p className="text-xs uppercase tracking-wide">
              Battle Status
            </p>
            <p className="mt-2 text-lg font-bold">
              {getBattleStatusText(battleState)}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
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
                variant="hp"
              />

              <ResourceBar
                label="MP"
                current={player.currentMp}
                max={player.derivedStats.maxMp}
                variant="mp"
              />

              <ResourceBar
                label="Energy"
                current={player.currentEnergy}
                max={player.derivedStats.maxEnergy}
                variant="energy"
              />

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Shield</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {player.shield}
                </p>
              </div>
              {(player.evasionChanceBonus > 0 ||
              player.nextDamageReductionPercent > 0) && (
              <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-4">
                <p className="text-sm font-semibold text-violet-300">
                  Temporary Effects
                </p>

                <div className="mt-2 space-y-1 text-sm text-slate-200">
                  {player.evasionChanceBonus > 0 && (
                    <p>
                      Evasion Chance: {player.evasionChanceBonus}%
                    </p>
                  )}

                  {player.nextDamageReductionPercent > 0 && (
                    <p>
                      Next Damage Reduction:{' '}
                      {Math.round(player.nextDamageReductionPercent * 100)}%
                    </p>
                  )}
                </div>
              </div>
            )}
            </div>
          </article>

          <article className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
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
                variant="hp"
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
          <article className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-xl font-semibold text-white">Actions</h2>

            {battleState.status === 'active' && (
              <div
                className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                  isPlayerTurn
                    ? 'border-violet-500/30 bg-violet-500/10 text-violet-200'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                }`}
              >
                {isPlayerTurn
                  ? 'It is currently your turn. Choose an action.'
                  : `${monster.name} is preparing to act...`}
              </div>
            )}

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={handlePlayerBasicAttack}
                disabled={!isPlayerTurn}
                className="w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-violet-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                Basic Attack
              </button>

              {source.type === 'zone' && (
                <button
                  type="button"
                  onClick={handlePlayerFlee}
                  disabled={!isPlayerTurn}
                  className="w-full rounded-xl border border-sky-500/40 bg-sky-500/10 px-5 py-3 font-semibold text-sky-200 transition duration-200 hover:-translate-y-0.5 hover:bg-sky-500/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Attempt Escape
                </button>
              )}

              <div className="space-y-3">
                {playerSkills.map((skill) => {
                    const usable = canPlayerUseSkill(player, skill.id);
                    const resourceWarning = getSkillResourceWarning(player, skill);

                    return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => handlePlayerUseSkill(skill.id)}
                          disabled={!isPlayerTurn || !usable}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-5 py-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-white">
                                  {skill.name}
                                </p>

                                <span
                                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${getSkillEffectBadgeClass(
                                    skill.effectType,
                                  )}`}
                                >
                                  {skill.effectType}
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-slate-400">
                                {skill.description}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
                                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                                  Cost: {getSkillCostText(skill)}
                                </span>

                                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                                  Type: {skill.actionType}
                                </span>

                                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                                  Scale: {skill.scalingStat ?? 'none'}
                                </span>
                              </div>

                              {resourceWarning && (
                                <p className="mt-3 text-xs font-semibold text-red-300">
                                  {resourceWarning}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                    );
                    })}
              </div>
                {isMonsterTurn && (
                  <div className="ui-soft-pulse rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
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
                    You gained {battleState.reward.exp} EXP and {formatCurrency(battleState.reward.bronze)}.
                    </p>

                    <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        const updatedCharacter = buildCharacterAfterWin(
                          character,
                          battleState,
                        );

                        onReturnToSourceAfterWin(updatedCharacter);
                      }}
                      className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-400"
                    >
                      {returnToSourceAfterWinLabel}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                        const updatedCharacter = buildCharacterAfterWin(
                            character,
                            battleState,
                        );

                        onContinueAdventure(updatedCharacter);
                        }}
                        className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-5 py-3 font-semibold text-emerald-200 transition hover:bg-emerald-500/10"
                    >
                        {continueAdventureLabel}
                    </button>
                    </div>
                </div>
                )}

            {battleState.status === 'escaped' && (
              <div className="mt-5 rounded-xl border border-sky-500/40 bg-sky-500/10 p-4">
                <p className="font-semibold text-sky-200">Escaped</p>

                <p className="mt-2 text-sm text-sky-100">
                  You escaped successfully. No reward was gained from this encounter.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    const updatedCharacter = buildCharacterAfterEscape(
                      character,
                      battleState,
                    );

                    onEscapeFromBattle(updatedCharacter);
                  }}
                  className="mt-4 w-full rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400"
                >
                  Return to Zones
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

                    onReturnToProfileAfterLoss(updatedCharacter);
                  }}
                  className="mt-4 w-full rounded-xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-400"
                >
                  Return to Profile
                </button>
              </div>
            )}
          </article>

          <article className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-xl font-semibold text-white">Battle Log</h2>

            <div
              ref={logContainerRef}
              className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-1"
            >
              {battleState.logs.map((log) => (
                <div
                  key={log.id}
                  className={`ui-log-entry rounded-xl border p-3 ${getLogCardClass(
                    log.actor,
                  )}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${getLogBadgeClass(
                        log.actor,
                      )}`}
                    >
                      {getLogActorLabel(log.actor)}
                    </span>

                    <span className="text-[11px] text-slate-500">
                      Turn {log.turn}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-slate-100">
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