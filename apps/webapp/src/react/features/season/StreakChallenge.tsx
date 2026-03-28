import { useState, useCallback, useRef, useEffect } from "react";
import type { Lang } from "../../i18n";
import { buildActionRequestId, postJson } from "../../api/common";

type StreakChallengeProps = { lang: Lang };

function authFields() {
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

const W_CV = 320, H_CV = 280;
const CX = W_CV / 2, CY = 130;
const RING_R = 86;
const RING_W = 24;
const TOTAL_ROUNDS = 20;
const TILT = 0.35; // 3D tilt factor (0 = flat, 1 = full side view)

type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; maxLife: number; r: number; g: number; b: number; size: number };

function normaliseAngle(a: number): number {
  return ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

/** Project ring angle to tilted 3D ellipse coordinates */
function ringPos(angle: number): { x: number; y: number; z: number } {
  const x = CX + Math.cos(angle) * RING_R;
  const yFlat = CY + Math.sin(angle) * RING_R;
  const y = CY + Math.sin(angle) * RING_R * TILT;
  const z = Math.sin(angle); // -1 = back, +1 = front
  return { x, y, z };
}

/**
 * StreakChallenge: 3D Plasma timing ring. Dot sweeps a tilted ring —
 * tap when inside the green arc. 20 rounds, increasing speed, streak bonuses.
 */
export function StreakChallenge({ lang }: StreakChallengeProps) {
  const isTr = lang === "tr";
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [round, setRound] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [rewardSC, setRewardSC] = useState(0);
  const [lastResult, setLastResult] = useState<"hit" | "miss" | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const stRef = useRef({
    phase: "idle" as "idle" | "playing" | "done",
    dotAngle: -Math.PI / 2,
    speed: 1.6,
    zoneAngle: 0.8,
    zoneWidth: 0.62,
    round: 1, streak: 0, bestStreak: 0, score: 0,
    flashAlpha: 0,
    flashGreen: true,
    particles: [] as Particle[],
    scorePopups: [] as { x: number; y: number; text: string; life: number; color: string }[],
    time: 0,
  });
  const lastTimeRef = useRef(performance.now());

  const nextZone = (roundNum: number) => {
    const minWidth = Math.max(0.22, 0.62 - roundNum * 0.018);
    stRef.current.zoneAngle = Math.random() * Math.PI * 2;
    stRef.current.zoneWidth = minWidth;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;

    /** Draw 3D tilted elliptical arc */
    const drawTiltedArc = (startAngle: number, endAngle: number, radius: number, lineWidth: number, segments: number = 60) => {
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      let first = true;
      const step = (endAngle - startAngle) / segments;
      for (let i = 0; i <= segments; i++) {
        const a = startAngle + i * step;
        const px = CX + Math.cos(a) * radius;
        const py = CY + Math.sin(a) * radius * TILT;
        first ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        first = false;
      }
      ctx.stroke();
    };

    const draw = (timestamp: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;
      const st = stRef.current;
      st.time = timestamp * 0.001;
      const t = st.time;

      if (st.phase === "playing") {
        st.dotAngle += dt * st.speed;
      }

      ctx.clearRect(0, 0, W_CV, H_CV);

      // === BACKGROUND ===
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H_CV);
      bgGrad.addColorStop(0, "#030612");
      bgGrad.addColorStop(0.5, "#04000e");
      bgGrad.addColorStop(1, "#06081a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W_CV, H_CV);

      // Perspective floor grid
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = "#00d2ff";
      ctx.lineWidth = 0.5;
      for (let row = 0; row < 8; row++) {
        const y = CY + 30 + row * 28;
        if (y > H_CV) break;
        const spread = 0.6 + row * 0.05;
        ctx.beginPath();
        ctx.moveTo(W_CV * (0.5 - spread * 0.5), y);
        ctx.lineTo(W_CV * (0.5 + spread * 0.5), y);
        ctx.stroke();
      }
      for (let col = -4; col <= 4; col++) {
        ctx.beginPath();
        ctx.moveTo(CX + col * 6, CY + 30);
        ctx.lineTo(CX + col * 40, H_CV);
        ctx.stroke();
      }
      ctx.restore();

      // Streak-colored ambient glow
      const streakGlow = Math.min(1, st.streak / 10);
      const bgG = ctx.createRadialGradient(CX, CY, 20, CX, CY, RING_R * 1.8);
      const glowColor = st.streak >= 10 ? "255,215,0" : st.streak >= 5 ? "180,30,220" : "0,80,200";
      bgG.addColorStop(0, `rgba(${glowColor},${0.05 + streakGlow * 0.1})`);
      bgG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bgG; ctx.fillRect(0, 0, W_CV, H_CV);

      if (st.phase === "playing" || st.phase === "done") {
        // === 3D RING SHADOW on floor ===
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        ctx.ellipse(CX, CY + RING_R * 0.8, RING_R * 1.1, RING_R * 0.18, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,100,255,0.3)";
        ctx.fill();
        ctx.restore();

        // === 3D TILTED RING TRACK (back half first) ===
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "rgba(30,60,120,0.8)";
        drawTiltedArc(0, Math.PI, RING_R, RING_W); // back half
        ctx.restore();

        // === GREEN ZONE ARC ===
        const zs = st.zoneAngle;
        const ze = st.zoneAngle + st.zoneWidth;
        ctx.save();
        ctx.shadowColor = "rgba(0,255,136,0.8)"; ctx.shadowBlur = 20;
        ctx.strokeStyle = "rgba(0,255,136,0.55)";
        drawTiltedArc(zs, ze, RING_R, RING_W, 30);
        ctx.restore();

        // Zone edge markers (3D projected)
        for (const angle of [zs, ze]) {
          const pos = ringPos(angle);
          const sz = 4 + (pos.z + 1) * 1.5; // larger when in front
          ctx.save();
          ctx.shadowColor = "rgba(0,255,136,0.9)"; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, sz, 0, Math.PI * 2);
          ctx.fillStyle = "#00ff88"; ctx.fill();
          ctx.restore();
        }

        // Front half of ring (draws over zone)
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "rgba(30,60,120,0.8)";
        drawTiltedArc(Math.PI, Math.PI * 2, RING_R, RING_W); // front half
        ctx.restore();

        // Tick marks (3D projected)
        ctx.save();
        for (let i = 0; i < 12; i++) {
          const ta = (i / 12) * Math.PI * 2;
          const inner = ringPos(ta);
          inner.x = CX + Math.cos(ta) * (RING_R - 8);
          inner.y = CY + Math.sin(ta) * (RING_R - 8) * TILT;
          const outer = { x: CX + Math.cos(ta) * (RING_R + 8), y: CY + Math.sin(ta) * (RING_R + 8) * TILT };
          ctx.beginPath();
          ctx.moveTo(inner.x, inner.y);
          ctx.lineTo(outer.x, outer.y);
          ctx.strokeStyle = `rgba(0,180,255,${0.08 + inner.z * 0.05})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();

        // === SWEEP DOT (3D projected) ===
        const da = normaliseAngle(st.dotAngle);
        const dotPos = ringPos(da);
        const zoneNorm = normaliseAngle(st.zoneAngle);
        const zoneEnd = normaliseAngle(st.zoneAngle + st.zoneWidth);
        const inZone = zoneNorm < zoneEnd
          ? (da >= zoneNorm && da <= zoneEnd)
          : (da >= zoneNorm || da <= zoneEnd);

        const dotColor = inZone ? [0, 255, 136] : [255, 80, 80];
        const dotSize = 8 + (dotPos.z + 1) * 3; // bigger when in front

        // Dot shadow on floor
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.ellipse(dotPos.x, CY + RING_R * 0.8, dotSize * 0.8, dotSize * 0.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${dotColor.join(",")})`;
        ctx.fill();
        ctx.restore();

        // Dot trail (3D)
        for (let i = 1; i <= 6; i++) {
          const ta = da - i * 0.06;
          const tp = ringPos(ta);
          const tSz = (dotSize - i * 1.2) * 0.7;
          if (tSz > 0) {
            ctx.beginPath(); ctx.arc(tp.x, tp.y, tSz, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${dotColor[0]},${dotColor[1]},${dotColor[2]},${0.2 - i * 0.03})`; ctx.fill();
          }
        }

        // Main dot with specular highlight
        ctx.save();
        ctx.shadowColor = `rgba(${dotColor[0]},${dotColor[1]},${dotColor[2]},0.9)`;
        ctx.shadowBlur = 24;
        ctx.beginPath(); ctx.arc(dotPos.x, dotPos.y, dotSize, 0, Math.PI * 2);
        const dotG = ctx.createRadialGradient(dotPos.x - dotSize * 0.3, dotPos.y - dotSize * 0.3, 0, dotPos.x, dotPos.y, dotSize);
        dotG.addColorStop(0, "#fff");
        dotG.addColorStop(0.3, `rgba(${dotColor[0]},${dotColor[1]},${dotColor[2]},1)`);
        dotG.addColorStop(1, `rgba(${dotColor[0]},${dotColor[1]},${dotColor[2]},0.3)`);
        ctx.fillStyle = dotG; ctx.fill();
        ctx.restore();

        // === CENTER HUD ===
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillText(`${st.round}/${TOTAL_ROUNDS}`, CX, CY - 26);
        ctx.save();
        ctx.shadowColor = "rgba(255,215,0,0.4)"; ctx.shadowBlur = 10;
        ctx.font = "bold 26px monospace";
        ctx.fillStyle = "#ffd700";
        ctx.fillText(`${st.score}`, CX, CY + 2);
        ctx.restore();
        const sColor = st.streak >= 10 ? "#ffd700" : st.streak >= 5 ? "#e040fb" : st.streak >= 3 ? "#00d2ff" : "rgba(0,255,136,0.7)";
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = sColor;
        ctx.fillText(`🔥 ×${st.streak}`, CX, CY + 24);

        // Flash overlay
        if (st.flashAlpha > 0) {
          st.flashAlpha = Math.max(0, st.flashAlpha - 0.05);
          const [fr, fg, fb] = st.flashGreen ? [0, 255, 136] : [255, 80, 80];
          ctx.save();
          ctx.strokeStyle = `rgba(${fr},${fg},${fb},${st.flashAlpha * 0.4})`;
          ctx.lineWidth = RING_W + 10;
          drawTiltedArc(0, Math.PI * 2, RING_R, RING_W + 10);
          ctx.restore();
        }
      }

      // 3D Particles (depth sorted)
      const sorted = [...st.particles].sort((a, b) => a.z - b.z);
      for (const p of sorted) {
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        p.vy += 0.06; p.life--;
        const a = p.life / p.maxLife;
        const scale = 0.5 + (p.z + 1) * 0.25;
        const sz = p.size * a * scale;
        ctx.save();
        ctx.globalAlpha = a * 0.3;
        ctx.beginPath(); ctx.arc(p.x, p.y, sz * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`; ctx.fill();
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`; ctx.fill();
        ctx.restore();
      }
      st.particles = st.particles.filter(p => p.life > 0);

      // Score popups
      for (const pop of st.scorePopups) {
        pop.life--;
        const a = pop.life / 28;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.save();
        ctx.shadowColor = pop.color === "green" ? "rgba(0,255,136,0.6)" : "rgba(255,80,80,0.6)";
        ctx.shadowBlur = 8;
        ctx.font = "bold 16px monospace";
        ctx.fillStyle = `rgba(${pop.color === "green" ? "0,255,136" : "255,80,80"},${a})`;
        ctx.fillText(pop.text, pop.x, pop.y - (28 - pop.life) * 1.4);
        ctx.restore();
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

    const dotPos = ringPos(da);

    if (inZone) {
      const zoneCenter = normaliseAngle(st.zoneAngle + st.zoneWidth / 2);
      const angleDiff = Math.abs(normaliseAngle(da - zoneCenter));
      const precision = 1 - Math.min(1, angleDiff / (st.zoneWidth / 2));
      const pts = Math.floor(10 + precision * 20 + st.streak * 5);

      st.score += pts; st.streak++;
      if (st.streak > st.bestStreak) st.bestStreak = st.streak;
      st.flashAlpha = 1; st.flashGreen = true;

      for (let k = 0; k < 20; k++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2.5 + Math.random() * 4;
        st.particles.push({
          x: dotPos.x, y: dotPos.y, z: dotPos.z + (Math.random() - 0.5) * 0.5,
          vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1,
          vz: (Math.random() - 0.5) * 0.02,
          life: 28 + Math.floor(Math.random() * 16), maxLife: 44,
          r: 0, g: 255, b: 136, size: 2 + Math.random() * 2,
        });
      }
      st.scorePopups.push({ x: CX, y: CY - 50, text: `+${pts}`, life: 28, color: "green" });
      setScore(st.score); setStreak(st.streak); setBestStreak(st.bestStreak);
      setLastResult("hit");
    } else {
      st.streak = 0; st.flashAlpha = 1; st.flashGreen = false;
      for (let k = 0; k < 10; k++) {
        const angle = Math.random() * Math.PI * 2;
        st.particles.push({
          x: dotPos.x, y: dotPos.y, z: dotPos.z,
          vx: Math.cos(angle) * 2.5, vy: Math.sin(angle) * 2.5,
          vz: 0, life: 18, maxLife: 18,
          r: 255, g: 60, b: 60, size: 2,
        });
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(0,200,255,0.04)", borderBottom: "1px solid rgba(0,200,255,0.08)" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#00d2ff", letterSpacing: 2 }}>🔥 3D STREAK RING</div>
          <div style={{ fontSize: 10, color: "rgba(0,200,255,0.4)", marginTop: 1 }}>
            {isTr ? "3D yüzükte yeşil bölgeyi yakala" : "Catch the dot on the 3D ring · keep the streak"}
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

      {phase === "idle" && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12, filter: "drop-shadow(0 0 20px #00d2ff)" }}>🔥</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.7 }}>
            {isTr
              ? "3D yüzükte parlak nokta yeşil bölgedeyken dokun! 20 tur, giderek hızlanır."
              : "Tap when the dot is inside the green arc on the 3D ring! 20 rounds, speed increases."}
          </div>
          <button onClick={startGame} style={{ background: "linear-gradient(135deg,#00d2ff,#8000ff)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 24px rgba(0,200,255,0.3)" }}>
            {isTr ? "BAŞLA (20 TUR)" : "START (20 ROUNDS)"}
          </button>
        </div>
      )}

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
