import { useState } from "react";

import { Button } from "../../components/ui/Button";
import { MagisteriumBrand } from "../../components/brand/MagisteriumBrand";
import type { CharacterSnapshot } from "../../domain/magisterium.types";
import { BattlePanel } from "../battles/BattlePanel";
import { GameHud } from "./GameHud";
import { GamePanelFrame } from "./GamePanelFrame";
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
    <GamePanelFrame
      title={title}
      subtitle={subtitle}
      returnLabel="← Return to Town"
      onBack={onBack}
    >
      <main className="gameshell-panel__body">
        <section className="gameshell-placeholder-card">
          <p>{subtitle}</p>
          <h2>{title}</h2>
          <span>{description}</span>
        </section>
      </main>
    </GamePanelFrame>
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

  if (activePanel === "battle") {
    return (
      <GamePanelFrame
        title="Shadowfen Woods"
        subtitle="Expedition"
        returnLabel="← Return to World Map"
        onBack={() => setActivePanel("map")}
        contentClassName="gameshell-panel__content"
      >
        <BattlePanel
          userId={userId}
          currentCharacter={currentCharacter}
          onCharacterUpdated={onCharacterUpdated}
        />
      </GamePanelFrame>
    );
  }

  if (activePanel === "inn") {
    return (
      <PlaceholderPanel
        title="The Cozy Hearth"
        subtitle="Inn / Tavern"
        description="Chỗ này sau sẽ nối với rest, inn voucher, hồi HP/MP/Stamina và giảm fatigue."
        onBack={() => setActivePanel("map")}
      />
    );
  }

  if (activePanel === "forge") {
    return (
      <PlaceholderPanel
        title="Iron & Ember"
        subtitle="Forge & Armory"
        description="Chỗ này sau sẽ nối InventoryPanel, equip, unequip, upgrade và reforging."
        onBack={() => setActivePanel("map")}
      />
    );
  }

  if (activePanel === "archive") {
    return (
      <PlaceholderPanel
        title="The Grand Archive"
        subtitle="Library / Runes"
        description="Chỗ này sau sẽ nối skill, rune, passive và progression knowledge."
        onBack={() => setActivePanel("map")}
      />
    );
  }

  return (
    <div className="gameshell-root">
      <header className="gameshell-header">
        <MagisteriumBrand compact />

        <div className="gameshell-actions">
          <Button type="button" variant="ghost" onClick={onBackToCharacters}>
            Characters
          </Button>

          <Button type="button" variant="ghost" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="gameshell-map">
        <div className="gameshell-map__grid" />

        {mapView === "town" ? (
          <TownMap
            onOpenInn={() => setActivePanel("inn")}
            onOpenForge={() => setActivePanel("forge")}
            onOpenArchive={() => setActivePanel("archive")}
            onOpenWorld={() => setMapView("world")}
          />
        ) : (
          <WorldMap
            onReturnTown={() => setMapView("town")}
            onOpenBattle={() => setActivePanel("battle")}
          />
        )}
      </main>

      <GameHud currentCharacter={currentCharacter} />
    </div>
  );
}