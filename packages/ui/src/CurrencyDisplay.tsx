/**
 * Blueprint: currency unit always written
 * Unrealized value not written as money promise
 */
interface CurrencyDisplayProps {
  amount: number;
  currency: 'SC' | 'HC' | 'RC' | 'NXT' | 'BTC' | 'USD';
  size?: 'sm' | 'md' | 'lg';
}

const CURRENCY_COLORS: Record<string, string> = {
  SC: 'var(--color-accent)',
  HC: 'var(--color-premium)',
  RC: '#ff6b9d',
  NXT: 'var(--color-success)',
  BTC: '#f7931a',
  USD: 'var(--color-text-primary)',
};

const SIZES = { sm: 12, md: 16, lg: 24 };

export function CurrencyDisplay({ amount, currency, size = 'md' }: CurrencyDisplayProps) {
  const fontSize = SIZES[size];
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        fontSize,
        color: CURRENCY_COLORS[currency] ?? 'var(--color-text-primary)',
      }}
    >
      {amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {currency}
    </span>
  );
}
