import type { ReactNode } from "react";

import slimeGelImage from "../../assets/items/slime/slime_gel.png";
import slimeCoreImage from "../../assets/items/slime/slime_core.png";
import type { ItemId } from "../../domain/magisterium.types";

const ITEM_IMAGE_BY_ID: Partial<Record<ItemId, string>> = {
  slime_gel: slimeGelImage,
  slime_core: slimeCoreImage,
};

interface ItemIconProps {
  itemId: ItemId;
  fallback: string;
  className?: string;
}

export function hasItemImage(itemId: ItemId): boolean {
  return ITEM_IMAGE_BY_ID[itemId] !== undefined;
}

export function renderItemIcon({
  itemId,
  fallback,
  className = "item-pixel-icon",
}: ItemIconProps): ReactNode {
  const imageSrc = ITEM_IMAGE_BY_ID[itemId];

  if (!imageSrc) {
    return fallback;
  }

  return <img className={className} src={imageSrc} alt="" draggable={false} />;
}
