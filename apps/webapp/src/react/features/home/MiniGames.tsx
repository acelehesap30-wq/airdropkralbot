import { useState, useCallback, useRef, useEffect } from "react";
import { t, type Lang } from "../../i18n";
import { buildActionRequestId, postJson } from "../../api/common";
import type { WebAppAuth } from "../../types";

type MiniGamesProps = {
  lang: Lang;
  auth?: WebAppAuth | null;
  sc: number;
};

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

// ─── TAP BLITZ ────────────────────────────────────
function TapBlitz({ lang, auth }: { lang: Lang; auth?: WebAppAuth | null }) {
  const isTr = lang === "tr";
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [reward, setReward] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tapsRef = useRef(0);

  const startGame = useCallback(() => {
    setPhase("playing");
    setTaps(0);
    tapsRef.current = 0;
    setTimeLeft(10);
    setReward(null);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase("done");
          // SC reward = taps * 2
          const earned = tapsRef.current * 2;
          setReward(earned);
          // Claim via API
          const a = authFields(auth);
          postJson("/webapp/api/v2/player/action", {
            ...a,
            action_key: "game_tap_blitz",
            action_request_id: buildActionRequestId("game_tap_blitz"),
            payload: { taps: tapsRef.current, reward_sc: earned }
          }).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [auth]);

  const handleTap = useCallback(() => {
    if (phase !== "playing") return;
    tapsRef.current += 1;
    setTaps((p) => p + 1);
  }, [phase]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const tapRank = taps >= 80 ? (isTr ? "Efsane" : "Legend") :
                  taps >= 60 ? (isTr ? "Hızlı" : "Fast") :
                  taps >= 40 ? (isTr ? "İyi" : "Good") :
                  taps >= 20 ? (isTr ? "Normal" : "Normal") :
                  (isTr ? "Yavaş" : "Slow");

  return (
    <div className="akrCard" style={{ borderLeft: "3px solid #e040fb" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>⚡</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e040fb" }}>
            {isTr ? "Dokunma Yarışı" : "Tap Blitz"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>
            {isTr ? "10 saniyede mümkün olduğunca hızlı dokun" : "Tap as fast as you can in 10 seconds"}
          </div>
        </div>
      </div>

      {phase === "idle" && (
        <button className="akrBtn akrBtnAccent" onClick={startGame} style={{ width: "100%" }}>
          {isTr ? "Başla" : "Start"}
        </button>
      )}

      {phase === "playing" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>
            {isTr ? `Kalan: ${timeLeft}s` : `Time: ${timeLeft}s`}
          </div>
          <div style={{
            width: "100%", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 8
          }}>
            <div style={{
              width: `${(timeLeft / 10) * 100}%`, height: "100%",
              background: timeLeft <= 3 ? "#ff4444" : "#e040fb",
              borderRadius: 2, transition: "width 1s linear"
            }} />
          </div>
          <button
            className="akrBtn"
            onClick={handleTap}
            style={{
              width: "100%", height: 80, fontSize: 24, fontWeight: 800,
              background: "linear-gradient(135deg, #e040fb20, #00d2ff10)",
              border: "2px solid #e040fb40",
              borderRadius: 12, cursor: "pointer",
              transition: "transform 0.05s",
              transform: `scale(${1 - (taps % 2) * 0.02})`
            }}
          >
            👆 {taps}
          </button>
          <div style={{ fontSize: 10, opacity: 0.4, marginTop: 4 }}>
            {isTr ? `Her dokunma = 2 SC` : `Each tap = 2 SC`}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#e040fb", fontFamily: "var(--font-mono)" }}>
            {taps} {isTr ? "dokunma" : "taps"}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, margin: "4px 0" }}>
            {tapRank} | +{reward} SC
          </div>
          <button className="akrBtn akrBtnGhost" onClick={() => { setPhase("idle"); setTaps(0); setReward(null); }} style={{ width: "100%" }}>
            {isTr ? "Tekrar Oyna" : "Play Again"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── COIN FLIP ────────────────────────────────────
function CoinFlip({ lang, auth, sc }: { lang: Lang; auth?: WebAppAuth | null; sc: number }) {
  const isTr = lang === "tr";
  const [bet, setBet] = useState(50);
  const [choice, setChoice] = useState<"heads" | "tails" | null>(null);
  const [result, setResult] = useState<{ side: "heads" | "tails"; won: boolean; amount: number } | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [animAngle, setAnimAngle] = useState(0);

  const flip = useCallback(async () => {
    if (!choice || flipping || sc < bet) return;
    setFlipping(true);
    setResult(null);

    // Animate
    let angle = 0;
    const anim = setInterval(() => {
      angle += 180;
      setAnimAngle(angle);
    }, 150);

    try {
      const a = authFields(auth);
      const resp = await postJson<any>("/webapp/api/v2/player/action", {
        ...a,
        action_key: "game_coin_flip",
        action_request_id: buildActionRequestId("game_coin_flip"),
        payload: { bet_sc: bet, choice }
      });

      clearInterval(anim);
      setAnimAngle(0);

      if (resp.success && resp.data) {
        setResult({
          side: resp.data.result_side || (Math.random() > 0.5 ? "heads" : "tails"),
          won: !!resp.data.won,
          amount: Number(resp.data.reward_sc || 0)
        });
      } else {
        // Simulate locally if API fails
        const side = Math.random() > 0.5 ? "heads" as const : "tails" as const;
        const won = side === choice;
        setResult({ side, won, amount: won ? Math.floor(bet * 1.8) : 0 });
      }
    } catch {
      clearInterval(anim);
      setAnimAngle(0);
      const side = Math.random() > 0.5 ? "heads" as const : "tails" as const;
      const won = side === choice;
      setResult({ side, won, amount: won ? Math.floor(bet * 1.8) : 0 });
    } finally {
      setFlipping(false);
    }
  }, [choice, flipping, bet, sc, auth]);

  return (
    <div className="akrCard" style={{ borderLeft: "3px solid #ffd700" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>🪙</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ffd700" }}>
            {isTr ? "Yazı Tura" : "Coin Flip"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>
            {isTr ? "SC bahis koy, kazan veya kaybet. x1.8 ödül." : "Bet SC, win or lose. x1.8 reward."}
          </div>
        </div>
      </div>

      {/* Bet amount */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8, justifyContent: "center" }}>
        {[10, 25, 50, 100].map((v) => (
          <button
            key={v}
            className="akrBtn akrBtnSm"
            onClick={() => setBet(v)}
            style={{
              opacity: bet === v ? 1 : 0.4,
              border: bet === v ? "1px solid #ffd700" : "1px solid transparent",
              fontSize: 10
            }}
          >
            {v} SC
          </button>
        ))}
      </div>

      {/* Choice */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          className="akrBtn"
          onClick={() => setChoice("heads")}
          style={{
            flex: 1, fontSize: 12, fontWeight: 600,
            background: choice === "heads" ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.03)",
            border: choice === "heads" ? "1px solid #ffd700" : "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8
          }}
        >
          👑 {isTr ? "Yazı" : "Heads"}
        </button>
        <button
          className="akrBtn"
          onClick={() => setChoice("tails")}
          style={{
            flex: 1, fontSize: 12, fontWeight: 600,
            background: choice === "tails" ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.03)",
            border: choice === "tails" ? "1px solid #ffd700" : "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8
          }}
        >
          🔢 {isTr ? "Tura" : "Tails"}
        </button>
      </div>

      {/* Coin animation */}
      <div style={{ textAlign: "center", margin: "8px 0" }}>
        <div style={{
          fontSize: 36,
          transform: `rotateY(${animAngle}deg)`,
          transition: "transform 0.15s ease",
          display: "inline-block"
        }}>
          {result ? (result.side === "heads" ? "👑" : "🔢") : "🪙"}
        </div>
      </div>

      {/* Flip button */}
      <button
        className="akrBtn akrBtnAccent"
        onClick={flip}
        disabled={!choice || flipping || sc < bet}
        style={{ width: "100%", opacity: (!choice || flipping || sc < bet) ? 0.4 : 1 }}
      >
        {flipping
          ? (isTr ? "Havada..." : "Flipping...")
          : sc < bet
            ? (isTr ? "Yetersiz SC" : "Not enough SC")
            : (isTr ? `${bet} SC ile Çevir` : `Flip for ${bet} SC`)}
      </button>

      {/* Result */}
      {result && (
        <div style={{
          textAlign: "center", marginTop: 8, padding: "8px 0",
          color: result.won ? "#00ff88" : "#ff4444",
          fontWeight: 700, fontSize: 13,
          fontFamily: "var(--font-mono)"
        }}>
          {result.won
            ? `✓ ${isTr ? "Kazandın" : "Won"} +${result.amount} SC`
            : `✗ ${isTr ? "Kaybettin" : "Lost"} -${bet} SC`}
        </div>
      )}
    </div>
  );
}

// ─── DAILY SPIN ───────────────────────────────────
const WHEEL_PRIZES = [
  { label: "10 SC", value: 10, color: "#00ff88", weight: 30 },
  { label: "25 SC", value: 25, color: "#00d2ff", weight: 25 },
  { label: "50 SC", value: 50, color: "#e040fb", weight: 15 },
  { label: "1 HC", value: 100, color: "#ffd700", weight: 10 },
  { label: "100 SC", value: 100, color: "#ff8800", weight: 8 },
  { label: "x2 Boost", value: 200, color: "#ff4444", weight: 5 },
  { label: "3 HC", value: 300, color: "#00ffaa", weight: 4 },
  { label: "500 SC", value: 500, color: "#ff00ff", weight: 3 },
];

function DailySpin({ lang, auth }: { lang: Lang; auth?: WebAppAuth | null }) {
  const isTr = lang === "tr";
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ label: string; value: number } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [canSpin, setCanSpin] = useState(() => {
    const lastSpin = localStorage.getItem("akr_daily_spin_ts");
    if (!lastSpin) return true;
    return Date.now() - Number(lastSpin) > 86400000;
  });

  const spin = useCallback(async () => {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setResult(null);

    // Weighted random
    const totalWeight = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * totalWeight;
    let prizeIndex = 0;
    for (let i = 0; i < WHEEL_PRIZES.length; i++) {
      r -= WHEEL_PRIZES[i].weight;
      if (r <= 0) { prizeIndex = i; break; }
    }

    const prize = WHEEL_PRIZES[prizeIndex];
    const segAngle = 360 / WHEEL_PRIZES.length;
    const targetRotation = rotation + 1440 + (360 - prizeIndex * segAngle - segAngle / 2);
    setRotation(targetRotation);

    // API call
    try {
      const a = authFields(auth);
      await postJson("/webapp/api/v2/player/action", {
        ...a,
        action_key: "game_daily_spin",
        action_request_id: buildActionRequestId("game_daily_spin"),
        payload: { prize_label: prize.label, prize_value: prize.value }
      });
    } catch {}

    setTimeout(() => {
      setResult(prize);
      setSpinning(false);
      setCanSpin(false);
      localStorage.setItem("akr_daily_spin_ts", String(Date.now()));
    }, 3000);
  }, [spinning, canSpin, rotation, auth]);

  return (
    <div className="akrCard" style={{ borderLeft: "3px solid #00d2ff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>🎰</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#00d2ff" }}>
            {isTr ? "Günlük Çark" : "Daily Spin"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>
            {isTr ? "Günde 1 çevirme hakkı. Şansını dene!" : "1 spin per day. Try your luck!"}
          </div>
        </div>
      </div>

      {/* Wheel */}
      <div style={{ position: "relative", width: "100%", maxWidth: 220, margin: "0 auto", aspectRatio: "1" }}>
        {/* Pointer */}
        <div style={{
          position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
          borderTop: "14px solid #ffd700",
          zIndex: 2, filter: "drop-shadow(0 2px 4px rgba(255,215,0,0.4))"
        }} />

        {/* Wheel circle */}
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          overflow: "hidden", position: "relative",
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? "transform 3s cubic-bezier(0.2, 0.8, 0.3, 1)" : "none",
          border: "3px solid rgba(255,255,255,0.1)"
        }}>
          {WHEEL_PRIZES.map((prize, i) => {
            const segAngle = 360 / WHEEL_PRIZES.length;
            const startAngle = i * segAngle;
            return (
              <div
                key={prize.label}
                style={{
                  position: "absolute",
                  width: "50%", height: "50%",
                  transformOrigin: "100% 100%",
                  transform: `rotate(${startAngle}deg) skewY(${-(90 - segAngle)}deg)`,
                  background: `${prize.color}25`,
                  borderRight: `1px solid ${prize.color}40`,
                  left: 0, top: 0
                }}
              />
            );
          })}
          {/* Labels */}
          {WHEEL_PRIZES.map((prize, i) => {
            const segAngle = 360 / WHEEL_PRIZES.length;
            const midAngle = (i * segAngle + segAngle / 2) * (Math.PI / 180);
            const r = 38;
            const x = 50 + r * Math.sin(midAngle);
            const y = 50 - r * Math.cos(midAngle);
            return (
              <div
                key={`label_${prize.label}`}
                style={{
                  position: "absolute",
                  left: `${x}%`, top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                  fontSize: 8, fontWeight: 700,
                  color: prize.color,
                  textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  whiteSpace: "nowrap", pointerEvents: "none"
                }}
              >
                {prize.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Spin button */}
      <button
        className="akrBtn akrBtnAccent"
        onClick={spin}
        disabled={spinning || !canSpin}
        style={{ width: "100%", marginTop: 8, opacity: (spinning || !canSpin) ? 0.4 : 1 }}
      >
        {spinning
          ? (isTr ? "Dönüyor..." : "Spinning...")
          : !canSpin
            ? (isTr ? "Yarın tekrar gel" : "Come back tomorrow")
            : (isTr ? "Çarkı Çevir" : "Spin the Wheel")}
      </button>

      {/* Result */}
      {result && (
        <div style={{
          textAlign: "center", marginTop: 8, padding: "8px 0",
          color: result.color || "#00ff88",
          fontWeight: 700, fontSize: 14,
          fontFamily: "var(--font-mono)"
        }}>
          🎉 {isTr ? "Kazandın" : "Won"}: {result.label}!
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────
export function MiniGames(props: MiniGamesProps) {
  const isTr = props.lang === "tr";

  return (
    <div style={{ marginTop: 8 }}>
      <div className="akrCard akrCardGlow" style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🎮</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {isTr ? "Mini Oyunlar" : "Mini Games"}
            </div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>
              {isTr ? "Oyna, kazan, sıralamalarda yüksel" : "Play, earn, climb the leaderboards"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <TapBlitz lang={props.lang} auth={props.auth} />
        <CoinFlip lang={props.lang} auth={props.auth} sc={props.sc} />
        <DailySpin lang={props.lang} auth={props.auth} />
      </div>
    </div>
  );
}
