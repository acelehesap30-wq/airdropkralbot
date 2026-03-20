'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';
import { apiFetch, endpoints } from '@/lib/api';

interface TokenSummary {
  price_usd: number;
  supply: number;
  market_cap: number;
  change_24h: number;
  volume_24h: number;
  bonding_curve_enabled: boolean;
}

interface QuoteResult {
  amount_usd: number;
  token_amount: number;
  rate: number;
  chain: string;
  slippage_pct: number;
}

const CHAINS = ['TON', 'BTC', 'ETH', 'SOL', 'TRX'] as const;

export default function ExchangePage() {
  const { locale } = useTelegram();
  const { balances, wallet, session } = useAppStore();
  const isTr = locale === 'tr';

  const [tokenData, setTokenData] = useState<TokenSummary>({
    price_usd: 0, supply: 0, market_cap: 0, change_24h: 0, volume_24h: 0, bonding_curve_enabled: false,
  });
  const [selectedChain, setSelectedChain] = useState<string>('TON');
  const [usdAmount, setUsdAmount] = useState('');
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [mintLoading, setMintLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Fetch token summary on mount
  useEffect(() => {
    const ctrl = new AbortController();
    apiFetch<{ data: TokenSummary }>(endpoints.tokenSummary, { signal: ctrl.signal })
      .then((res) => setTokenData(res.data))
      .catch(() => {/* offline fallback */});
    return () => ctrl.abort();
  }, []);

  // Get quote
  const handleQuote = useCallback(async () => {
    const amt = parseFloat(usdAmount);
    if (!amt || amt < 1 || amt > 250) return;
    setLoading(true);
    setQuote(null);
    try {
      const res = await apiFetch<{ data: QuoteResult }>(endpoints.tokenQuote, {
        method: 'POST',
        body: { amount_usd: amt, chain: selectedChain, uid: session?.uid, ts: session?.ts, sig: session?.sig },
      });
      setQuote(res.data);
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : 'Quote failed');
    } finally {
      setLoading(false);
    }
  }, [usdAmount, selectedChain, session]);

  // Create buy intent
  const handleBuy = useCallback(async () => {
    if (!quote) return;
    setBuyLoading(true);
    setStatusMsg('');
    try {
      await apiFetch(endpoints.tokenBuyIntent, {
        method: 'POST',
        body: { amount_usd: quote.amount_usd, chain: selectedChain, uid: session?.uid, ts: session?.ts, sig: session?.sig },
      });
      setStatusMsg(isTr ? 'Satin alma talebi olusturuldu!' : 'Buy intent created!');
      setQuote(null);
      setUsdAmount('');
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : 'Buy failed');
    } finally {
      setBuyLoading(false);
    }
  }, [quote, selectedChain, session, isTr]);

  // Mint NXT from gameplay currencies
  const handleMint = useCallback(async () => {
    setMintLoading(true);
    setStatusMsg('');
    try {
      const res = await apiFetch<{ data: { minted: number } }>(endpoints.tokenMint, {
        method: 'POST',
        body: { uid: session?.uid, ts: session?.ts, sig: session?.sig },
      });
      setStatusMsg(isTr ? `${res.data.minted} NXT mint edildi!` : `Minted ${res.data.minted} NXT!`);
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : 'Mint failed');
    } finally {
      setMintLoading(false);
    }
  }, [session, isTr]);

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">{isTr ? 'Token Borsasi' : 'Token Exchange'}</h1>
        <p className="hero-desc">
          {isTr
            ? 'NXT Token al-sat, cuzdan bagla, fiyat takibi yap.'
            : 'Buy-sell NXT Token, connect wallet, track prices.'}
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
          <span className={`neon-badge ${tokenData.change_24h >= 0 ? 'success' : 'danger'}`}>
            {tokenData.change_24h >= 0 ? '+' : ''}{tokenData.change_24h.toFixed(1)}%
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isTr ? 'Piyasa Degeri' : 'Market Cap'}
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
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>24h Vol</div>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>${tokenData.volume_24h.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Wallet Status */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="section-header" style={{ marginBottom: 10 }}>
          <span className="section-title">{isTr ? 'Cuzdan' : 'Wallet'}</span>
          <span className={`neon-badge ${wallet.linked ? 'success' : 'warning'}`}>
            {wallet.linked ? (isTr ? 'Bagli' : 'Connected') : (isTr ? 'Bagli Degil' : 'Not Connected')}
          </span>
        </div>

        {wallet.linked ? (
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              {wallet.chain?.toUpperCase()} &bull; {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 10 }}>
              <button className="neon-btn" style={{ fontSize: 12 }} onClick={handleMint} disabled={mintLoading}>
                {mintLoading ? '...' : (isTr ? 'Mint NXT' : 'Mint NXT')}
              </button>
              <button className="neon-btn premium" style={{ fontSize: 12 }} onClick={() => document.getElementById('buy-section')?.scrollIntoView({ behavior: 'smooth' })}>
                {isTr ? 'Token Al' : 'Buy Token'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              {isTr
                ? 'TON cuzdanini bagla ve token islemlerini baslat'
                : 'Connect your TON wallet to start token operations'}
            </p>
            <button className="neon-btn" style={{ width: '100%' }}>
              {isTr ? 'TON Cuzdan Bagla' : 'Connect TON Wallet'}
            </button>
          </div>
        )}
      </div>

      {/* Token Purchase Section */}
      <div id="buy-section" className="glass-card" style={{ padding: 16 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>
          {isTr ? 'Token Satin Al' : 'Buy Token'}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select
            value={selectedChain}
            onChange={(e) => { setSelectedChain(e.target.value); setQuote(null); }}
            style={{
              flex: '0 0 90px', padding: '8px', borderRadius: 8,
              background: 'rgba(42,42,62,0.3)', border: '1px solid rgba(42,42,62,0.4)',
              color: 'var(--color-text-primary)', fontSize: 13,
            }}
          >
            {CHAINS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="number"
            min={1}
            max={250}
            step={1}
            placeholder="USD"
            value={usdAmount}
            onChange={(e) => { setUsdAmount(e.target.value); setQuote(null); }}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8,
              background: 'rgba(42,42,62,0.3)', border: '1px solid rgba(42,42,62,0.4)',
              color: 'var(--color-text-primary)', fontSize: 14, fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <button className="neon-btn" onClick={handleQuote} disabled={loading || !usdAmount}>
            {loading ? '...' : (isTr ? 'Fiyat Al' : 'Get Quote')}
          </button>
          <button className="neon-btn premium" onClick={handleBuy} disabled={buyLoading || !quote}>
            {buyLoading ? '...' : (isTr ? 'Satin Al' : 'Buy Now')}
          </button>
        </div>

        {quote && (
          <div style={{
            marginTop: 12, padding: 12, borderRadius: 8,
            background: 'rgba(105, 240, 174, 0.08)', border: '1px solid rgba(105, 240, 174, 0.15)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              ${quote.amount_usd} &rarr; <strong style={{ color: 'var(--color-accent)' }}>{quote.token_amount.toLocaleString()} NXT</strong>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Rate: {quote.rate.toFixed(6)} | Slippage: {quote.slippage_pct}% | Chain: {quote.chain}
            </div>
          </div>
        )}

        {statusMsg && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-accent)', textAlign: 'center' }}>
            {statusMsg}
          </div>
        )}
      </div>

      {/* My Balances */}
      <div>
        <div className="section-header">
          <span className="section-title">{isTr ? 'Bakiyelerim' : 'My Balances'}</span>
        </div>
        <div className="glass-card" style={{ padding: '0 16px' }}>
          <BalanceRow label="Soft Currency (SC)" value={balances.sc} color="var(--color-sc)" />
          <BalanceRow label="Hard Currency (HC)" value={balances.hc} color="var(--color-hc)" />
          <BalanceRow label="Rare Currency (RC)" value={balances.rc} color="var(--color-rc)" />
          <BalanceRow label="NXT Token" value={balances.nxt ?? 0} color="var(--color-nxt)" />
          <BalanceRow label={isTr ? 'Cekilebilir (BTC)' : 'Payout (BTC)'} value={balances.payout_available ?? 0} color="var(--color-payout)" isLast />
        </div>
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
