import type { Character } from '../character-creation/types';
import { MONSTERS } from '../monster/monsterConstants';

import { DUNGEONS } from './dungeonConstants';
import type { DungeonDefinition } from './dungeonTypes';

interface DungeonEntryPageProps {
  character: Character;
  onBackToProfile: () => void;
  onEnterDungeon: (dungeon: DungeonDefinition) => void;
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

function getDifficultyClass(
  difficulty: DungeonDefinition['difficulty'],
): string {
  if (difficulty === 'beginner') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  if (difficulty === 'normal') {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  }

  return 'border-red-500/40 bg-red-500/10 text-red-300';
}

function getDifficultyDescription(
  difficulty: DungeonDefinition['difficulty'],
): string {
  if (difficulty === 'beginner') {
    return 'Safe for early adventurers.';
  }

  if (difficulty === 'normal') {
    return 'A balanced challenge for prepared players.';
  }

  return 'A dangerous challenge with higher risk.';
}

function getMonsterNames(monsterIds: string[]): string[] {
  return monsterIds
    .map((monsterId) => MONSTERS.find((monster) => monster.id === monsterId))
    .filter(Boolean)
    .map((monster) => monster!.name);
}

function getStrongestMonsterLabel(monsterIds: string[]): string {
  const monsters = monsterIds
    .map((monsterId) => MONSTERS.find((monster) => monster.id === monsterId))
    .filter((monster): monster is (typeof MONSTERS)[number] => Boolean(monster));

  if (monsters.length === 0) {
    return 'Unknown Threat';
  }

  let strongestMonster = monsters[0];

  for (const monster of monsters.slice(1)) {
    if (monster.level > strongestMonster.level) {
      strongestMonster = monster;
    }
  }

  return `${strongestMonster.name} (Lv.${strongestMonster.level})`;
}

function OverviewStatCard({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: string | number;
  accentClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-bold text-white ${accentClass ?? ''}`}>
        {value}
      </p>
    </div>
  );
}

export function DungeonEntryPage({
  character,
  onBackToProfile,
  onEnterDungeon,
}: DungeonEntryPageProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
              Magisterium
            </p>

            <h1 className="mt-2 text-4xl font-bold">Dungeon Entry</h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Prepare for combat, review your current condition, and choose
              where your next adventure begins.
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToProfile}
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500"
          >
            Back to Profile
          </button>
        </header>

        <section className="mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-900/80 to-slate-950 p-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-300">
                  {character.className}
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-300">
                  Level {character.level}
                </span>
              </div>

              <h2 className="mt-4 text-4xl font-bold text-white">
                {character.name}
              </h2>

              <p className="mt-2 max-w-2xl text-slate-400">
                Your current adventuring condition before entering a combat
                area. Review your resources carefully before moving deeper into
                dangerous territory.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <OverviewStatCard label="Level" value={character.level} />
                <OverviewStatCard
                  label="Gold"
                  value={character.gold}
                  accentClass="text-yellow-300"
                />
                <OverviewStatCard
                  label="Passive"
                  value={character.passive.name}
                  accentClass="text-violet-300"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Adventure Readiness
              </p>

              <div className="mt-5 space-y-4">
                <ResourceBar
                  label="HP"
                  current={character.currentState.hp}
                  max={character.derivedStats.maxHp}
                  variant="hp"
                />

                <ResourceBar
                  label="MP"
                  current={character.currentState.mp}
                  max={character.derivedStats.maxMp}
                  variant="mp"
                />

                <ResourceBar
                  label="Energy"
                  current={character.currentState.energy}
                  max={character.derivedStats.maxEnergy}
                  variant="energy"
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Defense
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {character.derivedStats.defense}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Action Speed
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {character.derivedStats.actionSpeed}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Available Dungeons
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Choose a destination and begin your next combat route.
            </p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {DUNGEONS.map((dungeon) => {
            const monsterNames = getMonsterNames(dungeon.possibleMonsterIds);
            const strongestThreat = getStrongestMonsterLabel(
              dungeon.possibleMonsterIds,
            );

            return (
              <article
                key={dungeon.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-violet-500/40"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-bold text-white">
                        {dungeon.name}
                      </h3>

                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getDifficultyClass(
                          dungeon.difficulty,
                        )}`}
                      >
                        {dungeon.difficulty}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {dungeon.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Recommended Level
                    </p>
                    <p className="mt-2 text-lg font-bold text-white">
                      Level {dungeon.recommendedLevel}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Entry Cost
                    </p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {dungeon.entryCostGold} Gold
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Threat Note
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-200">
                      {getDifficultyDescription(dungeon.difficulty)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Strongest Known Threat
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-200">
                      {strongestThreat}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Possible Monsters
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {monsterNames.map((monsterName) => (
                      <span
                        key={monsterName}
                        className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-200"
                      >
                        {monsterName}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {dungeon.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onEnterDungeon(dungeon)}
                  className="mt-6 w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400"
                >
                  Enter Dungeon
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}