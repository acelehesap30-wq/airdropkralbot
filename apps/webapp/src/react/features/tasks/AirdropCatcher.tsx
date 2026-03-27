import { useState, useCallback, useRef, useEffect } from "react";
import { buildActionRequestId, postJson } from "../../api/common";
import type { WebAppAuth } from "../../types";

type Props = {
  lang: "tr" | "en";
  auth?: WebAppAuth | null;
  onClose: () => void;
};

type FallingToken = {
  id: number;
  type: "SC" | "HC" | "RC" | "NXT" | "SCAM";
  x: number;
  y: number;
  speed: number;
  emoji: string;
};

const TOKEN_CONFIG = {
  SC: { emoji: "🪙", points: 5, color: "#FFD700" },
  HC: { emoji: "💎", points: 15, color: "#00D2FF" },
  RC: { emoji: "🔮", points: 25, color: "#A855F7" },
  NXT: { emoji: "⚡", points: 50, color: "#10B981" },
  SCAM: { emoji: "💀", points: -30, color: "#EF4444" },
};

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

export function AirdropCatcher({ lang, auth, onClose }: Props) {
  const isTr = lang === "tr";
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [tokens, setTokens] = useState<FallingToken[]>([]);
  const [catcherX, setCatcherX] = useState(50);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [caught, setCaught] = useState({ SC: 0, HC: 0, RC: 0, NXT: 0, SCAM: 0 });
  const [flash, setFlash] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const gameRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextId = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const caughtRef = useRef({ SC: 0, HC: 0, RC: 0, NXT: 0, SCAM: 0 });

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    if (animRef.current) clearInterval(animRef.current);
  }, []);

  const spawnToken = useCallback(() => {
    const types: FallingToken["type"][] = ["SC", "SC", "SC", "HC", "HC", "RC", "NXT", "SCAM", "SCAM"];
    const type = types[Math.floor(Math.random() * types.length)];
    const cfg = TOKEN_CONFIG[type];
    const token: FallingToken = {
      id: nextId.current++,
      type,
      x: 5 + Math.random() * 90,
      y: -5,
      speed: 1.5 + Math.random() * 2,
      emoji: cfg.emoji,
    };
    setTokens((prev) => [...prev, token]);
  }, []);

  const startGame = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setTimeLeft(20);
    setTokens([]);
    setCatcherX(50);
    setCombo(0);
    setBestCombo(0);
    setCaught({ SC: 0, HC: 0, RC: 0, NXT: 0, SCAM: 0 });
    scoreRef.current = 0;
    comboRef.current = 0;
    bestComboRef.current = 0;
    caughtRef.current = { SC: 0, HC: 0, RC: 0, NXT: 0, SCAM: 0 };
    nextId.current = 0;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          cleanup();
          setPhase("done");
          // Claim
          const a = authFields(auth);
          const reward = Math.max(0, scoreRef.current);
          postJson("/webapp/api/v2/player/action", {
            ...a,
            action_key: "game_airdrop_catcher",
            action_request_id: buildActionRequestId("game_airdrop_catcher"),
            payload: { score: scoreRef.current, reward_sc: reward, best_combo: bestComboRef.current, caught: caughtRef.current },
          }).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    spawnRef.current = setInterval(spawnToken, 600);

    animRef.current = setInterval(() => {
      setTokens((prev) => prev.map((t) => ({ ...t, y: t.y + t.speed })).filter((t) => t.y < 105));
    }, 50);
  }, [auth, cleanup, spawnToken]);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (phase !== "playing" || !gameRef.current) return;
      const rect = gameRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setCatcherX(Math.max(5, Math.min(95, pct)));
    },
    [phase]
  );

  const handleCatch = useCallback(
    (token: FallingToken) => {
      const cfg = TOKEN_CONFIG[token.type];
      const comboMultiplier = token.type !== "SCAM" ? 1 + comboRef.current * 0.1 : 1;
      const pts = Math.round(cfg.points * comboMultiplier);

      scoreRef.current += pts;
      setScore(scoreRef.current);

      if (token.type === "SCAM") {
        comboRef.current = 0;
        setCombo(0);
        setFlash("red");
      } else {
        comboRef.current++;
        setCombo(comboRef.current);
        if (comboRef.current > bestComboRef.current) {
          bestComboRef.current = comboRef.current;
          setBestCombo(bestComboRef.current);
        }
        setFlash(cfg.color);
      }

      caughtRef.current = { ...caughtRef.current, [token.type]: caughtRef.current[token.type] + 1 };
      setCaught({ ...caughtRef.current });

      setTokens((prev) => prev.filter((t) => t.id !== token.id));
      setTimeout(() => setFlash(null), 200);
    },
    []
  );

  // Check catches
  useEffect(() => {
    if (phase !== "playing") return;
    const catchZoneY = 85;
    const catchRadius = 12;
    tokens.forEach((token) => {
      if (token.y >= catchZoneY && token.y <= catchZoneY + 8 && Math.abs(token.x - catcherX) < catchRadius) {
        handleCatch(token);
      }
    });
  }, [tokens, catcherX, phase, handleCatch]);

  const rewardSc = Math.max(0, score);

  return (
    <div style={{ background: "rgba(0,0,0,0.95)", borderRadius: 16, padding: 16, marginTop: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#FFD700" }}>
            🪂 {isTr ? "Airdrop Avcısı" : "Airdrop Catcher"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
            {isTr ? "Düşen token'ları yakala, SCAM'lerden kaçın!" : "Catch falling tokens, avoid SCAMs!"}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>

      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🪂</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
            {isTr
              ? "Parmağını kaydırarak düşen airdrop token'larını yakala. 💀 SCAM token'larından kaçın — puan kaybedersin!"
              : "Swipe to catch falling airdrop tokens. Avoid 💀 SCAM tokens — they cost points!"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {(["SC", "HC", "RC", "NXT", "SCAM"] as const).map((type) => (
              <span key={type} style={{ fontSize: 11, color: TOKEN_CONFIG[type].color, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "4px 8px" }}>
                {TOKEN_CONFIG[type].emoji} {type} {TOKEN_CONFIG[type].points > 0 ? `+${TOKEN_CONFIG[type].points}` : TOKEN_CONFIG[type].points}
              </span>
            ))}
          </div>
          <button
            onClick={startGame}
            style={{ background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "#000", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          >
            {isTr ? "Başla (20s)" : "Start (20s)"}
          </button>
        </div>
      )}

      {phase === "playing" && (
        <>
          {/* Score bar */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#FFD700", fontWeight: 700 }}>⏱ {timeLeft}s</span>
            <span style={{ fontSize: 13, color: "#00D2FF", fontWeight: 700 }}>
              {isTr ? "Puan" : "Score"}: {score}
            </span>
            <span style={{ fontSize: 13, color: combo > 0 ? "#10B981" : "rgba(255,255,255,0.4)", fontWeight: 700 }}>
              🔥 x{combo}
            </span>
          </div>

          {/* Game area */}
          <div
            ref={gameRef}
            onTouchMove={handleMove}
            onMouseMove={handleMove}
            style={{
              position: "relative",
              width: "100%",
              height: 300,
              background: flash ? `rgba(${flash === "red" ? "255,0,0" : "255,255,255"},0.05)` : "rgba(255,255,255,0.02)",
              borderRadius: 12,
              overflow: "hidden",
              touchAction: "none",
              border: `1px solid ${flash || "rgba(255,255,255,0.06)"}`,
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            {/* Stars background */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={`star-${i}`}
                style={{
                  position: "absolute",
                  left: `${(i * 37) % 100}%`,
                  top: `${(i * 23) % 100}%`,
                  width: 2,
                  height: 2,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                }}
              />
            ))}

            {/* Falling tokens */}
            {tokens.map((token) => (
              <div
                key={token.id}
                style={{
                  position: "absolute",
                  left: `${token.x}%`,
                  top: `${token.y}%`,
                  transform: "translate(-50%, -50%)",
                  fontSize: 24,
                  transition: "none",
                  filter: token.type === "NXT" ? "drop-shadow(0 0 8px #10B981)" : token.type === "SCAM" ? "drop-shadow(0 0 6px #EF4444)" : "none",
                }}
              >
                {token.emoji}
              </div>
            ))}

            {/* Catcher */}
            <div
              style={{
                position: "absolute",
                left: `${catcherX}%`,
                bottom: 8,
                transform: "translateX(-50%)",
                width: 60,
                height: 32,
                background: "linear-gradient(135deg, rgba(255,215,0,0.3), rgba(0,210,255,0.3))",
                border: "2px solid rgba(255,215,0,0.6)",
                borderRadius: "0 0 30px 30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              🧺
            </div>
          </div>
        </>
      )}

      {phase === "done" && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>
            {rewardSc} SC {isTr ? "kazanıldı!" : "earned!"}
          </div>

          {/* Stats */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            {(["SC", "HC", "RC", "NXT"] as const).map((type) =>
              caught[type] > 0 ? (
                <span key={type} style={{ fontSize: 12, color: TOKEN_CONFIG[type].color }}>
                  {TOKEN_CONFIG[type].emoji} {caught[type]}×
                </span>
              ) : null
            )}
            {caught.SCAM > 0 && (
              <span style={{ fontSize: 12, color: "#EF4444" }}>💀 {caught.SCAM}× {isTr ? "yakalandı" : "hit"}</span>
            )}
          </div>

          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
            🔥 {isTr ? "En iyi kombo" : "Best combo"}: x{bestCombo}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={startGame}
              style={{ background: "linear-gradient(135deg, #FFD700, #FF8C00)", color: "#000", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
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
