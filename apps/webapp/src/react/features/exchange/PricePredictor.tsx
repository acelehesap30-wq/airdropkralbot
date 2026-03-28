import { useState, useCallback, useRef, useEffect } from "react";
import { buildActionRequestId, postJson } from "../../api/common";
import type { WebAppAuth } from "../../types";

type Props = {
  lang: "tr" | "en";
  auth?: WebAppAuth | null;
  currentPrice?: number;
  onClose: () => void;
};

type Round = {
  startPrice: number;
  endPrice: number;
  prediction: "up" | "down";
  correct: boolean;
};

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

function generatePriceMove(base: number): number {
  const change = (Math.random() - 0.45) * 0.08;
  return Math.max(0.0001, base * (1 + change));
}

// Canvas chart dimensions
const CW = 300, CH = 100;

function drawPriceChart(
  canvas: HTMLCanvasElement,
  history: number[],
  livePrice: number | null,
  animProgress: number, // 0..1 for live line extension
  direction: "up" | "down" | null,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, CW, CH);

  // BG
  ctx.fillStyle = "rgba(5,10,30,0.95)";
  ctx.fillRect(0, 0, CW, CH);

  // Subtle grid
  ctx.save(); ctx.globalAlpha = 0.06;
  for (let gx = 0; gx < CW; gx += 30) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CH);
    ctx.strokeStyle = "#00d2ff"; ctx.lineWidth = 0.5; ctx.stroke();
  }
  for (let gy = 0; gy < CH; gy += 20) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CW, gy);
    ctx.strokeStyle = "#00d2ff"; ctx.lineWidth = 0.5; ctx.stroke();
  }
  ctx.restore();

  // Build price array for chart
  const allPrices = livePrice != null
    ? [...history, history[history.length - 1] + (livePrice - history[history.length - 1]) * animProgress]
    : [...history];

  if (allPrices.length < 2) return;

  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || maxP * 0.01;

  const mapX = (i: number) => (i / (Math.max(allPrices.length - 1, 1))) * (CW - 20) + 10;
  const mapY = (p: number) => CH - 10 - ((p - minP) / range) * (CH - 20);

  // Gradient fill under line
  const lastP = allPrices[allPrices.length - 1];
  const prevP = allPrices[allPrices.length - 2];
  const isUp = lastP >= prevP;
  const lineColor: [number, number, number] = isUp ? [0, 255, 136] : [255, 80, 80];
  const [lr, lg, lb] = lineColor;

  // Fill gradient
  ctx.beginPath();
  ctx.moveTo(mapX(0), mapY(allPrices[0]));
  for (let i = 1; i < allPrices.length; i++) {
    ctx.lineTo(mapX(i), mapY(allPrices[i]));
  }
  ctx.lineTo(mapX(allPrices.length - 1), CH);
  ctx.lineTo(mapX(0), CH);
  ctx.closePath();
  const fillGrad = ctx.createLinearGradient(0, 0, 0, CH);
  fillGrad.addColorStop(0, `rgba(${lr},${lg},${lb},0.18)`);
  fillGrad.addColorStop(1, `rgba(${lr},${lg},${lb},0.02)`);
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // History segments (color by segment direction)
  for (let i = 0; i < history.length - 1; i++) {
    const segUp = history[i + 1] >= history[i];
    const [sr, sg, sb]: [number, number, number] = segUp ? [0, 255, 136] : [255, 80, 80];
    ctx.save();
    ctx.shadowColor = `rgba(${sr},${sg},${sb},0.6)`;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(mapX(i), mapY(history[i]));
    ctx.lineTo(mapX(i + 1), mapY(history[i + 1]));
    ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.7)`;
    ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  // Candlestick markers at each history point
  for (let i = 0; i < history.length; i++) {
    const x = mapX(i), y = mapY(history[i]);
    const pUp = i === 0 || history[i] >= history[i - 1];
    const [cr, cg, cb]: [number, number, number] = pUp ? [0, 220, 120] : [220, 60, 60];
    const barH = 6 + Math.abs((i > 0 ? history[i] - history[i - 1] : 0) / range) * 20;
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.35)`;
    ctx.fillRect(x - 4, y - barH / 2, 8, barH);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.7)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 4, y - barH / 2, 8, barH);
  }

  // Live price extension line
  if (livePrice != null && animProgress > 0) {
    const fromX = mapX(history.length - 1), fromY = mapY(history[history.length - 1]);
    const toX = mapX(allPrices.length - 1), toY = mapY(allPrices[allPrices.length - 1]);
    const [er, eg, eb] = direction === "up" ? [0, 255, 136] : direction === "down" ? [255, 80, 80] : [255, 215, 0];
    ctx.save();
    ctx.shadowColor = `rgba(${er},${eg},${eb},0.8)`;
    ctx.shadowBlur = 8;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY);
    ctx.strokeStyle = `rgba(${er},${eg},${eb},0.75)`;
    ctx.lineWidth = 2; ctx.stroke();
    ctx.setLineDash([]);
    // Live dot
    ctx.beginPath(); ctx.arc(toX, toY, 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${er},${eg},${eb},0.9)`; ctx.fill();
    // Pulsing ring
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);
    ctx.beginPath(); ctx.arc(toX, toY, 8 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${er},${eg},${eb},${0.4 * pulse})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  } else if (allPrices.length > 1) {
    // Static live dot at end
    const ex = mapX(allPrices.length - 1), ey = mapY(allPrices[allPrices.length - 1]);
    ctx.save();
    ctx.shadowColor = `rgba(${lr},${lg},${lb},0.8)`; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${lr},${lg},${lb})`; ctx.fill();
    ctx.restore();
  }
}

export function PricePredictor({ lang, auth, currentPrice = 0.001, onClose }: Props) {
  const isTr = lang === "tr";
  const [phase,       setPhase]       = useState<"idle" | "predicting" | "revealing" | "done">("idle");
  const [round,       setRound]       = useState(0);
  const [totalRounds] = useState(5);
  const [price,       setPrice]       = useState(currentPrice);
  const [score,       setScore]       = useState(0);
  const [streak,      setStreak]      = useState(0);
  const [bestStreak,  setBestStreak]  = useState(0);
  const [rounds,      setRounds]      = useState<Round[]>([]);
  const [prediction,  setPrediction]  = useState<"up" | "down" | null>(null);
  const [priceHistory,setPriceHistory]= useState<number[]>([currentPrice]);
  const [animating,   setAnimating]   = useState(false);

  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const rafRef         = useRef<number>(0);
  const scoreRef       = useRef(0);
  const streakRef      = useRef(0);
  const bestStreakRef  = useRef(0);
  const livePriceRef   = useRef<number | null>(null);
  const animProgressRef= useRef(0);
  const predictionRef  = useRef<"up" | "down" | null>(null);
  const historyRef     = useRef<number[]>([currentPrice]);

  // Animated chart RAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    const draw = () => {
      if (!alive) return;
      drawPriceChart(canvas, historyRef.current, livePriceRef.current, animProgressRef.current, predictionRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  // Sync historyRef with priceHistory state
  useEffect(() => { historyRef.current = priceHistory; }, [priceHistory]);

  const startGame = useCallback(() => {
    const startP = currentPrice || 0.001;
    setPhase("predicting"); setRound(1); setPrice(startP);
    setScore(0); setStreak(0); setBestStreak(0);
    setRounds([]); setPrediction(null);
    setPriceHistory([startP]); historyRef.current = [startP];
    livePriceRef.current = null; animProgressRef.current = 0; predictionRef.current = null;
    setAnimating(false);
    scoreRef.current = 0; streakRef.current = 0; bestStreakRef.current = 0;
  }, [currentPrice]);

  const makePrediction = useCallback((dir: "up" | "down") => {
    if (animating) return;
    setPrediction(dir); predictionRef.current = dir;
    setAnimating(true);

    const startP = historyRef.current[historyRef.current.length - 1];
    const endP = generatePriceMove(startP);
    const steps = 20;
    let step = 0;

    livePriceRef.current = startP;
    animProgressRef.current = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      animProgressRef.current = progress;
      const interpolated = startP + (endP - startP) * progress + (Math.random() - 0.5) * startP * 0.02;
      livePriceRef.current = interpolated;
      setPrice(interpolated);

      if (step >= steps) {
        clearInterval(interval);
        setPrice(endP);
        livePriceRef.current = null;
        animProgressRef.current = 0;
        setAnimating(false);

        const correct = dir === "up" ? endP > startP : endP < startP;
        const roundPts = correct ? (10 + streakRef.current * 5) : 0;

        if (correct) {
          streakRef.current++;
          setStreak(streakRef.current);
          if (streakRef.current > bestStreakRef.current) {
            bestStreakRef.current = streakRef.current;
            setBestStreak(bestStreakRef.current);
          }
        } else {
          streakRef.current = 0; setStreak(0);
        }
        scoreRef.current += roundPts; setScore(scoreRef.current);

        const roundData: Round = { startPrice: startP, endPrice: endP, prediction: dir, correct };
        setRounds(prev => {
          const next = [...prev, roundData]; return next;
        });

        const newHistory = [...historyRef.current, endP];
        historyRef.current = newHistory;
        setPriceHistory(newHistory);
        predictionRef.current = null;

        setPhase("revealing");
        setTimeout(() => {
          if (round >= totalRounds) {
            setPhase("done");
            const reward = scoreRef.current * 2;
            const a = authFields(auth);
            postJson("/webapp/api/v2/player/action", {
              ...a, action_key: "game_price_predictor",
              action_request_id: buildActionRequestId("game_price_predictor"),
              payload: { score: scoreRef.current, reward_sc: reward, best_streak: bestStreakRef.current, rounds: round },
            }).catch(() => {});
          } else {
            setRound(r => r + 1); setPrediction(null); setPhase("predicting");
          }
        }, 1500);
      }
    }, 100);
  }, [animating, round, totalRounds, auth]);

  const rewardSc = score * 2;

  return (
    <div style={{ background: "rgba(0,5,20,0.97)", borderRadius: 16, padding: 16, marginTop: 12, border: "1px solid rgba(16,185,129,0.2)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#10B981" }}>
            📈 {isTr ? "Fiyat Tahmincisi" : "Price Predictor"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
            {isTr ? "NXT fiyat yönünü tahmin et · SC kazan" : "Predict NXT price direction · earn SC"}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 18, cursor: "pointer", padding: "4px 8px" }}>✕</button>
      </div>

      {/* Idle */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 8, lineHeight: 1.7 }}>
            {isTr
              ? `NXT fiyatı yükselir mi düşer mi? ${totalRounds} turda en yüksek puanı topla! Ardışık doğrular kombo verir.`
              : `Will NXT price go up or down? Score highest in ${totalRounds} rounds! Consecutive correct = combo bonus.`}
          </div>
          <div style={{ fontSize: 13, color: "#10B981", marginBottom: 16, fontFamily: "monospace" }}>
            NXT: ${currentPrice.toFixed(4)}
          </div>
          <button onClick={startGame} style={{ background: "linear-gradient(135deg,#10B981,#059669)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {isTr ? "Tahmine Başla" : "Start Predicting"}
          </button>
        </div>
      )}

      {/* Playing */}
      {(phase === "predicting" || phase === "revealing") && (
        <>
          {/* Status */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
              {isTr ? "Tur" : "Round"} {round}/{totalRounds}
            </span>
            <span style={{ fontSize: 12, color: "#FFD700", fontWeight: 700 }}>
              {isTr ? "Puan" : "Score"}: {score}
            </span>
            <span style={{ fontSize: 11, color: streak > 0 ? "#10B981" : "rgba(255,255,255,0.35)" }}>
              🔥 ×{streak}
            </span>
          </div>

          {/* Price display */}
          <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 12, padding: "10px 14px", marginBottom: 10, border: animating ? "1px solid rgba(255,215,0,0.25)" : "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>NXT/USD</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", color: animating ? "#FFD700" : "#fff", transition: "color 0.3s", marginBottom: 6 }}>
              ${price.toFixed(6)}
            </div>
            {/* Canvas chart */}
            <canvas ref={canvasRef} width={CW} height={CH} style={{ display: "block", width: "100%", borderRadius: 6 }} />
          </div>

          {/* Round result indicators */}
          {rounds.length > 0 && (
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 10 }}>
              {rounds.map((r, i) => (
                <div key={i} style={{ width: 26, height: 26, borderRadius: "50%", background: r.correct ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)", border: `1px solid ${r.correct ? "#10B981" : "#EF4444"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                  {r.correct ? "✓" : "✗"}
                </div>
              ))}
              {Array.from({ length: totalRounds - rounds.length }, (_, i) => (
                <div key={`empty-${i}`} style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }} />
              ))}
            </div>
          )}

          {/* Reveal result */}
          {phase === "revealing" && rounds.length > 0 && (
            <div style={{ textAlign: "center", padding: 8, borderRadius: 8, marginBottom: 10, background: rounds[rounds.length - 1].correct ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: rounds[rounds.length - 1].correct ? "#10B981" : "#EF4444", fontSize: 14, fontWeight: 700 }}>
              {rounds[rounds.length - 1].correct
                ? (isTr ? "✓ Doğru tahmin!" : "✓ Correct!")
                : (isTr ? "✗ Yanlış tahmin" : "✗ Wrong prediction")}
            </div>
          )}

          {/* Prediction buttons */}
          {phase === "predicting" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => makePrediction("up")} disabled={animating} style={{ flex: 1, background: "linear-gradient(135deg,rgba(16,185,129,0.2),rgba(16,185,129,0.08))", border: "1px solid rgba(16,185,129,0.35)", borderRadius: 12, padding: "14px 0", color: "#10B981", fontSize: 16, fontWeight: 700, cursor: animating ? "default" : "pointer", opacity: animating ? 0.5 : 1 }}>
                📈 {isTr ? "Yükselir" : "Up"}
              </button>
              <button onClick={() => makePrediction("down")} disabled={animating} style={{ flex: 1, background: "linear-gradient(135deg,rgba(239,68,68,0.2),rgba(239,68,68,0.08))", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 12, padding: "14px 0", color: "#EF4444", fontSize: 16, fontWeight: 700, cursor: animating ? "default" : "pointer", opacity: animating ? 0.5 : 1 }}>
                📉 {isTr ? "Düşer" : "Down"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Done */}
      {phase === "done" && (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#10B981", marginBottom: 6 }}>
            +{rewardSc} SC {isTr ? "kazanıldı!" : "earned!"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>
            {rounds.filter(r => r.correct).length}/{totalRounds} {isTr ? "doğru" : "correct"} · 🔥 {isTr ? "En iyi seri" : "Best streak"}: ×{bestStreak}
          </div>
          {/* Final round summary */}
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 12 }}>
            {rounds.map((r, i) => (
              <div key={i} style={{ width: 32, height: 32, borderRadius: 8, background: r.correct ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${r.correct ? "#10B981" : "#EF4444"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                {r.prediction === "up" ? "📈" : "📉"}
              </div>
            ))}
          </div>
          {/* Final chart */}
          <canvas ref={canvasRef} width={CW} height={CH} style={{ display: "block", width: "100%", borderRadius: 6, marginBottom: 14 }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={startGame} style={{ background: "linear-gradient(135deg,#10B981,#059669)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {isTr ? "Tekrar" : "Play Again"}
            </button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 24px", fontSize: 13, cursor: "pointer" }}>
              {isTr ? "Kapat" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
