import { useState, useCallback, useRef, useEffect } from "react";
import type { Lang } from "../../i18n";
import { buildActionRequestId, postJson } from "../../api/common";

type ArenaChallengeProps = {
  lang: Lang;
};

function authFields() {
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

/**
 * Reflex Challenge: A colored circle appears at random positions.
 * Tap it as fast as possible within 15 seconds. Score = hits * speed bonus.
 */
export function ArenaChallenge({ lang }: ArenaChallengeProps) {
  const isTr = lang === "tr";
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [targetVisible, setTargetVisible] = useState(false);
  const [targetColor, setTargetColor] = useState("#00d2ff");
  const [rewardSC, setRewardSC] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef(0);
  const hitsRef = useRef(0);

  const COLORS = ["#00d2ff", "#e040fb", "#00ff88", "#ffd700", "#ff4444"];

  const spawnTarget = useCallback(() => {
    const x = 10 + Math.random() * 80;
    const y = 10 + Math.random() * 80;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    setTargetPos({ x, y });
    setTargetColor(color);
    setTargetVisible(true);

    // Auto-hide after 2s if not hit
    spawnRef.current = setTimeout(() => {
      setTargetVisible(false);
      // Respawn after brief delay
      spawnRef.current = setTimeout(() => spawnTarget(), 300 + Math.random() * 500);
    }, 1500 + Math.random() * 1000);
  }, []);

  const startGame = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setHits(0);
    setMisses(0);
    scoreRef.current = 0;
    hitsRef.current = 0;
    setTimeLeft(15);
    setRewardSC(0);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (spawnRef.current) clearTimeout(spawnRef.current);
          setTargetVisible(false);
          setPhase("done");
          const earned = Math.floor(scoreRef.current / 10) + hitsRef.current * 3;
          setRewardSC(earned);
          // Claim via API
          const a = authFields();
          postJson("/webapp/api/v2/player/action", {
            ...a,
            action_key: "game_tap_blitz",
            action_request_id: buildActionRequestId("game_arena_reflex"),
            payload: { taps: hitsRef.current, reward_sc: earned }
          }).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start spawning targets after short delay
    setTimeout(() => spawnTarget(), 500);
  }, [spawnTarget]);

  const handleHit = useCallback(() => {
    if (!targetVisible || phase !== "playing") return;
    if (spawnRef.current) clearTimeout(spawnRef.current);

    const speedBonus = Math.floor(Math.random() * 15) + 10;
    scoreRef.current += speedBonus;
    hitsRef.current += 1;
    setScore((s) => s + speedBonus);
    setHits((h) => h + 1);
    setTargetVisible(false);

    // Spawn next target
    spawnRef.current = setTimeout(() => spawnTarget(), 200 + Math.random() * 400);
  }, [targetVisible, phase, spawnTarget]);

  const handleMiss = useCallback(() => {
    if (phase !== "playing") return;
    setMisses((m) => m + 1);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnRef.current) clearTimeout(spawnRef.current);
    };
  }, []);

  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;

  return (
    <div className="akrCard" style={{ borderLeft: "3px solid #ff4444" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>🎯</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ff4444" }}>
            {isTr ? "Arena Refleks" : "Arena Reflex"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>
            {isTr ? "Hedefleri olabildiğince hızlı vur" : "Hit targets as fast as possible"}
          </div>
        </div>
      </div>

      {phase === "idle" && (
        <button className="akrBtn akrBtnAccent" onClick={startGame} style={{ width: "100%" }}>
          {isTr ? "Meydan Okumayı Başlat" : "Start Challenge"}
        </button>
      )}

      {phase === "playing" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{isTr ? `Süre: ${timeLeft}s` : `Time: ${timeLeft}s`}</span>
            <span style={{ fontSize: 10, color: "#00ff88", fontFamily: "var(--font-mono)" }}>
              {score} pts | {hits} {isTr ? "isabet" : "hits"}
            </span>
          </div>
          <div style={{
            width: "100%", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 6
          }}>
            <div style={{
              width: `${(timeLeft / 15) * 100}%`, height: "100%",
              background: timeLeft <= 5 ? "#ff4444" : "#00d2ff",
              borderRadius: 2, transition: "width 1s linear"
            }} />
          </div>
          <div
            onClick={handleMiss}
            style={{
              position: "relative",
              width: "100%", height: 180,
              background: "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%)",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
              cursor: "crosshair"
            }}
          >
            {/* Grid lines */}
            <div style={{ position: "absolute", inset: 0, opacity: 0.05 }}>
              {[25, 50, 75].map((p) => (
                <div key={`h${p}`} style={{ position: "absolute", top: `${p}%`, left: 0, right: 0, height: 1, background: "#fff" }} />
              ))}
              {[25, 50, 75].map((p) => (
                <div key={`v${p}`} style={{ position: "absolute", left: `${p}%`, top: 0, bottom: 0, width: 1, background: "#fff" }} />
              ))}
            </div>

            {/* Target */}
            {targetVisible && (
              <button
                onClick={(e) => { e.stopPropagation(); handleHit(); }}
                style={{
                  position: "absolute",
                  left: `${targetPos.x}%`, top: `${targetPos.y}%`,
                  transform: "translate(-50%, -50%)",
                  width: 36, height: 36, borderRadius: "50%",
                  background: `radial-gradient(circle, ${targetColor} 0%, ${targetColor}40 70%, transparent 100%)`,
                  border: `2px solid ${targetColor}`,
                  cursor: "pointer",
                  animation: "pulse 0.6s ease-in-out infinite",
                  boxShadow: `0 0 15px ${targetColor}60`
                }}
              />
            )}
          </div>
        </>
      )}

      {phase === "done" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#ff4444", fontFamily: "var(--font-mono)" }}>
            {score} {isTr ? "puan" : "pts"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "6px 0" }}>
            <span style={{ fontSize: 11, opacity: 0.6 }}>{hits} {isTr ? "isabet" : "hits"}</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>{accuracy}% {isTr ? "doğruluk" : "accuracy"}</span>
            <span style={{ fontSize: 11, color: "#00ff88" }}>+{rewardSC} SC</span>
          </div>
          <button className="akrBtn akrBtnGhost" onClick={() => { setPhase("idle"); setScore(0); }} style={{ width: "100%" }}>
            {isTr ? "Tekrar Oyna" : "Play Again"}
          </button>
        </div>
      )}
    </div>
  );
}
