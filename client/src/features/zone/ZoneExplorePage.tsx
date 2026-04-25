import { OverviewStatCard } from '../../components/ui/OverviewStatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionIntro } from '../../components/ui/SectionIntro';
import type { Character } from '../character-creation/types';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';

import type { ZoneDefinition } from './zoneTypes';

interface ZoneExplorePageProps {
  character: Character;
  zone: ZoneDefinition;
  onBackToZoneList: () => void;
  onReturnToProfile: () => void;
  onSearchEncounter: () => void;
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

function getZoneDifficultyClass(difficulty: ZoneDefinition['difficulty']): string {
  if (difficulty === 'safe') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  if (difficulty === 'normal') {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  }

  return 'border-red-500/40 bg-red-500/10 text-red-300';
}

function getEncounterDensityClass(
  density: ZoneDefinition['encounterDensity'],
): string {
  if (density === 'low') {
    return 'border-slate-700 bg-slate-900 text-slate-300';
  }

  if (density === 'normal') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  }

  return 'border-violet-500/40 bg-violet-500/10 text-violet-300';
}

export function ZoneExplorePage({
  character,
  zone,
  onBackToZoneList,
  onReturnToProfile,
  onSearchEncounter,
}: ZoneExplorePageProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Magisterium"
          title="Zone Exploration"
          description="Stay within an active farming zone, manage your condition, and search for repeated encounters."
          actions={
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={onSearchEncounter}
                  className="rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400"
                >
                  Search Encounter
                </button>

                <button
                  type="button"
                  onClick={onBackToZoneList}
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  Change Zone
                </button>
              </div>

              <div className="flex lg:justify-end">
                <button
                  type="button"
                  onClick={onReturnToProfile}
                  className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500"
                >
                  Return to Profile
                </button>
              </div>
            </div>
          }
        />

        <section className="ui-card-enter mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-900/80 to-slate-950 p-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-sm font-semibold uppercase tracking-wide ${getZoneDifficultyClass(
                    zone.difficulty,
                  )}`}
                >
                  {zone.difficulty}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-sm font-semibold uppercase tracking-wide ${getEncounterDensityClass(
                    zone.encounterDensity,
                  )}`}
                >
                  Encounter {zone.encounterDensity}
                </span>
              </div>

              <h2 className="mt-4 text-4xl font-bold text-white">
                {zone.name}
              </h2>

              <p className="mt-2 max-w-2xl text-slate-400">
                {zone.description}
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <OverviewStatCard
                  label="Recommended Level"
                  value={`Lv. ${zone.recommendedLevel}`}
                />
                <OverviewStatCard
                    label="Currency"
                    value={<MoneyDisplay totalBronze={character.moneyBronze} compact />}
                />
                <OverviewStatCard
                  label="Action Speed"
                  value={character.derivedStats.actionSpeed}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Active Farming Condition
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

        <div className="ui-card-enter">
          <SectionIntro
            title="Zone Notes"
            subtitle="This screen acts as your active farming hub. Future systems like road events, gathering, encounter settings, and camp actions can be attached here."
          />
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-xl font-semibold text-white">
              Current Zone Identity
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {zone.name} is treated as a regular farming area rather than a boss
              dungeon. Search encounters repeatedly, leave when resources get
              low, and use escape during battle if the fight becomes unsafe.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {zone.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </article>

          <article className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-xl font-semibold text-white">
              Current Loop
            </h3>

            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                1. Stay in this zone
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                2. Search for a random encounter
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                3. Win, escape, or retreat later when needed
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                4. Repeat farming without going back through the full menu
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}