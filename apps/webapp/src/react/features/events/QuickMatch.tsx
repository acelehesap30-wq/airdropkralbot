import { useState, useCallback, useRef, useEffect } from "react";
import type { Lang } from "../../i18n";
import { buildActionRequestId, postJson } from "../../api/common";

type QuickMatchProps = { lang: Lang };

function authFields() {
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

const SYMBOLS = ["💎", "⚡", "🔥", "🎯", "🪙", "⭐", "🏆", "🎰"];
const SYM_RGB: Record<string, [number, number, number]> = {
  "💎": [0, 214, 255], "⚡": [255, 215, 0],  "🔥": [255, 110, 30],
  "🎯": [255, 80, 80], "🪙": [200, 170, 30], "⭐": [255, 240, 80],
  "🏆": [255, 180, 0], "🎰": [200, 64, 251],
};

const COLS = 4, CW = 68, CH = 68, GAP = 5;
const W_CV = 320, H_CV = 320;
const GX0 = Math.round((W_CV - (COLS * CW + (COLS - 1) * GAP)) / 2);
const GY0 = 16;

function shuffleSymbols(): string[] {
  const arr = [...SYMBOLS, ...SYMBOLS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type Card = {
  id: number; sym: string;
  revealed: boolean; matched: boolean;
  flipProg: number; targetFlip: number;
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; g: number; b: number };

/**
 * QuickMatch: Memory card matching game with full canvas holographic rendering.
 * 4×4 grid, 8 pairs. 3D flip animation, particle bursts on match, hex card backs.
 */
export function QuickMatch({ lang }: QuickMatchProps) {
  const isTr = lang === "tr";
  const [phase,    setPhase]    = useState<"idle" | "playing" | "done">("idle");
  const [moves,    setMoves]    = useState(0);
  const [pairs,    setPairs]    = useState(0);
  const [elapsed,  setElapsed]  = useState(0);
  const [rewardSC, setRewardSC] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const stRef     = useRef({
    phase: "idle" as "idle" | "playing" | "done",
    cards: [] as Card[],
    flipped: [] as number[],
    lockUntil: 0,
    moves: 0, pairs: 0,
    particles: [] as Particle[],
    startTime: 0,
  });

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;

    const draw = () => {
      if (!alive) return;
      const st = stRef.current;
      const now = performance.now();
      ctx.clearRect(0, 0, W_CV, H_CV);

      // BG
      ctx.fillStyle = "#030a1a"; ctx.fillRect(0, 0, W_CV, H_CV);
      const bg = ctx.createRadialGradient(W_CV / 2, H_CV / 2, 10, W_CV / 2, H_CV / 2, W_CV * 0.7);
      bg.addColorStop(0, "rgba(0,40,100,0.18)"); bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W_CV, H_CV);

      // Floating ambient dots
      for (let i = 0; i < 8; i++) {
        const ax = (Math.sin(i * 2.5 + now * 0.0003) * 0.5 + 0.5) * W_CV;
        const ay = (Math.cos(i * 1.9 + now * 0.0002) * 0.5 + 0.5) * H_CV;
        ctx.beginPath(); ctx.arc(ax, ay, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,180,255,${0.07 + 0.04 * Math.sin(i + now * 0.001)})`; ctx.fill();
      }

      // Cards
      if (st.cards.length === 16) {
        for (let i = 0; i < 16; i++) {
          const card = st.cards[i];
          // Animate flip
          const diff = card.targetFlip - card.flipProg;
          card.flipProg += diff * 0.2;
          if (Math.abs(diff) < 0.005) card.flipProg = card.targetFlip;

          const col = i % COLS, row = Math.floor(i / COLS);
          const cx = GX0 + col * (CW + GAP) + CW / 2;
          const cy = GY0 + row * (CH + GAP) + CH / 2;
          const scaleX = Math.abs(Math.cos(card.flipProg * Math.PI));
          const isFront = card.flipProg >= 0.5;
          const [er, eg, eb] = isFront ? (SYM_RGB[card.sym] ?? [200, 200, 200]) : [10, 80, 160];

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(scaleX, 1);

          ctx.shadowColor = card.matched
            ? `rgba(${er},${eg},${eb},0.75)`
            : isFront ? `rgba(${er},${eg},${eb},0.45)` : "rgba(0,80,200,0.28)";
          ctx.shadowBlur = card.matched ? 22 : isFront ? 14 : 5;

          // Card body (rounded rect path)
          const hw = CW / 2 - 1, hh = CH / 2 - 1, r = 7;
          ctx.beginPath();
          ctx.moveTo(-hw + r, -hh); ctx.lineTo(hw - r, -hh);
          ctx.quadraticCurveTo(hw, -hh, hw, -hh + r);
          ctx.lineTo(hw, hh - r); ctx.quadraticCurveTo(hw, hh, hw - r, hh);
          ctx.lineTo(-hw + r, hh); ctx.quadraticCurveTo(-hw, hh, -hw, hh - r);
          ctx.lineTo(-hw, -hh + r); ctx.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
          ctx.closePath();

          if (isFront) {
            const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
            grad.addColorStop(0, `rgba(${er},${eg},${eb},0.22)`);
            grad.addColorStop(1, `rgba(${er},${eg},${eb},0.07)`);
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = "rgba(4,12,38,0.96)";
          }
          ctx.fill();

          const borderAlpha = card.matched
            ? 0.65 + 0.35 * Math.sin(now * 0.006)
            : isFront ? 0.55 : 0.22;
          ctx.strokeStyle = `rgba(${er},${eg},${eb},${borderAlpha})`;
          ctx.lineWidth = card.matched ? 2 : 1.2;
          ctx.stroke();

          ctx.shadowBlur = 0;

          if (isFront) {
            // Emoji
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = "25px serif";
            ctx.fillText(card.sym, 0, 2);
          } else {
            // Hex back pattern
            ctx.globalAlpha = 0.1;
            ctx.strokeStyle = "#00d2ff"; ctx.lineWidth = 0.6;
            for (let hx = -2; hx <= 2; hx++) {
              for (let hy = -2; hy <= 2; hy++) {
                const bx = hx * 16 + (hy % 2) * 8, by = hy * 14;
                if (Math.abs(bx) > hw + 4 || Math.abs(by) > hh + 4) continue;
                ctx.beginPath();
                for (let hi = 0; hi < 6; hi++) {
                  const ha = (hi / 6) * Math.PI * 2 - Math.PI / 6;
                  hi === 0 ? ctx.moveTo(bx + Math.cos(ha) * 6, by + Math.sin(ha) * 6)
                           : ctx.lineTo(bx + Math.cos(ha) * 6, by + Math.sin(ha) * 6);
                }
                ctx.closePath(); ctx.stroke();
              }
            }
            ctx.globalAlpha = 1;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = "bold 15px monospace";
            ctx.fillStyle = "rgba(0,180,255,0.4)";
            ctx.fillText("?", 0, 1);
          }

          ctx.restore();
        }
      }

      // Burst particles
      for (const p of st.particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
        const a = p.life / p.maxLife;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 * a + 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a})`; ctx.fill();
      }
      st.particles = st.particles.filter(p => p.life > 0);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const st = stRef.current;
    if (st.phase !== "playing") return;
    if (performance.now() < st.lockUntil) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W_CV / rect.width);
    const my = (e.clientY - rect.top)  * (H_CV / rect.height);

    for (let i = 0; i < 16; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const x = GX0 + col * (CW + GAP), y = GY0 + row * (CH + GAP);
      if (mx < x || mx > x + CW || my < y || my > y + CH) continue;
      const card = st.cards[i];
      if (!card || card.matched || card.revealed) return;
      if (st.flipped.length >= 2) return;

      card.revealed = true; card.targetFlip = 1;
      st.flipped.push(i);

      if (st.flipped.length === 2) {
        st.moves++;
        setMoves(st.moves);
        const [ai, bi] = st.flipped;
        const ca = st.cards[ai], cb = st.cards[bi];

        if (ca.sym === cb.sym) {
          // Match!
          ca.matched = true; cb.matched = true;
          st.pairs++;
          setPairs(st.pairs);
          st.flipped = [];

          // Burst particles from both card centers
          for (const idx of [ai, bi]) {
            const c2 = idx % COLS, r2 = Math.floor(idx / COLS);
            const px2 = GX0 + c2 * (CW + GAP) + CW / 2;
            const py2 = GY0 + r2 * (CH + GAP) + CH / 2;
            const [pr, pg, pb] = SYM_RGB[st.cards[idx].sym] ?? [255, 215, 0];
            for (let k = 0; k < 18; k++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = 2 + Math.random() * 5;
              st.particles.push({ x: px2, y: py2, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1, life: 28 + Math.floor(Math.random() * 18), maxLife: 46, r: pr, g: pg, b: pb });
            }
          }

          if (st.pairs >= 8) {
            const timeSec = Math.floor((Date.now() - st.startTime) / 1000);
            const movesBonus = Math.max(0, 30 - st.moves) * 4;
            const earned = 20 + movesBonus;
            st.phase = "done";
            setPhase("done"); setRewardSC(earned); setElapsed(timeSec);
            if (timerRef.current) clearInterval(timerRef.current);
            const a = authFields();
            postJson("/webapp/api/v2/player/action", {
              ...a, action_key: "game_quick_match",
              action_request_id: buildActionRequestId("game_quick_match"),
              payload: { moves: st.moves, time_sec: timeSec, reward_sc: earned },
            }).catch(() => {});
          }
        } else {
          // Mismatch — flip back after 850ms
          const fi0 = ai, fi1 = bi;
          st.lockUntil = performance.now() + 850;
          setTimeout(() => {
            if (st.cards[fi0]) { st.cards[fi0].revealed = false; st.cards[fi0].targetFlip = 0; }
            if (st.cards[fi1]) { st.cards[fi1].revealed = false; st.cards[fi1].targetFlip = 0; }
            st.flipped = [];
          }, 850);
        }
      }
      return;
    }
  }, []);

  const startGame = useCallback(() => {
    const syms = shuffleSymbols();
    const cards: Card[] = syms.map((sym, i) => ({
      id: i, sym, revealed: false, matched: false, flipProg: 0, targetFlip: 0,
    }));
    const st = stRef.current;
    st.cards = cards; st.flipped = []; st.lockUntil = 0;
    st.moves = 0; st.pairs = 0; st.particles = []; st.startTime = Date.now(); st.phase = "playing";
    setPhase("playing"); setMoves(0); setPairs(0); setElapsed(0); setRewardSC(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <div style={{ background: "rgba(3,10,26,0.98)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(0,214,255,0.15)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(0,214,255,0.04)", borderBottom: "1px solid rgba(0,214,255,0.08)" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#00d6ff", letterSpacing: 2 }}>🃏 NEXUS MATCH</div>
          <div style={{ fontSize: 10, color: "rgba(0,214,255,0.4)", marginTop: 1 }}>
            {isTr ? "8 holografik çifti eşleştir" : "Match 8 holo pairs · fewer moves = more SC"}
          </div>
        </div>
        {phase === "playing" && (
          <div style={{ display: "flex", gap: 10, fontFamily: "monospace", fontSize: 11 }}>
            <span style={{ color: "#ffd700" }}>⏱{elapsed}s</span>
            <span style={{ color: "#00ff88" }}>✓{pairs}/8</span>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>🔄{moves}</span>
          </div>
        )}
      </div>

      {/* Idle */}
      {phase === "idle" && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12, filter: "drop-shadow(0 0 20px #00d6ff)" }}>🃏</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.7 }}>
            {isTr
              ? "8 holografik çifti eşleştir. Daha az hamlede daha fazla SC!"
              : "Match 8 holo pairs. Fewer moves = more SC!"}
          </div>
          <button onClick={startGame} style={{ background: "linear-gradient(135deg,#00d6ff,#8000ff)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 24px rgba(0,214,255,0.3)" }}>
            {isTr ? "BAŞLAT" : "START"}
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
            {moves} {isTr ? "hamle" : "moves"} · {elapsed}s · {isTr ? "Tüm çiftler bulundu!" : "All pairs found!"}
          </div>
          <button onClick={startGame} style={{ background: "linear-gradient(135deg,#00d6ff,#8000ff)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {isTr ? "Tekrar" : "Replay"}
          </button>
        </div>
      )}
    </div>
  );
}
