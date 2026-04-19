import type { DungeonDefinition } from './dungeonTypes';
import { DUNGEONS } from './dungeonConstants';
import type { Character } from '../character-creation/types';
import { MONSTERS } from '../monster/monsterConstants';

interface DungeonEntryPageProps {
  character: Character;
  onBackToProfile: () => void;
  onEnterDungeon: (dungeon: DungeonDefinition) => void;
}

function getMonsterNames(monsterIds: string[]): string {
  return monsterIds
    .map((monsterId) => MONSTERS.find((monster) => monster.id === monsterId))
    .filter(Boolean)
    .map((monster) => monster?.name)
    .join(', ');
}

function getDifficultyClass(difficulty: DungeonDefinition['difficulty']): string {
  if (difficulty === 'beginner') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  if (difficulty === 'normal') {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  }

  return 'border-red-500/40 bg-red-500/10 text-red-300';
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

            <h1 className="mt-2 text-4xl font-bold">
              Dungeon Entry
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Choose a dungeon to begin your first adventure. This phase will
              connect your character profile to the battle system.
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

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-sm text-slate-400">Current Character</p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-white">
              {character.name}
            </h2>

            <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-sm text-violet-300">
              {character.className}
            </span>

            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-300">
              Level {character.level}
            </span>

            <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-300">
              {character.gold} Gold
            </span>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {DUNGEONS.map((dungeon) => (
            <article
              key={dungeon.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {dungeon.name}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    {dungeon.description}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getDifficultyClass(
                    dungeon.difficulty,
                  )}`}
                >
                  {dungeon.difficulty}
                </span>
              </div>

              <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-slate-400">Recommended Level</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    Level {dungeon.recommendedLevel}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-slate-400">Entry Cost</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {dungeon.entryCostGold} Gold
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 md:col-span-2">
                  <p className="text-slate-400">Possible Monsters</p>
                  <p className="mt-1 text-slate-200">
                    {getMonsterNames(dungeon.possibleMonsterIds)}
                  </p>
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
          ))}
        </section>
      </div>
    </main>
  );
}