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
  "💎": [0, 214, 255], "⚡": [255, 215, 0], "🔥": [255, 110, 30],
  "🎯": [255, 80, 80], "🪙": [200, 170, 30], "⭐": [255, 240, 80],
  "🏆": [255, 180, 0], "🎰": [200, 64, 251],
};

const COLS = 4, CW = 68, CH = 68, GAP = 5;
const W_CV = 320, H_CV = 340;
const GX0 = Math.round((W_CV - (COLS * CW + (COLS - 1) * GAP)) / 2);
const GY0 = 30;

function shuffleSymbols(): string[] {
  const arr = [...SYMBOLS, ...SYMBOLS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type Card = { id: number; sym: string; revealed: boolean; matched: boolean; flipProg: number; targetFlip: number };
type Spark = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; maxLife: number; r: number; g: number; b: number; size: number };

export function QuickMatch({ lang }: QuickMatchProps) {
  const isTr = lang === "tr";
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [moves, setMoves] = useState(0);
  const [pairs, setPairs] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [rewardSC, setRewardSC] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stRef = useRef({
    phase: "idle" as "idle" | "playing" | "done",
    cards: [] as Card[],
    flipped: [] as number[],
    lockUntil: 0,
    moves: 0, pairs: 0,
    sparks: [] as Spark[],
    startTime: 0,
    time: 0,
  });

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
      st.time = now * 0.001;
      const t = st.time;
      ctx.clearRect(0, 0, W_CV, H_CV);

      // === BACKGROUND: deep space + perspective floor ===
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H_CV);
      bgGrad.addColorStop(0, "#020810");
      bgGrad.addColorStop(0.5, "#030a1a");
      bgGrad.addColorStop(1, "#050d22");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W_CV, H_CV);

      // Perspective floor grid
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "#00d2ff";
      ctx.lineWidth = 0.5;
      const VP_Y = -80; // vanishing point above canvas
      const FLOOR_TOP = 10;
      for (let row = 0; row < 12; row++) {
        const y = FLOOR_TOP + row * 32;
        if (y > H_CV) break;
        const perspective = (y - VP_Y) / (H_CV - VP_Y);
        const xShrink = 1 - perspective * 0.3;
        const xOff = W_CV * (1 - xShrink) * 0.5;
        ctx.beginPath();
        ctx.moveTo(xOff, y);
        ctx.lineTo(W_CV - xOff, y);
        ctx.stroke();
      }
      for (let col = 0; col < 10; col++) {
        const x = col * 36;
        ctx.beginPath();
        ctx.moveTo(W_CV / 2, VP_Y);
        ctx.lineTo(x, H_CV);
        ctx.stroke();
      }
      ctx.restore();

      // Ambient floating orbs
      for (let i = 0; i < 6; i++) {
        const ax = (Math.sin(i * 2.5 + t * 0.3) * 0.5 + 0.5) * W_CV;
        const ay = (Math.cos(i * 1.9 + t * 0.2) * 0.5 + 0.5) * H_CV;
        const orb = ctx.createRadialGradient(ax, ay, 0, ax, ay, 25);
        orb.addColorStop(0, `rgba(0,180,255,${0.04 + 0.02 * Math.sin(i + t)})`);
        orb.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = orb;
        ctx.fillRect(ax - 25, ay - 25, 50, 50);
      }

      // Holographic scan line
      const scanY = ((t * 40) % (H_CV + 40)) - 20;
      ctx.save();
      const scanGrad = ctx.createLinearGradient(0, scanY - 3, 0, scanY + 3);
      scanGrad.addColorStop(0, "rgba(0,214,255,0)");
      scanGrad.addColorStop(0.5, "rgba(0,214,255,0.06)");
      scanGrad.addColorStop(1, "rgba(0,214,255,0)");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 8, W_CV, 16);
      ctx.restore();

      // === CARDS with 3D rotation + shadow ===
      if (st.cards.length === 16) {
        for (let i = 0; i < 16; i++) {
          const card = st.cards[i];
          const diff = card.targetFlip - card.flipProg;
          card.flipProg += diff * 0.18;
          if (Math.abs(diff) < 0.005) card.flipProg = card.targetFlip;

          const col = i % COLS, row = Math.floor(i / COLS);
          const cx = GX0 + col * (CW + GAP) + CW / 2;
          const cy = GY0 + row * (CH + GAP) + CH / 2;

          // 3D rotation angle (0 = back, PI = front)
          const rotAngle = card.flipProg * Math.PI;
          const cosRot = Math.cos(rotAngle);
          const scaleX = Math.abs(cosRot);
          const isFront = card.flipProg >= 0.5;
          const [er, eg, eb] = isFront ? (SYM_RGB[card.sym] ?? [200, 200, 200]) : [10, 80, 160];

          // 3D perspective Y-shift (cards tilt slightly during flip)
          const tiltY = Math.sin(rotAngle) * 3;
          // Shadow offset based on rotation
          const shadowOffset = Math.sin(rotAngle) * 6;

          // === SHADOW on floor ===
          ctx.save();
          ctx.translate(cx, cy + 4);
          ctx.scale(scaleX * 1.05, 0.25);
          ctx.beginPath();
          ctx.ellipse(0, CH / 2 + shadowOffset, CW / 2, CW / 3, 0, 0, Math.PI * 2);
          ctx.fillStyle = card.matched
            ? `rgba(${er},${eg},${eb},0.12)`
            : "rgba(0,0,0,0.25)";
          ctx.fill();
          ctx.restore();

          // === CARD BODY ===
          ctx.save();
          ctx.translate(cx, cy + tiltY);
          ctx.scale(scaleX, 1);

          // Glow shadow
          if (card.matched || isFront) {
            ctx.shadowColor = `rgba(${er},${eg},${eb},${card.matched ? 0.7 : 0.4})`;
            ctx.shadowBlur = card.matched ? 24 : 12;
          }

          const hw = CW / 2 - 1, hh = CH / 2 - 1, r = 8;
          ctx.beginPath();
          ctx.moveTo(-hw + r, -hh); ctx.lineTo(hw - r, -hh);
          ctx.quadraticCurveTo(hw, -hh, hw, -hh + r);
          ctx.lineTo(hw, hh - r); ctx.quadraticCurveTo(hw, hh, hw - r, hh);
          ctx.lineTo(-hw + r, hh); ctx.quadraticCurveTo(-hw, hh, -hw, hh - r);
          ctx.lineTo(-hw, -hh + r); ctx.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
          ctx.closePath();

          if (isFront) {
            // Front face: gradient with color
            const faceGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
            faceGrad.addColorStop(0, `rgba(${er},${eg},${eb},0.25)`);
            faceGrad.addColorStop(0.5, `rgba(${er},${eg},${eb},0.08)`);
            faceGrad.addColorStop(1, `rgba(${er},${eg},${eb},0.18)`);
            ctx.fillStyle = faceGrad;
          } else {
            // Back face: dark with subtle texture
            const backGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
            backGrad.addColorStop(0, "rgba(8,18,42,0.98)");
            backGrad.addColorStop(1, "rgba(4,10,28,0.98)");
            ctx.fillStyle = backGrad;
          }
          ctx.fill();

          // Specular highlight (top edge reflection)
          ctx.save();
          ctx.clip();
          const spec = ctx.createLinearGradient(0, -hh, 0, -hh + 20);
          spec.addColorStop(0, `rgba(255,255,255,${isFront ? 0.12 : 0.05})`);
          spec.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = spec;
          ctx.fillRect(-hw, -hh, hw * 2, 20);
          ctx.restore();

          // Border with animated alpha for matched cards
          const borderAlpha = card.matched
            ? 0.65 + 0.35 * Math.sin(t * 6)
            : isFront ? 0.5 : 0.18;
          ctx.strokeStyle = `rgba(${er},${eg},${eb},${borderAlpha})`;
          ctx.lineWidth = card.matched ? 2 : 1.2;
          ctx.stroke();
          ctx.shadowBlur = 0;

          if (isFront) {
            // Holographic shimmer sweep
            ctx.save();
            ctx.clip();
            const shimmerX = ((t * 60 + i * 30) % (CW * 3)) - CW;
            const shimGrad = ctx.createLinearGradient(shimmerX - 15, 0, shimmerX + 15, 0);
            shimGrad.addColorStop(0, "rgba(255,255,255,0)");
            shimGrad.addColorStop(0.5, `rgba(${er},${eg},${eb},0.15)`);
            shimGrad.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = shimGrad;
            ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
            ctx.restore();

            // Emoji symbol
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = "28px serif";
            ctx.fillText(card.sym, 0, 2);

            // Small type label
            ctx.font = "bold 7px monospace";
            ctx.fillStyle = `rgba(${er},${eg},${eb},0.4)`;
            ctx.fillText(card.sym === "💎" ? "DIAMOND" : card.sym === "⚡" ? "BOLT" : card.sym === "🔥" ? "FIRE" : card.sym === "🎯" ? "TARGET" : card.sym === "🪙" ? "COIN" : card.sym === "⭐" ? "STAR" : card.sym === "🏆" ? "TROPHY" : "SLOT", 0, hh - 8);
          } else {
            // Hex grid pattern on back
            ctx.save();
            ctx.clip();
            ctx.globalAlpha = 0.08;
            ctx.strokeStyle = "#00d2ff"; ctx.lineWidth = 0.5;
            for (let hx = -3; hx <= 3; hx++) {
              for (let hy = -3; hy <= 3; hy++) {
                const bx = hx * 14 + (hy % 2) * 7, by = hy * 12;
                if (Math.abs(bx) > hw + 4 || Math.abs(by) > hh + 4) continue;
                ctx.beginPath();
                for (let hi = 0; hi < 6; hi++) {
                  const ha = (hi / 6) * Math.PI * 2 - Math.PI / 6;
                  hi === 0 ? ctx.moveTo(bx + Math.cos(ha) * 5.5, by + Math.sin(ha) * 5.5)
                    : ctx.lineTo(bx + Math.cos(ha) * 5.5, by + Math.sin(ha) * 5.5);
                }
                ctx.closePath(); ctx.stroke();
              }
            }
            ctx.globalAlpha = 1;
            ctx.restore();

            // Center "?" with glow
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.save();
            ctx.shadowColor = "rgba(0,180,255,0.6)"; ctx.shadowBlur = 8;
            ctx.font = "bold 18px monospace";
            ctx.fillStyle = "rgba(0,180,255,0.5)";
            ctx.fillText("?", 0, 1);
            ctx.restore();
          }

          ctx.restore();
        }
      }

      // === 3D PARTICLES with depth ===
      const sortedSparks = [...st.sparks].sort((a, b) => b.z - a.z);
      for (const p of sortedSparks) {
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        p.vy += 0.08; p.life--;
        const a = p.life / p.maxLife;
        const depthScale = 0.5 + p.z * 0.5;
        const sz = p.size * a * depthScale + 0.3;
        // Glow
        ctx.save();
        ctx.globalAlpha = a * 0.3 * depthScale;
        ctx.beginPath(); ctx.arc(p.x, p.y, sz * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`; ctx.fill();
        ctx.globalAlpha = a * depthScale;
        ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`; ctx.fill();
        ctx.restore();
      }
      st.sparks = st.sparks.filter(p => p.life > 0);

      // HUD overlay at bottom
      if (st.phase === "playing") {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "#030a1a";
        ctx.fillRect(0, H_CV - 30, W_CV, 30);
        ctx.globalAlpha = 1;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#00d2ff";
        ctx.fillText(`${st.pairs}/8 MATCHED  ·  ${st.moves} MOVES`, W_CV / 2, H_CV - 15);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const handleInteract = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const st = stRef.current;
    if (st.phase !== "playing") return;
    if (performance.now() < st.lockUntil) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
    const clientY = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;
    const mx = (clientX - rect.left) * (W_CV / rect.width);
    const my = (clientY - rect.top) * (H_CV / rect.height);

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
          ca.matched = true; cb.matched = true;
          st.pairs++;
          setPairs(st.pairs);
          st.flipped = [];

          // 3D burst particles from both cards
          for (const idx of [ai, bi]) {
            const c2 = idx % COLS, r2 = Math.floor(idx / COLS);
            const px2 = GX0 + c2 * (CW + GAP) + CW / 2;
            const py2 = GY0 + r2 * (CH + GAP) + CH / 2;
            const [pr, pg, pb] = SYM_RGB[st.cards[idx].sym] ?? [255, 215, 0];
            for (let k = 0; k < 22; k++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = 2 + Math.random() * 5;
              st.sparks.push({
                x: px2, y: py2, z: 0.3 + Math.random() * 0.7,
                vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1.5,
                vz: (Math.random() - 0.5) * 0.02,
                life: 30 + Math.floor(Math.random() * 20), maxLife: 50,
                r: pr, g: pg, b: pb, size: 2 + Math.random() * 2,
              });
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
    st.moves = 0; st.pairs = 0; st.sparks = []; st.startTime = Date.now(); st.phase = "playing";
    setPhase("playing"); setMoves(0); setPairs(0); setElapsed(0); setRewardSC(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <div style={{ background: "rgba(3,10,26,0.98)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(0,214,255,0.15)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(0,214,255,0.04)", borderBottom: "1px solid rgba(0,214,255,0.08)" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#00d6ff", letterSpacing: 2 }}>🃏 NEXUS MATCH</div>
          <div style={{ fontSize: 10, color: "rgba(0,214,255,0.4)", marginTop: 1 }}>
            {isTr ? "8 holografik çifti eşleştir · 3D Flip" : "Match 8 holo pairs · 3D Flip · fewer moves = more SC"}
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

      {phase === "idle" && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12, filter: "drop-shadow(0 0 20px #00d6ff)" }}>🃏</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.7 }}>
            {isTr ? "8 holografik çifti eşleştir. 3D kartlar, daha az hamle = daha fazla SC!" : "Match 8 holographic pairs. 3D cards, fewer moves = more SC!"}
          </div>
          <button onClick={startGame} style={{ background: "linear-gradient(135deg,#00d6ff,#8000ff)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 24px rgba(0,214,255,0.3)" }}>
            {isTr ? "BAŞLAT" : "START"}
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef} width={W_CV} height={H_CV}
        onClick={handleInteract} onTouchStart={handleInteract}
        style={{ display: phase === "playing" ? "block" : "none", width: "100%", cursor: "pointer", touchAction: "none" }}
      />

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
