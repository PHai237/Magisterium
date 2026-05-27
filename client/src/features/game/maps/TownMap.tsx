import { MapNode } from "./MapNode";

interface TownMapProps {
  onOpenInn: () => void;
  onOpenForge: () => void;
  onOpenArchive: () => void;
  onOpenWorld: () => void;
}

export function TownMap({
  onOpenInn,
  onOpenForge,
  onOpenArchive,
  onOpenWorld
}: TownMapProps) {
  return (
    <>
      <div className="gameshell-district gameshell-district--residential">
        Residential Quarter
      </div>

      <div className="gameshell-district gameshell-district--plaza">
        Grand Plaza
      </div>

      <div className="gameshell-river" />

      <MapNode
        className="gameshell-node--inn"
        icon="🕯️"
        name="The Inn"
        subtitle="Rest & Recovery"
        onClick={onOpenInn}
        />

      <MapNode
        className="gameshell-node--forge"
        icon="⚒️"
        name="Iron & Ember"
        subtitle="Forge & Armory"
        onClick={onOpenForge}
      />

      <MapNode
        className="gameshell-node--archive"
        icon="🔮"
        name="The Grand Archive"
        subtitle="Library / Runes"
        onClick={onOpenArchive}
      />

      <MapNode
        className="gameshell-node--gate"
        icon="🌀"
        name="Vanguard Gate"
        subtitle="Exit to World Map →"
        onClick={onOpenWorld}
      />
    </>
  );
}