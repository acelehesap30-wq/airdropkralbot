'use client';

import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';

/** Small inline currency chip used in the top bar ticker */
function CurrencyChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 18%, transparent)`,
        borderRadius: 'var(--radius-full)',
        transition: 'all 0.3s ease',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 4px ${color}`,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600,
          color,
          whiteSpace: 'nowrap',
        }}
        className="count-up"
        key={value}
      >
        {value.toLocaleString()}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function TopBar() {
  const { user, locale } = useTelegram();
  const { balances, bootstrapped, kingdomTier } = useAppStore();

  const tierEmojis = ['\uD83C\uDF11', '\uD83C\uDF12', '\uD83C\uDF13', '\uD83C\uDF14', '\uD83C\uDF15', '\u2B50', '\uD83D\uDCAB', '\u2728', '\uD83D\uDC51', '\uD83C\uDFC6'];
  const tierEmoji = tierEmojis[Math.min(kingdomTier, tierEmojis.length - 1)] || '\uD83C\uDF11';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(8, 8, 14, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-border)',
        zIndex: 10,
        position: 'relative',
      }}
    >
      {/* Brand + user + connection status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-accent), #0066cc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            boxShadow: '0 0 12px rgba(0, 212, 255, 0.3)',
            position: 'relative',
          }}
        >
          {user?.first_name?.[0]?.toUpperCase() || 'N'}

          {/* Connection status dot */}
          <span
            className={bootstrapped ? 'breathe' : ''}
            style={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: bootstrapped ? 'var(--color-success)' : 'var(--color-text-muted)',
              border: '2px solid rgba(8, 8, 14, 0.9)',
              boxShadow: bootstrapped ? '0 0 6px var(--color-success)' : 'none',
              transition: 'background 0.5s ease, box-shadow 0.5s ease',
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.2px' }}>
            {user?.first_name ?? 'Nexus Pilot'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{tierEmoji}</span>
            <span>Tier {kingdomTier}</span>
            <span style={{ margin: '0 4px', opacity: 0.3 }}>&bull;</span>
            <span style={{ textTransform: 'uppercase' }}>{locale}</span>
          </div>
        </div>
      </div>

      {/* Live currency ticker: SC / HC / RC */}
      {bootstrapped && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <CurrencyChip label="SC" value={balances.sc} color="var(--color-sc)" />
          <CurrencyChip label="HC" value={balances.hc} color="var(--color-hc)" />
          <CurrencyChip label="RC" value={balances.rc} color="var(--color-rc)" />
        </div>
      )}
    </header>
  );
}
