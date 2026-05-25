import { getItemDefinitionById } from '../item/item.registry';

import type { ItemId } from '../character/character.types';

import type { StatModifier } from '../passive/passive.types';

type ModifierValueSource = NonNullable<StatModifier['valueSource']>;

function cloneModifierValueSource(
  valueSource?: Readonly<ModifierValueSource>,
): ModifierValueSource | undefined {
  if (!valueSource) {
    return undefined;
  }

  switch (valueSource.type) {
    case 'constant':
      return {
        type: 'constant',
      };

    case 'stat_ratio':
      return {
        type: 'stat_ratio',
        sourceStat: valueSource.sourceStat,
        ratio: valueSource.ratio,
        readFrom: valueSource.readFrom,
      };

    case 'derived_stat_ratio':
      return {
        type: 'derived_stat_ratio',
        sourceDerivedStat: valueSource.sourceDerivedStat,
        ratio: valueSource.ratio,
        readFrom: valueSource.readFrom,
      };
  }
}

export function cloneEquipmentStatModifier(
  modifier: Readonly<StatModifier>,
): StatModifier {
  return {
    ...modifier,
    valueSource: cloneModifierValueSource(modifier.valueSource),
  };
}

export function collectEquipmentStatModifiers(
  equippedItemIds: readonly ItemId[],
): StatModifier[] {
  return equippedItemIds.flatMap((itemId) => {
    const item = getItemDefinitionById(itemId);

    if (!item.equipment) {
      return [];
    }

    return item.equipment.modifiers.map((modifier) =>
      cloneEquipmentStatModifier(modifier),
    );
  });
}

export function hasEquipmentStatModifiers(
  equippedItemIds: readonly ItemId[],
): boolean {
  return collectEquipmentStatModifiers(equippedItemIds).length > 0;
}
