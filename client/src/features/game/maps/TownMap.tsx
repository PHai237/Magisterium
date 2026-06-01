import type { CSSProperties } from "react";

import { MapNode } from "./MapNode";

interface TownMapProps {
  onOpenInn: () => void;
  onOpenForge: () => void;
  onOpenArchive: () => void;
  onOpenMarket: () => void;
  onOpenSanctuary: () => void;
  onOpenWorld: () => void;
}

type TownNodeStyle = CSSProperties & Record<`--node-${string}`, string>;

interface TownMapNodeDefinition {
  id: string;
  className: string;
  icon: string;
  name: string;
  subtitle: string;
  style: TownNodeStyle;
  onClick: () => void;
}

export function TownMap({
  onOpenInn,
  onOpenForge,
  onOpenArchive,
  onOpenMarket,
  onOpenSanctuary,
  onOpenWorld
}: TownMapProps) {
  const nodes: TownMapNodeDefinition[] = [
    {
      id: "inn",
      className: "gameshell-node--inn",
      icon: "🕯️",
      name: "The Inn",
      subtitle: "Rest & Recovery",
      style: {
        "--node-top": "12%",
        "--node-left": "44%"
      },
      onClick: onOpenInn
    },
    {
      id: "forge",
      className: "gameshell-node--forge",
      icon: "⚒️",
      name: "Iron & Ember",
      subtitle: "Forge & Armory",
      style: {
        "--node-bottom": "23%",
        "--node-left": "14%"
      },
      onClick: onOpenForge
    },
    {
      id: "market",
      className: "gameshell-node--market",
      icon: "🧺",
      name: "Market",
      subtitle: "Supplies & Trade",
      style: {
        "--node-left": "35%",
        "--node-bottom": "15%"
      },
      onClick: onOpenMarket
    },
    {
      id: "sanctuary",
      className: "gameshell-node--sanctuary",
      icon: "🏛️",
      name: "The Sanctuary",
      subtitle: "Runes & Rank Up",
      style: {
        "--node-top": "34%",
        "--node-left": "18%"
      },
      onClick: onOpenSanctuary
    },
    {
      id: "archive",
      className: "gameshell-node--archive",
      icon: "🔮",
      name: "The Grand Archive",
      subtitle: "Library / Runes",
      style: {
        "--node-top": "24%",
        "--node-right": "10%"
      },
      onClick: onOpenArchive
    },
    {
      id: "gate",
      className: "gameshell-node--gate",
      icon: "🌀",
      name: "Vanguard Gate",
      subtitle: "Exit to World Map ->",
      style: {
        "--node-width": "8.8rem",
        "--node-bottom": "11%",
        "--node-right": "11%"
      },
      onClick: onOpenWorld
    }
  ];

  return (
    <>
      <div className="gameshell-district gameshell-district--residential">
        Residential Quarter
      </div>

      <div className="gameshell-plaza" aria-hidden="true">
        <div className="gameshell-plaza__tiles">
          {Array.from({ length: 28 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="gameshell-plaza__label">Grand Plaza</div>
      </div>

      <div className="gameshell-river" />

      {nodes.map((node) => (
        <MapNode
          key={node.id}
          className={node.className}
          icon={node.icon}
          name={node.name}
          subtitle={node.subtitle}
          style={node.style}
          onClick={node.onClick}
        />
      ))}
    </>
  );
}
