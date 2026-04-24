import type { ReactNode } from 'react';

import { CHARACTER_CLASSES, STARTER_GIFTS } from './constants';
import { useCharacterCreation } from './useCharacterCreation';

interface CharacterCreationFormProps {
  onCharacterCreated?: () => void;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
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

function getSelectableCardClass(isSelected: boolean): string {
  const baseClass =
    'w-full rounded-2xl border p-4 text-left transition duration-300 hover:border-violet-400 hover:-translate-y-0.5';

  const selectedClass =
    'border-violet-400 bg-violet-500/10 shadow-lg shadow-violet-950/30';

  const normalClass = 'border-slate-800 bg-slate-900';

  return `${baseClass} ${isSelected ? selectedClass : normalClass}`;
}

function getGiftAccentClass(giftId: string): string {
  if (giftId === 'stale_bread') {
    return 'text-amber-300';
  }

  if (giftId === 'guide_book') {
    return 'text-sky-300';
  }

  return 'text-yellow-300';
}

export function CharacterCreationForm({
  onCharacterCreated,
}: CharacterCreationFormProps) {
  const {
    name,
    setName,
    selectedClassId,
    setSelectedClassId,
    selectedGiftId,
    setSelectedGiftId,
    selectedClass,
    previewBaseStats,
    previewDerivedStats,
    canCreate,
    errorMessage,
    successMessage,
    createdCharacter,
    handleCreateCharacter,
    resetForm,
  } = useCharacterCreation();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
            Magisterium
          </p>

          <h1 className="mt-2 text-4xl font-bold">Character Creation</h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Shape your first adventurer, choose a class identity, select a
            starter gift, and prepare for the first step into the world of
            Magisterium.
          </p>
        </header>

        <section className="mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-900/80 to-slate-950 p-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-300">
                  Phase 1 Foundation
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-300">
                  RPG Prototype
                </span>
              </div>

              <h2 className="mt-4 text-4xl font-bold text-white">
                Begin a New Journey
              </h2>

              <p className="mt-2 max-w-2xl text-slate-400">
                Your class, stats, passive, and starter gift will shape the
                first version of your combat identity.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Starter Classes
                  </p>
                  <p className="mt-2 text-xl font-bold text-white">
                    {CHARACTER_CLASSES.length}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Starter Gifts
                  </p>
                  <p className="mt-2 text-xl font-bold text-white">
                    {STARTER_GIFTS.length}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Current Name
                  </p>
                  <p className="mt-2 text-xl font-bold text-violet-300">
                    {name.trim() || 'Unnamed Hero'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Creation Preview
              </p>

              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {name.trim() || 'Unnamed Hero'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">Selected Class</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {selectedClass?.name ?? 'No class selected'}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedClass?.passive.name ?? 'Passive preview unavailable'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">Selected Gift</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {STARTER_GIFTS.find((gift) => gift.id === selectedGiftId)
                      ?.name ?? 'No starter gift selected'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <form
          onSubmit={(event) => {
            event.preventDefault();

            const createdCharacter = handleCreateCharacter();

            if (createdCharacter) {
              onCharacterCreated?.();
            }
          }}
          className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
        >
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-xl font-semibold">1. Character Name</h2>

              <p className="mt-1 text-sm text-slate-400">
                This name will become your visible adventurer identity.
              </p>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={20}
                placeholder="Enter character name..."
                className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-lg text-slate-100 outline-none transition focus:border-violet-400"
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-xl font-semibold">2. Choose Class</h2>

              <p className="mt-1 text-sm text-slate-400">
                Each class has a different stat direction, passive, and combat
                identity.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {CHARACTER_CLASSES.map((characterClass) => (
                  <button
                    key={characterClass.id}
                    type="button"
                    onClick={() => setSelectedClassId(characterClass.id)}
                    className={getSelectableCardClass(
                      selectedClassId === characterClass.id,
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-100">
                        {characterClass.name}
                      </h3>

                      {selectedClassId === characterClass.id && (
                        <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                          Selected
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {characterClass.description}
                    </p>

                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-violet-300">
                          Stat Bonus
                        </p>

                        <div className="mt-2 grid grid-cols-5 gap-2 text-center text-xs">
                          <span className="rounded-lg bg-slate-950 px-2 py-1">
                            STR +{characterClass.statBonus.STR}
                          </span>
                          <span className="rounded-lg bg-slate-950 px-2 py-1">
                            INT +{characterClass.statBonus.INT}
                          </span>
                          <span className="rounded-lg bg-slate-950 px-2 py-1">
                            VIT +{characterClass.statBonus.VIT}
                          </span>
                          <span className="rounded-lg bg-slate-950 px-2 py-1">
                            DEX +{characterClass.statBonus.DEX}
                          </span>
                          <span className="rounded-lg bg-slate-950 px-2 py-1">
                            LUK +{characterClass.statBonus.LUK}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-violet-300">
                          Passive
                        </p>

                        <p className="mt-2 text-sm text-slate-300">
                          {characterClass.passive.name}: {characterClass.passive.description}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-violet-300">
                          Starter Skills
                        </p>

                        <ul className="mt-2 space-y-2 text-sm text-slate-300">
                          {characterClass.starterSkills.map((skill) => (
                            <li key={skill.id}>
                              • <span className="font-semibold">{skill.name}</span> —{' '}
                              {skill.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-xl font-semibold">3. Choose Starter Gift</h2>

              <p className="mt-1 text-sm text-slate-400">
                A small early-game bonus that shapes your first steps.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {STARTER_GIFTS.map((gift) => (
                  <button
                    key={gift.id}
                    type="button"
                    onClick={() => setSelectedGiftId(gift.id)}
                    className={getSelectableCardClass(selectedGiftId === gift.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-lg font-semibold ${getGiftAccentClass(
                          gift.id,
                        )}`}
                      >
                        {gift.name}
                      </h3>

                      {selectedGiftId === gift.id && (
                        <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                          Selected
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {gift.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-slate-300">
                        Effect: {gift.effectType}
                      </span>

                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-slate-300">
                        Value: +{gift.effectValue}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-xl font-semibold">Character Preview</h2>

              <p className="mt-1 text-sm text-slate-400">
                Preview updates as you choose class and gift.
              </p>

              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="mt-1 text-lg font-semibold">
                    {name.trim() || 'Unnamed Hero'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Class</p>
                  <p className="mt-1 text-lg font-semibold">
                    {selectedClass?.name ?? 'No class selected'}
                  </p>

                  {selectedClass && (
                    <p className="mt-2 text-sm text-slate-300">
                      Passive: <span className="font-semibold">{selectedClass.passive.name}</span>
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-300">
                    Base Stats
                  </p>

                  <div className="space-y-2">
                    <StatRow label="STR" value={previewBaseStats?.STR ?? '-'} />
                    <StatRow label="INT" value={previewBaseStats?.INT ?? '-'} />
                    <StatRow label="VIT" value={previewBaseStats?.VIT ?? '-'} />
                    <StatRow label="DEX" value={previewBaseStats?.DEX ?? '-'} />
                    <StatRow label="LUK" value={previewBaseStats?.LUK ?? '-'} />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-300">
                    Derived Stats
                  </p>

                  <div className="space-y-2">
                    <StatRow
                      label="Max HP"
                      value={previewDerivedStats?.maxHp ?? '-'}
                    />
                    <StatRow
                      label="Max MP"
                      value={previewDerivedStats?.maxMp ?? '-'}
                    />
                    <StatRow
                      label="Max Energy"
                      value={previewDerivedStats?.maxEnergy ?? '-'}
                    />
                    <StatRow
                      label="Defense"
                      value={previewDerivedStats?.defense ?? '-'}
                    />
                    <StatRow
                      label="Damage Reduction"
                      value={
                        previewDerivedStats
                          ? formatPercent(
                              previewDerivedStats.damageReduction * 100,
                            )
                          : '-'
                      }
                    />
                    <StatRow
                      label="Action Speed"
                      value={previewDerivedStats?.actionSpeed ?? '-'}
                    />
                    <StatRow
                      label="Crit Rate"
                      value={
                        previewDerivedStats
                          ? formatPercent(previewDerivedStats.critRate)
                          : '-'
                      }
                    />
                    <StatRow
                      label="Drop Rate Bonus"
                      value={
                        previewDerivedStats
                          ? formatPercent(previewDerivedStats.dropRateBonus)
                          : '-'
                      }
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {successMessage}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={!canCreate}
                    className="rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-slate-700"
                  >
                    Create Character
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {createdCharacter && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="text-xl font-semibold">Saved Character</h2>

                <p className="mt-1 text-sm text-slate-400">
                  Snapshot of the current character object saved into localStorage.
                </p>

                <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-300">
                  {JSON.stringify(createdCharacter, null, 2)}
                </pre>
              </div>
            )}
          </aside>
        </form>
      </div>
    </main>
  );
}