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
  const change = (Math.random() - 0.45) * 0.08; // slight upward bias
  return Math.max(0.0001, base * (1 + change));
}

export function PricePredictor({ lang, auth, currentPrice = 0.001, onClose }: Props) {
  const isTr = lang === "tr";
  const [phase, setPhase] = useState<"idle" | "predicting" | "revealing" | "done">("idle");
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(5);
  const [price, setPrice] = useState(currentPrice);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [prediction, setPrediction] = useState<"up" | "down" | null>(null);
  const [priceHistory, setPriceHistory] = useState<number[]>([currentPrice]);
  const [animatingPrice, setAnimatingPrice] = useState(false);

  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);

  const startGame = useCallback(() => {
    const startP = currentPrice || 0.001;
    setPhase("predicting");
    setRound(1);
    setPrice(startP);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setRounds([]);
    setPrediction(null);
    setPriceHistory([startP]);
    scoreRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
  }, [currentPrice]);

  const makePrediction = useCallback(
    (dir: "up" | "down") => {
      setPrediction(dir);
      setAnimatingPrice(true);

      // Simulate price movement over 2 seconds
      const startP = price;
      const endP = generatePriceMove(startP);
      const steps = 20;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        const progress = step / steps;
        const interpolated = startP + (endP - startP) * progress + (Math.random() - 0.5) * startP * 0.02;
        setPrice(interpolated);

        if (step >= steps) {
          clearInterval(interval);
          setPrice(endP);
          setAnimatingPrice(false);

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
            streakRef.current = 0;
            setStreak(0);
          }

          scoreRef.current += roundPts;
          setScore(scoreRef.current);

          const roundData: Round = { startPrice: startP, endPrice: endP, prediction: dir, correct };
          setRounds((prev) => [...prev, roundData]);
          setPriceHistory((prev) => [...prev, endP]);

          setPhase("revealing");

          // Auto-advance after 1.5s
          setTimeout(() => {
            if (round >= totalRounds) {
              setPhase("done");
              // Claim reward
              const a = authFields(auth);
              const reward = scoreRef.current * 2;
              postJson("/webapp/api/v2/player/action", {
                ...a,
                action_key: "game_price_predictor",
                action_request_id: buildActionRequestId("game_price_predictor"),
                payload: { score: scoreRef.current, reward_sc: reward, best_streak: bestStreakRef.current, rounds: round },
              }).catch(() => {});
            } else {
              setRound((r) => r + 1);
              setPrediction(null);
              setPhase("predicting");
            }
          }, 1500);
        }
      }, 100);
    },
    [price, round, totalRounds, auth]
  );

  const rewardSc = score * 2;

  // Mini chart renderer
  const renderChart = (prices: number[], height: number, width: number) => {
    if (prices.length < 2) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 0.0001;
    const points = prices.map((p, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    });
    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const lineColor = lastPrice >= prevPrice ? "#10B981" : "#EF4444";

    return (
      <svg width={width} height={height} style={{ display: "block" }}>
        <polyline points={points.join(" ")} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {prices.map((p, i) => {
          const x = (i / (prices.length - 1)) * width;
          const y = height - ((p - min) / range) * (height - 8) - 4;
          return <circle key={i} cx={x} cy={y} r={i === prices.length - 1 ? 4 : 2} fill={i === prices.length - 1 ? lineColor : "rgba(255,255,255,0.3)"} />;
        })}
      </svg>
    );
  };

  return (
    <div style={{ background: "rgba(0,0,0,0.95)", borderRadius: 16, padding: 16, marginTop: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#10B981" }}>
            📈 {isTr ? "Fiyat Tahmincisi" : "Price Predictor"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
            {isTr ? "NXT fiyat yönünü tahmin et, SC kazan!" : "Predict NXT price direction, earn SC!"}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>

      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
            {isTr
              ? `NXT fiyatının yükselip düşeceğini tahmin et. ${totalRounds} turda en yüksek puanı topla! Ardışık doğru tahminler kombo bonusu verir.`
              : `Predict if NXT price goes up or down. Score highest in ${totalRounds} rounds! Consecutive correct predictions give combo bonus.`}
          </div>
          <div style={{ fontSize: 14, color: "#10B981", marginBottom: 16 }}>
            NXT: ${currentPrice.toFixed(4)}
          </div>
          <button
            onClick={startGame}
            style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          >
            {isTr ? "Tahmine Başla" : "Start Predicting"}
          </button>
        </div>
      )}

      {(phase === "predicting" || phase === "revealing") && (
        <>
          {/* Status bar */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              {isTr ? "Tur" : "Round"} {round}/{totalRounds}
            </span>
            <span style={{ fontSize: 12, color: "#FFD700", fontWeight: 700 }}>
              {isTr ? "Puan" : "Score"}: {score}
            </span>
            <span style={{ fontSize: 12, color: streak > 0 ? "#10B981" : "rgba(255,255,255,0.4)" }}>
              🔥 x{streak}
            </span>
          </div>

          {/* Price display */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: 12,
            padding: 16,
            textAlign: "center",
            marginBottom: 12,
            border: animatingPrice ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.04)",
          }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>NXT/USD</div>
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              fontFamily: "monospace",
              color: animatingPrice ? "#FFD700" : "#fff",
              transition: "color 0.3s",
            }}>
              ${price.toFixed(6)}
            </div>
            {/* Mini chart */}
            <div style={{ marginTop: 8 }}>
              {renderChart(priceHistory, 60, 240)}
            </div>
          </div>

          {/* Round results */}
          {rounds.length > 0 && (
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 12 }}>
              {rounds.map((r, i) => (
                <div
                  key={i}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: r.correct ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                    border: `1px solid ${r.correct ? "#10B981" : "#EF4444"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                  }}
                >
                  {r.correct ? "✓" : "✗"}
                </div>
              ))}
            </div>
          )}

          {/* Prediction result */}
          {phase === "revealing" && rounds.length > 0 && (
            <div style={{
              textAlign: "center",
              padding: 8,
              borderRadius: 8,
              marginBottom: 12,
              background: rounds[rounds.length - 1].correct ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              color: rounds[rounds.length - 1].correct ? "#10B981" : "#EF4444",
              fontSize: 14,
              fontWeight: 700,
            }}>
              {rounds[rounds.length - 1].correct
                ? (isTr ? "Doğru tahmin! ✓" : "Correct! ✓")
                : (isTr ? "Yanlış tahmin ✗" : "Wrong prediction ✗")}
            </div>
          )}

          {/* Prediction buttons */}
          {phase === "predicting" && (
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => makePrediction("up")}
                disabled={!!prediction}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))",
                  border: "1px solid rgba(16,185,129,0.3)",
                  borderRadius: 12,
                  padding: "16px 0",
                  color: "#10B981",
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📈 {isTr ? "Yükselir" : "Up"}
              </button>
              <button
                onClick={() => makePrediction("down")}
                disabled={!!prediction}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 12,
                  padding: "16px 0",
                  color: "#EF4444",
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📉 {isTr ? "Düşer" : "Down"}
              </button>
            </div>
          )}
        </>
      )}

      {phase === "done" && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#10B981", marginBottom: 4 }}>
            {rewardSc} SC {isTr ? "kazanıldı!" : "earned!"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
            {rounds.filter((r) => r.correct).length}/{totalRounds} {isTr ? "doğru tahmin" : "correct"} · 🔥 {isTr ? "En iyi seri" : "Best streak"}: x{bestStreak}
          </div>

          {/* Round summary */}
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 16 }}>
            {rounds.map((r, i) => (
              <div
                key={i}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: r.correct ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                  border: `1px solid ${r.correct ? "#10B981" : "#EF4444"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                {r.prediction === "up" ? "📈" : "📉"}
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ marginBottom: 16 }}>
            {renderChart(priceHistory, 80, 280)}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={startGame}
              style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              {isTr ? "Tekrar Oyna" : "Play Again"}
            </button>
            <button
              onClick={onClose}
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 24px", fontSize: 14, cursor: "pointer" }}
            >
              {isTr ? "Kapat" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
