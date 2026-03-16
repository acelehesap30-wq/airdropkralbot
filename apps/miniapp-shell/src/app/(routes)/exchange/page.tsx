'use client';

import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';

export default function ExchangePage() {
  const { locale } = useTelegram();
  const { balances, wallet } = useAppStore();
  const isTr = locale === 'tr';

  const tokenData = {
    price_usd: 0.0042,
    supply: 1000000,
    market_cap: 4200,
    change_24h: 12.5,
    volume_24h: 850,
  };

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">💎 {isTr ? 'Token Borsası' : 'Token Exchange'}</h1>
        <p className="hero-desc">
          {isTr
            ? 'NXT Token al-sat, cüzdan bağla, fiyat takibi yap. Real-time oracle verisi.'
            : 'Buy-sell NXT Token, connect wallet, track prices. Real-time oracle data.'}
        </p>
      </div>

      {/* Token Price Card */}
      <div className="glass-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>NXT / USD</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
              ${tokenData.price_usd.toFixed(4)}
            </div>
          </div>
          <span className={`neon-badge ${tokenData.change_24h > 0 ? 'success' : 'danger'}`}>
            {tokenData.change_24h > 0 ? '↑' : '↓'} {Math.abs(tokenData.change_24h)}%
          </span>
        </div>

        {/* Mini stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isTr ? 'Piyasa Değeri' : 'Market Cap'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              ${tokenData.market_cap.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isTr ? 'Toplam Arz' : 'Supply'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              {tokenData.supply.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              24h Vol
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              ${tokenData.volume_24h}
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Status */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="section-header" style={{ marginBottom: 10 }}>
          <span className="section-title">🔗 {isTr ? 'Cüzdan' : 'Wallet'}</span>
          <span className={`neon-badge ${wallet.linked ? 'success' : 'warning'}`}>
            {wallet.linked ? (isTr ? 'Bağlı' : 'Connected') : (isTr ? 'Bağlı Değil' : 'Not Connected')}
          </span>
        </div>

        {wallet.linked ? (
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              {wallet.chain?.toUpperCase()} • {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 10 }}>
              <button className="neon-btn" style={{ fontSize: 12 }}>💫 Mint NXT</button>
              <button className="neon-btn premium" style={{ fontSize: 12 }}>🛒 {isTr ? 'Token Al' : 'Buy Token'}</button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              {isTr 
                ? 'TON cüzdanını bağla ve token işlemlerini başlat'
                : 'Connect your TON wallet to start token operations'}
            </p>
            <button className="neon-btn" style={{ width: '100%' }}>
              🔗 {isTr ? 'TON Cüzdan Bağla' : 'Connect TON Wallet'}
            </button>
          </div>
        )}
      </div>

      {/* My Balances */}
      <div>
        <div className="section-header">
          <span className="section-title">💰 {isTr ? 'Bakiyelerim' : 'My Balances'}</span>
        </div>

        <div className="glass-card" style={{ padding: '0 16px' }}>
          <BalanceRow label="Soft Currency (SC)" value={balances.sc} color="var(--color-sc)" />
          <BalanceRow label="Hard Currency (HC)" value={balances.hc} color="var(--color-hc)" />
          <BalanceRow label="Rare Currency (RC)" value={balances.rc} color="var(--color-rc)" />
          <BalanceRow label="NXT Token" value={balances.nxt ?? 0} color="var(--color-nxt)" />
          <BalanceRow label={isTr ? 'Çekilebilir (BTC)' : 'Payout (BTC)'} value={balances.payout_available ?? 0} color="var(--color-payout)" isLast />
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <button className="neon-btn" style={{ padding: '12px 8px', fontSize: 12 }}>
          📊 {isTr ? 'Fiyat Geçmişi' : 'Price History'}
        </button>
        <button className="neon-btn premium" style={{ padding: '12px 8px', fontSize: 12 }}>
          📤 {isTr ? 'TX Gönder' : 'Submit TX'}
        </button>
      </div>
    </div>
  );
}

function BalanceRow({ label, value, color, isLast }: { label: string; value: number; color: string; isLast?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0',
      borderBottom: isLast ? 'none' : '1px solid rgba(42, 42, 62, 0.2)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>
        {value.toLocaleString('tr-TR', { maximumFractionDigits: 8 })}
      </span>
    </div>
  );
}
