import type { Character } from '../character-creation/types';

import { PageHeader } from '../../components/ui/PageHeader';
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

function getPlaceStatusClass(unlocked: boolean): string {
  return unlocked
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    : 'border-slate-700 bg-slate-900 text-slate-400';
}

function getPlaceRoleClass(placeId: string): string {
  if (placeId === 'tavern') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  }

  if (placeId === 'clinic') {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  }

  return 'border-violet-500/40 bg-violet-500/10 text-violet-300';
}

function getPlaceRoleLabel(placeId: string): string {
  if (placeId === 'tavern') {
    return 'Recovery';
  }

  if (placeId === 'clinic') {
    return 'Medical';
  }

  return 'Service';
}

export function TownPage({
  character,
  onBackToProfile,
  onRecoverAtTavern,
}: TownPageProps) {
  const canRest = canAffordTavernRest(character);

  const servicePlaces = PLACES.filter((place) => place.id !== 'town');

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <PageHeader
            eyebrow="Magisterium"
            title="Town"
            description="A safe place to recover, regroup, and prepare for the next adventure."
            actions={
                <button
                type="button"
                onClick={onBackToProfile}
                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500"
                >
                Back to Profile
                </button>
            }
        />

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
                Review your current condition, restore your resources, and head
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

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Current Town
            </p>
            <p className="mt-2 text-lg font-bold text-white">
              Ravenhold Town
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Available Services
            </p>
            <p className="mt-2 text-lg font-bold text-white">
              {servicePlaces.filter((place) => place.unlocked).length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Recovery Cost
            </p>
            <p className="mt-2 text-lg font-bold text-yellow-300">
              {TAVERN_REST_COST} Gold
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Current Shield
            </p>
            <p className="mt-2 text-lg font-bold text-white">
              {character.currentState.shield}
            </p>
          </div>
        </section>

        <section className="mb-4">
          <h2 className="text-2xl font-bold text-white">Town Services</h2>
          <p className="mt-1 text-sm text-slate-400">
            Recover, prepare, and review future support systems before returning
            to danger.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {servicePlaces.map((place) => (
            <article
              key={place.id}
              className={`rounded-2xl border p-5 transition ${
                place.unlocked
                  ? 'border-slate-800 bg-slate-900/60 hover:border-violet-500/40'
                  : 'border-slate-800 bg-slate-900/30 opacity-60'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-white">{place.name}</h2>

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getPlaceStatusClass(
                    place.unlocked,
                  )}`}
                >
                  {place.unlocked ? 'Available' : 'Future'}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getPlaceRoleClass(
                    place.id,
                  )}`}
                >
                  {getPlaceRoleLabel(place.id)}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {place.description}
              </p>

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

              {place.id === 'clinic' && (
                <div className="mt-5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                  Future service: recovery support, respawn support, and death
                  loop systems will be connected here later.
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}