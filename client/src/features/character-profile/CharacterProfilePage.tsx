import type { ReactNode } from 'react';

import { OverviewStatCard } from '../../components/ui/OverviewStatCard';
import { SectionCard } from '../../components/ui/SectionCard';
import { PageHeader } from '../../components/ui/PageHeader';
import type { Character, SkillDefinition } from '../character-creation/types';
import { getExpToNextLevel } from '../character-progression/progressionCalculations';

interface CharacterProfilePageProps {
  character: Character;
  onCreateNewCharacter: () => void;
  onStartAdventure?: () => void;
  onVisitTown?: () => void;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getPercent(currentValue: number, maxValue: number): number {
  if (maxValue <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (currentValue / maxValue) * 100));
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

function StatRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
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

export function CharacterProfilePage({
  character,
  onCreateNewCharacter,
  onStartAdventure,
  onVisitTown,
}: CharacterProfilePageProps) {
  const expToNextLevel = getExpToNextLevel(character.level);
  const expPercent = getPercent(character.exp, expToNextLevel);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Magisterium"
          title="Character Profile"
          description="Review your character sheet, monitor your current combat state, and prepare for the next adventure."
          actions={
            <>
              <button
                type="button"
                onClick={onStartAdventure}
                className="rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400"
              >
                Start Adventure
              </button>

              <button
                type="button"
                onClick={onVisitTown}
                className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-5 py-3 font-semibold text-sky-200 transition hover:bg-sky-500/20"
              >
                Visit Town
              </button>

              <button
                type="button"
                onClick={onCreateNewCharacter}
                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500"
              >
                Create New Character
              </button>
            </>
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
                A rising adventurer of the Magisterium world. Continue growing
                stronger through battle, progression, and future systems such as
                equipment, achievements, and mastery.
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
                Progress to Next Level
              </p>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold text-white">
                    {character.exp} / {expToNextLevel}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Current EXP progress
                  </p>
                </div>

                <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-sm font-semibold text-sky-300">
                  {expPercent.toFixed(1)}%
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${expPercent}%` }}
                />
              </div>

              <div className="mt-6 space-y-4">
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

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <SectionCard
              title="Current State"
              subtitle="Your current combat resources and defensive state."
            >
              <div className="space-y-4">
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

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Shield</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {character.currentState.shield}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Starter Gift"
              subtitle="Your current beginning bonus and long-term flavor."
            >
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-amber-200">
                      {character.starterGift.name}
                    </p>

                    <p className="mt-2 text-sm text-slate-300">
                      {character.starterGift.description}
                    </p>
                  </div>

                  <span className="rounded-full border border-amber-500/40 px-2 py-1 text-xs uppercase tracking-wide text-amber-300">
                    {character.starterGift.effectType}
                  </span>
                </div>

                <p className="mt-4 text-sm text-amber-100">
                  Effect Value: +{character.starterGift.effectValue}
                </p>
              </div>
            </SectionCard>

            <SectionCard
              title="Passive"
              subtitle="Your class identity currently active on this character."
            >
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                <p className="text-lg font-semibold text-violet-200">
                  {character.passive.name}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {character.passive.description}
                </p>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <SectionCard
                title="Base Stats"
                subtitle="Raw stat values that define your build foundation."
              >
                <div className="space-y-2">
                  <StatRow label="STR" value={character.baseStats.STR} />
                  <StatRow label="INT" value={character.baseStats.INT} />
                  <StatRow label="VIT" value={character.baseStats.VIT} />
                  <StatRow label="DEX" value={character.baseStats.DEX} />
                  <StatRow label="LUK" value={character.baseStats.LUK} />
                </div>
              </SectionCard>

              <SectionCard
                title="Derived Stats"
                subtitle="Calculated values based on your current stats."
              >
                <div className="space-y-2">
                  <StatRow label="Max HP" value={character.derivedStats.maxHp} />
                  <StatRow label="Max MP" value={character.derivedStats.maxMp} />
                  <StatRow
                    label="Max Energy"
                    value={character.derivedStats.maxEnergy}
                  />
                  <StatRow
                    label="Defense"
                    value={character.derivedStats.defense}
                  />
                  <StatRow
                    label="Damage Reduction"
                    value={formatPercent(
                      character.derivedStats.damageReduction * 100,
                    )}
                  />
                  <StatRow
                    label="Action Speed"
                    value={character.derivedStats.actionSpeed}
                  />
                  <StatRow
                    label="Crit Rate"
                    value={formatPercent(character.derivedStats.critRate)}
                  />
                  <StatRow
                    label="Drop Rate Bonus"
                    value={formatPercent(character.derivedStats.dropRateBonus)}
                  />
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Starter Skills"
              subtitle="Your current combat options and starting role identity."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {character.skills.map((skill) => (
                  <article
                    key={skill.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-100">
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

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {skill.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-300">
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                        Cost: {skill.resourceCost} {skill.resourceType ?? ''}
                      </span>

                      <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                        Scale: {skill.scalingStat ?? 'none'}
                      </span>

                      <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                        Action: {skill.actionType}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <span className="rounded-lg bg-slate-900 px-2 py-1">
                        Base: {skill.baseValue}
                      </span>

                      <span className="rounded-lg bg-slate-900 px-2 py-1">
                        Multiplier: {skill.multiplier}
                      </span>

                      <span className="rounded-lg bg-slate-900 px-2 py-1">
                        Category: {skill.actionCategory}
                      </span>

                      <span className="rounded-lg bg-slate-900 px-2 py-1">
                        Damage: {skill.damageType ?? 'none'}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {skill.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-900 px-2 py-1 text-xs text-slate-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </SectionCard>
          </div>
        </section>
      </div>
    </main>
  );
}