import { MapNode } from "./MapNode";

interface WorldMapProps {
  onReturnTown: () => void;
  onOpenTownOutskirts: () => void;
  onOpenForestEdge: () => void;
  onOpenAbandonedMine: () => void;
}

export function WorldMap({
  onReturnTown,
  onOpenTownOutskirts,
  onOpenForestEdge,
  onOpenAbandonedMine
}: WorldMapProps) {
  return (
    <>
      <MapNode
        className="gameshell-node--return"
        icon="🏰"
        name="Stronghold Gate"
        subtitle="← Return to Town"
        onClick={onReturnTown}
      />

      <MapNode
        className="gameshell-node--outskirts"
        icon="🌾"
        name="Town Outskirts"
        subtitle="Search Area"
        onClick={onOpenTownOutskirts}
      />

      <MapNode
        className="gameshell-node--shadowfen"
        icon="🌲"
        name="Forest Edge"
        subtitle="Search Area"
        onClick={onOpenForestEdge}
      />

      <MapNode
        className="gameshell-node--mine"
        icon="⛏️"
        name="Abandoned Mine"
        subtitle="Search Area"
        onClick={onOpenAbandonedMine}
      />

      <MapNode
        className="gameshell-node--locked"
        icon="🌋"
        name="Dragon's Teeth"
        subtitle="Locked"
        disabled
        onClick={() => undefined}
      />
    </>
  );
}
