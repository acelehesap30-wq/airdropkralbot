import { useState, useCallback, useRef, useEffect } from "react";
import type { Lang } from "../../i18n";
import { buildActionRequestId, postJson } from "../../api/common";

type Props = { lang: Lang };

type Target = {
  id: number; x: number; y: number; size: number;
  r: number; g: number; b: number;
  born: number; ttl: number;
  phase: "appear" | "active" | "dying";
};
type HitFX = { id: number; x: number; y: number; t: number; r: number; g: number; b: number; pts: number };
type Spark  = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; g: number; b: number };

function authFields() {
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

const PALETTE: [number, number, number][] = [
  [0, 214, 255], [0, 255, 136], [255, 90, 50], [224, 64, 251], [255, 215, 0],
];

const WAVES = [
  { label: "WAVE 1", subEn: "Get ready!",   subTr: "Hazır ol!",    rgb: [0,214,255]   as [number,number,number], spawnMs: 660, ttl: 1850, maxOnScreen: 3 },
  { label: "WAVE 2", subEn: "Speed up!",    subTr: "Hız arttı!",   rgb: [224,64,251]  as [number,number,number], spawnMs: 390, ttl: 1250, maxOnScreen: 5 },
  { label: "WAVE 3", subEn: "FINAL WAVE!",  subTr: "SON DALGA!",   rgb: [255,80,80]   as [number,number,number], spawnMs: 200, ttl: 850,  maxOnScreen: 8 },
];

export function ArenaChallenge({ lang }: Props) {
  const isTr = lang === "tr";
  const [phase,    setPhase]    = useState<"idle" | "playing" | "done">("idle");
  const [score,    setScore]    = useState(0);
  const [hits,     setHits]     = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [rewardSC, setRewardSC] = useState(0);
  const [combo,    setCombo]    = useState(0);
  const [wave,     setWave]     = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stRef = useRef({
    phase: "idle",
    targets: [] as Target[],
    hitFX: [] as HitFX[],
    sparks: [] as Spark[],
    score: 0, hits: 0, combo: 0, nextId: 0,
    hexGrid: [] as { cx: number; cy: number }[],
    wave: 1,
    waveFlash: 0,
    waveRGB: [0, 214, 255] as [number, number, number],
    waveLabel: "WAVE 1",
    waveSubLabel: "Get ready!",
    comboFlash: 0,
    comboFlashRGB: [255, 215, 0] as [number, number, number],
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef   = useRef<number>(0);

  const buildHexGrid = useCallback((W: number, H: number) => {
    const cells: { cx: number; cy: number }[] = [];
    const sz = 22, dx = sz * 1.73, dy = sz * 1.5;
    const cols = Math.ceil(W / dx) + 1, rows = Math.ceil(H / dy) + 1;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++)
        cells.push({ cx: col * dx + (row % 2) * dx * 0.5, cy: row * dy });
    stRef.current.hexGrid = cells;
  }, []);

  const spawnTarget = useCallback((W: number, H: number) => {
    const st = stRef.current;
    if (st.phase !== "playing") return;
    const wDef = WAVES[st.wave - 1];
    if (st.targets.length < wDef.maxOnScreen) {
      const margin = 44;
      const col = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      st.targets.push({
        id: st.nextId++,
        x: margin + Math.random() * (W - margin * 2),
        y: margin + Math.random() * (H - margin * 2),
        size: 20 + Math.random() * 14,
        r: col[0], g: col[1], b: col[2],
        born: performance.now(),
        ttl: wDef.ttl + Math.random() * 200,
        phase: "appear",
      });
    }
    spawnRef.current = setTimeout(() => spawnTarget(W, H), wDef.spawnMs + Math.random() * 80);
  }, []);

  // Canvas draw loop (runs once, reads from stRef)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;
    buildHexGrid(canvas.width, canvas.height);

    const drawHex = (cx: number, cy: number, sz: number, alpha: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        i === 0 ? ctx.moveTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz)
                : ctx.lineTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(0,200,255,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    };

    const draw = () => {
      if (!alive) return;
      const W = canvas.width, H = canvas.height;
      const st = stRef.current;
      const now = performance.now();
      ctx.clearRect(0, 0, W, H);

      // BG
      ctx.fillStyle = "#030a1a";
      ctx.fillRect(0, 0, W, H);

      // Hex grid
      const hexPulse = Math.sin(now * 0.0008) * 0.02 + 0.03;
      for (const { cx, cy } of st.hexGrid) {
        const d = Math.hypot(cx - W / 2, cy - H / 2) / (Math.hypot(W, H) * 0.5);
        drawHex(cx, cy, 20, Math.max(0.02, hexPulse * (1 - d * 0.8)));
      }

      // Energy sweep
      const sweepX = (Math.sin(now * 0.0005) + 1) * 0.5 * W;
      const sg = ctx.createLinearGradient(sweepX - 60, 0, sweepX + 60, 0);
      sg.addColorStop(0, "rgba(0,214,255,0)");
      sg.addColorStop(0.5, "rgba(0,214,255,0.04)");
      sg.addColorStop(1, "rgba(0,214,255,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);

      // Targets
      for (const tgt of st.targets) {
        const age = (now - tgt.born) / tgt.ttl;
        if (age >= 1) { tgt.phase = "dying"; continue; }
        if (tgt.phase === "appear" && age > 0.06) tgt.phase = "active";

        const alpha = tgt.phase === "appear"
          ? Math.min(1, (now - tgt.born) / 240)
          : Math.max(0, 1 - Math.pow(age, 2.5));

        const pulse = 1 + Math.sin(now * 0.005 + tgt.id) * 0.08;
        const sz = tgt.size * pulse *
          (tgt.phase === "appear" ? 0.4 + 0.6 * Math.min(1, (now - tgt.born) / 240) : 1);

        ctx.save();
        ctx.shadowBlur = 28 * alpha;
        ctx.shadowColor = `rgba(${tgt.r},${tgt.g},${tgt.b},${alpha})`;

        for (let ring = 0; ring < 3; ring++) {
          const rr = sz * (1 + ring * 0.5);
          const ra = alpha * Math.max(0, 0.5 - ring * 0.14) * Math.abs(Math.sin(now * 0.004 - ring));
          ctx.beginPath(); ctx.arc(tgt.x, tgt.y, rr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${tgt.r},${tgt.g},${tgt.b},${ra})`;
          ctx.lineWidth = 1; ctx.stroke();
        }

        const grd = ctx.createRadialGradient(tgt.x, tgt.y, 0, tgt.x, tgt.y, sz);
        grd.addColorStop(0, `rgba(${tgt.r},${tgt.g},${tgt.b},${0.95 * alpha})`);
        grd.addColorStop(0.5, `rgba(${tgt.r},${tgt.g},${tgt.b},${0.5 * alpha})`);
        grd.addColorStop(1, `rgba(${tgt.r},${tgt.g},${tgt.b},0)`);
        ctx.beginPath(); ctx.arc(tgt.x, tgt.y, sz, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        ctx.strokeStyle = `rgba(${tgt.r},${tgt.g},${tgt.b},${0.55 * alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(tgt.x - sz * 1.6, tgt.y); ctx.lineTo(tgt.x + sz * 1.6, tgt.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tgt.x, tgt.y - sz * 1.6); ctx.lineTo(tgt.x, tgt.y + sz * 1.6); ctx.stroke();
        ctx.restore();

        if (tgt.phase === "active") {
          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, sz * 1.3, -Math.PI / 2, -Math.PI / 2 + (1 - age) * Math.PI * 2);
          ctx.strokeStyle = `rgba(${tgt.r},${tgt.g},${tgt.b},0.35)`;
          ctx.lineWidth = 2.5; ctx.stroke();
        }
      }
      st.targets = st.targets.filter(t => t.phase !== "dying");

      // Sparks
      for (const sp of st.sparks) {
        sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.14; sp.life--;
        const a = sp.life / sp.maxLife;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 2.5 * a + 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${sp.r},${sp.g},${sp.b},${a})`;
        ctx.fill();
      }
      st.sparks = st.sparks.filter(s => s.life > 0);

      // Hit FX
      for (const fx of st.hitFX) {
        const a2 = (now - fx.t) / 700;
        if (a2 > 1) continue;
        for (let ring = 0; ring < 4; ring++) {
          const r2 = (a2 + ring * 0.1) * 88;
          const fa = Math.max(0, (1 - a2) * 0.8);
          ctx.beginPath(); ctx.arc(fx.x, fx.y, r2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${fx.r},${fx.g},${fx.b},${fa / (ring + 1)})`;
          ctx.lineWidth = 2; ctx.stroke();
        }
        const ta = Math.max(0, 1 - a2 * 1.6);
        ctx.fillStyle = `rgba(255,255,200,${ta})`;
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`+${fx.pts}SC`, fx.x, fx.y - 30 * a2 - 6);
      }
      st.hitFX = st.hitFX.filter(fx => (now - fx.t) < 700);

      // Combo flash burst ring
      if (st.comboFlash > 0) {
        st.comboFlash--;
        const cf = st.comboFlash;
        const [cr, cg, cb] = st.comboFlashRGB;
        const a = cf / 40;
        const r = (40 - cf) * 4.2;
        ctx.beginPath(); ctx.arc(W / 2, H - 18, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a * 0.7})`;
        ctx.lineWidth = 3; ctx.stroke();
        // Second ring, slightly delayed
        const r2 = (40 - cf) * 2.5;
        if (r2 > 0) {
          ctx.beginPath(); ctx.arc(W / 2, H - 18, r2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a * 0.35})`;
          ctx.lineWidth = 5; ctx.stroke();
        }
      }

      // Wave flash overlay
      if (st.waveFlash > 0) {
        st.waveFlash--;
        const wf = st.waveFlash;
        const alpha = wf > 70 ? (90 - wf) / 20 : wf > 20 ? 1 : wf / 20;
        ctx.fillStyle = `rgba(0,0,0,${alpha * 0.6})`;
        ctx.fillRect(0, 0, W, H);
        const [wr, wg, wb] = st.waveRGB;
        ctx.save();
        ctx.shadowBlur = 55 * alpha;
        ctx.shadowColor = `rgba(${wr},${wg},${wb},1)`;
        ctx.fillStyle = `rgba(${wr},${wg},${wb},${alpha})`;
        ctx.font = "bold 44px monospace";
        ctx.textAlign = "center";
        ctx.fillText(st.waveLabel, W / 2, H / 2 + 14);
        ctx.shadowBlur = 0;
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`;
        ctx.fillText(st.waveSubLabel, W / 2, H / 2 + 36);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [buildHexGrid]);

  const handleTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const st = stRef.current;
    if (st.phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const cx = "touches" in e
      ? (e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0) - rect.left
      : e.clientX - rect.left;
    const cy2 = "touches" in e
      ? (e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0) - rect.top
      : e.clientY - rect.top;
    const px = cx * scaleX, py = cy2 * scaleY;

    let best: Target | null = null, bestDist = Infinity;
    for (const tgt of st.targets) {
      if (tgt.phase === "dying") continue;
      const d = Math.hypot(px - tgt.x, py - tgt.y);
      if (d < tgt.size * 2.8 && d < bestDist) { best = tgt; bestDist = d; }
    }

    if (best) {
      const hit = best;
      st.targets = st.targets.filter(t => t.id !== hit.id);
      st.combo++;
      const pts = 10 + st.combo * 5;
      st.score += pts; st.hits++;
      st.hitFX.push({ id: st.nextId++, x: hit.x, y: hit.y, t: performance.now(), r: hit.r, g: hit.g, b: hit.b, pts });

      // Combo milestone burst: 5 / 10 / 20
      const milestones = [5, 10, 20];
      if (milestones.includes(st.combo)) {
        const [cr, cg, cb]: [number, number, number] =
          st.combo >= 20 ? [255, 215, 0] : st.combo >= 10 ? [224, 64, 251] : [0, 255, 136];
        st.comboFlash = 40;
        st.comboFlashRGB = [cr, cg, cb];
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const spd = 2.5 + Math.random() * 3.5;
          st.sparks.push({
            x: hit.x, y: hit.y,
            vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1,
            life: 30 + Math.floor(Math.random() * 18), maxLife: 48,
            r: cr, g: cg, b: cb,
          });
        }
      }
      setScore(st.score); setHits(st.hits); setCombo(st.combo);
    } else {
      // Miss — red sparks + reset combo
      if (st.combo > 0) {
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          st.sparks.push({
            x: px, y: py,
            vx: Math.cos(angle) * (1.5 + Math.random() * 2.5),
            vy: Math.sin(angle) * (1.5 + Math.random() * 2.5),
            life: 16, maxLife: 16, r: 255, g: 60, b: 60,
          });
        }
      }
      st.combo = 0; setCombo(0);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearTimeout(spawnRef.current);
  }, []);

  const startGame = useCallback(() => {
    const st = stRef.current;
    st.phase = "playing"; st.score = 0; st.hits = 0; st.combo = 0;
    st.targets = []; st.hitFX = []; st.sparks = [];
    st.wave = 1; st.waveFlash = 90;
    st.waveRGB = WAVES[0].rgb; st.waveLabel = WAVES[0].label;
    st.waveSubLabel = isTr ? WAVES[0].subTr : WAVES[0].subEn;
    st.comboFlash = 0;

    setPhase("playing"); setScore(0); setHits(0); setTimeLeft(15);
    setCombo(0); setRewardSC(0); setWave(1);

    const canvas = canvasRef.current;
    const W = canvas?.width || 380, H = canvas?.height || 320;
    spawnTarget(W, H);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          cleanup();
          stRef.current.phase = "done";
          setPhase("done");
          const earned = Math.floor(stRef.current.score / 4) + stRef.current.hits * 4;
          setRewardSC(earned);
          const a = authFields();
          postJson("/webapp/api/v2/player/action", {
            ...a,
            action_key: "game_arena_reflex",
            action_request_id: buildActionRequestId("game_arena_reflex"),
            payload: { hits: stRef.current.hits, score: stRef.current.score, reward_sc: earned },
          }).catch(() => {});
          return 0;
        }
        const newTime = prev - 1;
        // Wave transitions: wave 2 at 10s remaining, wave 3 at 5s remaining
        const newWave = newTime > 10 ? 1 : newTime > 5 ? 2 : 3;
        if (newWave !== stRef.current.wave) {
          const wDef = WAVES[newWave - 1];
          stRef.current.wave = newWave;
          stRef.current.waveFlash = 90;
          stRef.current.waveRGB = wDef.rgb;
          stRef.current.waveLabel = wDef.label;
          stRef.current.waveSubLabel = isTr ? wDef.subTr : wDef.subEn;
          setWave(newWave);
        }
        return newTime;
      });
    }, 1000);
  }, [spawnTarget, cleanup, isTr]);

  useEffect(() => () => cleanup(), [cleanup]);

  const comboColor =
    combo >= 20 ? "#ffd700" : combo >= 10 ? "#e040fb" : combo >= 5 ? "#00ff88" : "rgba(255,255,255,0.3)";
  const waveRGB = WAVES[wave - 1]?.rgb ?? [0, 214, 255];
  const waveColorStr = `rgb(${waveRGB[0]},${waveRGB[1]},${waveRGB[2]})`;

  return (
    <div style={{ background: "rgba(3,10,26,0.98)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(0,214,255,0.15)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(0,214,255,0.04)", borderBottom: "1px solid rgba(0,214,255,0.08)" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#00d6ff", letterSpacing: 2 }}>⬡ HOLO ARENA</div>
          <div style={{ fontSize: 10, color: "rgba(0,214,255,0.4)", marginTop: 1 }}>
            {isTr ? "Holografik hedefleri vur · 3 Dalga" : "Destroy holographic targets · 3 Waves"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, fontFamily: "monospace", fontSize: 11 }}>
          {phase === "playing" && <>
            <span style={{ color: "#ff6060" }}>⏱{String(timeLeft).padStart(2, "0")}</span>
            <span style={{ color: waveColorStr, fontWeight: 700, fontSize: 12 }}>W{wave}</span>
            <span style={{ color: "#ffd700" }}>◈{score}</span>
            <span style={{ color: comboColor, fontWeight: combo >= 5 ? 700 : 400 }}>⚡×{combo}</span>
          </>}
        </div>
      </div>

      {/* Idle screen */}
      {phase === "idle" && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12, filter: "drop-shadow(0 0 20px #00d6ff)" }}>⬡</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 12, lineHeight: 1.7 }}>
            {isTr
              ? "3 Dalga · Her dalga daha hızlı! Combo zinciri SC'yi katlar. Kaçırmak komboyu sıfırlar."
              : "3 Waves · Each wave faster! Combo chains multiply SC. Miss resets combo."}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
            {WAVES.map((w, i) => (
              <div key={i} style={{
                fontSize: 10, padding: "4px 10px", borderRadius: 8, fontFamily: "monospace",
                background: `rgba(${w.rgb[0]},${w.rgb[1]},${w.rgb[2]},0.1)`,
                border: `1px solid rgba(${w.rgb[0]},${w.rgb[1]},${w.rgb[2]},0.35)`,
                color: `rgb(${w.rgb[0]},${w.rgb[1]},${w.rgb[2]})`,
              }}>
                {w.label}
              </div>
            ))}
          </div>
          <button onClick={startGame} style={{
            background: "linear-gradient(135deg,#00d6ff,#8000ff)", color: "#fff",
            border: "none", borderRadius: 12, padding: "13px 36px", fontSize: 14,
            fontWeight: 700, cursor: "pointer", boxShadow: "0 0 30px rgba(0,214,255,0.3)",
          }}>
            {isTr ? "ARENA'YA GİR" : "ENTER ARENA"}
          </button>
        </div>
      )}

      {/* Game canvas */}
      <canvas
        ref={canvasRef} width={380} height={320}
        onTouchStart={handleTap} onClick={handleTap}
        style={{ display: phase === "playing" ? "block" : "none", width: "100%", touchAction: "none", cursor: "crosshair" }}
      />

      {/* Done screen */}
      {phase === "done" && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 6, fontFamily: "monospace" }}>
            {isTr ? "Arena Sonucu" : "Arena Result"}
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#ffd700", marginBottom: 4, fontFamily: "monospace" }}>
            +{rewardSC} SC
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
            {hits} {isTr ? "isabet" : "hits"} · {score} {isTr ? "puan" : "pts"} · {isTr ? "3 Dalga tamamlandı" : "3 Waves cleared"}
          </div>
          <button onClick={startGame} style={{
            background: "linear-gradient(135deg,#00d6ff,#8000ff)", color: "#fff",
            border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13,
            fontWeight: 700, cursor: "pointer",
          }}>
            {isTr ? "Rematch" : "Rematch"}
          </button>
        </div>
      )}
    </div>
  );
}
