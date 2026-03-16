'use client';

import { useTelegram } from '@/lib/telegram';
import { useBootstrap } from '@/hooks/useBootstrap';
import { useAppStore } from '@/store/useAppStore';
import { apiFetch, endpoints } from '@/lib/api';
import { useState, useCallback, useEffect } from 'react';

interface TokenSummary {
  price_usd: number;
  supply: number;
  market_cap: number;
  change_24h: number;
}

/**
 * Blueprint Section 3.4: Exchange — NXT token market
 * Shows token price, buy/sell interface, market stats
 */
export default function ExchangePage() {
  const { locale } = useTelegram();
  const { isLoading: bootstrapLoading } = useBootstrap();
  const session = useAppStore((s) => s.session);
  const balances = useAppStore((s) => s.balances);
  const setBalances = useAppStore((s) => s.setBalances);

  const [summary, setSummary] = useState<TokenSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyAmount, setBuyAmount] = useState('');
  const [buying, setBuying] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const tr = locale === 'tr';

  // Fetch token summary
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ data: TokenSummary }>(endpoints.tokenSummary, {
          method: 'POST',
          body: { uid: session.uid, ts: session.ts, sig: session.sig },
        });
        if (!cancelled) setSummary(data.data);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  const handleBuy = useCallback(async () => {
    if (!session || buying || !buyAmount) return;
    const amount = parseFloat(buyAmount);
    if (isNaN(amount) || amount <= 0) return;

    setBuying(true);
    setTxStatus(null);
    try {
      const requestId = `buy:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      const data = await apiFetch<{ success: boolean; data?: any; error?: string }>(
        endpoints.tokenBuyIntent,
        {
          method: 'POST',
          body: {
            uid: session.uid,
            ts: session.ts,
            sig: session.sig,
            amount_sc: amount,
            request_id: requestId,
          },
        },
      );
      if (data.data?.snapshot?.balances) {
        setBalances({
          sc: data.data.snapshot.balances.SC ?? 0,
          hc: data.data.snapshot.balances.HC ?? 0,
          rc: data.data.snapshot.balances.RC ?? 0,
          nxt: data.data.snapshot.balances.NXT ?? balances.nxt,
          payout_available: balances.payout_available,
        });
      }
      setTxStatus(tr ? 'İşlem başarılı!' : 'Transaction successful!');
      setBuyAmount('');
    } catch (err: any) {
      setTxStatus(err?.message ?? (tr ? 'İşlem başarısız' : 'Transaction failed'));
    } finally {
      setBuying(false);
    }
  }, [session, buying, buyAmount, setBalances, balances, tr]);

  const isPageLoading = bootstrapLoading || loading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>
        📈 {tr ? 'Borsa' : 'Exchange'}
      </h1>

      {/* Balance bar */}
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
        <span style={{ color: '#00e5ff', fontWeight: 600 }}>
          🔷 NXT: {(balances.nxt ?? 0).toLocaleString()}
        </span>
      </div>

      {isPageLoading && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-secondary)' }}>
          ⏳ {tr ? 'Yükleniyor...' : 'Loading...'}
        </div>
      )}

      {/* Market summary card */}
      {summary && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            NXT Token
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {tr ? 'Fiyat' : 'Price'}
              </span>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                ${summary.price_usd.toFixed(6)}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {tr ? '24s Değişim' : '24h Change'}
              </span>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 16,
                  color: summary.change_24h >= 0 ? '#69f0ae' : '#ff5252',
                }}
              >
                {summary.change_24h >= 0 ? '+' : ''}
                {summary.change_24h.toFixed(2)}%
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {tr ? 'Arz' : 'Supply'}
              </span>
              <div>{summary.supply.toLocaleString()}</div>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {tr ? 'Piyasa Değeri' : 'Market Cap'}
              </span>
              <div>${summary.market_cap.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Buy section */}
      {!isPageLoading && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid rgba(0,229,255,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
            {tr ? 'NXT Satın Al (SC ile)' : 'Buy NXT (with SC)'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              placeholder={tr ? 'SC miktarı' : 'SC amount'}
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                color: 'var(--color-text)',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              onClick={handleBuy}
              disabled={buying || !buyAmount}
              style={{
                background: '#00e5ff',
                color: '#000',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 700,
                cursor: buying ? 'wait' : 'pointer',
                opacity: buying ? 0.6 : 1,
              }}
            >
              {buying ? '...' : tr ? 'Al' : 'Buy'}
            </button>
          </div>
          {txStatus && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#ffd740' }}>
              {txStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
