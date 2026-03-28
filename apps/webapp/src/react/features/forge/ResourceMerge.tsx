import { useState, useCallback, useRef, useEffect } from "react";
import type { Lang } from "../../i18n";
import { buildActionRequestId, postJson } from "../../api/common";

type ResourceMergeProps = { lang: Lang };

function authFields() {
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

type CellType = "sc" | "hc" | "rc" | "nxt" | "empty";
type Cell = { type: CellType; level: number };

const TYPE_RGB: Record<CellType, [number, number, number]> = {
  sc: [0, 255, 136], hc: [0, 210, 255], rc: [224, 64, 251], nxt: [255, 215, 0], empty: [30, 30, 60],
};
const TYPE_ICON: Record<CellType, string> = {
  sc: "💰", hc: "💎", rc: "🔮", nxt: "⭐", empty: "",
};

const COLS = 4, CW = 62, CH = 62, GAP = 6;
const W_CV = 300, H_CV = 340;
const GX0 = Math.round((W_CV - (COLS * CW + (COLS - 1) * GAP)) / 2);
const GY0 = 50;

function randomCell(): Cell {
  const types: CellType[] = ["sc", "sc", "sc", "hc", "hc", "rc"];
  return { type: types[Math.floor(Math.random() * types.length)], level: 1 };
}
function initGrid(): Cell[] { return Array.from({ length: 16 }, () => randomCell()); }

type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; g: number; b: number };
type CellFlash = { idx: number; alpha: number; r: number; g: number; b: number };

/**
 * ResourceMerge: Canvas 4×4 forge puzzle.
 * Merge same-type adjacent cells. Level 3 promotes: SC→HC→RC→NXT.
 * 30 seconds. Score + NXT bonus.
 */
export function ResourceMerge({ lang }: ResourceMergeProps) {
  const isTr = lang === "tr";
  const [phase,      setPhase]      = useState<"idle" | "playing" | "done">("idle");
  const [score,      setScore]      = useState(0);
  const [merges,     setMerges]     = useState(0);
  const [nxtCreated, setNxtCreated] = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(30);
  const [rewardSC,   setRewardSC]   = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const stRef     = useRef({
    phase: "idle" as "idle" | "playing" | "done",
    grid: [] as Cell[],
    selected: null as number | null,
    score: 0, merges: 0, nxtCreated: 0, timeLeft: 30,
    particles: [] as Particle[],
    flashes: [] as CellFlash[],
  });

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;

    const cellCenter = (i: number): [number, number] => {
      const col = i % COLS, row = Math.floor(i / COLS);
      return [GX0 + col * (CW + GAP) + CW / 2, GY0 + row * (CH + GAP) + CH / 2];
    };

    const drawRR = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const draw = () => {
      if (!alive) return;
      const st = stRef.current;
      const now = performance.now();
      ctx.clearRect(0, 0, W_CV, H_CV);

      // BG
      ctx.fillStyle = "#0a0514"; ctx.fillRect(0, 0, W_CV, H_CV);
      // Forge ambient glow
      const fg = ctx.createRadialGradient(W_CV / 2, H_CV / 2, 20, W_CV / 2, H_CV / 2, W_CV * 0.8);
      fg.addColorStop(0, "rgba(255,100,0,0.05)"); fg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fg; ctx.fillRect(0, 0, W_CV, H_CV);

      if (st.phase === "playing" || st.phase === "done") {
        // Timer bar
        const barW = W_CV - 40, barH = 6, barX = 20, barY = 12;
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        drawRR(barX, barY, barW, barH, 3); ctx.fill();
        const pct = st.timeLeft / 30;
        const [tr, tg, tb] = st.timeLeft <= 10 ? [255, 68, 68] : [255, 136, 0];
        ctx.fillStyle = `rgb(${tr},${tg},${tb})`;
        drawRR(barX, barY, barW * pct, barH, 3); ctx.fill();

        // HUD text
        ctx.font = "bold 11px monospace"; ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillStyle = `rgb(${tr},${tg},${tb})`;
        ctx.fillText(`⏱${st.timeLeft}s`, 20, 22);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff8800";
        ctx.fillText(`${st.score} pts`, W_CV / 2, 22);
        ctx.textAlign = "right";
        ctx.fillStyle = "#ffd700";
        ctx.fillText(`⭐${st.nxtCreated} NXT`, W_CV - 20, 22);

        // Grid
        for (let i = 0; i < 16; i++) {
          const cell = st.grid[i];
          if (!cell) continue;
          const [cx, cy] = cellCenter(i);
          const x = cx - CW / 2, y = cy - CH / 2;
          const [cr, cg, cb] = TYPE_RGB[cell.type];
          const isSelected = st.selected === i;
          const isNxt = cell.type === "nxt";

          ctx.save();

          // Glow
          ctx.shadowColor = `rgba(${cr},${cg},${cb},${isSelected ? 0.8 : isNxt ? 0.6 + 0.3 * Math.sin(now * 0.005) : 0.3})`;
          ctx.shadowBlur = isSelected ? 20 : isNxt ? 16 : 6;

          // Cell body
          drawRR(x + 1, y + 1, CW - 2, CH - 2, 8);
          const bg = ctx.createLinearGradient(x, y, x + CW, y + CH);
          bg.addColorStop(0, `rgba(${cr},${cg},${cb},${cell.type === "empty" ? 0.04 : 0.15})`);
          bg.addColorStop(1, `rgba(${cr},${cg},${cb},${cell.type === "empty" ? 0.02 : 0.06})`);
          ctx.fillStyle = bg; ctx.fill();

          // Border
          const borderAlpha = isSelected ? 0.9 : isNxt ? 0.6 + 0.3 * Math.sin(now * 0.005) : 0.3;
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${borderAlpha})`;
          ctx.lineWidth = isSelected ? 2.5 : 1.2;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Icon
          if (cell.type !== "empty") {
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = isNxt ? "22px serif" : "18px serif";
            ctx.fillText(TYPE_ICON[cell.type], cx, cy);

            // Level subscript
            if (cell.level > 1 && cell.type !== "nxt") {
              ctx.font = "bold 10px monospace";
              ctx.fillStyle = `rgba(${cr},${cg},${cb},0.9)`;
              ctx.textAlign = "right"; ctx.textBaseline = "bottom";
              ctx.fillText(`${cell.level}`, cx + CW / 2 - 5, cy + CH / 2 - 3);
            }
          }

          // Selected ring pulse
          if (isSelected) {
            const pulse = 0.4 + 0.4 * Math.sin(now * 0.008);
            ctx.beginPath(); ctx.arc(cx, cy, CW / 2 + 4, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${pulse})`; ctx.lineWidth = 2; ctx.stroke();
          }

          ctx.restore();
        }

        // Cell flashes
        for (const f of st.flashes) {
          f.alpha -= 0.04;
          if (f.alpha <= 0) continue;
          const [fx, fy] = cellCenter(f.idx);
          ctx.save();
          ctx.globalAlpha = f.alpha;
          ctx.beginPath(); ctx.arc(fx, fy, CW / 2 + 8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${f.r},${f.g},${f.b},0.3)`; ctx.fill();
          ctx.restore();
        }
        st.flashes = st.flashes.filter(f => f.alpha > 0);
      }

      // Particles
      for (const p of st.particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
        const a = p.life / p.maxLife;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.8 * a + 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a})`; ctx.fill();
      }
      st.particles = st.particles.filter(p => p.life > 0);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const isAdjacent = (a: number, b: number) => {
    const rA = Math.floor(a / 4), cA = a % 4;
    const rB = Math.floor(b / 4), cB = b % 4;
    return (Math.abs(rA - rB) + Math.abs(cA - cB)) === 1;
  };

  const cellCenter = (i: number): [number, number] => {
    const col = i % COLS, row = Math.floor(i / COLS);
    return [GX0 + col * (CW + GAP) + CW / 2, GY0 + row * (CH + GAP) + CH / 2];
  };

  const addBurst = (idx: number, rgb: [number, number, number], count: number) => {
    const st = stRef.current;
    const [cx, cy] = cellCenter(idx);
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 4;
      st.particles.push({
        x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1,
        life: 22 + Math.floor(Math.random() * 16), maxLife: 38,
        r: rgb[0], g: rgb[1], b: rgb[2],
      });
    }
  };

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const st = stRef.current;
    if (st.phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W_CV / rect.width);
    const my = (e.clientY - rect.top) * (H_CV / rect.height);

    // Find clicked cell
    for (let i = 0; i < 16; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const x = GX0 + col * (CW + GAP), y = GY0 + row * (CH + GAP);
      if (mx < x || mx > x + CW || my < y || my > y + CH) continue;
      const cell = st.grid[i];
      if (!cell || cell.type === "empty" || cell.type === "nxt") {
        st.selected = null; return;
      }

      if (st.selected === null) { st.selected = i; return; }
      if (st.selected === i) { st.selected = null; return; }

      const selCell = st.grid[st.selected];
      if (selCell.type === cell.type && selCell.level === cell.level && isAdjacent(st.selected, i)) {
        const newLevel = cell.level + 1;
        const srcIdx = st.selected;

        // Burst from source
        addBurst(srcIdx, TYPE_RGB[cell.type], 10);

        if (newLevel >= 3) {
          const promoMap: Record<string, CellType> = { sc: "hc", hc: "rc", rc: "nxt" };
          const promoted: CellType = (promoMap[cell.type] as CellType) || "nxt";

          if (promoted === "nxt") {
            st.grid[i] = { type: "nxt", level: 1 };
            st.nxtCreated++; st.score += 25;
            setNxtCreated(st.nxtCreated); setScore(st.score);
            // Gold mega burst
            addBurst(i, [255, 215, 0], 28);
          } else {
            st.grid[i] = { type: promoted, level: 1 };
            st.score += 10; setScore(st.score);
            // Promotion burst with new color
            addBurst(i, TYPE_RGB[promoted], 18);
          }
          // Flash on target
          const [pr, pg, pb] = TYPE_RGB[promoted === "nxt" ? "nxt" : promoted];
          st.flashes.push({ idx: i, alpha: 1, r: pr, g: pg, b: pb });
        } else {
          st.grid[i] = { type: cell.type, level: newLevel };
          st.score += 5; setScore(st.score);
          addBurst(i, TYPE_RGB[cell.type], 8);
          const [cr, cg, cb] = TYPE_RGB[cell.type];
          st.flashes.push({ idx: i, alpha: 0.7, r: cr, g: cg, b: cb });
        }

        st.grid[srcIdx] = randomCell();
        st.merges++; setMerges(st.merges);
      }
      st.selected = null;
      return;
    }
  }, []);

  const startGame = useCallback(() => {
    const st = stRef.current;
    st.grid = initGrid(); st.selected = null;
    st.score = 0; st.merges = 0; st.nxtCreated = 0; st.timeLeft = 30;
    st.particles = []; st.flashes = []; st.phase = "playing";
    setPhase("playing"); setScore(0); setMerges(0); setNxtCreated(0);
    setTimeLeft(30); setRewardSC(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const s = stRef.current;
      s.timeLeft--;
      setTimeLeft(s.timeLeft);
      if (s.timeLeft <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        s.phase = "done"; setPhase("done");
        const earned = s.score + s.nxtCreated * 50;
        setRewardSC(earned);
        const a = authFields();
        postJson("/webapp/api/v2/player/action", {
          ...a, action_key: "game_resource_merge",
          action_request_id: buildActionRequestId("game_resource_merge"),
          payload: { score: s.score, nxt: s.nxtCreated, reward_sc: earned },
        }).catch(() => {});
      }
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <div style={{ background: "rgba(10,5,20,0.98)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,136,0,0.15)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,136,0,0.04)", borderBottom: "1px solid rgba(255,136,0,0.08)" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#ff8800", letterSpacing: 2 }}>⚗️ NEXUS FORGE</div>
          <div style={{ fontSize: 10, color: "rgba(255,136,0,0.4)", marginTop: 1 }}>
            {isTr ? "Birleştir · Yükselt · NXT üret" : "Merge · Evolve · Create NXT"}
          </div>
        </div>
        {phase === "playing" && (
          <div style={{ display: "flex", gap: 10, fontFamily: "monospace", fontSize: 11 }}>
            <span style={{ color: timeLeft <= 10 ? "#ff4444" : "#ff8800" }}>⏱{timeLeft}s</span>
            <span style={{ color: "#ffd700" }}>⭐{nxtCreated}</span>
          </div>
        )}
      </div>

      {/* Idle */}
      {phase === "idle" && (
        <div style={{ padding: "20px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 10, filter: "drop-shadow(0 0 16px #ff8800)" }}>⚗️</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6, lineHeight: 1.6 }}>
            {isTr
              ? "Aynı tipte komşu hücreleri birleştir. Seviye 3'te terfi: SC→HC→RC→NXT"
              : "Merge adjacent same-type cells. Level 3 promotes: SC→HC→RC→NXT"}
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14 }}>
            {(["sc", "hc", "rc", "nxt"] as CellType[]).map(t => {
              const [r, g, b] = TYPE_RGB[t];
              return (
                <span key={t} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, fontFamily: "monospace", background: `rgba(${r},${g},${b},0.12)`, border: `1px solid rgba(${r},${g},${b},0.35)`, color: `rgb(${r},${g},${b})` }}>
                  {TYPE_ICON[t]} {t.toUpperCase()}
                </span>
              );
            })}
          </div>
          <button onClick={startGame} style={{ background: "linear-gradient(135deg,#ff8800,#ff4400)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 24px rgba(255,136,0,0.3)" }}>
            {isTr ? "BAŞLA (30s)" : "START (30s)"}
          </button>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef} width={W_CV} height={H_CV}
        onClick={handleClick}
        style={{ display: phase === "playing" ? "block" : "none", width: "100%", cursor: "pointer" }}
      />

      {/* Done */}
      {phase === "done" && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#ffd700", marginBottom: 4, fontFamily: "monospace" }}>+{rewardSC} SC</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
            {merges} {isTr ? "birleştirme" : "merges"} · {nxtCreated} NXT · {score} {isTr ? "puan" : "pts"}
          </div>
          <button onClick={startGame} style={{ background: "linear-gradient(135deg,#ff8800,#ff4400)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {isTr ? "Tekrar" : "Replay"}
          </button>
        </div>
      )}
    </div>
  );
}
