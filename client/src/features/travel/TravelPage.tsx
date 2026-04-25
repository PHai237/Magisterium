import { useEffect, useMemo, useRef, useState } from 'react';

import { OverviewStatCard } from '../../components/ui/OverviewStatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionIntro } from '../../components/ui/SectionIntro';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import type { Character } from '../character-creation/types';
import type { ZoneDefinition } from '../zone/zoneTypes';

interface TravelPageProps {
  character: Character;
  zone: ZoneDefinition;
  onCancelTravel: () => void;
  onArriveAtZone: () => void;
}

const TRAVEL_PROGRESS_STEP = 8;
const TRAVEL_TICK_MS = 180;

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
          className={`h-full rounded-full transition-all duration-300 ${getResourceBarFillClass(
            variant,
          )}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function getTravelStatusLines(zone: ZoneDefinition): string[] {
  return [
    `Leaving town and heading toward ${zone.name}.`,
    `The road ahead feels calm, but anything could happen later.`,
    `You continue moving through the path toward ${zone.name}.`,
    `Your destination is almost within reach.`,
  ];
}

function getCurrentTravelLine(
  progress: number,
  zone: ZoneDefinition,
): string {
  const lines = getTravelStatusLines(zone);

  if (progress < 25) {
    return lines[0];
  }

  if (progress < 55) {
    return lines[1];
  }

  if (progress < 85) {
    return lines[2];
  }

  return lines[3];
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

export function TravelPage({
  character,
  zone,
  onCancelTravel,
  onArriveAtZone,
}: TravelPageProps) {
  const [travelProgress, setTravelProgress] = useState(0);
  const hasCompletedRef = useRef(false);

  const currentTravelLine = useMemo(() => {
    return getCurrentTravelLine(travelProgress, zone);
  }, [travelProgress, zone]);

  useEffect(() => {
    if (hasCompletedRef.current) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTravelProgress((currentProgress) => {
        if (currentProgress >= 100) {
          window.clearInterval(intervalId);
          return 100;
        }

        const nextProgress = Math.min(
          100,
          currentProgress + TRAVEL_PROGRESS_STEP,
        );

        if (nextProgress >= 100) {
          window.clearInterval(intervalId);
        }

        return nextProgress;
      });
    }, TRAVEL_TICK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (travelProgress < 100 || hasCompletedRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (hasCompletedRef.current) {
        return;
      }

      hasCompletedRef.current = true;
      onArriveAtZone();
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [travelProgress, onArriveAtZone]);

  function handleSkipTravel() {
    if (hasCompletedRef.current) {
      return;
    }

    hasCompletedRef.current = true;
    onArriveAtZone();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Magisterium"
          title="Traveling"
          description={`You are currently moving toward ${zone.name}. This travel layer will later host road events and world interactions.`}
          actions={
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={handleSkipTravel}
                  className="rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400"
                >
                  Skip Travel
                </button>

                <button
                  type="button"
                  onClick={onCancelTravel}
                  className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          }
        />

        <section className="ui-card-enter mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-900/80 to-slate-950 p-6">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-sm font-semibold uppercase tracking-wide ${getZoneDifficultyClass(
                    zone.difficulty,
                  )}`}
                >
                  {zone.difficulty}
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-300">
                  Destination: {zone.name}
                </span>
              </div>

              <h2 className="mt-4 text-4xl font-bold text-white">
                Road to {zone.name}
              </h2>

              <p className="mt-3 text-base leading-7 text-slate-300">
                {currentTravelLine}
              </p>

              <div className="mt-6 grid max-w-3xl gap-4 md:grid-cols-3">
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
                Travel Condition
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
                <p className="text-sm text-slate-400">Travel Progress</p>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-2xl font-bold text-white">
                    {travelProgress}%
                  </p>

                  <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-300">
                    In Transit
                  </span>
                </div>

                <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${travelProgress}%` }}
                  />

                  <div
                    className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/40 bg-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.7)] transition-all duration-300"
                    style={{
                      left: `calc(${travelProgress}% - 8px)`,
                      opacity: travelProgress <= 2 ? 0 : 1,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="ui-card-enter">
          <SectionIntro
            title="Travel Layer Foundation"
            subtitle="This page is the future hook point for road events, ambushes, wandering merchants, NPC requests, dropped items, and other world interactions."
          />
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-xl font-semibold text-white">
              Current Travel Purpose
            </h3>

            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                1. Add a visible movement phase before zone farming begins
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                2. Give the player a sense of going somewhere in the world
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                3. Prepare a clean hook for future travel and road events
              </div>
            </div>
          </article>

          <article className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-xl font-semibold text-white">
              Future Expansion Hooks
            </h3>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400">
                #merchant
              </span>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400">
                #bandit_ambush
              </span>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400">
                #npc_help
              </span>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400">
                #dropped_item
              </span>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400">
                #road_event
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              For now, travel always completes safely. In the next phase, this
              screen will become the place where random road events can interrupt
              the journey before the player reaches the zone.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}