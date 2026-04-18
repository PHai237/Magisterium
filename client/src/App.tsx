import { CharacterCreationForm } from './features/character-creation/CharacterCreationForm';
import { CharacterProfilePage } from './features/character-profile/CharacterProfilePage';
import { useCurrentCharacter } from './features/character-profile/useCurrentCharacter';

function App() {
  const {
    character,
    errorMessage,
    hasCharacter,
    loadCharacter,
    clearCharacter,
  } = useCurrentCharacter();

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
          <h1 className="text-2xl font-bold text-red-200">
            Saved Character Error
          </h1>

          <p className="mt-3 text-red-100">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={clearCharacter}
            className="mt-5 rounded-xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-400"
          >
            Clear Broken Save
          </button>
        </div>
      </main>
    );
  }

  if (hasCharacter && character) {
    return (
      <CharacterProfilePage
        character={character}
        onCreateNewCharacter={clearCharacter}
        onStartAdventure={() => {
          alert('Dungeon system will be implemented in Phase 2.');
        }}
      />
    );
  }

  return <CharacterCreationForm onCharacterCreated={loadCharacter} />;
}

export default App;