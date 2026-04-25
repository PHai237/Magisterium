import { convertBronzeToCurrency } from '../../features/economy/currencyUtils';

interface MoneyDisplayProps {
  totalBronze: number;
  compact?: boolean;
}

interface CurrencyRow {
  key: 'gold' | 'silver' | 'bronze';
  label: string;
  value: number;
  className: string;
}

function getVisibleCurrencyRows(totalBronze: number): CurrencyRow[] {
  const currency = convertBronzeToCurrency(totalBronze);
  const rows: CurrencyRow[] = [];

  if (currency.gold > 0) {
    rows.push({
      key: 'gold',
      label: 'Gold',
      value: currency.gold,
      className: 'text-yellow-300',
    });
  }

  if (currency.silver > 0) {
    rows.push({
      key: 'silver',
      label: 'Silver',
      value: currency.silver,
      className: 'text-slate-200',
    });
  }

  if (currency.bronze > 0 || rows.length === 0) {
    rows.push({
      key: 'bronze',
      label: 'Bronze',
      value: currency.bronze,
      className: 'text-amber-300',
    });
  }

  return rows;
}

export function MoneyDisplay({
  totalBronze,
  compact = false,
}: MoneyDisplayProps) {
  const rows = getVisibleCurrencyRows(totalBronze);

  if (compact) {
    return (
      <span className="inline-flex flex-col items-start gap-1 align-top leading-tight">
        {rows.map((row) => (
          <span key={row.key} className={`text-sm font-semibold ${row.className}`}>
            {row.value} {row.label}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {rows.map((row) => (
        <span
          key={row.key}
          className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${
            row.key === 'gold'
              ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
              : row.key === 'silver'
              ? 'border-slate-500/40 bg-slate-500/10 text-slate-200'
              : 'border-amber-700/40 bg-amber-700/10 text-amber-300'
          }`}
        >
          {row.value} {row.label}
        </span>
      ))}
    </div>
  );
}