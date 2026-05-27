import { useState } from "react";

import { MagisteriumBrand } from "../../components/brand/MagisteriumBrand";
import { Button } from "../../components/ui/Button";
import type { CharacterSnapshot } from "../../domain/magisterium.types";
import { BattlePanel } from "../battles/BattlePanel";
import { InnPanel } from "../inn/InnPanel";
import { InventoryOverlay } from "../inventory/InventoryOverlay";
import { GameActionBar } from "./GameActionBar";
import { GameHud } from "./GameHud";
import { TownMap } from "./maps/TownMap";
import { WorldMap } from "./maps/WorldMap";
import "./styles/game-shell.css";

interface GameShellProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  onBackToCharacters: () => void;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
  onLogout: () => void;
}

type MapView = "town" | "world";
type ActivePanel = "map" | "battle" | "inn" | "forge" | "archive";

interface PlaceholderPanelProps {
  title: string;
  subtitle: string;
  description: string;
  onBack: () => void;
}

function PlaceholderPanel({
  title,
  subtitle,
  description,
  onBack
}: PlaceholderPanelProps) {
  return (
    <main className="gameshell-content">
      <header className="gameshell-content__header">
        <Button type="button" variant="ghost" onClick={onBack}>
          ← Return to Town
        </Button>

        <div>
          <span>{subtitle}</span>
          <strong>{title}</strong>
        </div>
      </header>

      <section className="gameshell-content__body gameshell-content__body--stage">
        <article className="gameshell-placeholder-card">
          <p>{subtitle}</p>
          <h2>{title}</h2>
          <span>{description}</span>
        </article>
      </section>
    </main>
  );
}

export function GameShell({
  userId,
  currentCharacter,
  onBackToCharacters,
  onCharacterUpdated,
  onLogout
}: GameShellProps) {
  const [mapView, setMapView] = useState<MapView>("town");
  const [activePanel, setActivePanel] = useState<ActivePanel>("map");
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  function openPanel(panel: ActivePanel) {
    setIsInventoryOpen(false);
    setActivePanel(panel);
  }

  function returnToTownMap() {
    setIsInventoryOpen(false);
    setMapView("town");
    setActivePanel("map");
  }

  function renderWorldBody() {
    if (activePanel === "battle") {
      return (
        <main className="gameshell-content">
          <header className="gameshell-content__header">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActivePanel("map")}
            >
              ← Return to World Map
            </Button>

            <div>
              <span>Expedition</span>
              <strong>Shadowfen Woods</strong>
            </div>
          </header>

          <section className="gameshell-content__body">
            <BattlePanel
              userId={userId}
              currentCharacter={currentCharacter}
              onCharacterUpdated={onCharacterUpdated}
            />
          </section>
        </main>
      );
    }

    if (activePanel === "inn") {
      return (
        <main className="gameshell-content">
          <header className="gameshell-content__header">
            <Button type="button" variant="ghost" onClick={returnToTownMap}>
              ← Return to Town
            </Button>

            <div>
              <span>Rest Service</span>
              <strong>The Inn</strong>
            </div>
          </header>

          <section className="gameshell-content__body gameshell-content__body--stage">
            <InnPanel
              userId={userId}
              currentCharacter={currentCharacter}
              onCharacterUpdated={onCharacterUpdated}
            />
          </section>
        </main>
      );
    }

    if (activePanel === "forge") {
      return (
        <PlaceholderPanel
          title="Iron & Ember"
          subtitle="Forge & Armory"
          description="Chỗ này sau sẽ dùng cho upgrade, reforge, repair, crafting và equipment services."
          onBack={returnToTownMap}
        />
      );
    }

    if (activePanel === "archive") {
      return (
        <PlaceholderPanel
          title="The Grand Archive"
          subtitle="Library / Runes"
          description="Chỗ này sau sẽ nối skill, rune, passive và progression knowledge."
          onBack={returnToTownMap}
        />
      );
    }

    return (
      <main className="gameshell-map">
        <div className="gameshell-map__grid" />

        {mapView === "town" ? (
          <TownMap
            onOpenInn={() => openPanel("inn")}
            onOpenForge={() => openPanel("forge")}
            onOpenArchive={() => openPanel("archive")}
            onOpenWorld={() => {
              setIsInventoryOpen(false);
              setMapView("world");
            }}
          />
        ) : (
          <WorldMap
            onReturnTown={() => {
              setIsInventoryOpen(false);
              setMapView("town");
            }}
            onOpenBattle={() => openPanel("battle")}
          />
        )}
      </main>
    );
  }

  return (
    <div className="gameshell-root">
      <header className="gameshell-header">
        <MagisteriumBrand compact />

        <GameHud
          currentCharacter={currentCharacter}
          onBackToCharacters={onBackToCharacters}
          onLogout={onLogout}
        />
      </header>

      {renderWorldBody()}

      {isInventoryOpen ? (
        <InventoryOverlay
          userId={userId}
          currentCharacter={currentCharacter}
          onCharacterUpdated={onCharacterUpdated}
          onClose={() => setIsInventoryOpen(false)}
        />
      ) : null}

      <GameActionBar
        isInventoryOpen={isInventoryOpen}
        onToggleInventory={() => setIsInventoryOpen((current) => !current)}
      />
    </div>
  );
}