export type StatKey = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'LUK';

export type DamageType = 'physical' | 'magical' | 'true';

export type ResistibleDamageType = Exclude<DamageType, 'true'>;

export type ElementType =
  | 'fire'
  | 'water'
  | 'wind'
  | 'earth'
  | 'light'
  | 'dark';

export type ResistanceKey = ResistibleDamageType | ElementType;

export type ResistanceProfile = Partial<Record<ResistanceKey, number>>;

export type ResourceType = 'HP' | 'MP' | 'Stamina';

export interface BaseStats {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  LUK: number;
}

export interface StatProgress {
  currentValue: number;
  fragmentCount: number;
  accumulatedBonus: number;
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

export type OriginId =
  | 'scholar'
  | 'mercenary'
  | 'wanderer'
  | 'street_urchin'
  | 'acolyte';

export type StarterKitId = 'novice_adventurer_kit';

export type SkillId = string;

export type PassiveId = string;

export type ItemId = string;

export type MilestoneId = string;

export type CurrencyUnit = 'bronze' | 'silver' | 'gold';

export interface CurrencyAmount {
  bronze: number;
  silver: number;
  gold: number;
}

export interface StarterKitDefinition {
  id: StarterKitId;
  name: string;
  description: string;

  startingMoneyBronze: number;

  startingItemIds: ItemId[];

  tags: string[];
}

export interface OriginDefinition {
  id: OriginId;
  name: string;
  description: string;

  initialStatBonus: BaseStats;

  startingItemIds: ItemId[];
  startingSkillIds: SkillId[];
  startingPassiveIds: PassiveId[];

  tags: string[];
}

export interface CharacterProgression {
  rankIndex?: number;
  rankId?: string;
  milestoneIds: MilestoneId[];
}

export interface MonsterKnowledgeRecord {
  monsterId: string;
  defeatCount: number;
  discoveredDropItemIds: ItemId[];
  firstDefeatedAt: string;
  lastDefeatedAt: string;
}

export interface Character {
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
  monsterKnowledge?: MonsterKnowledgeRecord[];

  fatigue: number;
  lastRestAt: string;

  createdAt: string;
  updatedAt: string;
}

export interface CharacterSnapshot extends Character {
  baseStats: BaseStats;
  derivedStats: DerivedStats;
}

export interface StartingKitItemPreview {
  itemId: ItemId;
  name: string;
  quantity: number;
}

export interface StartingKitPreview {
  id: StarterKitId;
  name: string;
  moneyBronze: number;
  items: StartingKitItemPreview[];
}

export interface CharacterCreationPreview {
  originId: OriginId;
  baseStats: BaseStats;
  derivedStats: DerivedStats;
  currentState: CurrentState;
  startingKit: StartingKitPreview;
}

export interface CreateCharacterInput {
  name: string;
  originId: OriginId;
  userId: string;
}
