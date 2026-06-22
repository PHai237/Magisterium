import type { MarketVendor } from "./market.api";

export interface MarketDialogueTopic {
  id: string;
  label: string;
  response: string;
}

export interface MarketDialogueDefinition {
  npcName: string;
  title: string;
  greeting: string;
  topics: MarketDialogueTopic[];
}

const MARKET_DIALOGUE_BY_VENDOR_ID: Record<string, MarketDialogueDefinition> = {
  farmer_stall: {
    npcName: "Lashop the Farmer",
    title: "Farmer Stall",
    greeting:
      "Welcome. The road may be unpredictable, but a traveler should never begin it on an empty stomach.",
    topics: [
      {
        id: "introduction",
        label: "Who are you?",
        response:
          "Name's Lashop. My family works the fields beyond the town walls, and I bring whatever the season lets us spare.",
      },
      {
        id: "goods",
        label: "What do you sell?",
        response:
          "Simple food and farm goods. Nothing glamorous, but a loaf in your pack can matter more than gold when the road runs long.",
      },
      {
        id: "harvest",
        label: "How is the harvest?",
        response:
          "Uneven. Some fields are thriving, while others have strange tracks around them. The farmers have started returning home before dusk.",
      },
      {
        id: "work",
        label: "Any work available?",
        response:
          "Nothing I can offer today. Keep visiting, though. Farmers always need another capable pair of hands sooner or later.",
      },
    ],
  },
  herbalist_table: {
    npcName: "Mirelle the Herbalist",
    title: "Herbalist Table",
    greeting:
      "Mind the bottles. Some restore the body, some restore the mind, and a careless hand can confuse the two.",
    topics: [
      {
        id: "introduction",
        label: "Who are you?",
        response:
          "Mirelle. I gather, prepare, and occasionally survive plants that sensible people know not to touch.",
      },
      {
        id: "alchemy",
        label: "Tell me about alchemy.",
        response:
          "Alchemy is patience made useful. A good reagent, the right measure, and enough restraint can turn common herbs into something life-saving.",
      },
      {
        id: "herbs",
        label: "Where do your herbs come from?",
        response:
          "Some grow near town. The valuable ones prefer dangerous soil, old ruins, and places where monsters have changed the land.",
      },
      {
        id: "work",
        label: "Any work available?",
        response:
          "Not yet. If my suppliers miss another delivery, I may need someone willing to search where the safer gatherers will not go.",
      },
    ],
  },
  general_goods: {
    npcName: "Borin the Provisioner",
    title: "General Goods",
    greeting:
      "Take your time. Most expeditions fail because of the one ordinary thing an adventurer decided not to pack.",
    topics: [
      {
        id: "introduction",
        label: "Who are you?",
        response:
          "Borin, provisioner and patient witness to poor planning. I sell the small necessities heroes remember only after leaving town.",
      },
      {
        id: "travel",
        label: "What should a traveler carry?",
        response:
          "Food, something to mend equipment, and enough room to bring valuables home. Pride takes up space and cannot be sold.",
      },
      {
        id: "passes",
        label: "Ask about travel passes.",
        response:
          "The pass here only covers a night's rest for now. Other towns may demand their own papers once the roads between them reopen.",
      },
      {
        id: "work",
        label: "Any work available?",
        response:
          "No work today. Merchants hear plenty, though. If something starts troubling the roads, this counter will know soon enough.",
      },
    ],
  },
};

export function getMarketDialogue(
  vendor: MarketVendor,
): MarketDialogueDefinition {
  return (
    MARKET_DIALOGUE_BY_VENDOR_ID[vendor.id] ?? {
      npcName: vendor.name,
      title: vendor.role,
      greeting: vendor.description,
      topics: [
        {
          id: "introduction",
          label: "Who are you?",
          response: `${vendor.name} serves travelers through ${vendor.role.toLowerCase()}.`,
        },
        {
          id: "work",
          label: "Any work available?",
          response:
            "There is no work available today. Check again another time.",
        },
      ],
    }
  );
}

export function getMarketNpcName(vendor: MarketVendor): string {
  return getMarketDialogue(vendor).npcName;
}
