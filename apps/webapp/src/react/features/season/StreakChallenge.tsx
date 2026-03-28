import { useState, useCallback, useRef, useEffect } from "react";
import type { Lang } from "../../i18n";
import { buildActionRequestId, postJson } from "../../api/common";

type StreakChallengeProps = { lang: Lang };

function authFields() {
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

const W_CV = 320, H_CV = 260;
const CX = W_CV / 2, CY = H_CV / 2 - 10;
const RING_R = 86;   // outer radius of ring track
const RING_W = 24;   // track width
const TOTAL_ROUNDS = 20;

type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; g: number; b: number };

function normaliseAngle(a: number): number {
  return ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

/**
 * StreakChallenge: Plasma timing ring. A dot sweeps the ring — tap when it's
 * inside the green arc to score. 20 rounds, increasing speed, streak bonuses.
 */
export function StreakChallenge({ lang }: StreakChallengeProps) {
  const isTr = lang === "tr";
  const [phase,      setPhase]      = useState<"idle" | "playing" | "done">("idle");
  const [round,      setRound]      = useState(0);
  const [streak,     setStreak]     = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [score,      setScore]      = useState(0);
  const [rewardSC,   setRewardSC]   = useState(0);
  const [lastResult, setLastResult] = useState<"hit" | "miss" | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const stRef     = useRef({
    phase: "idle" as "idle" | "playing" | "done",
    dotAngle: -Math.PI / 2,  // start at top (12 o'clock)
    speed: 1.6,               // rad/sec
    zoneAngle: 0.8,           // start angle of green zone
    zoneWidth: 0.62,          // width in radians (~35°)
    round: 1, streak: 0, bestStreak: 0, score: 0,
    flashAlpha: 0,
    flashGreen: true,
    particles: [] as Particle[],
    scorePopups: [] as { x: number; y: number; text: string; life: number; color: string }[],
  });
  const lastTimeRef = useRef(performance.now());

  // Randomise zone for next round
  const nextZone = (roundNum: number) => {
    const minWidth = Math.max(0.22, 0.62 - roundNum * 0.018);
    const angle = Math.random() * Math.PI * 2;
    stRef.current.zoneAngle = angle;
    stRef.current.zoneWidth = minWidth;
  };

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;

    const draw = (timestamp: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;
      const st = stRef.current;
      const now = timestamp;

      // Advance sweep dot
      if (st.phase === "playing") {
        st.dotAngle += dt * st.speed;
      }

      ctx.clearRect(0, 0, W_CV, H_CV);

      // BG
      ctx.fillStyle = "#04000e"; ctx.fillRect(0, 0, W_CV, H_CV);

      // Radial BG glow (streak-colored)
      const streakGlow = Math.min(1, st.streak / 10);
      const bgG = ctx.createRadialGradient(CX, CY, 20, CX, CY, RING_R * 1.5);
      bgG.addColorStop(0, `rgba(${st.streak >= 10 ? "255,215,0" : st.streak >= 5 ? "180,30,220" : "0,50,120"},${0.06 + streakGlow * 0.12})`);
      bgG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bgG; ctx.fillRect(0, 0, W_CV, H_CV);

      // Grid lines (faint)
      ctx.save(); ctx.globalAlpha = 0.04;
      for (let gx = 0; gx < W_CV; gx += 24) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H_CV); ctx.strokeStyle = "#00d2ff"; ctx.lineWidth = 0.5; ctx.stroke(); }
      for (let gy = 0; gy < H_CV; gy += 24) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W_CV, gy); ctx.strokeStyle = "#00d2ff"; ctx.lineWidth = 0.5; ctx.stroke(); }
      ctx.restore();

      if (st.phase === "playing" || st.phase === "done") {
        const innerR = RING_R - RING_W;

        // Track (dark ring)
        ctx.beginPath(); ctx.arc(CX, CY, RING_R, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(30,60,120,0.6)"; ctx.lineWidth = RING_W; ctx.stroke();

        // Inner ring shadow
        ctx.beginPath(); ctx.arc(CX, CY, RING_R, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,100,255,0.05)"; ctx.lineWidth = RING_W + 4; ctx.stroke();

        // Green zone arc
        const zs = st.zoneAngle;
        const ze = st.zoneAngle + st.zoneWidth;
        // Zone glow
        ctx.save();
        ctx.shadowColor = "rgba(0,255,136,0.8)"; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(CX, CY, RING_R, zs, ze);
        ctx.strokeStyle = "rgba(0,255,136,0.55)"; ctx.lineWidth = RING_W; ctx.stroke();
        ctx.restore();
        // Zone edge markers
        for (const angle of [zs, ze]) {
          const tx = CX + Math.cos(angle) * RING_R;
          const ty = CY + Math.sin(angle) * RING_R;
          ctx.save();
          ctx.shadowColor = "rgba(0,255,136,0.9)"; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#00ff88"; ctx.fill();
          ctx.restore();
        }

        // Tick marks at cardinal points
        ctx.save(); ctx.strokeStyle = "rgba(0,180,255,0.12)"; ctx.lineWidth = 1;
        for (let t = 0; t < 12; t++) {
          const ta = (t / 12) * Math.PI * 2;
          const inner = RING_R - RING_W / 2 - 6, outer2 = RING_R - RING_W / 2 + 6;
          ctx.beginPath();
          ctx.moveTo(CX + Math.cos(ta) * inner, CY + Math.sin(ta) * inner);
          ctx.lineTo(CX + Math.cos(ta) * outer2, CY + Math.sin(ta) * outer2);
          ctx.stroke();
        }
        ctx.restore();

        // Sweep dot
        const da = normaliseAngle(st.dotAngle);
        const dx = CX + Math.cos(da) * RING_R;
        const dy = CY + Math.sin(da) * RING_R;

        // Check if dot is in zone
        const zoneNorm = normaliseAngle(st.zoneAngle);
        const zoneEnd = normaliseAngle(st.zoneAngle + st.zoneWidth);
        const inZone = zoneNorm < zoneEnd
          ? (da >= zoneNorm && da <= zoneEnd)
          : (da >= zoneNorm || da <= zoneEnd);

        const dotColor = inZone ? [0, 255, 136] : [255, 80, 80];
        ctx.save();
        ctx.shadowColor = `rgba(${dotColor[0]},${dotColor[1]},${dotColor[2]},0.9)`;
        ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.arc(dx, dy, 10, 0, Math.PI * 2);
        const dotG = ctx.createRadialGradient(dx - 3, dy - 3, 0, dx, dy, 10);
        dotG.addColorStop(0, `rgba(${dotColor[0]},${dotColor[1]},${dotColor[2]},1)`);
        dotG.addColorStop(1, `rgba(${dotColor[0]},${dotColor[1]},${dotColor[2]},0.3)`);
        ctx.fillStyle = dotG; ctx.fill();
        // Trail behind dot
        for (let t = 1; t <= 6; t++) {
          const ta2 = da - t * 0.06;
          const tx2 = CX + Math.cos(ta2) * RING_R, ty2 = CY + Math.sin(ta2) * RING_R;
          ctx.beginPath(); ctx.arc(tx2, ty2, 5 - t * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${dotColor[0]},${dotColor[1]},${dotColor[2]},${0.25 - t * 0.04})`; ctx.fill();
        }
        ctx.restore();

        // Center HUD
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        // Round
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillText(`${st.round}/${TOTAL_ROUNDS}`, CX, CY - 28);
        // Score
        ctx.font = "bold 22px monospace";
        ctx.fillStyle = "#ffd700";
        ctx.fillText(`${st.score}`, CX, CY);
        // Streak
        const sColor = st.streak >= 10 ? "#ffd700" : st.streak >= 5 ? "#e040fb" : st.streak >= 3 ? "#00d2ff" : "rgba(0,255,136,0.7)";
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = sColor;
        ctx.fillText(`🔥 ×${st.streak}`, CX, CY + 22);

        // Ring inner border
        ctx.beginPath(); ctx.arc(CX, CY, innerR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,100,255,0.12)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(CX, CY, RING_R + RING_W / 2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,100,255,0.08)"; ctx.lineWidth = 1; ctx.stroke();

        // Flash overlay on ring
        if (st.flashAlpha > 0) {
          st.flashAlpha = Math.max(0, st.flashAlpha - 0.06);
          const [fr, fg, fb] = st.flashGreen ? [0, 255, 136] : [255, 80, 80];
          ctx.beginPath(); ctx.arc(CX, CY, RING_R, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${fr},${fg},${fb},${st.flashAlpha * 0.5})`;
          ctx.lineWidth = RING_W + 8; ctx.stroke();
        }
      }

      // Particles
      for (const p of st.particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--;
        const a = p.life / p.maxLife;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 * a + 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a})`; ctx.fill();
      }
      st.particles = st.particles.filter(p => p.life > 0);

      // Score popups
      for (const pop of st.scorePopups) {
        pop.life--;
        const a = pop.life / 28;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = "bold 14px monospace";
        ctx.fillStyle = `rgba(${pop.color === "green" ? "0,255,136" : "255,80,80"},${a})`;
        ctx.fillText(pop.text, pop.x, pop.y - (28 - pop.life) * 1.2);
      }
      st.scorePopups = st.scorePopups.filter(p => p.life > 0);

      rafRef.current = requestAnimationFrame(draw);
    };

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const handleTap = useCallback(() => {
    const st = stRef.current;
    if (st.phase !== "playing") return;

    const da = normaliseAngle(st.dotAngle);
    const zoneNorm = normaliseAngle(st.zoneAngle);
    const zoneEnd = normaliseAngle(st.zoneAngle + st.zoneWidth);
    const inZone = zoneNorm < zoneEnd
      ? (da >= zoneNorm && da <= zoneEnd)
      : (da >= zoneNorm || da <= zoneEnd);

    // Dot position on screen (for popups/particles)
    const dx = CX + Math.cos(da) * RING_R;
    const dy = CY + Math.sin(da) * RING_R;

    if (inZone) {
      const zoneCenter = normaliseAngle(st.zoneAngle + st.zoneWidth / 2);
      const angleDiff = Math.abs(normaliseAngle(da - zoneCenter));
      const precision = 1 - Math.min(1, angleDiff / (st.zoneWidth / 2));
      const pts = Math.floor(10 + precision * 20 + st.streak * 5);

      st.score += pts; st.streak++;
      if (st.streak > st.bestStreak) st.bestStreak = st.streak;
      st.flashAlpha = 1; st.flashGreen = true;

      // Burst particles (green)
      for (let k = 0; k < 16; k++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2.5 + Math.random() * 4;
        st.particles.push({ x: dx, y: dy, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 0.5, life: 24 + Math.floor(Math.random() * 16), maxLife: 40, r: 0, g: 255, b: 136 });
      }
      st.scorePopups.push({ x: CX, y: CY - 50, text: `+${pts}`, life: 28, color: "green" });

      setScore(st.score); setStreak(st.streak); setBestStreak(st.bestStreak);
      setLastResult("hit");
    } else {
      st.streak = 0; st.flashAlpha = 1; st.flashGreen = false;
      // Red sparks
      for (let k = 0; k < 8; k++) {
        const angle = Math.random() * Math.PI * 2;
        st.particles.push({ x: dx, y: dy, vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2, life: 16, maxLife: 16, r: 255, g: 60, b: 60 });
      }
      st.scorePopups.push({ x: CX, y: CY - 50, text: "MISS", life: 22, color: "red" });
      setStreak(0); setLastResult("miss");
    }

    const nextRound = st.round + 1;
    if (nextRound > TOTAL_ROUNDS) {
      st.phase = "done";
      setPhase("done");
      const earned = st.score + st.bestStreak * 10;
      setRewardSC(earned);
      const a = authFields();
      postJson("/webapp/api/v2/player/action", {
        ...a, action_key: "game_streak_challenge",
        action_request_id: buildActionRequestId("game_streak_challenge"),
        payload: { best_streak: st.bestStreak, rounds: TOTAL_ROUNDS, reward_sc: earned },
      }).catch(() => {});
    } else {
      st.round = nextRound;
      st.speed = Math.min(4.2, 1.6 + (nextRound - 1) * 0.12);
      nextZone(nextRound);
      setRound(nextRound);
    }
  }, []);

  const startGame = useCallback(() => {
    const st = stRef.current;
    st.phase = "playing"; st.dotAngle = -Math.PI / 2; st.speed = 1.6;
    st.round = 1; st.streak = 0; st.bestStreak = 0; st.score = 0;
    st.flashAlpha = 0; st.particles = []; st.scorePopups = [];
    nextZone(1);
    setPhase("playing"); setRound(1); setStreak(0); setBestStreak(0);
    setScore(0); setRewardSC(0); setLastResult(null);
  }, []);

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); }, []);

  const streakColor = streak >= 10 ? "#ffd700" : streak >= 5 ? "#e040fb" : streak >= 3 ? "#00d2ff" : "#00ff88";

  return (
    <div style={{ background: "rgba(4,0,14,0.98)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(0,200,255,0.15)", marginTop: 8 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(0,200,255,0.04)", borderBottom: "1px solid rgba(0,200,255,0.08)" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#00d2ff", letterSpacing: 2 }}>🔥 STREAK RING</div>
          <div style={{ fontSize: 10, color: "rgba(0,200,255,0.4)", marginTop: 1 }}>
            {isTr ? "Yeşil bölgede yakala, seriyi koru" : "Catch the dot in the green arc · keep the streak"}
          </div>
        </div>
        {phase === "playing" && (
          <div style={{ display: "flex", gap: 10, fontFamily: "monospace", fontSize: 11 }}>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>{round}/{TOTAL_ROUNDS}</span>
            <span style={{ color: streakColor, fontWeight: 700 }}>🔥×{streak}</span>
            {lastResult && (
              <span style={{ color: lastResult === "hit" ? "#00ff88" : "#ff4444", fontSize: 10 }}>
                {lastResult === "hit" ? "✓" : "✗"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Idle */}
      {phase === "idle" && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12, filter: "drop-shadow(0 0 20px #00d2ff)" }}>🔥</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.7 }}>
            {isTr
              ? "Parlak nokta yeşil yayın içindeyken dokun! 20 tur, giderek hızlanır. Seri SC'yi katlar."
              : "Tap when the dot is inside the green arc! 20 rounds, speed increases. Streaks multiply SC."}
          </div>
          <button onClick={startGame} style={{ background: "linear-gradient(135deg,#00d2ff,#8000ff)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 24px rgba(0,200,255,0.3)" }}>
            {isTr ? "BAŞLA (20 TUR)" : "START (20 ROUNDS)"}
          </button>
        </div>
      )}

      {/* Canvas */}
      {phase === "playing" && (
        <>
          <canvas
            ref={canvasRef} width={W_CV} height={H_CV}
            onClick={handleTap}
            style={{ display: "block", width: "100%", cursor: "pointer", touchAction: "none" }}
          />
          <button
            onClick={handleTap}
            style={{
              display: "block", width: "calc(100% - 32px)", margin: "0 16px 16px",
              background: "linear-gradient(135deg,rgba(0,255,136,0.15),rgba(0,200,255,0.1))",
              border: "1px solid rgba(0,255,136,0.35)", borderRadius: 14,
              padding: "14px 0", fontSize: 18, fontWeight: 800, color: "#00ff88",
              cursor: "pointer", letterSpacing: 4, fontFamily: "monospace",
            }}
          >
            {isTr ? "DOKUN!" : "TAP!"}
          </button>
        </>
      )}
      {phase !== "playing" && (
        <canvas ref={canvasRef} width={W_CV} height={H_CV} style={{ display: "none" }} />
      )}

      {/* Done */}
      {phase === "done" && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#ffd700", marginBottom: 4, fontFamily: "monospace" }}>+{rewardSC} SC</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
            {score} {isTr ? "puan" : "pts"} · {isTr ? `En iyi seri: ${bestStreak}` : `Best streak: ${bestStreak}`} · 20 {isTr ? "tur" : "rounds"}
          </div>
          <button onClick={startGame} style={{ background: "linear-gradient(135deg,#00d2ff,#8000ff)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {isTr ? "Tekrar Oyna" : "Play Again"}
          </button>
        </div>
      )}
    </div>
  );
}
