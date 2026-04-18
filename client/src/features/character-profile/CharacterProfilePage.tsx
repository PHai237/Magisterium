import type { ReactNode } from 'react';

import type { Character } from '../character-creation/types';

interface CharacterProfilePageProps {
  character: Character;
  onCreateNewCharacter: () => void;
  onStartAdventure?: () => void;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
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

export function CharacterProfilePage({
  character,
  onCreateNewCharacter,
  onStartAdventure,
}: CharacterProfilePageProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
              Magisterium
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              Character Profile
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Your character has been created. Review your current stats,
              class identity, passive, skills, and starter gift before entering
              the next phase.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onStartAdventure}
              className="rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400"
            >
              Start Adventure
            </button>

            <button
              type="button"
              onClick={onCreateNewCharacter}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Create New Character
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-6">
            <InfoCard title="Identity">
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5">
                <p className="text-sm uppercase tracking-wide text-violet-300">
                  {character.className}
                </p>

                <h2 className="mt-2 text-3xl font-bold text-white">
                  {character.name}
                </h2>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-slate-950 p-3">
                    <p className="text-xs text-slate-400">Level</p>
                    <p className="mt-1 text-xl font-bold">{character.level}</p>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-3">
                    <p className="text-xs text-slate-400">EXP</p>
                    <p className="mt-1 text-xl font-bold">{character.exp}</p>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-3">
                    <p className="text-xs text-slate-400">Gold</p>
                    <p className="mt-1 text-xl font-bold">{character.gold}</p>
                  </div>
                </div>
              </div>
            </InfoCard>

            <InfoCard title="Current State">
              <div className="space-y-2">
                <StatRow
                  label="HP"
                  value={`${character.currentState.hp} / ${character.derivedStats.maxHp}`}
                />
                <StatRow
                  label="MP"
                  value={`${character.currentState.mp} / ${character.derivedStats.maxMp}`}
                />
                <StatRow
                  label="Energy"
                  value={`${character.currentState.energy} / ${character.derivedStats.maxEnergy}`}
                />
                <StatRow
                  label="Shield"
                  value={character.currentState.shield}
                />
              </div>
            </InfoCard>

            <InfoCard title="Starter Gift">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-lg font-semibold text-slate-100">
                  {character.starterGift.name}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {character.starterGift.description}
                </p>

                <p className="mt-4 text-xs uppercase tracking-wide text-violet-300">
                  {character.starterGift.effectType} / +
                  {character.starterGift.effectValue}
                </p>
              </div>
            </InfoCard>
          </section>

          <section className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <InfoCard title="Base Stats">
                <div className="space-y-2">
                  <StatRow label="STR" value={character.baseStats.STR} />
                  <StatRow label="INT" value={character.baseStats.INT} />
                  <StatRow label="VIT" value={character.baseStats.VIT} />
                  <StatRow label="DEX" value={character.baseStats.DEX} />
                  <StatRow label="LUK" value={character.baseStats.LUK} />
                </div>
              </InfoCard>

              <InfoCard title="Derived Stats">
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
              </InfoCard>
            </div>

            <InfoCard title="Passive">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-lg font-semibold text-violet-300">
                  {character.passive.name}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {character.passive.description}
                </p>
              </div>
            </InfoCard>

            <InfoCard title="Starter Skills">
              <div className="grid gap-4 md:grid-cols-2">
                {character.skills.map((skill) => (
                  <article
                    key={skill.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-100">
                          {skill.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {skill.description}
                        </p>
                      </div>

                      <span className="rounded-full border border-violet-500/40 px-2 py-1 text-xs uppercase text-violet-300">
                        {skill.effectType}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <span className="rounded-lg bg-slate-900 px-2 py-1">
                        Action: {skill.actionType}
                      </span>

                      <span className="rounded-lg bg-slate-900 px-2 py-1">
                        Category: {skill.actionCategory}
                      </span>

                      <span className="rounded-lg bg-slate-900 px-2 py-1">
                        Damage: {skill.damageType ?? 'none'}
                      </span>

                      <span className="rounded-lg bg-slate-900 px-2 py-1">
                        Scale: {skill.scalingStat ?? 'none'}
                      </span>

                      <span className="rounded-lg bg-slate-900 px-2 py-1">
                        Base: {skill.baseValue}
                      </span>

                      <span className="rounded-lg bg-slate-900 px-2 py-1">
                        Multiplier: {skill.multiplier}
                      </span>

                      <span className="rounded-lg bg-slate-900 px-2 py-1">
                        Cost: {skill.resourceCost} {skill.resourceType ?? ''}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
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
            </InfoCard>
          </section>
        </div>
      </div>
    </main>
  );
}