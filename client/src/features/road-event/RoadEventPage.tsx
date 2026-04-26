import { useState } from 'react';
import type { ReactNode } from 'react';

import { PageHeader } from '../../components/ui/PageHeader';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import type { Character } from '../character-creation/types';
import type { ZoneDefinition } from '../zone/zoneTypes';

import { applyRoadEventChoice } from './roadEventCalculations';
import type {
  RoadEventChoiceDefinition,
  RoadEventDefinition,
} from './roadEventTypes';

interface RoadEventPageProps {
  character: Character;
  zone: ZoneDefinition;
  roadEvent: RoadEventDefinition;
  onResolveRoadEvent: (updatedCharacter: Character) => void;
  onCancelTravel: () => void;
}

interface ResolvedRoadEventResult {
  choice: RoadEventChoiceDefinition;
  updatedCharacter: Character;
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
          className={`h-full rounded-full transition-all duration-300 ${getResourceBarFillClass(
            variant,
          )}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
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

function getDeltaText(delta: number, label: string): string {
  if (delta > 0) {
    return `+${delta} ${label}`;
  }

  if (delta < 0) {
    return `${delta} ${label}`;
  }

  return `No ${label} change`;
}

function getDeltaClass(delta: number): string {
  if (delta > 0) {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  if (delta < 0) {
    return 'border-red-500/40 bg-red-500/10 text-red-300';
  }

  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function ResourceChangeCard({
  label,
  before,
  after,
  delta,
  deltaLabel,
}: {
  label: string;
  before: ReactNode;
  after: ReactNode;
  delta: number;
  deltaLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
          <p className="text-xs text-slate-500">Before</p>
          <div className="mt-1 text-sm font-semibold text-slate-200">
            {before}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
          <p className="text-xs text-slate-500">After</p>
          <div className="mt-1 text-sm font-semibold text-white">
            {after}
          </div>
        </div>
      </div>

      <div
        className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${getDeltaClass(
          delta,
        )}`}
      >
        {getDeltaText(delta, deltaLabel)}
      </div>
    </div>
  );
}

export function RoadEventPage({
  character,
  zone,
  roadEvent,
  onResolveRoadEvent,
  onCancelTravel,
}: RoadEventPageProps) {
  const [resolvedResult, setResolvedResult] =
    useState<ResolvedRoadEventResult | null>(null);

  const displayedCharacter =
    resolvedResult?.updatedCharacter ?? character;

  function handleChoose(choice: RoadEventChoiceDefinition) {
    if (resolvedResult) {
      return;
    }

    const updatedCharacter = applyRoadEventChoice(
      character,
      choice.outcome,
    );

    setResolvedResult({
      choice,
      updatedCharacter,
    });
  }

  function handleContinueTravel() {
    if (!resolvedResult) {
      return;
    }

    onResolveRoadEvent(resolvedResult.updatedCharacter);
  }

  const hpDelta =
    displayedCharacter.currentState.hp - character.currentState.hp;
  const mpDelta =
    displayedCharacter.currentState.mp - character.currentState.mp;
  const energyDelta =
    displayedCharacter.currentState.energy - character.currentState.energy;
  const bronzeDelta =
    displayedCharacter.moneyBronze - character.moneyBronze;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Magisterium"
          title={resolvedResult ? 'Road Event Result' : 'Road Event'}
          description={
            resolvedResult
              ? `The event has been resolved. Review the result before continuing toward ${zone.name}.`
              : `An event has interrupted your journey toward ${zone.name}. Choose how to respond before continuing travel.`
          }
          actions={
            resolvedResult ? (
              <button
                type="button"
                onClick={handleContinueTravel}
                className="rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400"
              >
                Continue Travel
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancelTravel}
                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500"
              >
                Cancel Travel
              </button>
            )
          }
        />

        <section className="ui-card-enter mb-6 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-950 p-6">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getRoadEventCategoryClass(
                    roadEvent.category,
                  )}`}
                >
                  {roadEvent.category}
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                  {roadEvent.rarity}
                </span>

                <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                  Destination: {zone.name}
                </span>

                {resolvedResult && (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                    Resolved
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-4xl font-bold text-white">
                {roadEvent.title}
              </h2>

              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                {roadEvent.triggerText}
              </p>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                {roadEvent.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {roadEvent.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Current Condition
              </p>

              <div className="mt-5 space-y-4">
                <ResourceBar
                  label="HP"
                  current={displayedCharacter.currentState.hp}
                  max={displayedCharacter.derivedStats.maxHp}
                  variant="hp"
                />

                <ResourceBar
                  label="MP"
                  current={displayedCharacter.currentState.mp}
                  max={displayedCharacter.derivedStats.maxMp}
                  variant="mp"
                />

                <ResourceBar
                  label="Energy"
                  current={displayedCharacter.currentState.energy}
                  max={displayedCharacter.derivedStats.maxEnergy}
                  variant="energy"
                />
              </div>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Currency</p>

                <div className="mt-2">
                  <MoneyDisplay
                    totalBronze={displayedCharacter.moneyBronze}
                    compact
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {!resolvedResult && (
          <section className="grid items-stretch gap-5 lg:grid-cols-2">
            {roadEvent.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleChoose(choice)}
                className="ui-card-enter flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-amber-400"
              >
                <div>
                  <p className="text-xl font-semibold text-white">
                    {choice.label}
                  </p>

                  <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-400">
                    {choice.description}
                  </p>
                </div>

                <div className="mt-auto space-y-3 pt-5">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-300">
                    {getChoiceOutcomePreview(choice)}
                  </div>

                  <div className="min-h-[52px]">
                    {choice.outcome.futureHook ? (
                      <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-xs font-semibold text-violet-200">
                        Future Hook: {choice.outcome.futureHook}
                      </div>
                    ) : (
                      <div className="invisible rounded-xl border border-transparent px-4 py-3 text-xs font-semibold">
                        Placeholder
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}

        {resolvedResult && (
          <section className="ui-card-enter rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                Event Resolved
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                Choice: {resolvedResult.choice.label}
              </span>
            </div>

            <h2 className="mt-4 text-3xl font-bold text-white">
              Result Feedback
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-100">
              {resolvedResult.choice.outcome.message}
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <ResourceChangeCard
                label="Currency"
                before={
                  <MoneyDisplay
                    totalBronze={character.moneyBronze}
                    compact
                  />
                }
                after={
                  <MoneyDisplay
                    totalBronze={displayedCharacter.moneyBronze}
                    compact
                  />
                }
                delta={bronzeDelta}
                deltaLabel="Bronze"
              />

              <ResourceChangeCard
                label="HP"
                before={`${character.currentState.hp} / ${character.derivedStats.maxHp}`}
                after={`${displayedCharacter.currentState.hp} / ${displayedCharacter.derivedStats.maxHp}`}
                delta={hpDelta}
                deltaLabel="HP"
              />

              <ResourceChangeCard
                label="MP"
                before={`${character.currentState.mp} / ${character.derivedStats.maxMp}`}
                after={`${displayedCharacter.currentState.mp} / ${displayedCharacter.derivedStats.maxMp}`}
                delta={mpDelta}
                deltaLabel="MP"
              />

              <ResourceChangeCard
                label="Energy"
                before={`${character.currentState.energy} / ${character.derivedStats.maxEnergy}`}
                after={`${displayedCharacter.currentState.energy} / ${displayedCharacter.derivedStats.maxEnergy}`}
                delta={energyDelta}
                deltaLabel="Energy"
              />
            </div>

            {resolvedResult.choice.outcome.futureHook && (
              <div className="mt-6 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
                <p className="text-sm font-semibold text-violet-200">
                  Future Hook Prepared
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This result is tagged for future system expansion:{' '}
                  <span className="font-semibold text-violet-200">
                    {resolvedResult.choice.outcome.futureHook}
                  </span>
                  .
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleContinueTravel}
              className="mt-6 w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400"
            >
              Continue Travel
            </button>
          </section>
        )}
      </div>
    </main>
  );
}