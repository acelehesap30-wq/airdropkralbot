'use client';

import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';

export default function VaultPage() {
  const { locale } = useTelegram();
  const { balances } = useAppStore();
  const isTr = locale === 'tr';

  const payoutData = {
    gate_open: true,
    min_btc: 0.0001,
    cooldown_hours: 72,
    last_payout: null as null | { status: string; amount: number; tx_hash: string; date: string },
    pending_requests: 0,
    history: [
      { id: 1, amount: 0.00015, status: 'paid', tx_hash: 'abc123...def', date: '2026-03-10' },
      { id: 2, amount: 0.00012, status: 'paid', tx_hash: 'ghi456...jkl', date: '2026-03-03' },
    ],
  };

  const canPayout = (balances.payout_available ?? 0) >= payoutData.min_btc && payoutData.gate_open;

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">🔐 {isTr ? 'Güvenli Kasa' : 'Secure Vault'}</h1>
        <p className="hero-desc">
          {isTr
            ? 'BTC çekim talebi oluştur, işlem geçmişini takip et. Tüm ödemelerde çift onay mekanizması.'
            : 'Create BTC withdrawal requests, track transaction history. Double confirmation on all payouts.'}
        </p>
      </div>

      {/* Payout balance */}
      <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
          {isTr ? 'Çekilebilir Bakiye' : 'Available Payout'}
        </div>
        <div style={{
          fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)',
          color: 'var(--color-payout)',
          textShadow: '0 0 20px rgba(105, 240, 174, 0.3)',
        }}>
          {(balances.payout_available ?? 0).toFixed(8)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>BTC</div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <span className={`neon-badge ${payoutData.gate_open ? 'success' : 'danger'}`}>
            {payoutData.gate_open ? '🟢' : '🔴'} Gate {payoutData.gate_open ? 'OPEN' : 'CLOSED'}
          </span>
          <span className="neon-badge accent">
            ⏳ {payoutData.cooldown_hours}h cooldown
          </span>
        </div>
      </div>

      {/* Payout requirements */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="section-title" style={{ marginBottom: 10 }}>
          📋 {isTr ? 'Çekim Gereksinimleri' : 'Payout Requirements'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <RequirementRow
            label={isTr ? 'Minimum BTC' : 'Minimum BTC'}
            value={`${payoutData.min_btc} BTC`}
            met={(balances.payout_available ?? 0) >= payoutData.min_btc}
          />
          <RequirementRow
            label={isTr ? 'Gate Durumu' : 'Gate Status'}
            value={payoutData.gate_open ? (isTr ? 'Açık' : 'Open') : (isTr ? 'Kapalı' : 'Closed')}
            met={payoutData.gate_open}
          />
          <RequirementRow
            label={isTr ? 'Cooldown Süresi' : 'Cooldown Period'}
            value={`${payoutData.cooldown_hours} ${isTr ? 'saat' : 'hours'}`}
            met={true}
          />
          <RequirementRow
            label={isTr ? 'KYC Durumu' : 'KYC Status'}
            value={isTr ? 'Otomatik' : 'Automatic'}
            met={true}
          />
        </div>
      </div>

      {/* Payout button */}
      <button
        className={`neon-btn ${canPayout ? 'success' : ''}`}
        style={{
          width: '100%',
          padding: '14px',
          fontSize: 14,
          opacity: canPayout ? 1 : 0.5,
        }}
        disabled={!canPayout}
      >
        {canPayout
          ? `🚀 ${isTr ? 'Çekim Talebi Oluştur' : 'Create Withdrawal Request'}`
          : `🔒 ${isTr ? 'Yetersiz Bakiye' : 'Insufficient Balance'}`}
      </button>

      {/* Transaction history */}
      {payoutData.history.length > 0 && (
        <div>
          <div className="section-header">
            <span className="section-title">📜 {isTr ? 'İşlem Geçmişi' : 'Transaction History'}</span>
          </div>

          {payoutData.history.map((tx) => (
            <div key={tx.id} className="glass-card" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-payout)' }}>
                    {tx.amount.toFixed(8)} BTC
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {tx.date} • {tx.tx_hash}
                  </div>
                </div>
                <span className={`neon-badge ${tx.status === 'paid' ? 'success' : 'warning'}`}>
                  {tx.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supported chains */}
      <div className="glass-card" style={{ padding: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {isTr ? 'Desteklenen Ağlar' : 'Supported Networks'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['BTC', 'ETH', 'SOL', 'TON', 'TRX'].map((chain) => (
            <span key={chain} className="neon-badge accent">{chain}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RequirementRow({ label, value, met }: { label: string; value: string; met: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>{met ? '✅' : '❌'}</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: met ? 'var(--color-success)' : 'var(--color-danger)' }}>
        {value}
      </span>
    </div>
  );
}
