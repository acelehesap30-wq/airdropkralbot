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
 * Central Hub District — PORTAL SEQUENCE
 * Mechanic: 4 colored portal crystals orbit around beacon. System flashes a
 * COLOR SEQUENCE (e.g., Green→Cyan→Purple). Player clicks crystals in shown order.
 * Correct = bonus round (sequence extends). Wrong = reset. Simpler than Elite's
 * Simon Says — serves as the intro/tutorial mechanic.
 * Theme: Neon hex-grid, beacon tower, orbital platforms, particle aurora.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.04, 0.04, 0.1, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.2, quality === 'low' ? 70 : 60, new Vector3(0, 5, 0), scene);
  camera.lowerRadiusLimit = 30; camera.upperRadiusLimit = 120;
  camera.lowerBetaLimit = 0.3; camera.upperBetaLimit = Math.PI / 2.2;
  camera.attachControl(canvas, true);
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.15;
    camera.autoRotationBehavior.idleRotationWaitTime = 1000;
  }

  // ── Lights ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.2; hemi.diffuse = new Color3(0.1, 0.15, 0.25);

  const pointA = new PointLight('ptA', new Vector3(15, 12, 15), scene);
  pointA.diffuse = new Color3(0, 0.82, 1); pointA.intensity = 1.5;

  const pointB = new PointLight('ptB', new Vector3(-15, 10, -15), scene);
  pointB.diffuse = new Color3(0.6, 0.2, 1); pointB.intensity = 1.2;

  // ── Ground – neon hex-grid ──
  const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100, subdivisions: 2 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.02, 0.02, 0.06);
  groundMat.specularColor = Color3.Black();
  groundMat.emissiveColor = new Color3(0, 0.06, 0.12);
  ground.material = groundMat;

  const gridCount = quality === 'low' ? 8 : quality === 'medium' ? 14 : 20;
  const gridMat = new StandardMaterial('gridMat', scene);
  gridMat.emissiveColor = new Color3(0, 0.5, 0.7);
  gridMat.diffuseColor = Color3.Black(); gridMat.alpha = 0.35;

  for (let i = 0; i < gridCount; i++) {
    const ring = MeshBuilder.CreateTorus(`hexRing${i}`, { diameter: 8 + i * 5, thickness: 0.08, tessellation: 6 }, scene);
    ring.position.y = 0.05;
    ring.rotation.y = i % 2 === 0 ? 0 : Math.PI / 6;
    ring.material = gridMat;
  }

  // ── Beacon Tower ──
  const beaconMat = new StandardMaterial('beaconMat', scene);
  beaconMat.emissiveColor = new Color3(0, 0.6, 0.9);
  beaconMat.diffuseColor = new Color3(0.05, 0.1, 0.2);

  const beaconGlowMat = new StandardMaterial('beaconGlowMat', scene);
  beaconGlowMat.emissiveColor = new Color3(0.2, 0.9, 1);
  beaconGlowMat.diffuseColor = Color3.Black();

  const segmentCount = quality === 'low' ? 4 : 6;
  for (let i = 0; i < segmentCount; i++) {
    const h = 3 - i * 0.3;
    const r = 2.5 - i * 0.35;
    const seg = MeshBuilder.CreateCylinder(`beacon${i}`, { height: h, diameterTop: r * 0.7, diameterBottom: r, tessellation: 8 }, scene);
    seg.position.y = i * (h * 0.85) + h / 2;
    seg.material = i % 2 === 0 ? beaconMat : beaconGlowMat;
  }

  const tip = MeshBuilder.CreateSphere('tip', { diameter: 2.2, segments: 8 }, scene);
  tip.position.y = segmentCount * 2.2 + 1;
  tip.material = beaconGlowMat;

  // ── Floating Orbital Platforms (decorative) ──
  const orbCount = quality === 'low' ? 4 : quality === 'medium' ? 6 : 8;
  const orbMat = new StandardMaterial('orbMat', scene);
  orbMat.emissiveColor = new Color3(0.1, 0.6, 0.9);
  orbMat.diffuseColor = new Color3(0.05, 0.15, 0.25);
  orbMat.alpha = 0.85;

  interface OrbitalPlatform { mesh: ReturnType<typeof MeshBuilder.CreateSphere>; angle: number; speed: number; radius: number; yOffset: number; yAmp: number; }
  const orbitals: OrbitalPlatform[] = [];

  for (let i = 0; i < orbCount; i++) {
    const orb = MeshBuilder.CreateSphere(`orb${i}`, { diameter: 1.2 + Math.random() * 0.8, segments: 6 }, scene);
    orb.material = orbMat;
    orbitals.push({
      mesh: orb,
      angle: (Math.PI * 2 / orbCount) * i,
      speed: 0.004 + Math.random() * 0.006,
      radius: 12 + Math.random() * 18,
      yOffset: 5 + Math.random() * 10,
      yAmp: 1 + Math.random() * 2,
    });
  }

  // ── Particle Aurora ──
  const aurPs = new ParticleSystem('aurora', quality === 'low' ? 200 : quality === 'medium' ? 500 : 1000, scene);
  aurPs.createPointEmitter(new Vector3(-30, 0, -30), new Vector3(30, 8, 30));
  aurPs.emitter = new Vector3(0, 12, 0);
  aurPs.minLifeTime = 2; aurPs.maxLifeTime = 5;
  aurPs.minSize = 0.3; aurPs.maxSize = 0.8;
  aurPs.minEmitPower = 0.5; aurPs.maxEmitPower = 1.5;
  aurPs.emitRate = quality === 'low' ? 30 : quality === 'medium' ? 60 : 120;
  aurPs.color1 = new Color4(0, 0.6, 1, 0.4);
  aurPs.color2 = new Color4(0.5, 0.1, 0.9, 0.3);
  aurPs.colorDead = new Color4(0, 0.2, 0.5, 0);
  aurPs.gravity = new Vector3(0, -0.05, 0);
  aurPs.blendMode = ParticleSystem.BLENDMODE_ADD;
  aurPs.start();

  // ── Glow & Bloom ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 0.8 : 0.5;
  }
  if (quality === 'high') {
    const pipeline = new DefaultRenderingPipeline('bloom', true, scene, [camera]);
    pipeline.bloomEnabled = true; pipeline.bloomThreshold = 0.35;
    pipeline.bloomWeight = 0.6; pipeline.bloomKernel = 64; pipeline.bloomScale = 0.5;
  }

  // ── PORTAL SEQUENCE MECHANIC ──
  // 4 colored portal crystals. System shows sequence, player reproduces it.
  const PORTAL_COLORS = [
    { name: 'green',  color: new Color3(0, 1, 0.53),    emissive: new Color3(0, 0.9, 0.4) },
    { name: 'cyan',   color: new Color3(0, 0.82, 1),     emissive: new Color3(0, 0.7, 0.9) },
    { name: 'purple', color: new Color3(0.88, 0.25, 0.98), emissive: new Color3(0.7, 0.15, 0.85) },
    { name: 'gold',   color: new Color3(1, 0.85, 0.15),  emissive: new Color3(0.9, 0.75, 0.1) },
  ];

  interface PortalCrystal {
    mesh: ReturnType<typeof MeshBuilder.CreatePolyhedron>;
    light: PointLight;
    mat: StandardMaterial;
    colorIdx: number;
    angle: number;
    radius: number;
    baseY: number;
    lit: boolean;
  }
  const crystals: PortalCrystal[] = [];

  for (let i = 0; i < 4; i++) {
    const cfg = PORTAL_COLORS[i];
    const angle = (Math.PI * 2 / 4) * i;
    const radius = 14;
    const baseY = 4;
    const pos = new Vector3(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);

    const mat = new StandardMaterial(`portalCrystalMat${i}`, scene);
    mat.emissiveColor = cfg.emissive.scale(0.4);
    mat.diffuseColor = cfg.color.scale(0.2);
    mat.alpha = 0.7;

    const crystal = MeshBuilder.CreatePolyhedron(`pCrystal${i}`, { type: 1, size: 1.5 }, scene);
    crystal.position.copyFrom(pos);
    crystal.material = mat;

    const light = new PointLight(`pCLight${i}`, pos.clone(), scene);
    light.diffuse = cfg.color; light.intensity = 0.3; light.range = 10;

    crystals.push({ mesh: crystal, light, mat, colorIdx: i, angle, radius, baseY, lit: false });
  }

  // Also add orbiting mini-crystals for extra clickable targets
  const miniCount = quality === 'low' ? 4 : quality === 'medium' ? 6 : 8;
  interface MiniCrystal {
    mesh: ReturnType<typeof MeshBuilder.CreatePolyhedron>;
    colorIdx: number;
    angle: number;
    radius: number;
    speed: number;
    baseY: number;
  }
  const miniCrystals: MiniCrystal[] = [];

  for (let i = 0; i < miniCount; i++) {
    const colorIdx = i % 4;
    const cfg = PORTAL_COLORS[colorIdx];
    const mat = new StandardMaterial(`miniMat${i}`, scene);
    mat.emissiveColor = cfg.emissive.scale(0.5);
    mat.diffuseColor = cfg.color.scale(0.15);
    mat.alpha = 0.75;

    const mini = MeshBuilder.CreatePolyhedron(`pMini${colorIdx}_${i}`, { type: 1, size: 0.6 }, scene);
    mini.material = mat;

    miniCrystals.push({
      mesh: mini, colorIdx,
      angle: (Math.PI * 2 / miniCount) * i,
      radius: 20 + Math.random() * 12,
      speed: 0.003 + Math.random() * 0.005,
      baseY: 2 + Math.random() * 6,
    });
  }

  // Sequence state
  let sequence: number[] = [];
  let playerStep = 0;
  let showingSequence = true;
  let seqShowStart = 0;
  let score = 0;
  let roundsCompleted = 0;

  function generateSequence() {
    if (sequence.length === 0) {
      sequence = [
        Math.floor(Math.random() * 4),
        Math.floor(Math.random() * 4),
      ];
    } else {
      sequence.push(Math.floor(Math.random() * 4));
    }
    playerStep = 0;
    showingSequence = true;
    seqShowStart = performance.now();
  }

  generateSequence();

  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = {
    score: 0, combo: 0,
    crystalsCollected: 0, totalCrystals: 4,
    mechanic: 'portal_sequence',
    round: 0, sequenceLength: sequence.length,
    showingSequence: true,
    lastType: '', lastPoints: 0,
  };

  // Burst effect
  const burstPs = new ParticleSystem('seqBurst', quality === 'low' ? 20 : 40, scene);
  burstPs.createPointEmitter(new Vector3(-1, -1, -1), new Vector3(1, 2, 1));
  burstPs.emitter = Vector3.Zero();
  burstPs.minLifeTime = 0.3; burstPs.maxLifeTime = 0.7;
  burstPs.minSize = 0.1; burstPs.maxSize = 0.4;
  burstPs.minEmitPower = 3; burstPs.maxEmitPower = 8;
  burstPs.emitRate = 0;
  burstPs.color1 = new Color4(0, 1, 0.8, 1);
  burstPs.colorDead = new Color4(0, 0, 0, 0);
  burstPs.gravity = new Vector3(0, -3, 0);
  burstPs.blendMode = ParticleSystem.BLENDMODE_ADD;

  // Click handler
  scene.onPointerDown = (_evt, pickResult) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    if (showingSequence) return;

    const name = pickResult.pickedMesh.name;
    let clickedColorIdx = -1;

    // Check main crystals
    for (const c of crystals) {
      if (c.mesh.name === name) { clickedColorIdx = c.colorIdx; break; }
    }
    // Check mini crystals
    if (clickedColorIdx < 0) {
      for (const mc of miniCrystals) {
        if (mc.mesh.name === name) { clickedColorIdx = mc.colorIdx; break; }
      }
    }
    if (clickedColorIdx < 0) return;

    // Flash the clicked crystal
    const mainCrystal = crystals[clickedColorIdx];
    mainCrystal.lit = true;
    setTimeout(() => { mainCrystal.lit = false; }, 250);

    const expected = sequence[playerStep];
    if (clickedColorIdx === expected) {
      playerStep++;

      if (playerStep >= sequence.length) {
        // Sequence complete!
        roundsCompleted++;
        const pts = sequence.length * 15 * roundsCompleted;
        score += pts;

        burstPs.emitter = new Vector3(0, 6, 0);
        const c = PORTAL_COLORS[clickedColorIdx].color;
        burstPs.color1 = new Color4(c.r, c.g, c.b, 1);
        burstPs.manualEmitCount = quality === 'low' ? 20 : 40;
        burstPs.start();
        setTimeout(() => burstPs.stop(), 300);

        scene.metadata.gameState = {
          score, combo: roundsCompleted,
          crystalsCollected: roundsCompleted, totalCrystals: 4,
          mechanic: 'portal_sequence',
          round: roundsCompleted, sequenceLength: sequence.length,
          showingSequence: true,
          lastType: sequence.length >= 6 ? 'rc' : sequence.length >= 4 ? 'hc' : 'sc',
          lastPoints: pts,
        };

        setTimeout(() => generateSequence(), 600);
      } else {
        scene.metadata.gameState = { ...scene.metadata.gameState, score };
      }
    } else {
      // Wrong! Reset
      sequence = [];
      score = Math.max(0, score - 10);
      generateSequence();

      scene.metadata.gameState = {
        score, combo: 0,
        crystalsCollected: roundsCompleted, totalCrystals: 4,
        mechanic: 'portal_sequence',
        round: 0, sequenceLength: sequence.length,
        showingSequence: true,
        lastType: '', lastPoints: -10,
      };
    }
  };

  // ── Portal Gate (decorative) ──
  const portalMat = new StandardMaterial('portalMat', scene);
  portalMat.emissiveColor = new Color3(0, 0.9, 1);
  portalMat.diffuseColor = Color3.Black();
  portalMat.alpha = 0.4; portalMat.backFaceCulling = false;

  const portalFrame = MeshBuilder.CreateTorus('portalFrame', { diameter: 8, thickness: 0.4, tessellation: 32 }, scene);
  portalFrame.position.set(0, 6, -25); portalFrame.rotation.x = Math.PI / 2;
  const portalFrameMat = new StandardMaterial('portalFrameMat', scene);
  portalFrameMat.emissiveColor = new Color3(0, 0.7, 1);
  portalFrameMat.diffuseColor = new Color3(0, 0.15, 0.3);
  portalFrame.material = portalFrameMat;

  const portalDisc = MeshBuilder.CreateDisc('portalDisc', { radius: 3.8, tessellation: 32 }, scene);
  portalDisc.position.set(0, 6, -25); portalDisc.rotation.x = Math.PI / 2;
  portalDisc.material = portalMat;

  const portalLight = new PointLight('portalLight', new Vector3(0, 6, -25), scene);
  portalLight.diffuse = new Color3(0, 0.9, 1); portalLight.intensity = 2; portalLight.range = 15;

  // ── Animation loop ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;

    // Orbital platforms
    for (const o of orbitals) {
      o.angle += o.speed;
      o.mesh.position.x = Math.cos(o.angle) * o.radius;
      o.mesh.position.z = Math.sin(o.angle) * o.radius;
      o.mesh.position.y = o.yOffset + Math.sin(t * 1.5 + o.angle) * o.yAmp;
    }

    // Beacon tip pulse
    tip.scaling.setAll(1 + Math.sin(t * 3) * 0.15);

    // Color cycling
    pointA.diffuse.r = 0.1 + Math.sin(t * 0.7) * 0.1;
    pointA.diffuse.g = 0.6 + Math.sin(t * 0.5) * 0.2;
    pointB.diffuse.r = 0.5 + Math.sin(t * 0.4) * 0.15;
    pointB.diffuse.b = 0.8 + Math.sin(t * 0.6) * 0.2;

    // Sequence show phase
    if (showingSequence) {
      const elapsed = performance.now() - seqShowStart;
      const stepDuration = 700;
      const gap = 200;
      const currentStep = Math.floor(elapsed / (stepDuration + gap));

      for (const c of crystals) {
        const isActive = currentStep < sequence.length && sequence[currentStep] === c.colorIdx;
        const withinFlash = (elapsed % (stepDuration + gap)) < stepDuration;
        const shouldLight = isActive && withinFlash;

        if (shouldLight) {
          c.mat.emissiveColor = PORTAL_COLORS[c.colorIdx].emissive;
          c.mat.alpha = 1;
          c.light.intensity = 1.5;
          c.mesh.scaling.setAll(1.4);
        } else {
          c.mat.emissiveColor = PORTAL_COLORS[c.colorIdx].emissive.scale(0.3);
          c.mat.alpha = 0.5;
          c.light.intensity = 0.2;
          c.mesh.scaling.setAll(1);
        }
      }

      if (currentStep >= sequence.length + 1) {
        showingSequence = false;
        for (const c of crystals) {
          c.mat.emissiveColor = PORTAL_COLORS[c.colorIdx].emissive.scale(0.4);
          c.mat.alpha = 0.7;
          c.light.intensity = 0.3;
          c.mesh.scaling.setAll(1);
        }
        scene.metadata.gameState = { ...scene.metadata.gameState, showingSequence: false };
      }
    } else {
      // Player phase: animate crystals
      for (const c of crystals) {
        if (c.lit) {
          c.mat.emissiveColor = PORTAL_COLORS[c.colorIdx].emissive;
          c.mat.alpha = 1;
          c.light.intensity = 1.5;
          c.mesh.scaling.setAll(1.3);
        } else {
          c.mat.emissiveColor = PORTAL_COLORS[c.colorIdx].emissive.scale(0.5);
          c.mat.alpha = 0.75;
          c.light.intensity = 0.35;
          c.mesh.scaling.setAll(1);
        }
        // Gentle orbit
        c.angle += 0.002;
        c.mesh.position.x = Math.cos(c.angle) * c.radius;
        c.mesh.position.z = Math.sin(c.angle) * c.radius;
        c.mesh.position.y = c.baseY + Math.sin(t * 2 + c.angle) * 0.5;
        c.mesh.rotation.y += 0.02;
        c.light.position.copyFrom(c.mesh.position);
      }
    }

    // Mini crystals orbit
    for (const mc of miniCrystals) {
      mc.angle += mc.speed;
      mc.mesh.position.x = Math.cos(mc.angle) * mc.radius;
      mc.mesh.position.z = Math.sin(mc.angle) * mc.radius;
      mc.mesh.position.y = mc.baseY + Math.sin(t * 2 + mc.angle) * 0.8;
      mc.mesh.rotation.y += 0.02;
      mc.mesh.rotation.x += 0.005;
    }

    // Portal animation
    portalDisc.rotation.z += 0.01;
    portalMat.alpha = 0.3 + Math.sin(t * 2) * 0.15;
    portalLight.intensity = 1.5 + Math.sin(t * 3) * 0.5;
    portalFrameMat.emissiveColor.g = 0.6 + Math.sin(t * 2) * 0.2;
  });

  return scene;
}
