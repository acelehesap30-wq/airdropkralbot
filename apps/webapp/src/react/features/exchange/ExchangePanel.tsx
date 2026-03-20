import { t, type Lang } from "../../i18n";
import type { BootstrapV2Data } from "../../types";

type ExchangePanelProps = {
  lang: Lang;
  advanced: boolean;
  data: BootstrapV2Data | null;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
};

export function ExchangePanel(props: ExchangePanelProps) {
  const isTr = props.lang === "tr";
  const balances = props.data?.balances || {};
  const token = props.data?.token || {};
  const sc = Number(balances.sc || 0);
  const hc = Number(balances.hc || 0);
  const nxt = Number(balances.nxt || 0);
  const payout = Number(balances.payout_available || 0);
  const nxtPrice = Number((token as any)?.nxt_price_usd || 0);
  const nxtMcap = Number((token as any)?.market_cap_usd || 0);
  const nxtSupply = Number((token as any)?.total_supply || 0);

  const PAIRS = [
    { from: "SC", to: "HC", rate: "1000:1", color: "#00d2ff", fromBal: sc },
    { from: "HC", to: "NXT", rate: "10:1", color: "#ffd700", fromBal: hc },
    { from: "NXT", to: "BTC", rate: "Market", color: "#ff8800", fromBal: nxt }
  ];

  return (
    <section className="akrPanelSection">
      <div className="akrCard akrCardGlow">
        <div className="akrCardHeader">
          <h2 className="akrCardTitle">{isTr ? "Borsa" : "Exchange"}</h2>
        </div>
        <p className="akrCardBody" style={{ fontSize: 12, opacity: 0.7 }}>
          {isTr
            ? "Oyun ici doviz cevir, NXT token al-sat, BTC'ye cekim yap."
            : "Convert in-game currencies, trade NXT tokens, withdraw to BTC."}
        </p>
      </div>

      {/* Token overview card */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>NXT Token</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "8px 0" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>
              {isTr ? "Fiyat" : "Price"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ffd700", fontFamily: "var(--font-mono, monospace)" }}>
              {nxtPrice > 0 ? `$${nxtPrice.toFixed(4)}` : "--"}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>MCap</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#00d2ff", fontFamily: "var(--font-mono, monospace)" }}>
              {nxtMcap > 0 ? `$${(nxtMcap / 1000).toFixed(0)}k` : "--"}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>Supply</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e040fb", fontFamily: "var(--font-mono, monospace)" }}>
              {nxtSupply > 0 ? `${(nxtSupply / 1e6).toFixed(1)}M` : "--"}
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

      {/* Trading pairs */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "Islem Ciftleri" : "Trading Pairs"}
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
              <button className="akrBtn akrBtnSm" style={{ marginTop: 4, fontSize: 10 }}>
                {isTr ? "Cevir" : "Convert"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
