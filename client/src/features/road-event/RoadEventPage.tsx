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

export function RoadEventPage({
  character,
  zone,
  roadEvent,
  onResolveRoadEvent,
  onCancelTravel,
}: RoadEventPageProps) {
  function handleChoose(choice: RoadEventChoiceDefinition) {
    const updatedCharacter = applyRoadEventChoice(
      character,
      choice.outcome,
    );

    onResolveRoadEvent(updatedCharacter);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Magisterium"
          title="Road Event"
          description={`An event has interrupted your journey toward ${zone.name}. Choose how to respond before continuing travel.`}
          actions={
            <button
              type="button"
              onClick={onCancelTravel}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Cancel Travel
            </button>
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
                <p className="text-sm text-slate-400">Currency</p>

                <div className="mt-2">
                  <MoneyDisplay totalBronze={character.moneyBronze} compact />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {roadEvent.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => handleChoose(choice)}
              className="ui-card-enter rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-amber-400"
            >
              <p className="text-xl font-semibold text-white">
                {choice.label}
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {choice.description}
              </p>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-300">
                {getChoiceOutcomePreview(choice)}
              </div>

              {choice.outcome.futureHook && (
                <div className="mt-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-xs font-semibold text-violet-200">
                  Future Hook: {choice.outcome.futureHook}
                </div>
              )}
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}