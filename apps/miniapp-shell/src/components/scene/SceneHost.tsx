'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

/* ═══════════════════════════════════════
   Blueprint Section 7: Full 3D Game Scene
   Engine: Canvas2D procedural (zero-dep)
   Features: 
     - Procedural neon hex-grid terrain
     - Animated beacon with pulse rings
     - Floating orbital platforms
     - Particle system (ambient + burst)
     - Nexus energy field
     - Performance-adaptive rendering
   ═══════════════════════════════════════ */

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; color: string; life: number; maxLife: number;
}

interface OrbitalBody {
  angle: number; speed: number; radius: number;
  size: number; color: string; glowSize: number; trail: { x: number; y: number; alpha: number }[];
}

interface HexCell {
  cx: number; cy: number; r: number;
  pulse: number; pulseSpeed: number; baseAlpha: number;
}

export function SceneHost() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [fps, setFps] = useState(60);
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');

  const initScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    // Generate hex grid
    const hexCells: HexCell[] = [];
    const hexR = 18;
    const hexH = hexR * Math.sqrt(3);
    for (let row = -2; row < H / hexH + 2; row++) {
      for (let col = -2; col < W / (hexR * 1.5) + 2; col++) {
        const cx = col * hexR * 1.5;
        const cy = row * hexH + (col % 2 === 0 ? 0 : hexH / 2);
        hexCells.push({ cx, cy, r: hexR, pulse: Math.random() * Math.PI * 2, pulseSpeed: 0.3 + Math.random() * 0.5, baseAlpha: 0.015 + Math.random() * 0.03 });
      }
    }

    // Particles
    const particles: Particle[] = [];
    const COLORS = ['#00d2ff', '#00ff88', '#e040fb', '#ffd700', '#ff4444'];
    function spawnParticle(x?: number, y?: number, burst = false) {
      const p: Particle = {
        x: x ?? Math.random() * W,
        y: y ?? Math.random() * H,
        vx: (Math.random() - 0.5) * (burst ? 3 : 0.4),
        vy: (Math.random() - 0.5) * (burst ? 3 : 0.4) - (burst ? 0 : 0.15),
        size: burst ? 1.5 + Math.random() * 2 : 0.5 + Math.random() * 1.5,
        alpha: 0.3 + Math.random() * 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0,
        maxLife: burst ? 30 + Math.random() * 30 : 120 + Math.random() * 200,
      };
      particles.push(p);
    }
    for (let i = 0; i < (quality === 'low' ? 30 : quality === 'medium' ? 60 : 100); i++) spawnParticle();

    // Orbital bodies
    const orbitals: OrbitalBody[] = [];
    const orbitalCount = quality === 'low' ? 3 : quality === 'medium' ? 5 : 8;
    for (let i = 0; i < orbitalCount; i++) {
      orbitals.push({
        angle: (Math.PI * 2 / orbitalCount) * i,
        speed: 0.003 + Math.random() * 0.006,
        radius: 50 + Math.random() * Math.min(W, H) * 0.25,
        size: 3 + Math.random() * 5,
        color: COLORS[i % COLORS.length],
        glowSize: 8 + Math.random() * 12,
        trail: [],
      });
    }

    // Beacon pulse rings
    const beaconRings: { radius: number; alpha: number; speed: number }[] = [];
    let beaconTimer = 0;

    // Camera auto-rotate
    let cameraAngle = 0;
    let time = 0;
    let frameCount = 0;
    let lastFpsCheck = performance.now();

    function drawHex(cx: number, cy: number, r: number, alpha: number) {
      ctx!.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) ctx!.moveTo(px, py);
        else ctx!.lineTo(px, py);
      }
      ctx!.closePath();
      ctx!.strokeStyle = `rgba(0,210,255,${alpha})`;
      ctx!.lineWidth = 0.5;
      ctx!.stroke();
    }

    function render() {
      time += 1 / 60;
      cameraAngle += 0.001;
      frameCount++;

      const now = performance.now();
      if (now - lastFpsCheck > 1000) {
        const currentFps = Math.round(frameCount * 1000 / (now - lastFpsCheck));
        setFps(currentFps);
        frameCount = 0;
        lastFpsCheck = now;
        // Auto quality adjustment
        if (currentFps < 25 && quality !== 'low') setQuality('low');
        else if (currentFps < 40 && quality === 'high') setQuality('medium');
      }

      // Clear
      ctx!.fillStyle = '#0a0a1a';
      ctx!.fillRect(0, 0, W, H);

      // Radial gradient background
      const bgGrad = ctx!.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.7);
      bgGrad.addColorStop(0, 'rgba(0,30,60,0.3)');
      bgGrad.addColorStop(0.5, 'rgba(10,10,26,0.1)');
      bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, W, H);

      // Hex grid with wave pulse
      if (quality !== 'low') {
        for (const hex of hexCells) {
          const dist = Math.sqrt((hex.cx - W / 2) ** 2 + (hex.cy - H * 0.6) ** 2);
          const wave = Math.sin(time * hex.pulseSpeed + dist * 0.01) * 0.5 + 0.5;
          drawHex(hex.cx, hex.cy, hex.r, hex.baseAlpha + wave * 0.02);
        }
      }

      // Beacon center
      const bx = W / 2;
      const by = H * 0.45;
      
      // Beacon glow
      const beaconGlow = ctx!.createRadialGradient(bx, by, 0, bx, by, 60);
      beaconGlow.addColorStop(0, `rgba(0,210,255,${0.15 + Math.sin(time * 2) * 0.08})`);
      beaconGlow.addColorStop(0.3, 'rgba(0,210,255,0.05)');
      beaconGlow.addColorStop(1, 'rgba(0,210,255,0)');
      ctx!.fillStyle = beaconGlow;
      ctx!.beginPath();
      ctx!.arc(bx, by, 60, 0, Math.PI * 2);
      ctx!.fill();

      // Beacon core
      const coreGrad = ctx!.createRadialGradient(bx, by, 0, bx, by, 12);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#00d2ff');
      coreGrad.addColorStop(0.7, '#0066cc');
      coreGrad.addColorStop(1, 'rgba(0,102,204,0)');
      ctx!.fillStyle = coreGrad;
      ctx!.beginPath();
      ctx!.arc(bx, by, 12, 0, Math.PI * 2);
      ctx!.fill();

      // Beacon pulse rings
      beaconTimer++;
      if (beaconTimer % 80 === 0) {
        beaconRings.push({ radius: 12, alpha: 0.6, speed: 0.8 + Math.random() * 0.4 });
      }
      for (let i = beaconRings.length - 1; i >= 0; i--) {
        const ring = beaconRings[i];
        ring.radius += ring.speed;
        ring.alpha *= 0.985;
        if (ring.alpha < 0.01) { beaconRings.splice(i, 1); continue; }
        ctx!.strokeStyle = `rgba(0,210,255,${ring.alpha})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(bx, by, ring.radius, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // Energy field lines
      if (quality === 'high') {
        for (let i = 0; i < 3; i++) {
          const fieldAngle = time * 0.5 + (Math.PI * 2 / 3) * i;
          const fx1 = bx + Math.cos(fieldAngle) * 30;
          const fy1 = by + Math.sin(fieldAngle) * 30;
          const fx2 = bx + Math.cos(fieldAngle + 0.3) * 80;
          const fy2 = by + Math.sin(fieldAngle + 0.3) * 80;
          ctx!.strokeStyle = `rgba(224,64,251,${0.15 + Math.sin(time * 3 + i) * 0.1})`;
          ctx!.lineWidth = 0.8;
          ctx!.beginPath();
          ctx!.moveTo(fx1, fy1);
          ctx!.quadraticCurveTo(bx + Math.cos(fieldAngle + 0.15) * 60, by + Math.sin(fieldAngle + 0.15) * 20, fx2, fy2);
          ctx!.stroke();
        }
      }

      // Orbital bodies with trails
      for (const orb of orbitals) {
        orb.angle += orb.speed;
        const ox = bx + Math.cos(orb.angle) * orb.radius;
        const oy = by + Math.sin(orb.angle) * orb.radius * 0.5; // Perspective flatten

        // Trail
        orb.trail.push({ x: ox, y: oy, alpha: 0.5 });
        if (orb.trail.length > (quality === 'high' ? 20 : 8)) orb.trail.shift();
        
        if (quality !== 'low') {
          for (let t = 0; t < orb.trail.length - 1; t++) {
            const trailPt = orb.trail[t];
            trailPt.alpha *= 0.9;
            ctx!.fillStyle = `${orb.color}${Math.round(trailPt.alpha * 40).toString(16).padStart(2, '0')}`;
            ctx!.beginPath();
            ctx!.arc(trailPt.x, trailPt.y, orb.size * 0.3, 0, Math.PI * 2);
            ctx!.fill();
          }
        }

        // Glow
        const orbGlow = ctx!.createRadialGradient(ox, oy, 0, ox, oy, orb.glowSize);
        orbGlow.addColorStop(0, `${orb.color}66`);
        orbGlow.addColorStop(1, `${orb.color}00`);
        ctx!.fillStyle = orbGlow;
        ctx!.beginPath();
        ctx!.arc(ox, oy, orb.glowSize, 0, Math.PI * 2);
        ctx!.fill();

        // Body
        ctx!.fillStyle = orb.color;
        ctx!.beginPath();
        ctx!.arc(ox, oy, orb.size, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        const lifeRatio = 1 - p.life / p.maxLife;
        if (lifeRatio <= 0 || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
          particles.splice(i, 1);
          spawnParticle();
          continue;
        }
        ctx!.globalAlpha = p.alpha * lifeRatio;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // Ring platforms
      if (quality !== 'low') {
        for (let i = 0; i < 3; i++) {
          const ringR = 100 + i * 40;
          const ringRotation = time * (0.2 + i * 0.1);
          ctx!.strokeStyle = `rgba(0,210,255,${0.05 - i * 0.01})`;
          ctx!.lineWidth = 0.5;
          ctx!.beginPath();
          ctx!.ellipse(bx, by, ringR, ringR * 0.35, ringRotation, 0, Math.PI * 2);
          ctx!.stroke();
        }
      }

      // Burst particles on interval
      if (Math.random() < 0.02) {
        const bAngle = Math.random() * Math.PI * 2;
        const bDist = 30 + Math.random() * 40;
        for (let b = 0; b < (quality === 'low' ? 3 : 6); b++) {
          spawnParticle(bx + Math.cos(bAngle) * bDist, by + Math.sin(bAngle) * bDist, true);
        }
      }

      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);
  }, [quality]);

  useEffect(() => {
    initScene();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [initScene]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 280 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', borderRadius: 12 }} />
      <div style={{
        position: 'absolute', bottom: 8, right: 8,
        fontSize: 9, fontFamily: 'var(--font-mono, monospace)',
        color: fps > 30 ? 'rgba(0,255,136,0.5)' : 'rgba(255,68,68,0.5)',
        background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4,
      }}>
        {fps} FPS • {quality.toUpperCase()}
      </div>
    </div>
  );
}
