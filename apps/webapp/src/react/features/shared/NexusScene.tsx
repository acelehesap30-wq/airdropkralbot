import { useRef, useEffect, type CSSProperties } from "react";
import type { TabKey } from "../../types";

/**
 * NexusScene — Beautiful Canvas 2D animated background per tab.
 * Replaces BabylonJS 3D district scenes with lightweight pseudo-3D visuals.
 */

type Theme = {
  bg: [number, number, number];
  primary: [number, number, number];
  secondary: [number, number, number];
  label: string;
  particleCount: number;
};

const THEMES: Record<string, Theme> = {
  home:     { bg: [6, 16, 34],   primary: [0, 214, 255],   secondary: [47, 255, 181], label: "NEXUS HUB",     particleCount: 60 },
  pvp:      { bg: [20, 8, 12],   primary: [255, 60, 80],   secondary: [255, 140, 0],  label: "ARENA",          particleCount: 80 },
  tasks:    { bg: [8, 20, 16],   primary: [47, 255, 181],  secondary: [0, 214, 255],  label: "MISSIONS",       particleCount: 50 },
  forge:    { bg: [16, 8, 24],   primary: [224, 64, 251],  secondary: [255, 178, 94], label: "FORGE",          particleCount: 70 },
  exchange: { bg: [16, 14, 6],   primary: [255, 178, 94],  secondary: [0, 214, 255],  label: "EXCHANGE",       particleCount: 45 },
  season:   { bg: [14, 12, 6],   primary: [255, 215, 0],   secondary: [224, 64, 251], label: "SEASON HALL",    particleCount: 55 },
  events:   { bg: [6, 12, 24],   primary: [0, 214, 255],   secondary: [255, 60, 80],  label: "EVENTS",         particleCount: 65 },
};

type Particle = {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  size: number; alpha: number;
  color: [number, number, number];
  life: number; maxLife: number;
  type: "dot" | "ring" | "hex";
};

type NexusSceneProps = { tab: TabKey; lang: "tr" | "en" };

export function NexusScene({ tab }: NexusSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stRef = useRef<{
    particles: Particle[];
    time: number;
    raf: number;
    w: number; h: number;
    theme: Theme;
  } | null>(null);

  const theme = THEMES[tab];
  if (!theme) return null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const mkParticle = (): Particle => {
      const isPrimary = Math.random() > 0.35;
      const col = isPrimary ? theme.primary : theme.secondary;
      const types: Particle["type"][] = ["dot", "dot", "dot", "ring", "hex"];
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        z: 0.3 + Math.random() * 0.7,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.3 - 0.15,
        vz: (Math.random() - 0.5) * 0.01,
        size: 1.5 + Math.random() * 3,
        alpha: 0.15 + Math.random() * 0.5,
        color: col,
        life: 0,
        maxLife: 200 + Math.random() * 400,
        type: types[Math.floor(Math.random() * types.length)],
      };
    };

    const particles: Particle[] = [];
    for (let i = 0; i < theme.particleCount; i++) {
      const p = mkParticle();
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }

    const st = { particles, time: 0, raf: 0, w: W, h: H, theme };
    stRef.current = st;

    const drawHex = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const drawGrid = (t: number) => {
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = `rgb(${theme.primary.join(",")})`;
      ctx.lineWidth = 0.5;
      const spacing = 40;
      const offset = (t * 8) % spacing;
      for (let x = -spacing + offset; x < W + spacing; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = -spacing + offset * 0.5; y < H + spacing; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawOrb = (cx: number, cy: number, r: number, col: [number, number, number], alpha: number) => {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(${col.join(",")},${alpha * 0.8})`);
      grad.addColorStop(0.5, `rgba(${col.join(",")},${alpha * 0.3})`);
      grad.addColorStop(1, `rgba(${col.join(",")},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    };

    const render = () => {
      st.time += 0.016;
      const t = st.time;

      // Background gradient
      const bg = theme.bg;
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`);
      grad.addColorStop(1, `rgb(${Math.floor(bg[0] * 1.4)}, ${Math.floor(bg[1] * 1.4)}, ${Math.floor(bg[2] * 1.4)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Background grid
      drawGrid(t);

      // Large ambient orbs
      drawOrb(W * 0.2, H * 0.3, 120, theme.primary, 0.06 + Math.sin(t * 0.5) * 0.02);
      drawOrb(W * 0.8, H * 0.7, 100, theme.secondary, 0.05 + Math.cos(t * 0.4) * 0.02);
      drawOrb(W * 0.5, H * 0.15, 80, theme.primary, 0.04 + Math.sin(t * 0.3 + 1) * 0.015);

      // Center orb glow pulse
      const centerR = 30 + Math.sin(t * 1.5) * 5;
      drawOrb(W * 0.5, H * 0.45, centerR, theme.primary, 0.12 + Math.sin(t * 2) * 0.04);

      // Particles
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i];
        p.life++;
        if (p.life > p.maxLife) {
          st.particles[i] = mkParticle();
          continue;
        }

        p.x += p.vx * p.z;
        p.y += p.vy * p.z;
        p.z += p.vz;
        if (p.z < 0.2) p.z = 0.2;
        if (p.z > 1.2) p.z = 1.2;

        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20;
        if (p.y > H + 20) p.y = -20;

        const fadeIn = Math.min(1, p.life / 30);
        const fadeOut = Math.min(1, (p.maxLife - p.life) / 40);
        const a = p.alpha * fadeIn * fadeOut * p.z;
        const s = p.size * p.z;

        ctx.save();
        ctx.globalAlpha = a;

        if (p.type === "dot") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${p.color.join(",")})`;
          ctx.fill();
          // Glow
          if (s > 2) {
            ctx.globalAlpha = a * 0.3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, s * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${p.color.join(",")})`;
            ctx.fill();
          }
        } else if (p.type === "ring") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, s * 2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgb(${p.color.join(",")})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else {
          drawHex(p.x, p.y, s * 1.5);
          ctx.strokeStyle = `rgb(${p.color.join(",")})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Connecting lines between close particles
      ctx.save();
      ctx.lineWidth = 0.3;
      for (let i = 0; i < st.particles.length; i++) {
        const a = st.particles[i];
        for (let j = i + 1; j < st.particles.length; j++) {
          const b = st.particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 60) {
            const lineAlpha = (1 - dist / 60) * 0.08 * a.alpha * b.alpha;
            ctx.globalAlpha = lineAlpha;
            ctx.strokeStyle = `rgb(${theme.primary.join(",")})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // Horizontal scan line
      const scanY = (t * 30) % (H + 40) - 20;
      ctx.save();
      const scanGrad = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
      scanGrad.addColorStop(0, `rgba(${theme.primary.join(",")},0)`);
      scanGrad.addColorStop(0.5, `rgba(${theme.primary.join(",")},0.08)`);
      scanGrad.addColorStop(1, `rgba(${theme.primary.join(",")},0)`);
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 8, W, 16);
      ctx.restore();

      // Top/bottom vignette
      const vigTop = ctx.createLinearGradient(0, 0, 0, 40);
      vigTop.addColorStop(0, `rgba(${bg[0]},${bg[1]},${bg[2]},0.8)`);
      vigTop.addColorStop(1, "transparent");
      ctx.fillStyle = vigTop;
      ctx.fillRect(0, 0, W, 40);

      const vigBot = ctx.createLinearGradient(0, H - 40, 0, H);
      vigBot.addColorStop(0, "transparent");
      vigBot.addColorStop(1, `rgba(${bg[0]},${bg[1]},${bg[2]},0.9)`);
      ctx.fillStyle = vigBot;
      ctx.fillRect(0, H - 40, W, 40);

      // Label
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.font = "bold 36px 'Bebas Neue', 'Arial Black', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = `rgb(${theme.primary.join(",")})`;
      ctx.fillText(theme.label, W / 2, H / 2 + 12);
      ctx.restore();

      st.raf = requestAnimationFrame(render);
    };

    st.raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(st.raf);
      stRef.current = null;
    };
  }, [tab]);

  const containerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  };

  return (
    <div style={containerStyle} className="akrNexusScene">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
