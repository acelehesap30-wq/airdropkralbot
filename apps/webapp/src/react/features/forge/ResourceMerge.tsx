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

/* ═══════════ ISOMETRIC 3D CONSTANTS ═══════════ */
const COLS = 4;
const W_CV = 300, H_CV = 340;
const IW = 60, IH = 30;        // iso tile width & vertical span
const ISO_X = W_CV / 2;        // grid origin x (center)
const ISO_Y = 120;              // grid origin y (where col=0,row=0 base sits)

/** Back-to-front draw order for 4×4 iso grid */
const ISO_DRAW_ORDER: number[] = (() => {
  const order: number[] = [];
  for (let d = 0; d <= 6; d++)
    for (let c = 0; c < COLS; c++) {
      const r = d - c;
      if (r >= 0 && r < COLS) order.push(c + r * COLS);
    }
  return order;
})();

/** Grid (col,row) → screen (sx,sy) base position */
function isoXY(col: number, row: number): [number, number] {
  return [ISO_X + (col - row) * IW / 2, ISO_Y + (col + row) * IH / 2];
}

/** Block pixel height based on cell type & level */
function getBlockH(cell: Cell): number {
  if (cell.type === "empty") return 3;
  if (cell.type === "nxt") return 30;
  return 10 + cell.level * 8; // lv1→18, lv2→26, lv3→34
}

function randomCell(): Cell {
  const types: CellType[] = ["sc", "sc", "sc", "hc", "hc", "rc"];
  return { type: types[Math.floor(Math.random() * types.length)], level: 1 };
}
function initGrid(): Cell[] { return Array.from({ length: 16 }, () => randomCell()); }

type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; g: number; b: number };
type CellFlash = { idx: number; alpha: number; r: number; g: number; b: number };

/**
 * ResourceMerge — Isometric 3D Forge Puzzle
 * Merge same-type adjacent blocks on an isometric grid.
 * Level 3 promotes: SC→HC→RC→NXT.
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

  /* ═══════════ CANVAS DRAW LOOP ═══════════ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;

    /** Draw one isometric 3D block */
    const drawIsoBlock = (col: number, row: number, cell: Cell, now: number) => {
      const [sx, sy] = isoXY(col, row);
      const [r, g, b] = TYPE_RGB[cell.type];
      const idx = col + row * COLS;
      const isSelected = stRef.current.selected === idx;
      const isNxt = cell.type === "nxt";
      const bh = getBlockH(cell) + (isNxt ? Math.sin(now * 0.004) * 3 : 0);

      const topA = cell.type === "empty" ? 0.08 : (isNxt ? 0.78 + Math.sin(now * 0.003) * 0.12 : 0.55);
      const leftA = topA * 0.55;
      const rightA = topA * 0.38;

      if (isSelected || isNxt) {
        ctx.shadowBlur = isSelected ? 22 : 14;
        ctx.shadowColor = `rgba(${r},${g},${b},${isSelected ? 0.9 : 0.65})`;
      }

      /* ── Top face (rhombus) ── */
      ctx.beginPath();
      ctx.moveTo(sx,           sy - bh - IH / 2); // north
      ctx.lineTo(sx + IW / 2,  sy - bh);           // east
      ctx.lineTo(sx,           sy - bh + IH / 2);  // south
      ctx.lineTo(sx - IW / 2,  sy - bh);           // west
      ctx.closePath();

      if (cell.type !== "empty") {
        const tg = ctx.createLinearGradient(sx - IW / 2, sy - bh - IH / 2, sx + IW / 2, sy - bh + IH / 2);
        tg.addColorStop(0, `rgba(${r},${g},${b},${topA * 1.3})`);
        tg.addColorStop(0.5, `rgba(${r},${g},${b},${topA})`);
        tg.addColorStop(1, `rgba(${r},${g},${b},${topA * 0.65})`);
        ctx.fillStyle = tg;
      } else {
        ctx.fillStyle = `rgba(${r},${g},${b},${topA})`;
      }
      ctx.fill();
      ctx.strokeStyle = `rgba(${r},${g},${b},${isSelected ? 0.95 : 0.35})`;
      ctx.lineWidth = isSelected ? 2.5 : 0.8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (bh > 4) {
        /* ── Left face (SW side) ── */
        ctx.beginPath();
        ctx.moveTo(sx - IW / 2, sy - bh);           // top-west
        ctx.lineTo(sx,           sy - bh + IH / 2);  // top-south
        ctx.lineTo(sx,           sy + IH / 2);        // base-south
        ctx.lineTo(sx - IW / 2, sy);                  // base-west
        ctx.closePath();
        const lg = ctx.createLinearGradient(sx - IW / 2, sy - bh, sx, sy + IH / 2);
        lg.addColorStop(0, `rgba(${r},${g},${b},${leftA * 1.1})`);
        lg.addColorStop(1, `rgba(${r},${g},${b},${leftA * 0.45})`);
        ctx.fillStyle = lg;
        ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},0.18)`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        /* ── Right face (SE side) ── */
        ctx.beginPath();
        ctx.moveTo(sx,           sy - bh + IH / 2);  // top-south
        ctx.lineTo(sx + IW / 2,  sy - bh);            // top-east
        ctx.lineTo(sx + IW / 2,  sy);                  // base-east
        ctx.lineTo(sx,           sy + IH / 2);         // base-south
        ctx.closePath();
        const rg = ctx.createLinearGradient(sx, sy - bh, sx + IW / 2, sy + IH / 2);
        rg.addColorStop(0, `rgba(${r},${g},${b},${rightA * 1.0})`);
        rg.addColorStop(1, `rgba(${r},${g},${b},${rightA * 0.35})`);
        ctx.fillStyle = rg;
        ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},0.12)`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        /* ── Edge highlights ── */
        // Front edge (bottom-center vertical)
        ctx.beginPath();
        ctx.moveTo(sx, sy - bh + IH / 2);
        ctx.lineTo(sx, sy + IH / 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /* ── Icon on top face ── */
      if (cell.type !== "empty") {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = isNxt ? "16px serif" : "13px serif";
        ctx.fillText(TYPE_ICON[cell.type], sx, sy - bh);

        // Level badge
        if (cell.level > 1 && cell.type !== "nxt") {
          ctx.font = "bold 8px monospace";
          ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
          ctx.fillText(`Lv${cell.level}`, sx + IW / 4 - 2, sy - bh + 6);
        }
      }

      /* ── Selected pulse ring (iso diamond) ── */
      if (isSelected) {
        const pulse = 0.35 + 0.45 * Math.sin(now * 0.008);
        ctx.beginPath();
        ctx.moveTo(sx,           sy - bh - IH / 2 - 6);
        ctx.lineTo(sx + IW / 2 + 5, sy - bh);
        ctx.lineTo(sx,           sy - bh + IH / 2 + 6);
        ctx.lineTo(sx - IW / 2 - 5, sy - bh);
        ctx.closePath();
        ctx.strokeStyle = `rgba(${r},${g},${b},${pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    const draw = () => {
      if (!alive) return;
      const st = stRef.current;
      const now = performance.now();
      ctx.clearRect(0, 0, W_CV, H_CV);

      /* ── Background ── */
      const bg = ctx.createLinearGradient(0, 0, 0, H_CV);
      bg.addColorStop(0, "#0a0514");
      bg.addColorStop(0.6, "#080312");
      bg.addColorStop(1, "#0c0618");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W_CV, H_CV);

      /* ── Ambient forge glow ── */
      const ambGlow = ctx.createRadialGradient(W_CV / 2, ISO_Y + 50, 10, W_CV / 2, ISO_Y + 50, W_CV * 0.65);
      ambGlow.addColorStop(0, "rgba(255,100,0,0.06)");
      ambGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ambGlow;
      ctx.fillRect(0, 0, W_CV, H_CV);

      /* ── Subtle isometric floor grid ── */
      ctx.save();
      ctx.globalAlpha = 0.035;
      ctx.strokeStyle = "#ff8800";
      ctx.lineWidth = 0.5;
      for (let r2 = -1; r2 <= COLS + 1; r2++) {
        const [x1, y1] = isoXY(-1, r2);
        const [x2, y2] = isoXY(COLS + 1, r2);
        ctx.beginPath(); ctx.moveTo(x1, y1 + IH / 2); ctx.lineTo(x2, y2 + IH / 2); ctx.stroke();
      }
      for (let c2 = -1; c2 <= COLS + 1; c2++) {
        const [x1, y1] = isoXY(c2, -1);
        const [x2, y2] = isoXY(c2, COLS + 1);
        ctx.beginPath(); ctx.moveTo(x1, y1 + IH / 2); ctx.lineTo(x2, y2 + IH / 2); ctx.stroke();
      }
      ctx.restore();

      if (st.phase === "playing" || st.phase === "done") {
        /* ── Timer bar ── */
        const barW = W_CV - 40, barH = 5, barX = 20, barY = 14;
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(barX, barY, barW, barH);
        const pct = st.timeLeft / 30;
        const [tr2, tg2, tb2] = st.timeLeft <= 10 ? [255, 68, 68] : [255, 136, 0];
        ctx.fillStyle = `rgb(${tr2},${tg2},${tb2})`;
        ctx.fillRect(barX, barY, barW * pct, barH);

        /* ── HUD text ── */
        ctx.font = "bold 11px monospace";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillStyle = `rgb(${tr2},${tg2},${tb2})`;
        ctx.fillText(`⏱${st.timeLeft}s`, 20, 24);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff8800";
        ctx.fillText(`${st.score} pts`, W_CV / 2, 24);
        ctx.textAlign = "right";
        ctx.fillStyle = "#ffd700";
        ctx.fillText(`⭐${st.nxtCreated} NXT`, W_CV - 20, 24);

        /* ── ISOMETRIC 3D GRID (back→front) ── */
        ctx.textBaseline = "middle";
        for (const i of ISO_DRAW_ORDER) {
          const cell = st.grid[i];
          if (!cell) continue;
          drawIsoBlock(i % COLS, Math.floor(i / COLS), cell, now);
        }

        /* ── Cell flash overlays (iso diamond) ── */
        for (const f of st.flashes) {
          f.alpha -= 0.03;
          if (f.alpha <= 0) continue;
          const col = f.idx % COLS, row = Math.floor(f.idx / COLS);
          const [fx, fy] = isoXY(col, row);
          const cell = st.grid[f.idx];
          const bh = cell ? getBlockH(cell) : 10;
          ctx.save();
          ctx.globalAlpha = f.alpha * 0.5;
          ctx.beginPath();
          ctx.moveTo(fx,           fy - bh - IH / 2 - 10);
          ctx.lineTo(fx + IW / 2 + 8, fy - bh);
          ctx.lineTo(fx,           fy - bh + IH / 2 + 10);
          ctx.lineTo(fx - IW / 2 - 8, fy - bh);
          ctx.closePath();
          ctx.fillStyle = `rgba(${f.r},${f.g},${f.b},0.35)`;
          ctx.fill();
          ctx.restore();
        }
        st.flashes = st.flashes.filter(f => f.alpha > 0);

        /* ── "FORGE" label at bottom ── */
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.font = "bold 38px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "#ff8800";
        ctx.fillText("FORGE", W_CV / 2, H_CV - 8);
        ctx.restore();
      }

      /* ── Particles ── */
      for (const p of st.particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
        const a = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.8 * a + 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a})`;
        ctx.fill();
      }
      st.particles = st.particles.filter(p => p.life > 0);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  /* ═══════════ GAME LOGIC ═══════════ */

  const isAdjacent = (a: number, b: number) => {
    const rA = Math.floor(a / 4), cA = a % 4;
    const rB = Math.floor(b / 4), cB = b % 4;
    return (Math.abs(rA - rB) + Math.abs(cA - cB)) === 1;
  };

  /** Get iso screen center of cell's TOP FACE for burst placement */
  const cellCenter = (i: number): [number, number] => {
    const col = i % COLS, row = Math.floor(i / COLS);
    const [sx, sy] = isoXY(col, row);
    const cell = stRef.current.grid[i];
    const bh = cell ? getBlockH(cell) : 10;
    return [sx, sy - bh];
  };

  const addBurst = (idx: number, rgb: [number, number, number], count: number) => {
    const st = stRef.current;
    const [cx, cy] = cellCenter(idx);
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 4;
      st.particles.push({
        x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1.5,
        life: 22 + Math.floor(Math.random() * 16), maxLife: 38,
        r: rgb[0], g: rgb[1], b: rgb[2],
      });
    }
  };

  /** Click/touch handler — iso diamond hit-test (front→back) */
  const handleInteract = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const st = stRef.current;
    if (st.phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
    const clientY = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;
    const mx = (clientX - rect.left) * (W_CV / rect.width);
    const my = (clientY - rect.top) * (H_CV / rect.height);

    // Front-to-back hit test: check nearest cells first
    let hitIdx = -1;
    for (let oi = ISO_DRAW_ORDER.length - 1; oi >= 0; oi--) {
      const i = ISO_DRAW_ORDER[oi];
      const cell = st.grid[i];
      if (!cell) continue;
      const col = i % COLS, row = Math.floor(i / COLS);
      const [sx, sy] = isoXY(col, row);
      const bh = getBlockH(cell);
      // Diamond (rhombus) hit test on top face
      const dx = mx - sx;
      const dy2 = my - (sy - bh);
      if (Math.abs(dx) / (IW / 2) + Math.abs(dy2) / (IH / 2) <= 1.15) {
        hitIdx = i; break;
      }
      // Also check side faces (below top face, within block body)
      if (bh > 4 && my >= sy - bh + IH / 2 && my <= sy + IH / 2) {
        if (mx >= sx - IW / 2 && mx <= sx + IW / 2) {
          hitIdx = i; break;
        }
      }
    }
    if (hitIdx < 0) return;

    const i = hitIdx;
    const cell = st.grid[i];
    if (!cell || cell.type === "empty" || cell.type === "nxt") {
      st.selected = null; return;
    }

    if (st.selected === null) { st.selected = i; return; }
    if (st.selected === i)    { st.selected = null; return; }

    const selCell = st.grid[st.selected];
    if (selCell && selCell.type === cell.type && selCell.level === cell.level && isAdjacent(st.selected, i)) {
      const newLevel = cell.level + 1;
      const srcIdx = st.selected;

      // Burst from source cell
      addBurst(srcIdx, TYPE_RGB[cell.type], 10);

      if (newLevel >= 3) {
        const promoMap: Record<string, CellType> = { sc: "hc", hc: "rc", rc: "nxt" };
        const promoted: CellType = (promoMap[cell.type] as CellType) || "nxt";

        if (promoted === "nxt") {
          st.grid[i] = { type: "nxt", level: 1 };
          st.nxtCreated++; st.score += 25;
          setNxtCreated(st.nxtCreated); setScore(st.score);
          addBurst(i, [255, 215, 0], 28);
        } else {
          st.grid[i] = { type: promoted, level: 1 };
          st.score += 10; setScore(st.score);
          addBurst(i, TYPE_RGB[promoted], 18);
        }
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

  /* ═══════════ JSX ═══════════ */
  return (
    <div style={{ background: "rgba(10,5,20,0.98)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,136,0,0.15)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,136,0,0.04)", borderBottom: "1px solid rgba(255,136,0,0.08)" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#ff8800", letterSpacing: 2 }}>⚗️ NEXUS FORGE 3D</div>
          <div style={{ fontSize: 10, color: "rgba(255,136,0,0.4)", marginTop: 1 }}>
            {isTr ? "İzometrik blokları birleştir · NXT üret" : "Merge isometric blocks · Create NXT"}
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
              ? "İzometrik 3D blokları eşleştir. Seviye 3'te terfi: SC→HC→RC→NXT"
              : "Merge adjacent 3D blocks. Level 3 promotes: SC→HC→RC→NXT"}
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
        onClick={handleInteract} onTouchStart={handleInteract}
        style={{ display: phase === "playing" ? "block" : "none", width: "100%", cursor: "pointer", touchAction: "none" }}
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
