import { useState } from "react";

import { Button } from "../../components/ui/Button";
import type { CharacterSnapshot } from "../../domain/magisterium.types";
import { compactLabel, formatNumber } from "../../lib/format";
import { BattlePanel } from "../battles/BattlePanel";
import { MagisteriumBrand } from "../../components/brand/MagisteriumBrand";

interface GameShellProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  onBackToCharacters: () => void;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
  onLogout: () => void;
}

type MapView = "town" | "world";
type ActivePanel = "map" | "battle" | "inn" | "forge" | "archive";

function getInitialLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatBronze(value: number): string {
  if (value >= 1_000_000) {
    return `${formatNumber(value / 1_000_000, 1)}M BRONZE`;
  }

  if (value >= 1_000) {
    return `${formatNumber(value / 1_000, 1)}K BRONZE`;
  }

  return `${formatNumber(value)} BRONZE`;
}

interface TownNodeProps {
  className?: string;
  icon: string;
  name: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}

function TownNode({
  className = "",
  icon,
  name,
  subtitle,
  onClick,
  disabled = false
}: TownNodeProps) {
  return (
    <button
      type="button"
      className={`gameshell-node ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="gameshell-node__icon">{icon}</span>
      <strong>{name}</strong>
      <small>{subtitle}</small>
    </button>
  );
}

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
    <div className="gameshell-panel">
      <header className="gameshell-panel__header">
        <Button type="button" variant="ghost" onClick={onBack}>
          ← Return to Town
        </Button>

        <div>
          <span>{subtitle}</span>
          <strong>{title}</strong>
        </div>
      </header>

      <main className="gameshell-panel__body">
        <section className="gameshell-placeholder-card">
          <p>{subtitle}</p>
          <h2>{title}</h2>
          <span>{description}</span>
        </section>
      </main>

      <GameShellStyles />
    </div>
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
      <div className="gameshell-panel">
        <header className="gameshell-panel__header">
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

        <main className="gameshell-panel__content">
          <BattlePanel
            userId={userId}
            currentCharacter={currentCharacter}
            onCharacterUpdated={onCharacterUpdated}
          />
        </main>

        <GameShellStyles />
      </div>
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
        <MagisteriumBrand subtitle="Spatial Game Core" compact />

        <div
          className={`gameshell-location ${
            mapView === "world" ? "gameshell-location--world" : ""
          }`}
        >
          {mapView === "town"
            ? "Weaver's Stronghold (Town)"
            : "The Wildlands (World Map)"}
        </div>

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
          <>
            <div className="gameshell-district gameshell-district--residential">
              Residential Quarter
            </div>

            <div className="gameshell-district gameshell-district--plaza">
              Grand Plaza
            </div>

            <div className="gameshell-river" />

            <TownNode
              className="gameshell-node--inn"
              icon="🍞"
              name="The Cozy Hearth"
              subtitle="Inn / Tavern"
              onClick={() => setActivePanel("inn")}
            />

            <TownNode
              className="gameshell-node--forge"
              icon="⚒️"
              name="Iron & Ember"
              subtitle="Forge & Armory"
              onClick={() => setActivePanel("forge")}
            />

            <TownNode
              className="gameshell-node--archive"
              icon="🔮"
              name="The Grand Archive"
              subtitle="Library / Runes"
              onClick={() => setActivePanel("archive")}
            />

            <TownNode
              className="gameshell-node--gate"
              icon="🌀"
              name="Vanguard Gate"
              subtitle="Exit to World Map →"
              onClick={() => setMapView("world")}
            />
          </>
        ) : (
          <>
            <TownNode
              className="gameshell-node--return"
              icon="🏰"
              name="Stronghold Gate"
              subtitle="← Return to Town"
              onClick={() => setMapView("town")}
            />

            <TownNode
              className="gameshell-node--shadowfen"
              icon="🌲"
              name="Shadowfen"
              subtitle="Lv. 1 - 10 Arena"
              onClick={() => setActivePanel("battle")}
            />

            <TownNode
              className="gameshell-node--locked"
              icon="🌋"
              name="Dragon's Teeth"
              subtitle="Lv. 30+ Locked"
              disabled
              onClick={() => undefined}
            />
          </>
        )}
      </main>

      <footer className="gameshell-footer">
        <div className="gameshell-profile">
          <div className="gameshell-avatar">
            {getInitialLetter(currentCharacter.name)}
          </div>

          <div>
            <strong>{currentCharacter.name}</strong>
            <span>
              Lv. {currentCharacter.progression.level} ·{" "}
              {compactLabel(currentCharacter.originId)}
            </span>
          </div>
        </div>

        <div className="gameshell-stats">
          <div>
            <span>HP</span>
            <strong>
              {formatNumber(currentCharacter.currentState.hp)} /{" "}
              {formatNumber(currentCharacter.derivedStats.maxHp)}
            </strong>
          </div>

          <div>
            <span>MP</span>
            <strong>
              {formatNumber(currentCharacter.currentState.mp)} /{" "}
              {formatNumber(currentCharacter.derivedStats.maxMp)}
            </strong>
          </div>

          <div>
            <span>STA</span>
            <strong>
              {formatNumber(currentCharacter.currentState.stamina)} /{" "}
              {formatNumber(currentCharacter.derivedStats.maxStamina)}
            </strong>
          </div>

          <div>
            <span>🪙</span>
            <strong>{formatBronze(currentCharacter.moneyBronze)}</strong>
          </div>
        </div>
      </footer>

      <GameShellStyles />
    </div>
  );
}

function GameShellStyles() {
  return (
    <style>{`
      .gameshell-root,
      .gameshell-panel {
        width: 100%;
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #0b0f0d;
        color: #d7e1d2;
      }

      .gameshell-header,
      .gameshell-panel__header {
        height: 65px;
        flex: 0 0 65px;
        border-bottom: 1px solid #22293a;
        background: linear-gradient(180deg, #0d1017, #07090e);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0 2rem;
        z-index: 5;
      }

      .gameshell-brand h1 {
        margin: 0;
        color: #f8fafc;
        font-size: 1.15rem;
        font-weight: 950;
        letter-spacing: 0.25em;
      }

      .gameshell-brand span {
        color: #475569;
        font-size: 0.62rem;
        font-weight: 800;
        letter-spacing: 0.12em;
      }

      .gameshell-location {
        border: 1px solid rgba(168, 85, 247, 0.24);
        border-radius: 0.65rem;
        background: rgba(168, 85, 247, 0.08);
        color: #c084fc;
        padding: 0.42rem 1rem;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .gameshell-location--world {
        border-color: rgba(251, 113, 133, 0.26);
        background: rgba(251, 113, 133, 0.08);
        color: #fb7185;
      }

      .gameshell-actions {
        display: flex;
        gap: 0.6rem;
      }

      .gameshell-map {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
        background:
          radial-gradient(circle at 50% 44%, rgba(244, 214, 142, 0.13), transparent 16rem),
          radial-gradient(circle at 18% 24%, rgba(80, 160, 96, 0.11), transparent 22rem),
          radial-gradient(circle at 80% 72%, rgba(56, 189, 248, 0.09), transparent 20rem),
          linear-gradient(135deg, #182116 0%, #24201a 52%, #141916 100%);
      }

      .gameshell-map__grid {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(241, 245, 249, 0.075) 1px, transparent 1px),
          linear-gradient(90deg, rgba(241, 245, 249, 0.075) 1px, transparent 1px),
          radial-gradient(circle at 50% 46%, rgba(241, 245, 249, 0.16) 0 3px, transparent 4px),
          radial-gradient(circle at 50% 46%, rgba(241, 245, 249, 0.11) 0 72px, transparent 74px);
        background-size:
          40px 40px,
          40px 40px,
          100% 100%,
          100% 100%;
        opacity: 0.95;
      }

      .gameshell-river {
        position: absolute;
        left: -6%;
        top: 8%;
        width: 82%;
        height: 36%;
        border-bottom: 42px solid rgba(56, 189, 248, 0.34);
        border-radius: 0 0 50% 55%;
        transform: rotate(-17deg);
        filter:
          drop-shadow(0 0 18px rgba(56, 189, 248, 0.22))
          blur(0.15px);
        pointer-events: none;
      }

      .gameshell-river::after {
        content: "";
        position: absolute;
        left: 2%;
        right: 4%;
        bottom: -34px;
        height: 8px;
        border-radius: 999px;
        background: rgba(186, 230, 253, 0.34);
        filter: blur(3px);
      }

      .gameshell-district {
        position: absolute;
        border: 1px dashed rgba(226, 232, 240, 0.22);
        border-radius: 1rem;
        color: rgba(226, 232, 240, 0.34);
        background: rgba(255, 255, 255, 0.026);
        display: grid;
        place-items: center;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        pointer-events: none;
      }

      .gameshell-district--residential {
        top: 14%;
        left: 5%;
        width: 16rem;
        height: 10rem;
      }

      .gameshell-district--plaza {
        top: 40%;
        left: 39%;
        width: 12rem;
        height: 7rem;
        border-radius: 999px;
      }

      .gameshell-node {
        position: absolute;
        width: 7.8rem;
        min-height: 6.5rem;
        border: 1.5px solid rgba(51, 65, 85, 0.92);
        border-radius: 0.95rem;
        background: rgba(11, 15, 23, 0.9);
        color: #d7e1d2;
        padding: 0.78rem 0.55rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.18rem;
        cursor: pointer;
        box-shadow: 0 18px 42px rgba(0, 0, 0, 0.48);
        backdrop-filter: blur(7px);
        transition:
          transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
          border-color 220ms ease,
          box-shadow 220ms ease,
          opacity 220ms ease;
      }

      .gameshell-node:not(:disabled):hover {
        transform: translateY(-5px) scale(1.045);
        border-color: rgba(248, 250, 252, 0.86);
        box-shadow:
          0 0 0 7px rgba(250, 204, 21, 0.08),
          0 0 34px rgba(250, 204, 21, 0.22),
          0 0 46px rgba(168, 85, 247, 0.25),
          0 20px 42px rgba(0, 0, 0, 0.55);
        filter: drop-shadow(0 0 20px rgba(250, 204, 21, 0.2));
      }

      .gameshell-node:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }

      .gameshell-node__icon {
        font-size: 1.55rem;
        line-height: 1;
        margin-bottom: 0.25rem;
      }

      .gameshell-node strong {
        color: #f8fafc;
        font-size: 0.72rem;
        font-weight: 950;
        white-space: nowrap;
      }

      .gameshell-node small {
        color: #9ca89a;
        font-size: 0.56rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .gameshell-node--inn {
        top: 12%;
        left: 44%;
        border-color: rgba(245, 158, 11, 0.25);
      }

      .gameshell-node--forge {
        bottom: 23%;
        left: 14%;
        border-color: rgba(239, 68, 68, 0.25);
      }

      .gameshell-node--archive {
        top: 24%;
        right: 10%;
        border-color: rgba(168, 85, 247, 0.3);
      }

      .gameshell-node--gate {
        width: 9rem;
        bottom: 11%;
        right: 11%;
        border-color: rgba(56, 189, 248, 0.32);
        background: linear-gradient(
          180deg,
          rgba(19, 23, 34, 0.94),
          rgba(56, 189, 248, 0.035)
        );
      }

      .gameshell-node--gate strong {
        color: #38bdf8;
      }

      .gameshell-node--return {
        top: 20%;
        left: 10%;
        border-color: rgba(56, 189, 248, 0.3);
      }

      .gameshell-node--shadowfen {
        top: 45%;
        left: 43%;
        width: 6.8rem;
        min-height: 6.8rem;
        border-radius: 999px;
        border-color: rgba(251, 113, 133, 0.32);
      }

      .gameshell-node--locked {
        top: 20%;
        right: 20%;
        width: 6.8rem;
        min-height: 6.8rem;
        border-radius: 999px;
        border-color: rgba(251, 113, 133, 0.18);
      }

      .gameshell-footer {
        height: 58px;
        flex: 0 0 58px;
        border-top: 1px solid #22293a;
        background: #0b0d13;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0 2rem;
      }

      .gameshell-profile {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        min-width: 0;
      }

      .gameshell-avatar {
        width: 1.75rem;
        height: 1.75rem;
        border-radius: 999px;
        background: #a855f7;
        color: white;
        display: grid;
        place-items: center;
        font-size: 0.72rem;
        font-weight: 950;
      }

      .gameshell-profile strong {
        display: block;
        color: #f8fafc;
        font-size: 0.82rem;
      }

      .gameshell-profile span {
        display: block;
        color: #64748b;
        font-size: 0.68rem;
        font-weight: 800;
      }

      .gameshell-stats {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        flex-wrap: wrap;
      }

      .gameshell-stats > div {
        border: 1px solid #22293a;
        border-radius: 0.5rem;
        background: #06070a;
        display: flex;
        align-items: center;
        gap: 0.38rem;
        padding: 0.32rem 0.68rem;
        font-size: 0.74rem;
      }

      .gameshell-stats span {
        color: #64748b;
        font-weight: 900;
      }

      .gameshell-stats strong {
        color: #f8fafc;
        font-weight: 900;
      }

      .gameshell-panel__header > div {
        display: grid;
        justify-items: end;
      }

      .gameshell-panel__header span {
        color: #a855f7;
        font-size: 0.7rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .gameshell-panel__header strong {
        color: #f8fafc;
        font-size: 0.92rem;
      }

      .gameshell-panel__content {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
      }

      .gameshell-panel__body {
        flex: 1 1 auto;
        min-height: 0;
        display: grid;
        place-items: center;
        padding: 2rem;
        background:
          radial-gradient(circle at center, rgba(168, 85, 247, 0.08), transparent 28rem),
          #07090e;
      }

      .gameshell-placeholder-card {
        max-width: 34rem;
        border: 1px solid #22293a;
        border-radius: 1rem;
        background: rgba(19, 23, 34, 0.72);
        box-shadow: 0 18px 42px rgba(0, 0, 0, 0.45);
        padding: 1.4rem;
      }

      .gameshell-placeholder-card p {
        margin: 0 0 0.5rem;
        color: #a855f7;
        font-size: 0.7rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .gameshell-placeholder-card h2 {
        margin: 0 0 0.6rem;
        color: #f8fafc;
      }

      .gameshell-placeholder-card span {
        color: #94a3b8;
        line-height: 1.55;
      }

      @media (max-width: 980px) {
        .gameshell-header,
        .gameshell-footer {
          padding: 0 1rem;
        }

        .gameshell-location {
          display: none;
        }

        .gameshell-stats {
          display: none;
        }

        .gameshell-node {
          width: 8.6rem;
          min-height: 7.3rem;
        }
      }
    `}</style>
  );
}
