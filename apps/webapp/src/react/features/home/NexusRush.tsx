import { useState, useCallback, useRef, useEffect } from "react";
import { buildActionRequestId, postJson } from "../../api/common";
import type { WebAppAuth } from "../../types";
import type { Lang } from "../../i18n";

type NexusRushProps = { lang: Lang; auth?: WebAppAuth | null };

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

const LANE_COUNT = 4;
const GAME_SECS  = 30;
const W_CV = 340, H_CV = 185;

type Obstacle = { y: number; walls: boolean[]; color: string };
type Crystal  = { y: number; lane: number; alive: boolean };
type Spark    = { x: number; y: number; vx: number; vy: number; life: number; r: number; g: number; b: number };

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS RUSH — 3D Tunnel Lane Runner
// Tap left / right half to dodge obstacles. Collect crystals.
// ═══════════════════════════════════════════════════════════════════════════════
export function NexusRush({ lang, auth }: NexusRushProps) {
  const isTr = lang === "tr";
  const [phase, setPhase]     = useState<"idle"|"playing"|"done">("idle");
  const [score, setScore]     = useState(0);
  const [gems, setGems]       = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECS);
  const [reward, setReward]   = useState<number|null>(null);
  const [hp, setHp]           = useState(3);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const timerRef  = useRef<ReturnType<typeof setInterval>|null>(null);
  const stRef     = useRef({
    phase: "idle" as "idle"|"playing"|"done",
    lane: 1,                     // 0-3
    hp: 3,
    score: 0,
    gemCount: 0,
    obstacles: [] as Obstacle[],
    crystals: [] as Crystal[],
    sparks: [] as Spark[],
    speed: 2.8,
    elapsed: 0,                  // seconds elapsed (float)
    frameCount: 0,
    spawnCooldown: 0,
    invincible: 0,               // frames
    hitFlash: 0,
    collectFlash: 0,
    tunnelPhase: 0,              // animation phase for tunnel rings
  });

  const colW = W_CV / LANE_COUNT;
  const PLAYER_Y = H_CV - 32;

  // ── Finish game ──
  const finishGame = useCallback((finalHp: number) => {
    const st = stRef.current;
    if (st.phase === "done") return;
    st.phase = "done";
    if (timerRef.current) clearInterval(timerRef.current);
    const earned = Math.floor(st.score + st.gemCount * 30);
    setReward(earned);
    setPhase("done");
    const a = authFields(auth);
    postJson("/webapp/api/v2/player/action", {
      ...a,
      action_key: "game_nexus_rush",
      action_request_id: buildActionRequestId("game_nexus_rush"),
      payload: { score: Math.floor(st.score), gems: st.gemCount, hp: finalHp, reward_sc: earned }
    }).catch(() => {});
  }, [auth]);

  // ── Start game ──
  const startGame = useCallback(() => {
    const st = stRef.current;
    st.phase = "playing";
    st.lane = 1;
    st.hp = 3;
    st.score = 0;
    st.gemCount = 0;
    st.obstacles = [];
    st.crystals = [];
    st.sparks = [];
    st.speed = 2.8;
    st.elapsed = 0;
    st.frameCount = 0;
    st.spawnCooldown = 0;
    st.invincible = 0;
    st.hitFlash = 0;
    st.collectFlash = 0;
    st.tunnelPhase = 0;
    setPhase("playing");
    setScore(0);
    setGems(0);
    setHp(3);
    setTimeLeft(GAME_SECS);
    setReward(null);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { finishGame(stRef.current.hp); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [finishGame]);

  // ── Tap handler: move left/right ──
  const handleTap = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const st = stRef.current;
    if (st.phase !== "playing") return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const prevLane = st.lane;
    if (x < W_CV * 0.5) {
      st.lane = Math.max(0, st.lane - 1);
    } else {
      st.lane = Math.min(LANE_COUNT - 1, st.lane + 1);
    }
    if (st.lane !== prevLane) {
      // Lane-change spark trail
      const px = prevLane * colW + colW / 2;
      for (let i = 0; i < 6; i++) {
        st.sparks.push({ x: px, y: PLAYER_Y, vx: (Math.random()-0.5)*3, vy: (Math.random()-1)*2.5, life: 0.8+Math.random()*0.4, r:0,g:210,b:255 });
      }
    }
  }, [colW, PLAYER_Y]);

  // ── Draw loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;

    const OBS_COLORS = ["#ff4444","#e040fb","#ff8c00","#00d2ff","#ff2266"];

    const spawnObstacle = (st: typeof stRef.current) => {
      // At least 1 gap, always passable
      const numGaps = st.elapsed > 20 ? 1 : (Math.random() < 0.35 ? 2 : 1);
      const walls = [true, true, true, true];
      const gapLanes = new Set<number>();
      while (gapLanes.size < numGaps) gapLanes.add(Math.floor(Math.random() * LANE_COUNT));
      gapLanes.forEach(l => { walls[l] = false; });
      st.obstacles.push({ y: -20, walls, color: OBS_COLORS[Math.floor(Math.random() * OBS_COLORS.length)] });
    };

    const spawnCrystal = (st: typeof stRef.current) => {
      st.crystals.push({ y: -16, lane: Math.floor(Math.random() * LANE_COUNT), alive: true });
    };

    const draw = () => {
      if (!alive) return;
      const st = stRef.current;
      ctx.clearRect(0, 0, W_CV, H_CV);

      // ── Background: deep space ──
      ctx.fillStyle = "#04000f";
      ctx.fillRect(0, 0, W_CV, H_CV);

      // ── 3D CYLINDRICAL TUNNEL RINGS ──
      const tn = Date.now() * 0.001;
      st.tunnelPhase += 0.018;
      const RING_COLORS = ["#00d2ff","#e040fb","#00ff88","#ffd700"];
      const VP_X = W_CV / 2, VP_Y = H_CV * 0.12; // vanishing point
      for (let i = 0; i < 12; i++) {
        const t = ((i / 12 + st.tunnelPhase) % 1);
        if (t < 0.04) continue;
        const scale = t * t; // quadratic = more perspective bunching near VP
        const rw = W_CV * 0.52 * scale;
        const rh = H_CV * 0.48 * scale;
        const cx = VP_X;
        const cy = VP_Y + (H_CV * 0.42 - VP_Y) * scale;
        const alpha = scale * 0.28;
        const col = RING_COLORS[i % RING_COLORS.length];
        ctx.save();
        // Outer glow ring
        ctx.globalAlpha = alpha * 0.35;
        ctx.strokeStyle = col;
        ctx.lineWidth = 6 + scale * 8;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rw, rh * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Inner sharp ring
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.5 + scale * 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rw, rh * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // ── Scanlines ──
      for (let y = 0; y < H_CV; y += 4) {
        ctx.save();
        ctx.globalAlpha = 0.025;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, y, W_CV, 2);
        ctx.restore();
      }

      // ── PERSPECTIVE LANE DIVIDERS (converge at VP) ──
      for (let c = 0; c <= LANE_COUNT; c++) {
        const xBottom = c * colW;
        const xTop = VP_X + (xBottom - VP_X) * 0.08; // converge toward VP
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = "#00d2ff";
        ctx.lineWidth = 0.8;
        ctx.setLineDash([5, 8]);
        ctx.beginPath(); ctx.moveTo(xTop, 0); ctx.lineTo(xBottom, H_CV); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      if (st.phase === "playing") {
        st.frameCount++;
        st.elapsed += 1/60;
        // Speed ramp
        st.speed = 2.8 + st.elapsed * 0.10;
        st.score += st.speed * 0.04;

        // ── Spawn obstacles ──
        st.spawnCooldown--;
        if (st.spawnCooldown <= 0) {
          spawnObstacle(st);
          st.spawnCooldown = Math.max(30, Math.round(85 - st.elapsed * 1.8));
        }
        // ── Spawn crystals ──
        if (Math.random() < 0.004 + st.elapsed * 0.00015) spawnCrystal(st);

        const playerX = st.lane * colW + colW / 2;

        // ── Update & draw obstacles ──
        st.obstacles = st.obstacles.filter(obs => {
          obs.y += st.speed;
          if (obs.y > H_CV + 30) return false;

          const depthFrac = Math.max(0, Math.min(1, obs.y / H_CV));
          const blockH = 10 + depthFrac * 10;

          for (let c = 0; c < LANE_COUNT; c++) {
            if (!obs.walls[c]) continue;
            const bx = c * colW + 2;
            const bw = colW - 4;

            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = obs.color;

            // Perspective factor: how much to converge toward VP
            const vpFrac = Math.max(0.05, obs.y / H_CV);
            const topH = 4 + vpFrac * 8; // depth of top face (thicker when near)

            // Front face (main gradient block)
            const grad = ctx.createLinearGradient(bx, obs.y, bx, obs.y + blockH);
            grad.addColorStop(0, obs.color + "dd");
            grad.addColorStop(1, obs.color + "44");
            ctx.fillStyle = grad;
            ctx.fillRect(bx, obs.y, bw, blockH);

            // 3D Top face (perspective trapezoid converging toward VP)
            const leftVP  = VP_X + (bx - VP_X) * (vpFrac * 0.82);
            const rightVP = VP_X + (bx + bw - VP_X) * (vpFrac * 0.82);
            ctx.beginPath();
            ctx.moveTo(bx, obs.y);              // front-left
            ctx.lineTo(bx + bw, obs.y);         // front-right
            ctx.lineTo(rightVP, obs.y - topH);  // back-right (toward VP)
            ctx.lineTo(leftVP, obs.y - topH);   // back-left (toward VP)
            ctx.closePath();
            ctx.fillStyle = obs.color + "88";
            ctx.fill();

            // Top face highlight edge
            ctx.strokeStyle = obs.color + "55";
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Front face bottom edge glow
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = "#fff";
            ctx.fillRect(bx + 2, obs.y, bw - 4, 1.5);
            ctx.restore();

            // ── Collision ──
            if (
              obs.y + blockH > PLAYER_Y - 12 &&
              obs.y < PLAYER_Y + 16 &&
              st.invincible <= 0
            ) {
              st.hp--;
              setHp(st.hp);
              st.hitFlash = 18;
              st.invincible = 55;
              // Damage sparks
              for (let i = 0; i < 14; i++) {
                st.sparks.push({ x: playerX, y: PLAYER_Y, vx: (Math.random()-0.5)*5, vy: (Math.random()-1.5)*3.5, life: 1, r:255,g:60,b:60 });
              }
              if (st.hp <= 0) { finishGame(0); return false; }
            }
          }
          return true;
        });

        // ── Update & draw crystals ──
        st.crystals = st.crystals.filter(cr => {
          if (!cr.alive) return false;
          cr.y += st.speed * 0.85;
          if (cr.y > H_CV + 20) return false;

          // Collect check
          const crX = cr.lane * colW + colW / 2;
          if (
            cr.y + 12 > PLAYER_Y - 14 &&
            cr.y - 8 < PLAYER_Y + 16 &&
            cr.lane === st.lane
          ) {
            cr.alive = false;
            st.gemCount++;
            st.score += 30;
            st.collectFlash = 12;
            setGems(st.gemCount);
            // Collect sparks
            for (let i = 0; i < 10; i++) {
              st.sparks.push({ x: crX, y: cr.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-1)*3, life: 0.9, r:255,g:215,b:0 });
            }
            return false;
          }

          // Draw crystal
          const pulse = Math.sin(tn * 5 + cr.lane) * 0.3 + 0.7;
          ctx.save();
          ctx.globalAlpha = pulse;
          ctx.shadowBlur = 18;
          ctx.shadowColor = "#ffd700";
          // Diamond shape
          const cs = 9;
          ctx.fillStyle = "#ffd700";
          ctx.beginPath();
          ctx.moveTo(crX, cr.y - cs);
          ctx.lineTo(crX + cs * 0.65, cr.y);
          ctx.lineTo(crX, cr.y + cs * 0.8);
          ctx.lineTo(crX - cs * 0.65, cr.y);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = pulse * 0.5;
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(crX - 2, cr.y - cs * 0.5);
          ctx.lineTo(crX + 2, cr.y - cs * 0.5);
          ctx.lineTo(crX, cr.y - cs * 0.1);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          return true;
        });

        // ── Update & draw sparks ──
        st.sparks = st.sparks.filter(sp => {
          sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.15; sp.life -= 0.045;
          if (sp.life <= 0) return false;
          ctx.save();
          ctx.globalAlpha = sp.life;
          ctx.fillStyle = `rgb(${sp.r},${sp.g},${sp.b})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = `rgb(${sp.r},${sp.g},${sp.b})`;
          ctx.beginPath(); ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI*2); ctx.fill();
          ctx.restore();
          return true;
        });

        // ── Invincibility blink ──
        if (st.invincible > 0) st.invincible--;
        const showPlayer = st.invincible <= 0 || Math.floor(st.invincible / 7) % 2 === 0;

        // ── Draw 3D player ship ──
        if (showPlayer) {
          ctx.save();
          const px = st.lane * colW + colW / 2;
          const shipH = 20;
          const accentColor = st.collectFlash > 0 ? "#ffd700" : "#00d2ff";
          const accentRGB = st.collectFlash > 0 ? "255,215,0" : "0,210,255";

          ctx.shadowBlur = 30;
          ctx.shadowColor = accentColor;

          // Ship body with gradient (3D lit from top-left)
          const bodyGrad = ctx.createLinearGradient(px - 12, PLAYER_Y - shipH, px + 12, PLAYER_Y + 8);
          bodyGrad.addColorStop(0, `rgba(${accentRGB},1)`);
          bodyGrad.addColorStop(0.5, `rgba(${accentRGB},0.7)`);
          bodyGrad.addColorStop(1, `rgba(${accentRGB},0.35)`);
          ctx.fillStyle = bodyGrad;
          ctx.beginPath();
          ctx.moveTo(px, PLAYER_Y - shipH);
          ctx.lineTo(px - 13, PLAYER_Y + 6);
          ctx.lineTo(px - 5, PLAYER_Y + 1);
          ctx.lineTo(px, PLAYER_Y + 8);
          ctx.lineTo(px + 5, PLAYER_Y + 1);
          ctx.lineTo(px + 13, PLAYER_Y + 6);
          ctx.closePath();
          ctx.fill();

          // Wing edge highlights
          ctx.strokeStyle = `rgba(${accentRGB},0.6)`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Cockpit dome (3D sphere highlight)
          const ckpGrad = ctx.createRadialGradient(px - 1, PLAYER_Y - shipH * 0.4, 0, px, PLAYER_Y - shipH * 0.3, 4);
          ckpGrad.addColorStop(0, "rgba(255,255,255,0.95)");
          ckpGrad.addColorStop(0.5, `rgba(${accentRGB},0.7)`);
          ckpGrad.addColorStop(1, "rgba(0,0,0,0.2)");
          ctx.fillStyle = ckpGrad;
          ctx.beginPath();
          ctx.arc(px, PLAYER_Y - shipH * 0.35, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Engine exhaust (dual trails)
          ctx.shadowBlur = 0;
          for (const dx of [-4, 4]) {
            const trailH = 10 + Math.random() * 6;
            const exGrad = ctx.createRadialGradient(px + dx, PLAYER_Y + 10, 0, px + dx, PLAYER_Y + 10 + trailH / 2, 6);
            exGrad.addColorStop(0, "rgba(224,64,251,0.8)");
            exGrad.addColorStop(0.5, "rgba(224,64,251,0.3)");
            exGrad.addColorStop(1, "rgba(224,64,251,0)");
            ctx.fillStyle = exGrad;
            ctx.beginPath();
            ctx.ellipse(px + dx, PLAYER_Y + 10, 3.5, trailH, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        if (st.collectFlash > 0) st.collectFlash--;

        // ── Hit flash overlay ──
        if (st.hitFlash > 0) {
          ctx.save();
          ctx.globalAlpha = (st.hitFlash / 18) * 0.35;
          ctx.fillStyle = "#ff0000";
          ctx.fillRect(0, 0, W_CV, H_CV);
          ctx.restore();
          st.hitFlash--;
        }

        // ── HUD ──
        // HP hearts
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.globalAlpha = i < st.hp ? 1 : 0.15;
          ctx.font = "bold 13px sans-serif";
          ctx.fillText("♥", 8 + i * 18, 16);
          ctx.fillStyle = i < st.hp ? "#ff4444" : "rgba(255,255,255,0.3)";
          ctx.restore();
        }
        // Score
        ctx.save();
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "#00d2ff";
        ctx.textAlign = "right";
        ctx.fillText(`${Math.floor(st.score)}`, W_CV - 6, 16);
        ctx.restore();
        // Gems
        ctx.save();
        ctx.font = "10px monospace";
        ctx.fillStyle = "#ffd700";
        ctx.textAlign = "right";
        ctx.fillText(`💎${st.gemCount}`, W_CV - 6, 30);
        ctx.restore();

        // Speed indicator strip at bottom
        const speedPct = Math.min(1, (st.speed - 2.8) / 3.0);
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = `hsl(${120 - speedPct*120}, 100%, 55%)`;
        ctx.fillRect(0, H_CV - 3, W_CV * speedPct, 3);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [colW, PLAYER_Y, finishGame]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const rankLabel = (r: number) =>
    r >= 400 ? (isTr ? "⚡ Efsane Pilot" : "⚡ Legend Pilot")
    : r >= 200 ? (isTr ? "🚀 Uzay Askeri" : "🚀 Space Marine")
    : r >= 80  ? (isTr ? "🛸 Yükselen" : "🛸 Rising")
    : (isTr ? "🪐 Çaylak" : "🪐 Rookie");

  return (
    <div style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={W_CV} height={H_CV}
        style={{ width: "100%", borderRadius: 12, display: "block",
          cursor: phase === "playing" ? "pointer" : "default",
          boxShadow: phase === "playing" ? "0 0 24px rgba(0,210,255,0.18)" : undefined }}
        onClick={handleTap}
      />

      {/* ── IDLE overlay ── */}
      {phase === "idle" && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: 12,
          background: "rgba(4,0,15,0.88)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10
        }}>
          <div style={{ fontSize: 32 }}>🚀</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#00d2ff", letterSpacing: 2 }}>
            NEXUS RUSH
          </div>
          <div style={{ fontSize: 10, opacity: 0.55, textAlign: "center", maxWidth: 200, lineHeight: 1.5 }}>
            {isTr
              ? "Sol yarıya dokun → sola geç · Sağ yarıya → sağa geç\nEngelleri geç, kristalleri topla · 3 can"
              : "Tap left → move left · Tap right → move right\nDodge obstacles, collect crystals · 3 lives"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Engel→Geç","💎+30 SC","Hız↑"].map((h, i) => (
              <span key={i} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5,
                background: "rgba(0,210,255,0.1)", border: "1px solid rgba(0,210,255,0.2)", color: "#00d2ff" }}>
                {h}
              </span>
            ))}
          </div>
          <button
            className="akrBtn akrBtnAccent"
            onClick={startGame}
            style={{ fontSize: 13, fontWeight: 800, padding: "10px 28px", marginTop: 4,
              boxShadow: "0 0 20px rgba(0,210,255,0.35)", letterSpacing: 1 }}
          >
            {isTr ? "🚀 BAŞLAT" : "🚀 LAUNCH"}
          </button>
        </div>
      )}

      {/* ── PLAYING top bar ── */}
      {phase === "playing" && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "4px 8px", pointerEvents: "none"
        }}>
          <div style={{ display: "flex", gap: 3 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ fontSize: 13, opacity: i < hp ? 1 : 0.18, color: "#ff4444" }}>♥</span>
            ))}
          </div>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "#ffd700" }}>
            💎 {gems}
          </div>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00d2ff", fontWeight: 700 }}>
            {timeLeft}s
          </div>
        </div>
      )}

      {/* ── DONE overlay ── */}
      {phase === "done" && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: 12,
          background: "rgba(4,0,15,0.92)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8
        }}>
          <div style={{ fontSize: 30 }}>
            {stRef.current.hp <= 0 ? "💥" : "🏁"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: stRef.current.hp <= 0 ? "#ff4444" : "#00d2ff" }}>
            {stRef.current.hp <= 0
              ? (isTr ? "Gemi yok edildi!" : "Ship destroyed!")
              : (isTr ? "Görev tamamlandı!" : "Mission complete!")}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {reward !== null && (
              <span style={{ fontSize: 13, fontWeight: 800, color: "#ffd700", fontFamily: "monospace",
                background: "rgba(255,215,0,0.1)", padding: "4px 12px", borderRadius: 8 }}>
                +{reward} SC
              </span>
            )}
            <span style={{ fontSize: 11, color: "#00d2ff", fontFamily: "monospace",
              background: "rgba(0,210,255,0.1)", padding: "4px 10px", borderRadius: 8 }}>
              💎 {gems}
            </span>
          </div>
          {reward !== null && (
            <div style={{ fontSize: 11, opacity: 0.7, color: "#00ff88" }}>{rankLabel(reward)}</div>
          )}
          <button className="akrBtn akrBtnGhost" onClick={startGame}
            style={{ fontSize: 11, padding: "8px 22px", marginTop: 4 }}>
            {isTr ? "🔄 Tekrar" : "🔄 Retry"}
          </button>
        </div>
      )}
    </div>
  );
}
