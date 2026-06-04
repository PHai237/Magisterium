import type {
  EncounterId,
  ExplorationZoneId,
  OriginId,
} from "./magisterium.types";

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
    description:
      "A seeker of ancient runes. Possesses high mental acuity but frail flesh.",
    focus: "Magic Focus",
  },
  {
    id: "mercenary",
    label: "Mercenary",
    icon: "⚔️",
    description:
      "A hardened blade for hire. Specialized in physical survival and defense.",
    focus: "Melee Focus",
  },
  {
    id: "wanderer",
    label: "Wanderer",
    icon: "🍂",
    description:
      "A traveler with no fixed path. Balanced capabilities and flexible growth.",
    focus: "Balanced",
  },
  {
    id: "street_urchin",
    label: "Street Urchin",
    icon: "🦅",
    description:
      "Raised by the alleyways. Extremely agile with high critical strike chances.",
    focus: "Agility Focus",
  },
  {
    id: "acolyte",
    label: "Acolyte",
    icon: "✦",
    description:
      "A novice trained in spiritual restraint, recovery, and support-oriented growth.",
    focus: "Support Focus",
  },
];

export const ENCOUNTER_OPTIONS: Array<{
  id: EncounterId;
  label: string;
  description: string;
}> = [
  {
    id: "town_outskirts_slime",
    label: "Town Outskirts Slime",
    description: "A real beginner encounter against a slime. Drops Slime Gel.",
  },
  {
    id: "town_outskirts_rabbit",
    label: "Town Outskirts Rabbit",
    description:
      "A quick beginner encounter against a horned rabbit. Drops Rabbit Meat.",
  },
  {
    id: "town_outskirts_hawk",
    label: "Town Outskirts Hawk",
    description:
      "A faster outskirts encounter against a razorwing hawk. Drops Hawk Feather.",
  },
  {
    id: "forest_edge_boar",
    label: "Forest Edge Boar",
    description:
      "A forest-edge beast encounter against a wild boar. Drops Boar Meat.",
  },
  {
    id: "forest_edge_wolf",
    label: "Forest Edge Wolf",
    description:
      "A fast forest-edge encounter against a wild wolf. Drops Wolf Pelt.",
  },
  {
    id: "forest_edge_bear",
    label: "Forest Edge Bear",
    description:
      "A heavy forest-edge encounter against a bear. Drops Bear Meat.",
  },
  {
    id: "abandoned_mine_goblin",
    label: "Abandoned Mine Goblin",
    description:
      "A mine encounter against a goblin scavenger. Drops Goblin Scrap.",
  },
  {
    id: "abandoned_mine_spider",
    label: "Abandoned Mine Spider",
    description:
      "A mine encounter against a tunnel spider. Drops Spider Silk.",
  },
  {
    id: "abandoned_mine_ore_mite",
    label: "Abandoned Mine Ore Mite",
    description:
      "A mine encounter against an ore mite. Drops Coal and Copper Nugget.",
  },
];

export interface ExplorationZoneClientDefinition {
  id: ExplorationZoneId;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  dangerLevel: number;
  staminaCost: number;
  entryLog: string[];
}

export const EXPLORATION_ZONE_DEFINITIONS: Record<
  ExplorationZoneId,
  ExplorationZoneClientDefinition
> = {
  town_outskirts: {
    id: "town_outskirts",
    name: "Town Outskirts",
    subtitle: "Lv. 1 - 2 Wildlands",
    description:
      "Slimes, horned rabbits, and razorwing hawks roam the grasslands outside the stronghold.",
    icon: "🌾",
    dangerLevel: 1,
    staminaCost: 5,
    entryLog: [
      "You step beyond the stronghold road into the open town outskirts.",
      "The grass shifts under the wind. Something may be watching from nearby.",
    ],
  },
  forest_edge: {
    id: "forest_edge",
    name: "Forest Edge",
    subtitle: "Lv. 2 - 4 Border Woods",
    description:
      "The first line of the forest beyond the safe roads. Wild boars, wolves, and bears are more common here.",
    icon: "🌲",
    dangerLevel: 2,
    staminaCost: 7,
    entryLog: [
      "You approach the forest edge. The canopy muffles the road behind you.",
      "Broken branches and claw marks suggest this area is no longer safe.",
    ],
  },
  abandoned_mine: {
    id: "abandoned_mine",
    name: "Abandoned Mine",
    subtitle: "Lv. 2 - 3 Derelict Shafts",
    description:
      "Old shafts haunted by goblin scavengers, tunnel spiders, and ore mites.",
    icon: "⛏️",
    dangerLevel: 3,
    staminaCost: 8,
    entryLog: [
      "You descend toward the abandoned mine where the air smells of rust, dust, and old stone.",
      "Loose gravel shifts underfoot. Something skitters deeper in the dark.",
    ],
  },
};
