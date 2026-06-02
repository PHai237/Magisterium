import type { ReactNode } from "react";

import greenSlimeImage from "../../assets/monsters/slime/green_slime.png";
import type { MonsterId } from "../../domain/magisterium.types";

const MONSTER_IMAGE_BY_ID: Partial<Record<MonsterId, string>> = {
  slime: greenSlimeImage,
};

interface MonsterIconProps {
  monsterId: MonsterId | null | undefined;
  fallback: string;
  className?: string;
}

export function hasMonsterImage(monsterId: MonsterId | null | undefined): boolean {
  return monsterId ? MONSTER_IMAGE_BY_ID[monsterId] !== undefined : false;
}

export function renderMonsterIcon({
  monsterId,
  fallback,
  className = "monster-pixel-icon",
}: MonsterIconProps): ReactNode {
  const imageSrc = monsterId ? MONSTER_IMAGE_BY_ID[monsterId] : undefined;

  if (!imageSrc) {
    return fallback;
  }

  return <img className={className} src={imageSrc} alt="" draggable={false} />;
}
