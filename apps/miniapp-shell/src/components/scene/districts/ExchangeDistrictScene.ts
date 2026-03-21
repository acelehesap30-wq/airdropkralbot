import {
  Scene,
  Engine,
  ArcRotateCamera,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  PointLight,
  HemisphericLight,
  ParticleSystem,
  DefaultRenderingPipeline,
  GlowLayer,
} from '@babylonjs/core';

/**
 * Exchange District — MARKET TIMING
 * Mechanic: Trade orbs have fluctuating values (visible through size/glow pulsing).
 * Click at PEAK value for max points. A market cycle drives fluctuation.
 * Perfect timing = 3x multiplier. Good = 2x. Poor = 1x.
 * Theme: Trading (purple/gold), price tickers, holographic charts.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.03, 0.02, 0.06, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3, quality === 'low' ? 70 : 58, new Vector3(0, 5, 0), scene);
  camera.lowerRadiusLimit = 30; camera.upperRadiusLimit = 110;
  camera.lowerBetaLimit = 0.3; camera.upperBetaLimit = Math.PI / 2.2;
  camera.attachControl(canvas, true);
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.1;
    camera.autoRotationBehavior.idleRotationWaitTime = 1100;
  }

  // ── Lights ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.15; hemi.diffuse = new Color3(0.12, 0.06, 0.18);

  const purplePt = new PointLight('purplePt', new Vector3(12, 12, 8), scene);
  purplePt.diffuse = new Color3(0.6, 0.15, 0.9); purplePt.intensity = 1.8;

  const goldPt = new PointLight('goldPt', new Vector3(-10, 10, -10), scene);
  goldPt.diffuse = new Color3(1, 0.85, 0.2); goldPt.intensity = 1.5;

  // ── Ground ──
  const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100, subdivisions: 2 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.03, 0.02, 0.05);
  groundMat.specularColor = new Color3(0.1, 0.05, 0.15);
  groundMat.emissiveColor = new Color3(0.02, 0.01, 0.04);
  ground.material = groundMat;

  // floor grid
  const floorLineMat = new StandardMaterial('floorLineMat', scene);
  floorLineMat.emissiveColor = new Color3(0.4, 0.1, 0.6);
  floorLineMat.diffuseColor = Color3.Black();
  floorLineMat.alpha = 0.2;

  const gridLines = quality === 'low' ? 8 : 16;
  for (let i = 0; i < gridLines; i++) {
    const pos = -35 + (70 / gridLines) * i;
    const lx = MeshBuilder.CreateBox(`flX${i}`, { width: 70, height: 0.02, depth: 0.05 }, scene);
    lx.position.set(0, 0.02, pos); lx.material = floorLineMat;
    const lz = MeshBuilder.CreateBox(`flZ${i}`, { width: 0.05, height: 0.02, depth: 70 }, scene);
    lz.position.set(pos, 0.02, 0); lz.material = floorLineMat;
  }

  // ── Trading Floor Pillars ──
  const pillarMat = new StandardMaterial('pillarMat', scene);
  pillarMat.diffuseColor = new Color3(0.08, 0.04, 0.12);
  pillarMat.emissiveColor = new Color3(0.03, 0.01, 0.05);

  const pillarAccentMat = new StandardMaterial('pillarAccMat', scene);
  pillarAccentMat.emissiveColor = new Color3(1, 0.8, 0.15);
  pillarAccentMat.diffuseColor = Color3.Black();

  const pillarPositions = [[-18, -18], [-18, 18], [18, -18], [18, 18], [-10, -10], [-10, 10], [10, -10], [10, 10]];
  for (let i = 0; i < pillarPositions.length; i++) {
    const [px, pz] = pillarPositions[i];
    const pillar = MeshBuilder.CreateCylinder(`pillar${i}`, { height: 12, diameter: 1.5, tessellation: 8 }, scene);
    pillar.position.set(px, 6, pz); pillar.material = pillarMat;
    const band = MeshBuilder.CreateTorus(`band${i}`, { diameter: 2.2, thickness: 0.15, tessellation: 16 }, scene);
    band.position.set(px, 11, pz); band.material = pillarAccentMat;
  }

  // ── Price Tickers ──
  const tickerMat = new StandardMaterial('tickerMat', scene);
  tickerMat.emissiveColor = new Color3(0.5, 0.15, 0.8);
  tickerMat.diffuseColor = Color3.Black(); tickerMat.alpha = 0.6;

  const tickerGoldMat = new StandardMaterial('tickerGoldMat', scene);
  tickerGoldMat.emissiveColor = new Color3(1, 0.85, 0.15);
  tickerGoldMat.diffuseColor = Color3.Black(); tickerGoldMat.alpha = 0.55;

  interface Ticker { mesh: ReturnType<typeof MeshBuilder.CreatePlane>; baseY: number; bobSpeed: number; bobAmp: number; }
  const tickers: Ticker[] = [];
  const tickerCount = quality === 'low' ? 3 : 6;
  for (let i = 0; i < tickerCount; i++) {
    const angle = (Math.PI * 2 / tickerCount) * i;
    const r = 8;
    const ticker = MeshBuilder.CreatePlane(`ticker${i}`, { width: 4, height: 2 }, scene);
    ticker.position.set(Math.cos(angle) * r, 9 + Math.random() * 3, Math.sin(angle) * r);
    ticker.billboardMode = 7;
    ticker.material = i % 2 === 0 ? tickerMat : tickerGoldMat;
    tickers.push({ mesh: ticker, baseY: ticker.position.y, bobSpeed: 0.8 + Math.random() * 0.5, bobAmp: 0.3 + Math.random() * 0.3 });
  }

  // ── Holographic Chart ──
  const chartMat = new StandardMaterial('chartMat', scene);
  chartMat.emissiveColor = new Color3(0.5, 0.2, 0.8);
  chartMat.diffuseColor = Color3.Black(); chartMat.alpha = 0.35;
  const chartBack = MeshBuilder.CreatePlane('chartBack', { width: 16, height: 10 }, scene);
  chartBack.position.set(0, 8, -20); chartBack.material = chartMat;

  const barMat = new StandardMaterial('barMat', scene);
  barMat.emissiveColor = new Color3(0.2, 0.8, 0.3); barMat.diffuseColor = Color3.Black(); barMat.alpha = 0.6;
  const barRedMat = new StandardMaterial('barRedMat', scene);
  barRedMat.emissiveColor = new Color3(0.9, 0.2, 0.2); barRedMat.diffuseColor = Color3.Black(); barRedMat.alpha = 0.6;

  interface ChartBar { mesh: ReturnType<typeof MeshBuilder.CreateBox>; baseHeight: number; }
  const chartBars: ChartBar[] = [];
  const barCount = quality === 'low' ? 8 : 14;
  for (let i = 0; i < barCount; i++) {
    const h = 1 + Math.random() * 6;
    const bar = MeshBuilder.CreateBox(`cBar${i}`, { width: 0.8, height: h, depth: 0.1 }, scene);
    bar.position.set(-6.5 + (13 / barCount) * i, 4 + h / 2, -19.9);
    bar.material = Math.random() > 0.4 ? barMat : barRedMat;
    chartBars.push({ mesh: bar, baseHeight: h });
  }

  // ── MARKET TIMING MECHANIC ──
  // Each orb has a value cycle. Click at peak = max points.
  type TradeSignal = 'bull' | 'bear' | 'golden';
  interface MarketOrb {
    mesh: ReturnType<typeof MeshBuilder.CreateSphere>;
    light: InstanceType<typeof PointLight>;
    signal: TradeSignal;
    angle: number; radius: number; speed: number; baseY: number;
    // market cycle
    cycleSpeed: number;   // how fast value fluctuates
    cyclePhase: number;   // starting phase
    tapped: boolean;
    respawnAt: number;
  }

  const SIGNAL_CONFIG = {
    bull:   { basePoints: 10, color: new Color3(0.2, 0.9, 0.3) },
    bear:   { basePoints: 15, color: new Color3(0.9, 0.2, 0.2) },
    golden: { basePoints: 50, color: new Color3(1, 0.85, 0.1) },
  } as const;

  const orbCount = quality === 'low' ? 5 : quality === 'medium' ? 8 : 11;
  const marketOrbs: MarketOrb[] = [];

  for (let i = 0; i < orbCount; i++) {
    const signal: TradeSignal = i % 7 === 0 ? 'golden' : i % 2 === 0 ? 'bull' : 'bear';
    const cfg = SIGNAL_CONFIG[signal];
    const orbMat = new StandardMaterial(`orbMat${i}`, scene);
    orbMat.emissiveColor = cfg.color; orbMat.diffuseColor = Color3.Black(); orbMat.alpha = 0.85;
    const orb = MeshBuilder.CreateSphere(`tradeOrb${i}`, { diameter: signal === 'golden' ? 1.8 : 1.2, segments: 8 }, scene);
    orb.material = orbMat;

    const light = new PointLight(`orbLight${i}`, Vector3.Zero(), scene);
    light.diffuse = cfg.color; light.intensity = 0.5; light.range = 6;

    marketOrbs.push({
      mesh: orb, light, signal,
      angle: (Math.PI * 2 / orbCount) * i,
      radius: 6 + Math.random() * 18,
      speed: 0.003 + Math.random() * 0.007,
      baseY: 3 + Math.random() * 8,
      cycleSpeed: 1.5 + Math.random() * 2,
      cyclePhase: Math.random() * Math.PI * 2,
      tapped: false, respawnAt: 0,
    });
  }

  let score = 0;
  let trades = 0;
  let perfectTrades = 0;

  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = {
    score: 0, combo: 0, crystalsCollected: 0, totalCrystals: orbCount,
    mechanic: 'market_timing', trades: 0, perfectTrades: 0,
    lastType: '', lastPoints: 0,
  };

  // Burst effect
  const tradeBurst = new ParticleSystem('tradeBurst', quality === 'low' ? 15 : 30, scene);
  tradeBurst.createPointEmitter(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5));
  tradeBurst.emitter = Vector3.Zero();
  tradeBurst.minLifeTime = 0.3; tradeBurst.maxLifeTime = 0.7;
  tradeBurst.minSize = 0.12; tradeBurst.maxSize = 0.4;
  tradeBurst.minEmitPower = 3; tradeBurst.maxEmitPower = 7;
  tradeBurst.emitRate = 0;
  tradeBurst.color1 = new Color4(1, 0.85, 0.1, 1);
  tradeBurst.colorDead = new Color4(0, 0, 0, 0);
  tradeBurst.gravity = new Vector3(0, -2, 0);
  tradeBurst.blendMode = ParticleSystem.BLENDMODE_ADD;

  scene.onPointerDown = (_evt: any, pickResult: any) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    const name = pickResult.pickedMesh.name;

    for (const orb of marketOrbs) {
      if (orb.tapped || orb.mesh.name !== name) continue;

      // Calculate current market value (0-1) based on cycle
      const now = performance.now() / 1000;
      const cycleValue = (Math.sin(now * orb.cycleSpeed + orb.cyclePhase) + 1) / 2; // 0 to 1

      // Timing multiplier: peak (>0.85) = 3x, good (>0.6) = 2x, poor = 1x
      let timingMult = 1;
      let timingLabel = 'poor';
      if (cycleValue > 0.85) { timingMult = 3; timingLabel = 'perfect'; perfectTrades++; }
      else if (cycleValue > 0.6) { timingMult = 2; timingLabel = 'good'; }

      orb.tapped = true;
      orb.mesh.setEnabled(false);
      orb.light.intensity = 0;

      const cfg = SIGNAL_CONFIG[orb.signal];
      const pts = cfg.basePoints * timingMult;
      score += pts;
      trades++;

      tradeBurst.emitter = orb.mesh.position.clone();
      const c = cfg.color;
      tradeBurst.color1 = new Color4(c.r, c.g, c.b, 1);
      tradeBurst.manualEmitCount = timingMult === 3 ? 40 : timingMult === 2 ? 25 : 15;
      tradeBurst.start();
      setTimeout(() => tradeBurst.stop(), 300);

      orb.respawnAt = performance.now() + 4000 + Math.random() * 4000;

      scene.metadata.gameState = {
        score, combo: timingMult,
        crystalsCollected: trades, totalCrystals: orbCount,
        mechanic: 'market_timing', trades, perfectTrades,
        lastType: orb.signal === 'golden' ? 'rc' : orb.signal === 'bull' ? 'hc' : 'sc',
        lastPoints: pts,
        timing: timingLabel,
      };
      break;
    }
  };

  // ── Currency Particles ──
  const currPs = new ParticleSystem('currency', quality === 'low' ? 150 : 400, scene);
  currPs.createPointEmitter(new Vector3(-5, 0, -5), new Vector3(5, 2, 5));
  currPs.emitter = new Vector3(0, 2, 0);
  currPs.minLifeTime = 2; currPs.maxLifeTime = 4;
  currPs.minSize = 0.15; currPs.maxSize = 0.4;
  currPs.minEmitPower = 1; currPs.maxEmitPower = 3;
  currPs.emitRate = quality === 'low' ? 20 : 60;
  currPs.color1 = new Color4(1, 0.85, 0.1, 0.7);
  currPs.color2 = new Color4(1, 0.7, 0, 0.5);
  currPs.colorDead = new Color4(0.5, 0.3, 0, 0);
  currPs.gravity = new Vector3(0, 2, 0);
  currPs.blendMode = ParticleSystem.BLENDMODE_ADD;
  currPs.start();

  // ── Glow ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 0.8 : 0.5;
  }

  // ── Bloom ──
  if (quality === 'high') {
    const pipeline = new DefaultRenderingPipeline('bloom', true, scene, [camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.35;
    pipeline.bloomWeight = 0.55;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
  }

  // ── Animation ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;
    const now = performance.now();
    const nowSec = now / 1000;

    for (const orb of marketOrbs) {
      if (orb.tapped && orb.respawnAt > 0 && now >= orb.respawnAt) {
        orb.tapped = false;
        orb.mesh.setEnabled(true);
        orb.respawnAt = 0;
        orb.angle = Math.random() * Math.PI * 2;
        orb.cyclePhase = Math.random() * Math.PI * 2;
      }
      if (!orb.tapped) {
        orb.angle += orb.speed;
        orb.mesh.position.x = Math.cos(orb.angle) * orb.radius;
        orb.mesh.position.z = Math.sin(orb.angle) * orb.radius;
        orb.mesh.position.y = orb.baseY + Math.sin(t * 2.5 + orb.angle) * 1.5;
        orb.light.position.copyFrom(orb.mesh.position);

        // Market value visualization: size and glow pulse with cycle
        const cycleValue = (Math.sin(nowSec * orb.cycleSpeed + orb.cyclePhase) + 1) / 2;
        const scale = 0.7 + cycleValue * 0.8; // 0.7 to 1.5
        orb.mesh.scaling.setAll(scale);
        orb.light.intensity = 0.2 + cycleValue * 0.8; // 0.2 to 1.0

        // Color shift: green when high value, red when low
        const mat = orb.mesh.material as StandardMaterial;
        if (mat) {
          mat.alpha = 0.5 + cycleValue * 0.5;
          // add green tint at peak
          if (cycleValue > 0.8) {
            mat.emissiveColor.g = Math.min(1, mat.emissiveColor.g + 0.3);
          }
        }
      }
    }

    // ticker bob
    for (const tk of tickers) {
      tk.mesh.position.y = tk.baseY + Math.sin(t * tk.bobSpeed) * tk.bobAmp;
    }

    // chart bars animate
    for (let i = 0; i < chartBars.length; i++) {
      const cb = chartBars[i];
      const newH = cb.baseHeight + Math.sin(t * 1.5 + i * 0.7) * 1.2;
      const clampH = Math.max(0.5, newH);
      cb.mesh.scaling.y = clampH / cb.baseHeight;
    }

    purplePt.diffuse.r = 0.5 + Math.sin(t * 0.8) * 0.15;
    goldPt.intensity = 1.3 + Math.sin(t * 1.2) * 0.3;
    chartMat.alpha = 0.3 + Math.sin(t * 2) * 0.08;
  });

  return scene;
}
