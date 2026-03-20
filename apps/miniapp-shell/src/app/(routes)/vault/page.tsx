'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';
import { apiFetch, endpoints } from '@/lib/api';

interface PayoutStatus {
  gate_open: boolean;
  min_btc: number;
  cooldown_hours: number;
  cooldown_remaining_sec: number;
  pending_requests: number;
  last_payout: { status: string; amount: number; tx_hash: string; date: string } | null;
  history: Array<{ id: number; amount: number; status: string; tx_hash: string; date: string; chain: string }>;
}

const PAYOUT_CHAINS = ['BTC', 'ETH', 'SOL', 'TON', 'TRX'] as const;

export default function VaultPage() {
  const { locale } = useTelegram();
  const { balances, session } = useAppStore();
  const isTr = locale === 'tr';

  const [payoutData, setPayoutData] = useState<PayoutStatus>({
    gate_open: false, min_btc: 0.0001, cooldown_hours: 72,
    cooldown_remaining_sec: 0, pending_requests: 0,
    last_payout: null, history: [],
  });
  const [selectedChain, setSelectedChain] = useState('BTC');
  const [requesting, setRequesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Fetch payout status on mount
  useEffect(() => {
    const ctrl = new AbortController();
    apiFetch<{ data: PayoutStatus }>(
      `${endpoints.payoutStatus}?uid=${session?.uid ?? ''}&ts=${session?.ts ?? ''}&sig=${session?.sig ?? ''}`,
      { signal: ctrl.signal },
    )
      .then((res) => setPayoutData(res.data))
      .catch(() => { /* offline — use defaults */ });
    return () => ctrl.abort();
  }, [session]);

  const canPayout = (balances.payout_available ?? 0) >= payoutData.min_btc
    && payoutData.gate_open
    && payoutData.cooldown_remaining_sec <= 0
    && payoutData.pending_requests === 0;

  // Create payout request
  const handlePayoutRequest = useCallback(async () => {
    if (!canPayout) return;
    setRequesting(true);
    setStatusMsg('');
    try {
      await apiFetch(endpoints.payoutRequest, {
        method: 'POST',
        body: {
          chain: selectedChain,
          uid: session?.uid,
          ts: session?.ts,
          sig: session?.sig,
        },
      });
      setStatusMsg(isTr ? 'Cekim talebi olusturuldu! Admin onay bekliyor.' : 'Withdrawal request created! Awaiting admin approval.');
      // Refresh status
      const res = await apiFetch<{ data: PayoutStatus }>(
        `${endpoints.payoutStatus}?uid=${session?.uid ?? ''}&ts=${session?.ts ?? ''}&sig=${session?.sig ?? ''}`,
      );
      setPayoutData(res.data);
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setRequesting(false);
    }
  }, [canPayout, selectedChain, session, isTr]);

  const cooldownText = payoutData.cooldown_remaining_sec > 0
    ? `${Math.ceil(payoutData.cooldown_remaining_sec / 3600)}h ${isTr ? 'kaldi' : 'remaining'}`
    : (isTr ? 'Hazir' : 'Ready');

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">{isTr ? 'Guvenli Kasa' : 'Secure Vault'}</h1>
        <p className="hero-desc">
          {isTr
            ? 'Cekim talebi olustur, islem gecmisini takip et. Cift onay mekanizmasi.'
            : 'Create withdrawal requests, track history. Double confirmation on all payouts.'}
        </p>
      </div>

      {/* Payout balance */}
      <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
          {isTr ? 'Cekilebilir Bakiye' : 'Available Payout'}
        </div>
        <div style={{
          fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)',
          color: 'var(--color-payout)',
          textShadow: '0 0 20px rgba(105, 240, 174, 0.3)',
        }}>
          {(balances.payout_available ?? 0).toFixed(8)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>BTC</div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className={`neon-badge ${payoutData.gate_open ? 'success' : 'danger'}`}>
            Gate {payoutData.gate_open ? 'OPEN' : 'CLOSED'}
          </span>
          <span className={`neon-badge ${payoutData.cooldown_remaining_sec <= 0 ? 'success' : 'accent'}`}>
            Cooldown: {cooldownText}
          </span>
          {payoutData.pending_requests > 0 && (
            <span className="neon-badge warning">
              {payoutData.pending_requests} {isTr ? 'bekleyen' : 'pending'}
            </span>
          )}
        </div>
      </div>

      {/* Payout requirements */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="section-title" style={{ marginBottom: 10 }}>
          {isTr ? 'Cekim Gereksinimleri' : 'Payout Requirements'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <RequirementRow
            label={isTr ? 'Minimum Bakiye' : 'Minimum Balance'}
            value={`${payoutData.min_btc} BTC`}
            met={(balances.payout_available ?? 0) >= payoutData.min_btc}
          />
          <RequirementRow
            label={isTr ? 'Gate Durumu' : 'Gate Status'}
            value={payoutData.gate_open ? (isTr ? 'Acik' : 'Open') : (isTr ? 'Kapali' : 'Closed')}
            met={payoutData.gate_open}
          />
          <RequirementRow
            label="Cooldown"
            value={cooldownText}
            met={payoutData.cooldown_remaining_sec <= 0}
          />
          <RequirementRow
            label={isTr ? 'Bekleyen Talep' : 'Pending Requests'}
            value={payoutData.pending_requests === 0 ? (isTr ? 'Yok' : 'None') : `${payoutData.pending_requests}`}
            met={payoutData.pending_requests === 0}
          />
        </div>
      </div>

      {/* Chain selector + request button */}
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
          style={{
            flex: '0 0 90px', padding: '12px 8px', borderRadius: 8,
            background: 'rgba(42,42,62,0.3)', border: '1px solid rgba(42,42,62,0.4)',
            color: 'var(--color-text-primary)', fontSize: 13,
          }}
        >
          {PAYOUT_CHAINS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          className={`neon-btn ${canPayout ? 'success' : ''}`}
          style={{ flex: 1, padding: '12px', fontSize: 14, opacity: canPayout ? 1 : 0.5 }}
          disabled={!canPayout || requesting}
          onClick={handlePayoutRequest}
        >
          {requesting
            ? '...'
            : canPayout
              ? (isTr ? 'Cekim Talebi Olustur' : 'Create Withdrawal Request')
              : (isTr ? 'Sartlar Karsilanmiyor' : 'Requirements Not Met')}
        </button>
      </div>

      {statusMsg && (
        <div className="glass-card" style={{ padding: 12, textAlign: 'center', fontSize: 13, color: 'var(--color-accent)' }}>
          {statusMsg}
        </div>
      )}

      {/* Transaction history */}
      {payoutData.history.length > 0 && (
        <div>
          <div className="section-header">
            <span className="section-title">{isTr ? 'Islem Gecmisi' : 'Transaction History'}</span>
          </div>
          {payoutData.history.map((tx) => (
            <div key={tx.id} className="glass-card" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-payout)' }}>
                    {tx.amount.toFixed(8)} {tx.chain || 'BTC'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {tx.date} &bull; {tx.tx_hash}
                  </div>
                </div>
                <span className={`neon-badge ${tx.status === 'paid' ? 'success' : tx.status === 'rejected' ? 'danger' : 'warning'}`}>
                  {tx.status === 'paid' ? (isTr ? 'Odendi' : 'Paid')
                    : tx.status === 'rejected' ? (isTr ? 'Reddedildi' : 'Rejected')
                    : (isTr ? 'Bekliyor' : 'Pending')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supported chains */}
      <div className="glass-card" style={{ padding: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {isTr ? 'Desteklenen Aglar' : 'Supported Networks'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PAYOUT_CHAINS.map((chain) => (
            <span key={chain} className={`neon-badge ${chain === selectedChain ? 'success' : 'accent'}`}>{chain}</span>
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
        <span style={{ fontSize: 14 }}>{met ? '\u2705' : '\u274C'}</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: met ? 'var(--color-success)' : 'var(--color-danger)' }}>
        {value}
      </span>
    </div>
  );
}
