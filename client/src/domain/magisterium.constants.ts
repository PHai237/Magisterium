import type { EncounterId, OriginId } from "./magisterium.types";

export const STAT_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "LUK"] as const;

export const ORIGIN_OPTIONS: Array<{
  id: OriginId;
  label: string;
  icon: string;
  description: string;
  focus: string;
}> = [
  {
    id: "scholar",
    label: "Scholar",
    icon: "🔮",
    description: "A seeker of ancient runes. Possesses high mental acuity but frail flesh.",
    focus: "Magic Focus"
  },
  {
    id: "mercenary",
    label: "Mercenary",
    icon: "⚔️",
    description: "A hardened blade for hire. Specialized in physical survival and defense.",
    focus: "Melee Focus"
  },
  {
    id: "wanderer",
    label: "Wanderer",
    icon: "🍂",
    description: "A traveler with no fixed path. Balanced capabilities and flexible growth.",
    focus: "Balanced"
  },
  {
    id: "street_urchin",
    label: "Street Urchin",
    icon: "🦅",
    description: "Raised by the alleyways. Extremely agile with high critical strike chances.",
    focus: "Agility Focus"
  },
  {
    id: "acolyte",
    label: "Acolyte",
    icon: "✦",
    description: "A novice trained in spiritual restraint, recovery, and support-oriented growth.",
    focus: "Support Focus"
  }
];

export const ENCOUNTER_OPTIONS: Array<{
  id: EncounterId;
  label: string;
  description: string;
}> = [
  {
    id: "town_outskirts_slime",
    label: "Town Outskirts Slime",
    description: "A real beginner encounter against a slime. Drops Slime Gel."
  },
  {
    id: "town_outskirts_boar",
    label: "Town Outskirts Boar",
    description: "A beginner beast encounter against a wild boar. Drops Boar Meat."
  },
  {
    id: "town_outskirts_wolf",
    label: "Town Outskirts Wolf",
    description: "A faster early encounter against a wild wolf. Drops Wolf's Skin."
  },
  {
    id: "town_outskirts_mixed",
    label: "Town Outskirts Mixed Pack",
    description: "A small real encounter near town with multiple beginner monsters."
  },
  {
    id: "goblin_scout",
    label: "Goblin Scout",
    description: "A sharper forest-edge encounter against a goblin scout."
  },
  {
    id: "forest_edge_mixed",
    label: "Forest Edge Mixed",
    description: "Small mixed encounter for testing forest-edge multi-monster turns."
  }
];