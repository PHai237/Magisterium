export interface CurrencyBreakdown {
  gold: number;
  silver: number;
  bronze: number;
}

export const CURRENCY_VALUES = {
  bronzePerSilver: 100,
  silverPerGold: 100,
  bronzePerGold: 100 * 100,
} as const;

export function normalizeBronzeAmount(amount: number): number {
  return Math.max(0, Math.floor(amount));
}

export function convertBronzeToCurrency(
  totalBronze: number,
): CurrencyBreakdown {
  const normalizedBronze = normalizeBronzeAmount(totalBronze);

  const gold = Math.floor(
    normalizedBronze / CURRENCY_VALUES.bronzePerGold,
  );

  const remainingAfterGold =
    normalizedBronze % CURRENCY_VALUES.bronzePerGold;

  const silver = Math.floor(
    remainingAfterGold / CURRENCY_VALUES.bronzePerSilver,
  );

  const bronze = remainingAfterGold % CURRENCY_VALUES.bronzePerSilver;

  return {
    gold,
    silver,
    bronze,
  };
}

export function formatCurrency(totalBronze: number): string {
  const currency = convertBronzeToCurrency(totalBronze);

  return `${currency.gold} Gold • ${currency.silver} Silver • ${currency.bronze} Bronze`;
}

export function formatCurrencyShort(totalBronze: number): string {
  const currency = convertBronzeToCurrency(totalBronze);

  return `${currency.gold}G ${currency.silver}S ${currency.bronze}B`;
}

export function addBronze(
  currentBronze: number,
  bronzeToAdd: number,
): number {
  return normalizeBronzeAmount(currentBronze + bronzeToAdd);
}

export function subtractBronze(
  currentBronze: number,
  bronzeToSubtract: number,
): number {
  return normalizeBronzeAmount(currentBronze - bronzeToSubtract);
}

export function canAffordBronze(
  currentBronze: number,
  costBronze: number,
): boolean {
  return normalizeBronzeAmount(currentBronze) >= normalizeBronzeAmount(costBronze);
}

export function convertCurrencyToBronze(params: {
  gold?: number;
  silver?: number;
  bronze?: number;
}): number {
  const gold = params.gold ?? 0;
  const silver = params.silver ?? 0;
  const bronze = params.bronze ?? 0;

  return normalizeBronzeAmount(
    gold * CURRENCY_VALUES.bronzePerGold +
      silver * CURRENCY_VALUES.bronzePerSilver +
      bronze,
  );
}