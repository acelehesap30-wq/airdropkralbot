import { useState, useCallback, useRef, useEffect } from "react";
import type { Lang } from "../../i18n";
import { buildActionRequestId, postJson } from "../../api/common";

type StreakChallengeProps = {
  lang: Lang;
};

function authFields() {
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

/**
 * Streak Challenge: A bar fills up. Tap when it's in the green zone.
 * Chain successful taps to build a streak. Higher streak = more points.
 * Miss the zone = streak resets. 20 rounds total.
 */
export function StreakChallenge({ lang }: StreakChallengeProps) {
  const isTr = lang === "tr";
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [round, setRound] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [barPos, setBarPos] = useState(0);
  const [barDir, setBarDir] = useState(1);
  const [zoneStart, setZoneStart] = useState(35);
  const [zoneEnd, setZoneEnd] = useState(65);
  const [lastResult, setLastResult] = useState<"hit" | "miss" | null>(null);
  const [rewardSC, setRewardSC] = useState(0);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const barRef = useRef(0);
  const dirRef = useRef(1);
  const speedRef = useRef(1.5);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestRef = useRef(0);

  const TOTAL_ROUNDS = 20;

  const randomZone = (difficulty: number) => {
    const width = Math.max(12, 35 - difficulty * 2);
    const start = 5 + Math.random() * (90 - width);
    return { start, end: start + width };
  };

  const animate = useCallback(() => {
    barRef.current += dirRef.current * speedRef.current;
    if (barRef.current >= 100) { barRef.current = 100; dirRef.current = -1; }
    if (barRef.current <= 0) { barRef.current = 0; dirRef.current = 1; }
    setBarPos(barRef.current);
    animRef.current = requestAnimationFrame(animate);
  }, []);

  const startGame = useCallback(() => {
    setPhase("playing");
    setRound(1);
    setStreak(0);
    setBestStreak(0);
    setScore(0);
    setLastResult(null);
    setRewardSC(0);
    scoreRef.current = 0;
    streakRef.current = 0;
    bestRef.current = 0;
    speedRef.current = 1.5;
    barRef.current = 0;
    dirRef.current = 1;
    const zone = randomZone(0);
    setZoneStart(zone.start);
    setZoneEnd(zone.end);
    animRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const handleTap = useCallback(() => {
    if (phase !== "playing") return;
    const pos = barRef.current;
    const isHit = pos >= zoneStart && pos <= zoneEnd;

    if (isHit) {
      const precision = 1 - Math.abs(pos - (zoneStart + zoneEnd) / 2) / ((zoneEnd - zoneStart) / 2);
      const points = Math.floor(10 + precision * 20 + streakRef.current * 5);
      scoreRef.current += points;
      streakRef.current += 1;
      if (streakRef.current > bestRef.current) bestRef.current = streakRef.current;
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      setBestStreak(bestRef.current);
      setLastResult("hit");
    } else {
      streakRef.current = 0;
      setStreak(0);
      setLastResult("miss");
    }

    const nextRound = round + 1;
    if (nextRound > TOTAL_ROUNDS) {
      // Game over
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setPhase("done");
      const earned = scoreRef.current + bestRef.current * 10;
      setRewardSC(earned);
      // API claim
      const a = authFields();
      postJson("/webapp/api/v2/player/action", {
        ...a,
        action_key: "game_streak_challenge",
        action_request_id: buildActionRequestId("game_streak_challenge"),
        payload: { best_streak: bestRef.current, rounds: 20, reward_sc: earned }
      }).catch(() => {});
    } else {
      setRound(nextRound);
      // Increase difficulty
      speedRef.current = Math.min(4, 1.5 + (nextRound - 1) * 0.12);
      const zone = randomZone(Math.floor(nextRound / 3));
      setZoneStart(zone.start);
      setZoneEnd(zone.end);
    }
  }, [phase, round, zoneStart, zoneEnd, animate]);

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const streakColor = streak >= 10 ? "#ffd700" : streak >= 5 ? "#e040fb" : streak >= 3 ? "#00d2ff" : "#00ff88";

  return (
    <div className="akrCard" style={{ borderLeft: "3px solid #00d2ff", marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>🔥</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#00d2ff" }}>
            {isTr ? "Seri Mücadelesi" : "Streak Challenge"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>
            {isTr ? "Yeşil bölgede dokun, seriyi koru" : "Tap in the green zone, keep the streak"}
          </div>
        </div>
      </div>

      {phase === "idle" && (
        <button className="akrBtn akrBtnAccent" onClick={startGame} style={{ width: "100%" }}>
          {isTr ? "Başla (20 Tur)" : "Start (20 Rounds)"}
        </button>
      )}

      {phase === "playing" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, opacity: 0.6 }}>
              {round}/{TOTAL_ROUNDS} | {score} pts
            </span>
            <span style={{ fontSize: 10, color: streakColor, fontWeight: 700 }}>
              🔥 {streak} {isTr ? "seri" : "streak"}
            </span>
          </div>

          {/* Timing bar */}
          <div style={{
            position: "relative", width: "100%", height: 40,
            background: "rgba(0,0,0,0.4)", borderRadius: 8,
            overflow: "hidden", cursor: "pointer",
            border: lastResult === "hit" ? "1px solid rgba(0,255,136,0.4)" : lastResult === "miss" ? "1px solid rgba(255,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)"
          }}
            onClick={handleTap}
          >
            {/* Green zone */}
            <div style={{
              position: "absolute",
              left: `${zoneStart}%`,
              width: `${zoneEnd - zoneStart}%`,
              top: 0, bottom: 0,
              background: "rgba(0,255,136,0.15)",
              borderLeft: "2px solid rgba(0,255,136,0.4)",
              borderRight: "2px solid rgba(0,255,136,0.4)"
            }} />

            {/* Cursor */}
            <div style={{
              position: "absolute",
              left: `${barPos}%`,
              top: 2, bottom: 2,
              width: 3,
              background: barPos >= zoneStart && barPos <= zoneEnd ? "#00ff88" : "#ff4444",
              borderRadius: 2,
              boxShadow: `0 0 8px ${barPos >= zoneStart && barPos <= zoneEnd ? "#00ff88" : "#ff4444"}`,
              transition: "none"
            }} />

            {/* Center label */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, opacity: 0.4,
              pointerEvents: "none"
            }}>
              {isTr ? "DOKUN!" : "TAP!"}
            </div>
          </div>

          {/* Last result flash */}
          {lastResult && (
            <div style={{
              textAlign: "center", fontSize: 11, fontWeight: 600, marginTop: 4,
              color: lastResult === "hit" ? "#00ff88" : "#ff4444"
            }}>
              {lastResult === "hit"
                ? (isTr ? `✓ İsabet! Seri: ${streak}` : `✓ Hit! Streak: ${streak}`)
                : (isTr ? "✗ Kaçırdın! Seri sıfırlandı" : "✗ Miss! Streak reset")}
            </div>
          )}
        </>
      )}

      {phase === "done" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🔥</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#00d2ff", fontFamily: "var(--font-mono)" }}>
            {score} {isTr ? "puan" : "pts"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "6px 0" }}>
            <span style={{ fontSize: 11, opacity: 0.6 }}>
              {isTr ? `En iyi seri: ${bestStreak}` : `Best streak: ${bestStreak}`}
            </span>
            <span style={{ fontSize: 11, color: "#00ff88" }}>+{rewardSC} SC</span>
          </div>
          <button className="akrBtn akrBtnGhost" onClick={startGame} style={{ width: "100%" }}>
            {isTr ? "Tekrar Oyna" : "Play Again"}
          </button>
        </div>
      )}
    </div>
  );
}
