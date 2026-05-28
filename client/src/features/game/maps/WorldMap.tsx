import { MapNode } from "./MapNode";

interface WorldMapProps {
  onReturnTown: () => void;
  onOpenTownOutskirts: () => void;
  onOpenForestEdge: () => void;
}

export function WorldMap({
  onReturnTown,
  onOpenTownOutskirts,
  onOpenForestEdge
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
        subtitle="Lv. 1 - 2 Search"
        onClick={onOpenTownOutskirts}
      />

      <MapNode
        className="gameshell-node--shadowfen"
        icon="🌲"
        name="Forest Edge"
        subtitle="Lv. 2 - 4 Search"
        onClick={onOpenForestEdge}
      />

      <MapNode
        className="gameshell-node--locked"
        icon="🌋"
        name="Dragon's Teeth"
        subtitle="Lv. 30+ Locked"
        disabled
        onClick={() => undefined}
      />
    </>
  );
}
