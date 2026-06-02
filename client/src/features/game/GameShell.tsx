import { useState } from "react";
import type { PropsWithChildren } from "react";

import { MagisteriumBrand } from "../../components/brand/MagisteriumBrand";
import { Button } from "../../components/ui/Button";
import type {
  CharacterSnapshot,
  EncounterId,
  ExplorationZoneId
} from "../../domain/magisterium.types";
import { BattlePanel } from "../battles/BattlePanel";
import { ExplorationZone } from "../exploration/ExplorationZone";
import { InnPanel } from "../inn/InnPanel";
import { InventoryOverlay } from "../inventory/InventoryOverlay";
import { MarketPanel } from "../market/MarketPanel";
import { SanctuaryPanel } from "../sanctuary/SanctuaryPanel";
import { SmithPanel } from "../smith/SmithPanel";
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
type ActivePanel =
  | "map"
  | "exploration"
  | "battle"
  | "inn"
  | "market"
  | "sanctuary"
  | "smith"
  | "archive";

interface PlaceholderPanelProps {
  title: string;
  subtitle: string;
  description: string;
  onBack: () => void;
  returnLabel?: string;
}

interface LocationStageProps {
  returnLabel: string;
  onBack: () => void;
  className?: string;
}

function LocationStage({
  returnLabel,
  onBack,
  className = "",
  children
}: PropsWithChildren<LocationStageProps>) {
  return (
    <section className={`gameshell-location-stage ${className}`}>
      <Button
        type="button"
        variant="ghost"
        className="gameshell-location-back"
        onClick={onBack}
      >
        {returnLabel}
      </Button>

      <div className="gameshell-location-main">{children}</div>
    </section>
  );
}

function PlaceholderPanel({
  title,
  subtitle,
  description,
  onBack,
  returnLabel = "← Return to Town"
}: PlaceholderPanelProps) {
  return (
    <LocationStage returnLabel={returnLabel} onBack={onBack}>
      <article className="gameshell-placeholder-card">
        <p>{subtitle}</p>
        <h2>{title}</h2>
        <span>{description}</span>
      </article>
    </LocationStage>
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
  const [selectedZoneId, setSelectedZoneId] =
    useState<ExplorationZoneId>("town_outskirts");
  const [selectedEncounterId, setSelectedEncounterId] =
    useState<EncounterId>("town_outskirts_slime");
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  function openPanel(panel: ActivePanel) {
    setIsInventoryOpen(false);
    setActivePanel(panel);
  }

  function openExploration(zoneId: ExplorationZoneId) {
    setIsInventoryOpen(false);
    setSelectedZoneId(zoneId);
    setActivePanel("exploration");
  }

  function openBattle(encounterId: EncounterId) {
    setIsInventoryOpen(false);
    setSelectedEncounterId(encounterId);
    setActivePanel("battle");
  }

  function returnToTownMap() {
    setIsInventoryOpen(false);
    setMapView("town");
    setActivePanel("map");
  }

  function returnToWorldMap() {
    setIsInventoryOpen(false);
    setMapView("world");
    setActivePanel("map");
  }

  function returnToExploration() {
    setIsInventoryOpen(false);
    setActivePanel("exploration");
  }

  function renderBodyContent() {
    if (activePanel === "exploration") {
      return (
        <ExplorationZone
          userId={userId}
          currentCharacter={currentCharacter}
          zoneId={selectedZoneId}
          onCharacterUpdated={onCharacterUpdated}
          onEncounterFound={openBattle}
          onReturnToWorldMap={returnToWorldMap}
        />
      );
    }

    if (activePanel === "inn") {
      return (
        <LocationStage returnLabel="← Return to Town" onBack={returnToTownMap}>
          <InnPanel
            userId={userId}
            currentCharacter={currentCharacter}
            onCharacterUpdated={onCharacterUpdated}
          />
        </LocationStage>
      );
    }

    if (activePanel === "smith") {
      return (
        <LocationStage
          returnLabel="Return"
          onBack={returnToTownMap}
          className="gameshell-location-stage--smith"
        >
          <SmithPanel
            userId={userId}
            currentCharacter={currentCharacter}
            onCharacterUpdated={onCharacterUpdated}
          />
        </LocationStage>
      );
    }

    if (activePanel === "market") {
      return (
        <LocationStage
          returnLabel="← Return to Town"
          onBack={returnToTownMap}
          className="gameshell-location-stage--market"
        >
          <MarketPanel
            userId={userId}
            currentCharacter={currentCharacter}
            onCharacterUpdated={onCharacterUpdated}
          />
        </LocationStage>
      );
    }

    if (activePanel === "sanctuary") {
      return (
        <LocationStage
          returnLabel="← Return to Town"
          onBack={returnToTownMap}
          className="gameshell-location-stage--sanctuary"
        >
          <SanctuaryPanel
            userId={userId}
            currentCharacter={currentCharacter}
            onCharacterUpdated={onCharacterUpdated}
          />
        </LocationStage>
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
            onOpenSmith={() => openPanel("smith")}
            onOpenArchive={() => openPanel("archive")}
            onOpenMarket={() => openPanel("market")}
            onOpenSanctuary={() => openPanel("sanctuary")}
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
            onOpenTownOutskirts={() => openExploration("town_outskirts")}
            onOpenForestEdge={() => openExploration("forest_edge")}
          />
        )}
      </main>
    );
  }

  if (activePanel === "battle") {
    return (
      <div className="gameshell-root gameshell-root--combat">
        <BattlePanel
          userId={userId}
          currentCharacter={currentCharacter}
          initialEncounterId={selectedEncounterId}
          onExitBattle={returnToExploration}
          onCharacterUpdated={onCharacterUpdated}
        />
      </div>
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
