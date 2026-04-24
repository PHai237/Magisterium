import type { Character } from '../character-creation/types';

import { PLACES, TAVERN_REST_COST } from './placeConstants';
import {
  canAffordTavernRest,
  recoverAtTavern,
} from './placeCalculations';

interface TownPageProps {
  character: Character;
  onBackToProfile: () => void;
  onRecoverAtTavern: (updatedCharacter: Character) => void;
}

type ResourceBarVariant = 'hp' | 'mp' | 'energy';

function getPercent(currentValue: number, maxValue: number): number {
  if (maxValue <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (currentValue / maxValue) * 100));
}

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

export function TownPage({
  character,
  onBackToProfile,
  onRecoverAtTavern,
}: TownPageProps) {
  const canRest = canAffordTavernRest(character);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
              Magisterium
            </p>

            <h1 className="mt-2 text-4xl font-bold">Town</h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              A safe place to recover, regroup, and prepare for the next
              adventure.
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
                Review your current condition, recover your resources, and head
                back out when you are ready.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Gold
                  </p>
                  <p className="mt-2 text-xl font-bold text-yellow-300">
                    {character.gold}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Defense
                  </p>
                  <p className="mt-2 text-xl font-bold text-white">
                    {character.derivedStats.defense}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Action Speed
                  </p>
                  <p className="mt-2 text-xl font-bold text-white">
                    {character.derivedStats.actionSpeed}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Recovery Status
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

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Shield</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {character.currentState.shield}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {PLACES.map((place) => (
            <article
              key={place.id}
              className={`rounded-2xl border p-5 ${
                place.unlocked
                  ? 'border-slate-800 bg-slate-900/60'
                  : 'border-slate-800 bg-slate-900/30 opacity-60'
              }`}
            >
              <h2 className="text-2xl font-bold text-white">{place.name}</h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {place.description}
              </p>

              <div className="mt-4">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    place.unlocked
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  {place.unlocked ? 'Available' : 'Future'}
                </span>
              </div>

              {place.id === 'tavern' && place.unlocked && (
                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-sm text-slate-400">Rest Cost</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {TAVERN_REST_COST} Gold
                    </p>
                  </div>

                  {!canRest && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      Not enough Gold to rest at the tavern.
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!canRest}
                    onClick={() => {
                      const updatedCharacter = recoverAtTavern(character);
                      onRecoverAtTavern(updatedCharacter);
                    }}
                    className="w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-slate-700"
                  >
                    Rest at Tavern
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}