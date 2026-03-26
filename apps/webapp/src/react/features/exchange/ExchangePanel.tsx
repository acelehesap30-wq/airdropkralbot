import { useState, useCallback, useEffect } from "react";
import { t, type Lang } from "../../i18n";
import type { BootstrapV2Data, WebAppAuth } from "../../types";

type ExchangePanelProps = {
  lang: Lang;
  advanced: boolean;
  data: BootstrapV2Data | null;
  auth?: WebAppAuth | null;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
};

const NXT_PRICE_DEFAULT = 0.001;
const SC_TO_HC_RATE = 1000;
const HC_TO_NXT_RATE = 10;

function authQuery(auth?: WebAppAuth | null): string {
  if (!auth) {
    const params = new URLSearchParams(window.location.search);
    return `uid=${params.get("uid") || ""}&ts=${params.get("ts") || Date.now()}&sig=${params.get("sig") || ""}`;
  }
  return `uid=${auth.uid}&ts=${auth.ts}&sig=${auth.sig}`;
}

export function ExchangePanel(props: ExchangePanelProps) {
  const isTr = props.lang === "tr";
  const balances = props.data?.balances || {};
  const token = props.data?.token || {};
  const sc = Number(balances.sc || 0);
  const hc = Number(balances.hc || 0);
  const nxt = Number(balances.nxt || 0);
  const payout = Number(balances.payout_available || 0);

  // Token price: from bootstrap data or fetched, fallback to $0.01
  const bootstrapPrice = Number((token as any)?.nxt_price_usd || 0);
  const [livePrice, setLivePrice] = useState<number>(0);
  const [converting, setConverting] = useState<string | null>(null);
  const [convertResult, setConvertResult] = useState<string | null>(null);

  const nxtPrice = livePrice > 0 ? livePrice : bootstrapPrice > 0 ? bootstrapPrice : NXT_PRICE_DEFAULT;
  const nxtMcap = Number((token as any)?.market_cap_usd || 0);
  const nxtSupply = Number((token as any)?.total_supply || 0);

  // Fetch live token price
  useEffect(() => {
    let cancelled = false;
    async function fetchPrice() {
      try {
        const resp = await fetch(`/webapp/api/v2/token/summary?${authQuery(props.auth)}`);
        const data = await resp.json();
        if (!cancelled && data?.success && data?.data?.nxt_price_usd) {
          setLivePrice(Number(data.data.nxt_price_usd));
        }
      } catch (_) {}
    }
    fetchPrice();
    const interval = setInterval(fetchPrice, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [props.auth]);

  // Convert handler
  const handleConvert = useCallback(async (from: string, to: string) => {
    if (converting) return;
    const pairKey = `${from}-${to}`;
    setConverting(pairKey);
    setConvertResult(null);

    try {
      const aq = authQuery(props.auth);
      const params = new URLSearchParams(aq);
      const uid = params.get("uid") || "";
      const ts = params.get("ts") || String(Date.now());
      const sig = params.get("sig") || "";

      if (from === "SC" && to === "HC") {
        if (sc < SC_TO_HC_RATE) {
          setConvertResult(isTr ? `En az ${SC_TO_HC_RATE} SC gerekli` : `Need at least ${SC_TO_HC_RATE} SC`);
          return;
        }
        const convertAmount = Math.floor(sc / SC_TO_HC_RATE);
        const resp = await fetch("/webapp/api/v2/player/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid, ts, sig,
            action_key: "convert_sc_to_hc",
            action_request_id: `convert_sc_hc_${uid}_${Date.now()}`,
            payload: { sc_amount: convertAmount * SC_TO_HC_RATE, hc_amount: convertAmount }
          })
        });
        const data = await resp.json();
        if (data.success) {
          setConvertResult(isTr ? `${convertAmount * SC_TO_HC_RATE} SC → ${convertAmount} HC` : `${convertAmount * SC_TO_HC_RATE} SC → ${convertAmount} HC`);
        } else {
          setConvertResult(data.error || (isTr ? "Dönüşüm başarısız" : "Conversion failed"));
        }
      } else if (from === "HC" && to === "NXT") {
        if (hc < HC_TO_NXT_RATE) {
          setConvertResult(isTr ? `En az ${HC_TO_NXT_RATE} HC gerekli` : `Need at least ${HC_TO_NXT_RATE} HC`);
          return;
        }
        const convertAmount = Math.floor(hc / HC_TO_NXT_RATE);
        const resp = await fetch("/webapp/api/v2/token/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid, ts, sig,
            action_request_id: `mint_nxt_${uid}_${Date.now()}`,
            amount: convertAmount
          })
        });
        const data = await resp.json();
        if (data.success) {
          setConvertResult(isTr ? `${convertAmount * HC_TO_NXT_RATE} HC → ${convertAmount} NXT` : `${convertAmount * HC_TO_NXT_RATE} HC → ${convertAmount} NXT`);
        } else {
          setConvertResult(data.error || (isTr ? "Mint başarısız" : "Mint failed"));
        }
      } else if (from === "NXT" && to === "BTC") {
        props.onShellAction("open_payout", "exchange");
      }
    } catch (err) {
      setConvertResult(isTr ? "Bağlantı hatası" : "Connection error");
    } finally {
      setConverting(null);
    }
  }, [sc, hc, nxt, converting, props.auth, props.onShellAction, isTr]);

  const PAIRS = [
    { from: "SC", to: "HC", rate: `${SC_TO_HC_RATE}:1`, color: "#00d2ff", fromBal: sc, canConvert: sc >= SC_TO_HC_RATE },
    { from: "HC", to: "NXT", rate: `${HC_TO_NXT_RATE}:1`, color: "#ffd700", fromBal: hc, canConvert: hc >= HC_TO_NXT_RATE },
    { from: "NXT", to: "BTC", rate: `$${nxtPrice.toFixed(4)}`, color: "#ff8800", fromBal: nxt, canConvert: nxt > 0 }
  ];

  return (
    <section className="akrPanelSection">
      <div className="akrCard akrCardGlow">
        <div className="akrCardHeader">
          <h2 className="akrCardTitle">{isTr ? "Borsa" : "Exchange"}</h2>
        </div>
        <p className="akrCardBody" style={{ fontSize: 12, opacity: 0.7 }}>
          {isTr
            ? "Oyun i\u00e7i d\u00f6viz \u00e7evir, NXT token al-sat, BTC'ye \u00e7ekim yap."
            : "Convert in-game currencies, trade NXT tokens, withdraw to BTC."}
        </p>
      </div>

      {/* Token overview card */}
      <div className="akrCard">
        <div className="akrCardHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>NXT Token</h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {livePrice > 0 && (
              <span className="akrBadge" style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", fontSize: 8 }}>
                LIVE
              </span>
            )}
            <span className="akrBadge" style={{ background: "rgba(0,210,255,0.1)", color: "#00d2ff", fontSize: 8 }}>
              AUTO
            </span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "8px 0" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>
              {isTr ? "Fiyat" : "Price"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ffd700", fontFamily: "var(--font-mono, monospace)" }}>
              ${nxtPrice.toFixed(4)}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>MCap</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#00d2ff", fontFamily: "var(--font-mono, monospace)" }}>
              {nxtMcap > 0 ? `$${(nxtMcap / 1000).toFixed(0)}k` : `$${((nxtSupply > 0 ? nxtSupply : 10_000_000) * nxtPrice / 1000).toFixed(0)}k`}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>Supply</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e040fb", fontFamily: "var(--font-mono, monospace)" }}>
              {nxtSupply > 0 ? `${(nxtSupply / 1e6).toFixed(1)}M` : "10.0M"}
            </div>
          </div>
        </div>
      </div>

      {/* Balances */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "Bakiyeler" : "Balances"}
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: "8px 0" }}>
          {[
            { key: "SC", value: sc, color: "#00ff88" },
            { key: "HC", value: hc, color: "#00d2ff" },
            { key: "NXT", value: nxt, color: "#ffd700" },
            { key: "BTC", value: payout, color: "#ff8800" }
          ].map((c) => (
            <div key={c.key} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>{c.key}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.color, fontFamily: "var(--font-mono, monospace)" }}>
                {typeof c.value === "number" && c.value > 1000 ? `${(c.value / 1000).toFixed(1)}k` : c.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Convert result flash */}
      {convertResult && (
        <div className="akrCard" style={{ borderColor: "rgba(0,255,136,0.3)", textAlign: "center" }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: convertResult.includes("→") ? "#00ff88" : "#ff6644",
            fontFamily: "var(--font-mono, monospace)",
            padding: "6px 0"
          }}>
            {convertResult}
          </div>
        </div>
      )}

      {/* Trading pairs */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "\u0130\u015flem \u00c7iftleri" : "Trading Pairs"}
          </h3>
        </div>
        {PAIRS.map((pair) => (
          <div key={`${pair.from}-${pair.to}`} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)"
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {pair.from} &rarr; {pair.to}
              </div>
              <div style={{ fontSize: 10, opacity: 0.5, fontFamily: "var(--font-mono, monospace)" }}>
                {isTr ? "Oran" : "Rate"}: {pair.rate}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: pair.color }}>
                {pair.fromBal > 1000 ? `${(pair.fromBal / 1000).toFixed(1)}k` : pair.fromBal} {pair.from}
              </div>
              <button
                className="akrBtn akrBtnSm"
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  opacity: pair.canConvert ? 1 : 0.4,
                  cursor: pair.canConvert ? "pointer" : "not-allowed"
                }}
                disabled={!pair.canConvert || converting !== null}
                onClick={() => handleConvert(pair.from, pair.to)}
              >
                {converting === `${pair.from}-${pair.to}`
                  ? (isTr ? "İşleniyor..." : "Processing...")
                  : (isTr ? "\u00c7evir" : "Convert")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
