import { useEffect, useMemo, useRef, useState } from 'react';

import { OverviewStatCard } from '../../components/ui/OverviewStatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionIntro } from '../../components/ui/SectionIntro';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import type { Character } from '../character-creation/types';
import {
  applyRoadEventChoice,
  getRoadEventChancePercent,
  rollRoadEventForZone,
} from '../road-event/roadEventCalculations';
import type {
  RoadEventChoiceDefinition,
  RoadEventDefinition,
  RoadEventFrequency,
} from '../road-event/roadEventTypes';
import type { ZoneDefinition } from '../zone/zoneTypes';

interface TravelPageProps {
  character: Character;
  zone: ZoneDefinition;
  onCancelTravel: () => void;
  onArriveAtZone: () => void;
  onTravelEventResult: (updatedCharacter: Character) => void;
  roadEventFrequency?: RoadEventFrequency;
}

const TRAVEL_PROGRESS_STEP = 8;
const TRAVEL_TICK_MS = 180;
const ROAD_EVENT_CHECKPOINTS = [32, 64, 88];

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
    `The road ahead feels calm, but anything could happen.`,
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

function getRoadEventCategoryClass(
  category: RoadEventDefinition['category'],
): string {
  if (category === 'merchant') {
    return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300';
  }

  if (category === 'reward') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  if (category === 'recovery') {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  }

  if (category === 'danger' || category === 'future_combat') {
    return 'border-red-500/40 bg-red-500/10 text-red-300';
  }

  return 'border-violet-500/40 bg-violet-500/10 text-violet-300';
}

function formatSignedValue(value: number, label: string): string {
  if (value > 0) {
    return `+${value} ${label}`;
  }

  if (value < 0) {
    return `${value} ${label}`;
  }

  return '';
}

function getChoiceOutcomePreview(choice: RoadEventChoiceDefinition): string {
  const parts = [
    formatSignedValue(choice.outcome.bronzeChange ?? 0, 'Bronze'),
    formatSignedValue(choice.outcome.hpChange ?? 0, 'HP'),
    formatSignedValue(choice.outcome.mpChange ?? 0, 'MP'),
    formatSignedValue(choice.outcome.energyChange ?? 0, 'Energy'),
  ].filter(Boolean);

  if (parts.length === 0) {
    return 'No immediate resource change';
  }

  return parts.join(' • ');
}

function RoadEventPanel({
  event,
  onChoose,
}: {
  event: RoadEventDefinition;
  onChoose: (choice: RoadEventChoiceDefinition) => void;
}) {
  return (
    <section className="ui-card-enter mb-6 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-950 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getRoadEventCategoryClass(
            event.category,
          )}`}
        >
          {event.category}
        </span>

        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
          {event.rarity}
        </span>

        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
          Road Event
        </span>
      </div>

      <h2 className="mt-4 text-3xl font-bold text-white">
        {event.title}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
        {event.description}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {event.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onChoose(choice)}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-amber-400"
          >
            <p className="text-lg font-semibold text-white">
              {choice.label}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              {choice.description}
            </p>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-300">
              {getChoiceOutcomePreview(choice)}
            </div>

            {choice.outcome.futureHook && (
              <div className="mt-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-xs text-violet-200">
                Future Hook: {choice.outcome.futureHook}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {event.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400"
          >
            #{tag}
          </span>
        ))}
      </div>
    </section>
  );
}

export function TravelPage({
  character,
  zone,
  onCancelTravel,
  onArriveAtZone,
  onTravelEventResult,
  roadEventFrequency = 'normal',
}: TravelPageProps) {
  const [travelCharacter, setTravelCharacter] = useState(character);
  const [travelProgress, setTravelProgress] = useState(0);
  const [activeRoadEvent, setActiveRoadEvent] =
    useState<RoadEventDefinition | null>(null);
  const [checkedCheckpoints, setCheckedCheckpoints] = useState<number[]>([]);
  const [resolvedRoadEventIds, setResolvedRoadEventIds] = useState<string[]>([]);
  const [travelLog, setTravelLog] = useState<string[]>([
    `Started traveling toward ${zone.name}.`,
  ]);

  const hasCompletedRef = useRef(false);

  const roadEventChance = useMemo(() => {
    return getRoadEventChancePercent(zone, roadEventFrequency);
  }, [zone, roadEventFrequency]);

  const currentTravelLine = useMemo(() => {
    if (activeRoadEvent) {
      return activeRoadEvent.triggerText;
    }

    return getCurrentTravelLine(travelProgress, zone);
  }, [activeRoadEvent, travelProgress, zone]);

  useEffect(() => {
    if (hasCompletedRef.current || activeRoadEvent) {
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
  }, [activeRoadEvent]);

  useEffect(() => {
    if (
        hasCompletedRef.current ||
        activeRoadEvent ||
        travelProgress >= 100
    ) {
        return;
    }

    const checkpoint = ROAD_EVENT_CHECKPOINTS.find((item) => {
        return travelProgress >= item && !checkedCheckpoints.includes(item);
    });

    if (!checkpoint) {
        return;
    }

    const timeoutId = window.setTimeout(() => {
        setCheckedCheckpoints((currentCheckpoints) => {
        if (currentCheckpoints.includes(checkpoint)) {
            return currentCheckpoints;
        }

        return [...currentCheckpoints, checkpoint];
        });

        const roadEvent = rollRoadEventForZone(zone, roadEventFrequency);

        if (!roadEvent) {
        setTravelLog((currentLog) => [
            ...currentLog,
            `Checkpoint ${checkpoint}%: The road stays quiet.`,
        ]);
        return;
        }

        setActiveRoadEvent(roadEvent);
        setTravelLog((currentLog) => [
        ...currentLog,
        `Checkpoint ${checkpoint}%: ${roadEvent.triggerText}`,
        ]);
    }, 0);

    return () => {
        window.clearTimeout(timeoutId);
    };
    }, [
    activeRoadEvent,
    checkedCheckpoints,
    roadEventFrequency,
    travelProgress,
    zone,
    ]);

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
    if (hasCompletedRef.current || activeRoadEvent) {
      return;
    }

    hasCompletedRef.current = true;
    onArriveAtZone();
  }

  function handleRoadEventChoice(choice: RoadEventChoiceDefinition) {
    if (!activeRoadEvent) {
      return;
    }

    const updatedCharacter = applyRoadEventChoice(
      travelCharacter,
      choice.outcome,
    );

    setTravelCharacter(updatedCharacter);
    onTravelEventResult(updatedCharacter);

    setResolvedRoadEventIds((currentIds) => {
      if (currentIds.includes(activeRoadEvent.id)) {
        return currentIds;
      }

      return [...currentIds, activeRoadEvent.id];
    });

    setTravelLog((currentLog) => [
      ...currentLog,
      choice.outcome.message,
    ]);

    setActiveRoadEvent(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Magisterium"
          title="Traveling"
          description={`You are currently moving toward ${zone.name}. Road events can now interrupt travel before you reach the zone.`}
          actions={
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={handleSkipTravel}
                  disabled={Boolean(activeRoadEvent)}
                  className="rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-slate-700"
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

                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-300">
                  Event Chance: {roadEventChance}%
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
                  value={
                    <MoneyDisplay
                      totalBronze={travelCharacter.moneyBronze}
                      compact
                    />
                  }
                />
                <OverviewStatCard
                  label="Road Events Resolved"
                  value={resolvedRoadEventIds.length}
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
                  current={travelCharacter.currentState.hp}
                  max={travelCharacter.derivedStats.maxHp}
                  variant="hp"
                />

                <ResourceBar
                  label="MP"
                  current={travelCharacter.currentState.mp}
                  max={travelCharacter.derivedStats.maxMp}
                  variant="mp"
                />

                <ResourceBar
                  label="Energy"
                  current={travelCharacter.currentState.energy}
                  max={travelCharacter.derivedStats.maxEnergy}
                  variant="energy"
                />
              </div>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Travel Progress</p>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-2xl font-bold text-white">
                    {travelProgress}%
                  </p>

                  <span
                    className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                      activeRoadEvent
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                    }`}
                  >
                    {activeRoadEvent ? 'Road Event' : 'In Transit'}
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

        {activeRoadEvent && (
          <RoadEventPanel
            event={activeRoadEvent}
            onChoose={handleRoadEventChoice}
          />
        )}

        <div className="ui-card-enter">
          <SectionIntro
            title="Road Event Foundation"
            subtitle="Travel can now pause, show a road event, let the player choose an action, apply the result, then continue moving."
          />
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-xl font-semibold text-white">
              Current Road Event System
            </h3>

            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                1. Travel has event checkpoints at 32%, 64%, and 88%
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                2. Event chance depends on event frequency and zone danger
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                3. Event choices can change HP, MP, Energy, or Bronze
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                4. Future hooks are prepared for inventory, quest, merchant, ambush, and rare enemy systems
              </div>
            </div>
          </article>

          <article className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-xl font-semibold text-white">
              Travel Log
            </h3>

            <div className="mt-4 max-h-[360px] space-y-3 overflow-auto pr-1 text-sm text-slate-300">
              {travelLog.map((log, index) => (
                <div
                  key={`${log}-${index}`}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                >
                  {log}
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}