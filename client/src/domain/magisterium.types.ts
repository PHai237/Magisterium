export type OriginId =
  | "scholar"
  | "mercenary"
  | "wanderer"
  | "street_urchin"
  | "acolyte";

export type EncounterId =
  | "town_outskirts_slime"
  | "town_outskirts_rabbit"
  | "town_outskirts_hawk"
  | "forest_edge_boar"
  | "forest_edge_wolf"
  | "forest_edge_bear"
  | "abandoned_mine_goblin"
  | "abandoned_mine_spider"
  | "abandoned_mine_ore_mite";

export type MonsterId =
  | "slime"
  | "horned_rabbit"
  | "razorwing_hawk"
  | "wild_boar"
  | "wild_wolf"
  | "bear"
  | "goblin"
  | "spider"
  | "ore_mite";

export type ExplorationZoneId =
  | "town_outskirts"
  | "forest_edge"
  | "abandoned_mine";

export type ExplorationSearchOutcomeType =
  | "encounter"
  | "bronze"
  | "item"
  | "nothing";

export type StarterKitId = "novice_adventurer_kit";

export type StatKey = "STR" | "DEX" | "CON" | "INT" | "WIS" | "LUK";

export type SkillId = string;
export type ItemId = string;
export type PassiveId = string;

export type EquipmentSlot =
  | "weapon"
  | "off_hand"
  | "helmet"
  | "armor"
  | "legging"
  | "boots"
  | "accessory";

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type MilestoneId = string;

export interface StatProgress {
  currentValue: number;
  fragmentCount: number;
  accumulatedBonus: number;
}

export interface BaseStats {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  LUK: number;
}

export interface DerivedStats {
  maxHp: number;
  maxMp: number;
  maxStamina: number;

  pAtk: number;
  mAtk: number;
  healingPotency: number;

  pDef: number;
  mDef: number;

  actionSpeed: number;
  accuracy: number;
  evasionRate: number;

  critRate: number;
  critDamageBonus: number;

  fleeRate: number;

  statusResist: number;
  spiritualPotency: number;

  mpRegen: number;
  staminaRegen: number;

  secondChanceRate: number;
  procRate: number;
}

export interface CurrentState {
  hp: number;
  mp: number;
  stamina: number;
}

export interface CharacterProgression {
  rankIndex?: number;
  rankId?: string;
  level?: number;
  exp?: number;
  milestoneIds: MilestoneId[];
}

export interface StartingKitPreviewItem {
  itemId: ItemId;
  name: string;
  quantity: number;
}

export interface StartingKitPreview {
  id: StarterKitId;
  name: string;
  moneyBronze: number;
  items: StartingKitPreviewItem[];
}

export interface CharacterCreationPreview {
  originId: OriginId;
  baseStats: BaseStats;
  derivedStats: DerivedStats;
  currentState: CurrentState;
  startingKit: StartingKitPreview;
}

export interface CharacterSnapshot {
  id: string;
  version: number;
  userId: string;

  name: string;
  originId: OriginId;

  progression: CharacterProgression;
  moneyBronze: number;

  stats: Record<StatKey, StatProgress>;
  currentState: CurrentState;

  passiveIds: PassiveId[];
  learnedSkillIds: SkillId[];
  equippedSkillIds: SkillId[];

  starterKitId: StarterKitId;

  inventoryItemIds: ItemId[];
  equippedItemIds: ItemId[];

  fatigue: number;
  lastRestAt: string;

  createdAt: string;
  updatedAt: string;

  baseStats: BaseStats;
  derivedStats: DerivedStats;
}

export interface ExplorationSearchResult {
  zoneId: ExplorationZoneId;
  zoneName: string;
  outcomeType: ExplorationSearchOutcomeType;
  message: string;
  log: string[];
  staminaCost: number;
  character: CharacterSnapshot;
  encounterId?: EncounterId;
  bronzeFound?: number;
  itemFound?: {
    itemId: ItemId;
    quantity: number;
  };
}

export interface InventoryItemStack {
  itemId: ItemId;
  quantity: number;
}

export interface InventoryOperationResult {
  itemId: ItemId;
  previousQuantity: number;
  nextQuantity: number;
  quantityChanged: number;
  inventoryItemIds: ItemId[];
}

export interface CharacterInventoryMutationResult {
  character: CharacterSnapshot;
  inventoryChange: InventoryOperationResult;
}

export interface MarketCatalogItem {
  itemId: ItemId;
  name: string;
  description: string;
  category: string;
  rarity: string;
  buyPriceBronze: number;
  sellPriceBronze: number;
  maxStock: number;
  currentStock: number;
  restockCadence: "daily" | "two_day" | "weekly";
  nextRestockAt: string;
  tags: string[];
}

export interface MarketVendor {
  id: string;
  name: string;
  icon: string;
  role: string;
  description: string;
  unlockState: "open" | "locked" | "rumored";
  items: MarketCatalogItem[];
}

export interface MarketCatalog {
  id: string;
  name: string;
  generatedAt: string;
  vendors: MarketVendor[];
}

export interface MarketTransactionResult {
  character: CharacterSnapshot;
  transaction: {
    type: "buy" | "sell";
    itemId: ItemId;
    quantity: number;
    unitPriceBronze: number;
    totalPriceBronze: number;
    previousMoneyBronze: number;
    nextMoneyBronze: number;
    inventoryChange: InventoryOperationResult;
  };
}

export interface CharacterInnRestResult {
  character: CharacterSnapshot;

  rest: {
    paymentMethod: "bronze" | "pass";
    priceBronze: number;
    passItemId?: ItemId;
    previousMoneyBronze: number;
    nextMoneyBronze: number;
    previousCurrentState: CurrentState;
    nextCurrentState: CurrentState;
    restedAt: string;
  };
}

export type ConsumableEffectTarget = "HP" | "MP" | "Stamina" | "Fatigue";

export interface ConsumableEffectApplication {
  effectType: string;
  target: ConsumableEffectTarget;
  previousValue: number;
  nextValue: number;
  amountApplied: number;
}

export interface CharacterConsumableMutationResult
  extends CharacterInventoryMutationResult {
  itemUse: {
    itemId: ItemId;
    context: "battle" | "out_of_battle";
    consumesOnUse: boolean;
    effects: ConsumableEffectApplication[];
  };
}

export interface CharacterEquipmentMutationResult {
  character: CharacterSnapshot;
  equipmentChange: {
    itemId: ItemId;
    equippedItemIds: ItemId[];
    removedItemIds: ItemId[];
  };
}

export type BattleStatus =
  | "created"
  | "in_progress"
  | "victory"
  | "defeat"
  | "escaped"
  | "cancelled";
export type BattleActorType = "character" | "monster";
export type BattleActionType =
  | "basic_attack"
  | "use_skill"
  | "use_item"
  | "skip_turn"
  | "flee";
export type DamageType = "physical" | "magical" | "true";
export type ElementType = "fire" | "water" | "wind" | "earth" | "light" | "dark";
export type BattleActionPhase =
  | "initiation"
  | "resource_check"
  | "accuracy_check"
  | "damage_calculation"
  | "mitigation"
  | "apply_damage"
  | "completed"
  | "cancelled";

export interface BattleEvent {
  id: string;
  type: string;
  phase: BattleActionPhase;
  actorId: string;
  targetId?: string;
  skillId?: SkillId;
  itemId?: ItemId;
  effectId?: string;
  sourceId?: string;
  value?: number;
  damageType?: DamageType;
  elementType?: ElementType;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface BattleActorState {
  actorId: string;
  actorType: BattleActorType;

  monsterId?: MonsterId;
  aiTargetingMode?: string;

  skillIds: SkillId[];
  inventoryItemIds: ItemId[];
  battleStartInventoryItemIds?: ItemId[];

  baseStats: BaseStats;
  derivedStats: DerivedStats;
  resistances?: Partial<Record<DamageType | ElementType, number>>;

  hp: number;
  mp: number;
  stamina: number;
  shield: number;
  isExhausted: boolean;

  activeStatusEffects: unknown[];
  activeModifiers: unknown[];
  procCountThisTurn: number;
}

export interface BattleTurnOrderEntry {
  actorId: string;
  actionSpeed: number;
  initiative: number;
  turnGauge: number;
  hasActedThisRound: boolean;
}

export interface BattleState {
  battleId: string;
  status: BattleStatus;

  encounterId?: EncounterId;
  zoneId?: string;
  ownerUserId?: string;

  rewardClaim?: {
    claimedAt: string;
    claimedByCharacterId: string;
    reward: BattleRewardSummary;
  };

  roundNumber: number;
  turnNumber: number;
  activeActorId?: string;

  actors: Record<string, BattleActorState>;
  turnOrder: BattleTurnOrderEntry[];

  randomContext: {
    battleId: string;
    seed: string;
    rollIndex: number;
  };

  events: BattleEvent[];

  createdAt: string;
  updatedAt: string;
}

export interface BattleActionResult {
  phase: "completed" | "cancelled";
  actorState: BattleActorState;
  targetStates: BattleActorState[];
  events: BattleEvent[];
  randomRolls: unknown[];
  procContext: unknown;
}

export interface BattleEngineResult {
  battleState: BattleState;
  actionResult: BattleActionResult;
}

export interface BattleRewardSummary {
  exp: number;
  moneyBronze: number;
  items: Array<{
    itemId: ItemId;
    quantity: number;
  }>;
  defeatedMonsters: Array<{
    actorId: string;
    monsterId: MonsterId;
  }>;
  lootRolls: unknown[];
}

export interface AppliedBattleRewardResponse {
  battle: BattleState;
  character: CharacterSnapshot;
  reward: BattleRewardSummary;
  progression: {
    previousLevel: number;
    nextLevel: number;
    previousExp: number;
    nextExp: number;
    expGained: number;
    leveledUp: boolean;
    levelsGained: number;
  };
}

export type RankId =
  | "novice"
  | "initiate"
  | "acolyte"
  | "adept"
  | "magus"
  | "magister"
  | "archmagister";

export interface RankDefinition {
  id: RankId;
  index: number;
  name: string;
  averageStatRequired: number;
}

export interface RankProgressionStatus {
  currentRank: RankDefinition;
  nextRank?: RankDefinition;
  averageStatValue: number;
  averageStatRequiredForNextRank?: number;
  progressPercentToNextRank: number;
  isEligibleForRankUp: boolean;
}

export interface SanctuaryInventoryQuantity {
  statKey: StatKey;
  itemId: ItemId;
  quantity: number;
}

export interface CharacterSanctuaryStatusResult {
  character: CharacterSnapshot;
  rankStatus: RankProgressionStatus;
  fragments: SanctuaryInventoryQuantity[];
  runes: SanctuaryInventoryQuantity[];
}

export interface CharacterRuneRefinementResult
  extends CharacterSanctuaryStatusResult {
  refinement: {
    statKey: StatKey;
    consumedItemId: ItemId;
    consumedQuantity: number;
    createdItemId: ItemId;
    createdQuantity: number;
  };
}

export interface CharacterRuneImbueResult
  extends CharacterSanctuaryStatusResult {
  imbue: {
    statKey: StatKey;
    consumedItemId: ItemId;
    consumedQuantity: number;
    previousAccumulatedBonus: number;
    nextAccumulatedBonus: number;
  };
}

export interface CharacterRankUpResult extends CharacterSanctuaryStatusResult {
  rankUp: {
    previousRank: RankDefinition;
    nextRank: RankDefinition;
    averageStatValue: number;
  };
}

export type UserRole = "player";

export interface UserSessionSnapshot {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  user: UserSessionSnapshot;
  token: string;
}
