import { MapNode } from "./MapNode";

interface WorldMapProps {
  onReturnTown: () => void;
  onOpenBattle: () => void;
}

export function WorldMap({ onReturnTown, onOpenBattle }: WorldMapProps) {
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
        className="gameshell-node--shadowfen"
        icon="🌲"
        name="Shadowfen"
        subtitle="Lv. 1 - 10 Arena"
        onClick={onOpenBattle}
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