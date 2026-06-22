import { MapNode } from "./MapNode";

interface TownMapProps {
  onOpenInn: () => void;
  onOpenSmith: () => void;
  onOpenArchive: () => void;
  onOpenMarket: () => void;
  onOpenSanctuary: () => void;
  onOpenWorld: () => void;
}

export function TownMap({
  onOpenInn,
  onOpenSmith,
  onOpenArchive,
  onOpenMarket,
  onOpenSanctuary,
  onOpenWorld
}: TownMapProps) {
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
        name="The Smith"
        subtitle="Smithy & Armory"
        onClick={onOpenSmith}
      />

      <MapNode
        className="gameshell-node--market"
        icon="🧺"
        name="The Market"
        subtitle="Supplies & Trade"
        onClick={onOpenMarket}
      />

      <MapNode
        className="gameshell-node--sanctuary"
        icon="⛪"
        name="The Sanctuary"
        subtitle="Fragments / Runes"
        onClick={onOpenSanctuary}
      />

      <MapNode
        className="gameshell-node--archive"
        icon="🔮"
        name="The Library"
        subtitle="Knowledge & Magic"
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
