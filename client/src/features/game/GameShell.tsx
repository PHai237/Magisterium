import { useState } from "react";
import type { PropsWithChildren } from "react";

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

interface LocationLayoutProps {
  returnLabel: string;
  onBack: () => void;
}

function LocationLayout({
  returnLabel,
  onBack,
  children
}: PropsWithChildren<LocationLayoutProps>) {
  return (
    <div className="gameshell-location-layout">
      <div className="gameshell-location-side">
        <Button
          type="button"
          variant="ghost"
          className="gameshell-location-back"
          onClick={onBack}
        >
          {returnLabel}
        </Button>
      </div>

      <div className="gameshell-location-main">{children}</div>

      <div className="gameshell-location-side" aria-hidden="true" />
    </div>
  );
}

function PlaceholderPanel({
  title,
  subtitle,
  description,
  onBack
}: PlaceholderPanelProps) {
  return (
    <section className="gameshell-location-stage">
      <LocationLayout returnLabel="← Return to Town" onBack={onBack}>
        <article className="gameshell-placeholder-card">
          <p>{subtitle}</p>
          <h2>{title}</h2>
          <span>{description}</span>
        </article>
      </LocationLayout>
    </section>
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

  function renderBodyContent() {
    if (activePanel === "battle") {
      return (
        <section className="gameshell-location-stage gameshell-location-stage--battle">
          <LocationLayout
            returnLabel="← Return to World Map"
            onBack={() => setActivePanel("map")}
          >
            <BattlePanel
              userId={userId}
              currentCharacter={currentCharacter}
              onCharacterUpdated={onCharacterUpdated}
            />
          </LocationLayout>
        </section>
      );
    }

    if (activePanel === "inn") {
      return (
        <section className="gameshell-location-stage">
          <LocationLayout returnLabel="← Return to Town" onBack={returnToTownMap}>
            <InnPanel
              userId={userId}
              currentCharacter={currentCharacter}
              onCharacterUpdated={onCharacterUpdated}
            />
          </LocationLayout>
        </section>
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

      <div className="gameshell-body-layer">
        {renderBodyContent()}

        {isInventoryOpen ? (
          <InventoryOverlay
            userId={userId}
            currentCharacter={currentCharacter}
            onCharacterUpdated={onCharacterUpdated}
            onClose={() => setIsInventoryOpen(false)}
          />
        ) : null}
      </div>

      <GameActionBar
        isInventoryOpen={isInventoryOpen}
        onToggleInventory={() => setIsInventoryOpen((current) => !current)}
      />
    </div>
  );
}