import { convertBronzeToCurrency, formatCurrencyShort } from '../../features/economy/currencyUtils';

interface MoneyDisplayProps {
  totalBronze: number;
  compact?: boolean;
}

export function MoneyDisplay({
  totalBronze,
  compact = false,
}: MoneyDisplayProps) {
  const currency = convertBronzeToCurrency(totalBronze);

  if (compact) {
    return (
      <span className="font-bold text-yellow-300">
        {formatCurrencyShort(totalBronze)}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-sm font-semibold text-yellow-300">
        {currency.gold} Gold
      </span>

      <span className="rounded-full border border-slate-500/40 bg-slate-500/10 px-3 py-1 text-sm font-semibold text-slate-200">
        {currency.silver} Silver
      </span>

      <span className="rounded-full border border-amber-700/40 bg-amber-700/10 px-3 py-1 text-sm font-semibold text-amber-300">
        {currency.bronze} Bronze
      </span>
    </div>
  );
}