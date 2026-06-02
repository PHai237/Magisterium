import { useEffect, useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";
import type { CharacterSnapshot, EquipmentSlot, OriginId } from "../../domain/magisterium.types";
import { formatNumber } from "../../lib/format";
import { smithApi, type SmithRecipeView } from "./smith.api";
import "./smith.css";

interface SmithPanelProps {
  userId: string;
  currentCharacter: CharacterSnapshot;
  onCharacterUpdated: (character: CharacterSnapshot) => void;
}

interface SmithCategoryDefinition {
  slot: EquipmentSlot;
  label: string;
  icon: string;
}

const SMITH_CATEGORIES: SmithCategoryDefinition[] = [
  { slot: "weapon", label: "Hand", icon: "⚔️" },
  { slot: "off_hand", label: "Off-hand", icon: "🛡️" },
  { slot: "helmet", label: "Helmet", icon: "🪖" },
  { slot: "armor", label: "Armor", icon: "◈" },
  { slot: "legging", label: "Legging", icon: "▥" },
  { slot: "boots", label: "Boots", icon: "🥾" },
  { slot: "accessory", label: "Accessory", icon: "◆" }
];

const SLOT_LABEL_BY_ID: Record<EquipmentSlot, string> = {
  weapon: "Hand",
  off_hand: "Off-hand",
  helmet: "Helmet",
  armor: "Armor",
  legging: "Legging",
  boots: "Boots",
  accessory: "Accessory"
};

const ORIGIN_LABELS: Record<OriginId, string> = {
  scholar: "Scholar",
  mercenary: "Mercenary",
  wanderer: "Wanderer",
  street_urchin: "Street Urchin",
  acolyte: "Acolyte"
};

const MATERIAL_ICONS: Record<string, string> = {
  slime_gel: "●",
  slime_core: "◇",
  slime_membrane: "▱",
  boar_meat: "🥩",
  tough_hide: "▰",
  boar_tusk: "△",
  wolf_pelt: "P",
  wolf_fang: "△",
  goblin_scrap: "▣",
  goblin_ear: "👂",
  spider_silk: "S",
  spider_eye: "E",
  venom_sac: "V",
  cracked_blade: "▱",
  coal: "●",
  copper_nugget: "◆",
  rough_wood: "▬",
  rough_stone: "●"
};

function getItemIcon(recipe: SmithRecipeView | null): string {
  if (!recipe) {
    return "Ø";
  }

  const tags = recipe.output.tags;

  if (tags.includes("staff")) {
    return "⌇";
  }

  if (tags.includes("dagger") || tags.includes("knife")) {
    return "†";
  }

  if (tags.includes("sword") || tags.includes("greatsword")) {
    return "⚔️";
  }

  if (tags.includes("shield") || recipe.output.slot === "off_hand") {
    return "🛡️";
  }

  if (recipe.output.slot === "accessory") {
    return "◆";
  }

  return SMITH_CATEGORIES.find((category) => category.slot === recipe.output.slot)?.icon ?? "◇";
}

function getMaterialIcon(itemId: string): string {
  return MATERIAL_ICONS[itemId] ?? "◇";
}

function toTitleCase(value: string): string {
  return value
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatModifierTarget(target: string): string {
  return target
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatModifierValue(value: number): string {
  if (value > 0) {
    return `+${formatNumber(value)}`;
  }

  return formatNumber(value);
}

function formatRecommendedOrigins(originIds: readonly OriginId[]): string {
  if (originIds.length === 0) {
    return "Any Origin";
  }

  return originIds.map((originId) => ORIGIN_LABELS[originId] ?? originId).join(" / ");
}

function getRecipeCodename(recipe: SmithRecipeView): string {
  return recipe.output.itemId.toUpperCase().split("_").join("-");
}

export function SmithPanel({
  userId,
  currentCharacter,
  onCharacterUpdated
}: SmithPanelProps) {
  const [catalog, setCatalog] = useState<SmithRecipeView[]>([]);
  const [activeCategory, setActiveCategory] = useState<EquipmentSlot>("weapon");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busyRecipeId, setBusyRecipeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncedCharacter, setSyncedCharacter] = useState<CharacterSnapshot>(currentCharacter);

  const filteredRecipes = useMemo(
    () => catalog.filter((recipe) => recipe.output.slot === activeCategory),
    [activeCategory, catalog]
  );

  const selectedRecipe = useMemo(() => {
    return (
      filteredRecipes.find((recipe) => recipe.id === selectedRecipeId) ??
      filteredRecipes[0] ??
      null
    );
  }, [filteredRecipes, selectedRecipeId]);

  useEffect(() => {
    setSyncedCharacter(currentCharacter);
  }, [currentCharacter]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecipes() {
      setLoading(true);
      setError(null);

      try {
        const result = await smithApi.getRecipes(userId, currentCharacter.id);

        if (cancelled) {
          return;
        }

        setCatalog(result.recipes);
        setSyncedCharacter(result.character);
        setSelectedRecipeId((current) =>
          result.recipes.some((recipe) => recipe.id === current)
            ? current
            : result.recipes[0]?.id ?? ""
        );
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load smithing blueprints."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRecipes();

    return () => {
      cancelled = true;
    };
  }, [currentCharacter.id, userId]);

  useEffect(() => {
    if (
      selectedRecipeId &&
      filteredRecipes.some((recipe) => recipe.id === selectedRecipeId)
    ) {
      return;
    }

    setSelectedRecipeId(filteredRecipes[0]?.id ?? "");
  }, [filteredRecipes, selectedRecipeId]);

  async function craftSelectedRecipe() {
    if (!selectedRecipe || busyRecipeId) {
      return;
    }

    setBusyRecipeId(selectedRecipe.id);
    setNotice(null);
    setError(null);

    try {
      const result = await smithApi.craft(
        userId,
        currentCharacter.id,
        selectedRecipe.id
      );

      const refreshed = await smithApi.getRecipes(userId, result.character.id);

      setCatalog(refreshed.recipes);
      setSyncedCharacter(refreshed.character);
      onCharacterUpdated(refreshed.character);
      setNotice(`Forged 1x ${selectedRecipe.output.name}.`);
    } catch (craftError) {
      setError(
        craftError instanceof Error
          ? craftError.message
          : "Smithing sequence failed."
      );
    } finally {
      setBusyRecipeId(null);
    }
  }

  const emptyCellCount = Math.max(12 - filteredRecipes.length, 4);
  const activeCategoryLabel = SLOT_LABEL_BY_ID[activeCategory];
  const isBusy = Boolean(busyRecipeId);

  return (
    <section className="smith-panel" aria-label="Iron and Ember Smithy">
      <header className="smith-console-header">
        <div className="smith-console-id">
          <span className="smith-console-id__lamp" aria-hidden="true" />
          <div>
            <strong>SMITHING SYSTEM</strong>
            <span>
              Operator: {syncedCharacter.name} // Bronze: {formatNumber(syncedCharacter.moneyBronze)}
            </span>
          </div>
        </div>

        <nav className="smith-category-strip" aria-label="Smith categories">
          {SMITH_CATEGORIES.map((category) => (
            <button
              key={category.slot}
              type="button"
              className={`smith-category-button ${
                activeCategory === category.slot ? "smith-category-button--active" : ""
              }`}
              onClick={() => setActiveCategory(category.slot)}
            >
              <span aria-hidden="true">{category.icon}</span>
              <strong>{category.label}</strong>
            </button>
          ))}
        </nav>
      </header>

      <div className="smith-workbench">
        <section className="smith-blueprint-bay">
          <header className="smith-section-header">
            <span>MATRIX: {activeCategoryLabel.toUpperCase()} BLUEPRINTS</span>
            <em>GRID SCALE: 4x3</em>
          </header>

          {loading ? (
            <div className="smith-empty-state">Loading blueprint matrix...</div>
          ) : error && catalog.length === 0 ? (
            <div className="smith-empty-state smith-empty-state--error">{error}</div>
          ) : (
            <div className="smith-blueprint-grid">
              {filteredRecipes.map((recipe) => {
                const isActive = selectedRecipe?.id === recipe.id;

                return (
                  <button
                    key={recipe.id}
                    type="button"
                    className={`smith-blueprint-cell ${
                      isActive ? "smith-blueprint-cell--active" : ""
                    } ${recipe.canCraft ? "" : "smith-blueprint-cell--incomplete"}`}
                    onClick={() => setSelectedRecipeId(recipe.id)}
                  >
                    <span className="smith-blueprint-cell__icon" aria-hidden="true">
                      {getItemIcon(recipe)}
                    </span>
                    <strong>{recipe.output.name}</strong>
                    <small>{recipe.output.rarity}</small>
                  </button>
                );
              })}

              {Array.from({ length: emptyCellCount }, (_, index) => (
                <div key={`empty-${index}`} className="smith-blueprint-cell smith-blueprint-cell--empty">
                  ø
                </div>
              ))}
            </div>
          )}

          <footer className="smith-blueprint-footer">
            <span>* Select a blueprint cell to load the assembly line.</span>
            <span>Filter: {activeCategoryLabel}</span>
          </footer>
        </section>

        <aside className="smith-assembly-line">
          {selectedRecipe ? (
            <>
              <div className="smith-target-card">
                <div className="smith-target-card__icon" aria-hidden="true">
                  {getItemIcon(selectedRecipe)}
                </div>
                <div>
                  <span>Target Blueprint</span>
                  <h2>{getRecipeCodename(selectedRecipe)}</h2>
                  <p>{selectedRecipe.output.description}</p>
                </div>
              </div>

              <div className="smith-spec-grid">
                <div>
                  <span>Slot</span>
                  <strong>{SLOT_LABEL_BY_ID[selectedRecipe.output.slot]}</strong>
                </div>
                <div>
                  <span>Rarity</span>
                  <strong>{toTitleCase(selectedRecipe.output.rarity)}</strong>
                </div>
                <div>
                  <span>Origin Fit</span>
                  <strong>{formatRecommendedOrigins(selectedRecipe.recommendedOriginIds)}</strong>
                </div>
                <div>
                  <span>Success</span>
                  <strong>100%</strong>
                </div>
              </div>

              <section className="smith-output-modifiers">
                <div className="smith-subheader">Estimated Output Specs</div>
                {selectedRecipe.output.modifiers.length > 0 ? (
                  <div className="smith-modifier-grid">
                    {selectedRecipe.output.modifiers.map((modifier) => (
                      <div key={modifier.id} className="smith-modifier-card">
                        <span>{formatModifierTarget(modifier.target)}</span>
                        <strong>{formatModifierValue(modifier.value)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="smith-empty-state smith-empty-state--compact">
                    No static modifiers detected.
                  </div>
                )}
              </section>

              <section className="smith-reagents">
                <div className="smith-subheader">Required Reagents</div>
                <div className="smith-reagent-list">
                  {selectedRecipe.requirements.map((requirement) => (
                    <div
                      key={requirement.itemId}
                      className={`smith-reagent-row ${
                        requirement.isSatisfied ? "" : "smith-reagent-row--missing"
                      }`}
                    >
                      <span className="smith-reagent-row__name">
                        <em aria-hidden="true">{getMaterialIcon(requirement.itemId)}</em>
                        {requirement.name}
                      </span>
                      <strong>
                        {formatNumber(requirement.ownedQuantity)} / {formatNumber(requirement.requiredQuantity)}
                      </strong>
                    </div>
                  ))}
                </div>
              </section>

              <footer className="smith-action-footer">
                <div>
                  <span>Striking Charge</span>
                  <strong>{formatNumber(selectedRecipe.bronzeCost)} Bronze</strong>
                </div>
                <Button
                  type="button"
                  className="smith-craft-button"
                  disabled={isBusy || !selectedRecipe.canCraft}
                  onClick={() => void craftSelectedRecipe()}
                >
                  {busyRecipeId === selectedRecipe.id
                    ? "Running..."
                    : selectedRecipe.canCraft
                      ? "Initialize Smithing Sequence"
                      : selectedRecipe.missingReason ?? "Cannot Craft"}
                </Button>
              </footer>
            </>
          ) : (
            <div className="smith-empty-assembly">
              <span>Ø</span>
              <strong>NO_DATA_MATRIX</strong>
              <p>No schematics detected in this category sector.</p>
            </div>
          )}
        </aside>
      </div>

      <footer className="smith-terminal">
        <strong>[SMITH_LOG]:</strong>
        <span>
          {notice ?? error ?? "Station terminal loaded. Select grid coordinates to inspect designs."}
        </span>
      </footer>
    </section>
  );
}
