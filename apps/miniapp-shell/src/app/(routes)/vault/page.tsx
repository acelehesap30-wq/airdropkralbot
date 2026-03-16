'use client';

import { useTelegram } from '@/lib/telegram';
import { useBootstrap } from '@/hooks/useBootstrap';
import { useAppStore } from '@/store/useAppStore';
import { apiFetch, endpoints } from '@/lib/api';
import { useState, useCallback, useEffect } from 'react';

interface PayoutStatus {
  eligible: boolean;
  min_amount: number;
  max_amount: number;
  pending_request: boolean;
  last_payout_at: string | null;
  cooldown_remaining_sec: number;
}

/**
 * Blueprint Section 3.5: Vault — payout & wallet management
 * Shows payout eligibility, wallet link status, withdrawal flow
 */
export default function VaultPage() {
  const { locale } = useTelegram();
  const { isLoading: bootstrapLoading } = useBootstrap();
  const session = useAppStore((s) => s.session);
  const balances = useAppStore((s) => s.balances);
  const wallet = useAppStore((s) => s.wallet);
  const setBalances = useAppStore((s) => s.setBalances);

  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestResult, setRequestResult] = useState<string | null>(null);

  const tr = locale === 'tr';

  // Fetch payout status
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ data: PayoutStatus }>(endpoints.payoutStatus, {
          method: 'POST',
          body: { uid: session.uid, ts: session.ts, sig: session.sig },
        });
        if (!cancelled) setPayoutStatus(data.data);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  const requestPayout = useCallback(async () => {
    if (!session || requesting) return;
    setRequesting(true);
    setRequestResult(null);
    try {
      const requestId = `payout:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      const data = await apiFetch<{ success: boolean; data?: any; error?: string }>(
        endpoints.payoutRequest,
        {
          method: 'POST',
          body: {
            uid: session.uid,
            ts: session.ts,
            sig: session.sig,
            request_id: requestId,
          },
        },
      );
      if (data.data?.snapshot?.balances) {
        setBalances({
          sc: data.data.snapshot.balances.SC ?? 0,
          hc: data.data.snapshot.balances.HC ?? 0,
          rc: data.data.snapshot.balances.RC ?? 0,
          payout_available: data.data.snapshot.balances.payout_available ?? 0,
        });
      }
      setRequestResult(tr ? 'Ödeme talebi oluşturuldu!' : 'Payout request created!');
    } catch (err: any) {
      setRequestResult(err?.message ?? (tr ? 'Talep başarısız' : 'Request failed'));
    } finally {
      setRequesting(false);
    }
  }, [session, requesting, setBalances, tr]);

  const isPageLoading = bootstrapLoading || loading;
  const payoutAvailable = balances.payout_available ?? 0;

  const canRequest =
    payoutStatus?.eligible &&
    !payoutStatus.pending_request &&
    payoutAvailable > 0 &&
    wallet.linked &&
    (payoutStatus.cooldown_remaining_sec ?? 0) <= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>
        🏦 {tr ? 'Kasa' : 'Vault'}
      </h1>

      {/* Payout balance */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(105,240,174,0.1))',
          border: '1px solid rgba(0,229,255,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 16px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
          {tr ? 'Çekilebilir Bakiye' : 'Available for Payout'}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#69f0ae' }}>
          ${payoutAvailable.toFixed(2)}
        </div>
      </div>

      {/* Currency balances */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          fontSize: 13,
        }}
      >
        <span>🪙 SC: {balances.sc.toLocaleString()}</span>
        <span>💎 HC: {balances.hc.toLocaleString()}</span>
        <span>🔴 RC: {balances.rc.toLocaleString()}</span>
        <span>🔷 NXT: {(balances.nxt ?? 0).toLocaleString()}</span>
      </div>

      {isPageLoading && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-secondary)' }}>
          ⏳ {tr ? 'Yükleniyor...' : 'Loading...'}
        </div>
      )}

      {/* Wallet status */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: `1px solid ${wallet.linked ? 'rgba(105,240,174,0.4)' : 'rgba(255,82,82,0.4)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          👛 {tr ? 'Cüzdan Durumu' : 'Wallet Status'}
        </div>
        {wallet.linked ? (
          <div style={{ fontSize: 12 }}>
            <div style={{ color: '#69f0ae', marginBottom: 4 }}>
              ✅ {tr ? 'Bağlı' : 'Connected'} — {wallet.chain}
            </div>
            <div style={{ color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>
              {wallet.address
                ? `${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}`
                : '—'}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#ff5252' }}>
            ❌ {tr ? 'Cüzdan bağlı değil. Ödeme almak için cüzdan bağlayın.' : 'Wallet not linked. Link a wallet to receive payouts.'}
          </div>
        )}
      </div>

      {/* Payout status */}
      {payoutStatus && !isPageLoading && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            💸 {tr ? 'Ödeme Durumu' : 'Payout Status'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {tr ? 'Uygunluk' : 'Eligibility'}
              </span>
              <span style={{ color: payoutStatus.eligible ? '#69f0ae' : '#ff5252' }}>
                {payoutStatus.eligible
                  ? (tr ? 'Uygun' : 'Eligible')
                  : (tr ? 'Uygun değil' : 'Not eligible')}
              </span>
            </div>
            {payoutStatus.pending_request && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {tr ? 'Bekleyen Talep' : 'Pending Request'}
                </span>
                <span style={{ color: '#ffd740' }}>⏳ {tr ? 'İşleniyor' : 'Processing'}</span>
              </div>
            )}
            {payoutStatus.cooldown_remaining_sec > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {tr ? 'Bekleme Süresi' : 'Cooldown'}
                </span>
                <span>{Math.ceil(payoutStatus.cooldown_remaining_sec / 3600)}h</span>
              </div>
            )}
            {payoutStatus.last_payout_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {tr ? 'Son Ödeme' : 'Last Payout'}
                </span>
                <span>{new Date(payoutStatus.last_payout_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Request payout button */}
          <button
            onClick={requestPayout}
            disabled={!canRequest || requesting}
            style={{
              width: '100%',
              marginTop: 12,
              background: canRequest ? '#69f0ae' : '#555',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '10px',
              fontSize: 14,
              fontWeight: 700,
              cursor: canRequest && !requesting ? 'pointer' : 'not-allowed',
              opacity: requesting ? 0.6 : 1,
            }}
          >
            {requesting
              ? '...'
              : tr
                ? 'Ödeme Talep Et'
                : 'Request Payout'}
          </button>

          {requestResult && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#ffd740', textAlign: 'center' }}>
              {requestResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
