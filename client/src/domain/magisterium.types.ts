export type OriginId =
  | "scholar"
  | "mercenary"
  | "wanderer"
  | "street_urchin"
  | "acolyte";

export type EncounterId =
  | "slime_training"
  | "goblin_scout"
  | "forest_edge_mixed";

export type MonsterId = "slime" | "goblin";

export type StarterKitId = "novice_adventurer_kit";

export type StatKey = "STR" | "DEX" | "CON" | "INT" | "WIS" | "LUK";

export type SkillId = string;
export type ItemId = string;
export type PassiveId = string;
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
  level: number;
  exp: number;
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

export interface CharacterInnRestResult {
  character: CharacterSnapshot;

  rest: {
    priceBronze: number;
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

export type BattleStatus = "created" | "in_progress" | "victory" | "defeat" | "fled";
export type BattleActorType = "character" | "monster";
export type BattleActionType = "basic_attack" | "use_skill" | "use_item" | "skip_turn";
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
