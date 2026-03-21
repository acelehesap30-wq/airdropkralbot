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
 * Mission Quarter District
 * Theme: Military/tech, dark tones, holographic mission board, scanning beam,
 * green/orange neon accents, animated radar ground effect.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.04, 0.02, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera(
    'cam',
    -Math.PI / 2,
    Math.PI / 3,
    quality === 'low' ? 70 : 55,
    new Vector3(0, 4, 0),
    scene,
  );
  camera.lowerRadiusLimit = 30;
  camera.upperRadiusLimit = 110;
  camera.lowerBetaLimit = 0.3;
  camera.upperBetaLimit = Math.PI / 2.2;
  camera.attachControl(canvas, true);
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.1;
    camera.autoRotationBehavior.idleRotationWaitTime = 1200;
  }

  // ── Lights ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.15;
  hemi.diffuse = new Color3(0.1, 0.15, 0.08);

  const greenPt = new PointLight('greenPt', new Vector3(10, 10, 10), scene);
  greenPt.diffuse = new Color3(0, 0.9, 0.3);
  greenPt.intensity = 1.5;

  const orangePt = new PointLight('orangePt', new Vector3(-12, 8, -10), scene);
  orangePt.diffuse = new Color3(1, 0.55, 0);
  orangePt.intensity = 1.2;

  // ── Ground ──
  const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100, subdivisions: 2 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.03, 0.04, 0.03);
  groundMat.specularColor = Color3.Black();
  groundMat.emissiveColor = new Color3(0, 0.03, 0.01);
  ground.material = groundMat;

  // ── Radar ground rings ──
  const radarCount = quality === 'low' ? 4 : 8;
  const radarMat = new StandardMaterial('radarMat', scene);
  radarMat.emissiveColor = new Color3(0, 0.5, 0.15);
  radarMat.diffuseColor = Color3.Black();
  radarMat.alpha = 0.25;

  const radarRings: ReturnType<typeof MeshBuilder.CreateTorus>[] = [];
  for (let i = 0; i < radarCount; i++) {
    const ring = MeshBuilder.CreateTorus(
      `radar${i}`,
      { diameter: 10 + i * 7, thickness: 0.06, tessellation: 48 },
      scene,
    );
    ring.position.y = 0.05;
    ring.material = radarMat;
    radarRings.push(ring);
  }

  // radar sweep arm
  const sweepMat = new StandardMaterial('sweepMat', scene);
  sweepMat.emissiveColor = new Color3(0, 0.8, 0.2);
  sweepMat.diffuseColor = Color3.Black();
  sweepMat.alpha = 0.3;

  const sweepArm = MeshBuilder.CreateBox('sweep', { width: 40, height: 0.04, depth: 0.6 }, scene);
  sweepArm.position.y = 0.06;
  sweepArm.material = sweepMat;
  sweepArm.setPivotPoint(new Vector3(-20, 0, 0));

  // ── Holographic Mission Board ──
  const boardMat = new StandardMaterial('boardMat', scene);
  boardMat.emissiveColor = new Color3(0, 0.7, 0.3);
  boardMat.diffuseColor = Color3.Black();
  boardMat.alpha = 0.5;

  const boardFrame = MeshBuilder.CreateBox('boardFrame', { width: 12, height: 8, depth: 0.15 }, scene);
  boardFrame.position.set(0, 8, -15);
  boardFrame.material = boardMat;

  // board lines (mission entries)
  const lineMat = new StandardMaterial('lineMat', scene);
  lineMat.emissiveColor = new Color3(0, 0.9, 0.4);
  lineMat.diffuseColor = Color3.Black();
  lineMat.alpha = 0.7;

  const lineCount = quality === 'low' ? 3 : 5;
  for (let i = 0; i < lineCount; i++) {
    const line = MeshBuilder.CreateBox(`mLine${i}`, { width: 9, height: 0.3, depth: 0.02 }, scene);
    line.position.set(0, 10.5 - i * 1.4, -14.9);
    line.material = lineMat;
  }

  // status indicators (small cubes)
  const statusGreen = new StandardMaterial('sGreen', scene);
  statusGreen.emissiveColor = new Color3(0, 1, 0.3);
  statusGreen.diffuseColor = Color3.Black();

  const statusOrange = new StandardMaterial('sOrange', scene);
  statusOrange.emissiveColor = new Color3(1, 0.55, 0);
  statusOrange.diffuseColor = Color3.Black();

  for (let i = 0; i < lineCount; i++) {
    const dot = MeshBuilder.CreateBox(`dot${i}`, { size: 0.4 }, scene);
    dot.position.set(-5.2, 10.5 - i * 1.4, -14.85);
    dot.material = i % 2 === 0 ? statusGreen : statusOrange;
  }

  // ── Scanning Beam (rotating transparent cylinder) ──
  const scanMat = new StandardMaterial('scanMat', scene);
  scanMat.emissiveColor = new Color3(0, 0.7, 0.25);
  scanMat.diffuseColor = Color3.Black();
  scanMat.alpha = 0.15;

  const scanBeam = MeshBuilder.CreateCylinder(
    'scanBeam',
    { height: 25, diameterTop: 0.3, diameterBottom: 12, tessellation: 16 },
    scene,
  );
  scanBeam.position.set(15, 12.5, 0);
  scanBeam.material = scanMat;

  // scan base
  const scanBase = MeshBuilder.CreateCylinder('scanBase', { height: 1, diameter: 3, tessellation: 12 }, scene);
  scanBase.position.set(15, 0.5, 0);
  const scanBaseMat = new StandardMaterial('scanBaseMat', scene);
  scanBaseMat.emissiveColor = new Color3(0, 0.5, 0.15);
  scanBaseMat.diffuseColor = new Color3(0.05, 0.08, 0.05);
  scanBase.material = scanBaseMat;

  // ── Tech pillars ──
  const pillarMat = new StandardMaterial('pillarMat', scene);
  pillarMat.diffuseColor = new Color3(0.08, 0.1, 0.08);
  pillarMat.emissiveColor = new Color3(0.02, 0.06, 0.02);

  const pillarPositions = [
    new Vector3(-20, 4, -20),
    new Vector3(20, 4, -20),
    new Vector3(-20, 4, 20),
    new Vector3(20, 4, 20),
  ];
  for (let i = 0; i < pillarPositions.length; i++) {
    const pillar = MeshBuilder.CreateBox(`pillar${i}`, { width: 2, height: 8, depth: 2 }, scene);
    pillar.position = pillarPositions[i];
    pillar.material = pillarMat;

    // pillar accent light
    const accent = MeshBuilder.CreateBox(`pAcc${i}`, { width: 0.3, height: 6, depth: 0.3 }, scene);
    accent.position = pillarPositions[i].clone();
    accent.position.x += 1.1;
    accent.material = i % 2 === 0 ? statusGreen : statusOrange;
  }

  // ── Scan Targets (interactive blips) ──
  type TargetTier = 'basic' | 'priority' | 'critical';
  interface ScanTarget {
    mesh: ReturnType<typeof MeshBuilder.CreateSphere>;
    angle: number;
    radius: number;
    speed: number;
    tier: TargetTier;
    scanned: boolean;
    respawnAt: number;
    light: InstanceType<typeof PointLight>;
  }

  const TIER_CONFIG = {
    basic:    { points: 5,  color: new Color3(0, 0.9, 0.3) },
    priority: { points: 20, color: new Color3(1, 0.55, 0) },
    critical: { points: 50, color: new Color3(1, 0.1, 0.1) },
  } as const;

  const targetCount = quality === 'low' ? 5 : quality === 'medium' ? 8 : 12;
  const targets: ScanTarget[] = [];

  for (let i = 0; i < targetCount; i++) {
    const tier: TargetTier = i % 5 === 0 ? 'critical' : i % 3 === 0 ? 'priority' : 'basic';
    const cfg = TIER_CONFIG[tier];
    const blip = MeshBuilder.CreateSphere(`target${i}`, { diameter: tier === 'critical' ? 1.5 : tier === 'priority' ? 1.2 : 0.8, segments: 8 }, scene);
    const blipMat = new StandardMaterial(`targetMat${i}`, scene);
    blipMat.emissiveColor = cfg.color;
    blipMat.diffuseColor = Color3.Black();
    blipMat.alpha = 0.8;
    blip.material = blipMat;

    const light = new PointLight(`tLight${i}`, Vector3.Zero(), scene);
    light.diffuse = cfg.color;
    light.intensity = 0.4;
    light.range = 5;

    targets.push({
      mesh: blip,
      angle: (Math.PI * 2 / targetCount) * i,
      radius: 8 + Math.random() * 20,
      speed: 0.004 + Math.random() * 0.006,
      tier,
      scanned: false,
      respawnAt: 0,
      light,
    });
  }

  // ── Game State ──
  let score = 0;
  let streak = 0;
  let lastScanTime = 0;
  let targetsScanned = 0;

  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = { score: 0, streak: 0, crystalsCollected: 0, totalCrystals: targetCount, lastType: '', lastPoints: 0 };

  // ── Click to scan targets ──
  scene.onPointerDown = (_evt: any, pickResult: any) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    const name = pickResult.pickedMesh.name;

    for (const tgt of targets) {
      if (tgt.scanned || tgt.mesh.name !== name) continue;

      tgt.scanned = true;
      tgt.mesh.setEnabled(false);
      tgt.light.intensity = 0;

      const now = performance.now();
      if (now - lastScanTime < 3000) {
        streak = Math.min(streak + 1, 10);
      } else {
        streak = 1;
      }
      lastScanTime = now;

      const cfg = TIER_CONFIG[tgt.tier];
      const pts = cfg.points * streak;
      score += pts;
      targetsScanned++;

      scene.metadata.gameState = {
        score,
        streak,
        crystalsCollected: targetsScanned,
        totalCrystals: targetCount,
        lastType: tgt.tier === 'critical' ? 'rc' : tgt.tier === 'priority' ? 'hc' : 'sc',
        lastPoints: pts,
      };

      // Scan burst particles
      const burst = new ParticleSystem(`scanBurst${tgt.mesh.name}`, quality === 'low' ? 12 : 25, scene);
      burst.createPointEmitter(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5));
      burst.emitter = tgt.mesh.position.clone();
      burst.minLifeTime = 0.2;
      burst.maxLifeTime = 0.6;
      burst.minSize = 0.1;
      burst.maxSize = 0.35;
      burst.minEmitPower = 2;
      burst.maxEmitPower = 5;
      burst.emitRate = 0;
      const c = cfg.color;
      burst.color1 = new Color4(c.r, c.g, c.b, 1);
      burst.color2 = new Color4(c.r * 0.6, c.g * 0.6, c.b * 0.6, 0.7);
      burst.colorDead = new Color4(0, 0, 0, 0);
      burst.gravity = new Vector3(0, -1, 0);
      burst.blendMode = ParticleSystem.BLENDMODE_ADD;
      burst.manualEmitCount = quality === 'low' ? 12 : 25;
      burst.start();
      burst.targetStopDuration = 0.8;
      burst.disposeOnStop = true;

      // Respawn in 5-10 seconds
      tgt.respawnAt = now + 5000 + Math.random() * 5000;
      break;
    }
  };

  // ── Particles – data sparks ──
  const ps = new ParticleSystem('sparks', quality === 'low' ? 100 : 300, scene);
  ps.createPointEmitter(new Vector3(-20, 0, -20), new Vector3(20, 5, 20));
  ps.emitter = new Vector3(0, 1, 0);
  ps.minLifeTime = 1;
  ps.maxLifeTime = 3;
  ps.minSize = 0.1;
  ps.maxSize = 0.3;
  ps.minEmitPower = 0.3;
  ps.maxEmitPower = 1;
  ps.emitRate = quality === 'low' ? 20 : 60;
  ps.color1 = new Color4(0, 0.9, 0.3, 0.6);
  ps.color2 = new Color4(1, 0.55, 0, 0.4);
  ps.colorDead = new Color4(0, 0.3, 0.1, 0);
  ps.gravity = new Vector3(0, 0.3, 0);
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.start();

  // ── Glow ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 0.7 : 0.4;
  }

  // ── Bloom (high only) ──
  if (quality === 'high') {
    const pipeline = new DefaultRenderingPipeline('bloom', true, scene, [camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.4;
    pipeline.bloomWeight = 0.5;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
  }

  // ── Animation ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;

    const now = performance.now();

    // scan target orbits and respawn
    for (const tgt of targets) {
      if (tgt.scanned && tgt.respawnAt > 0 && now >= tgt.respawnAt) {
        tgt.scanned = false;
        tgt.mesh.setEnabled(true);
        tgt.respawnAt = 0;
        tgt.angle = Math.random() * Math.PI * 2;
        targetsScanned = Math.max(0, targetsScanned - 1);
      }
      if (!tgt.scanned) {
        tgt.angle += tgt.speed;
        tgt.mesh.position.x = Math.cos(tgt.angle) * tgt.radius;
        tgt.mesh.position.z = Math.sin(tgt.angle) * tgt.radius;
        tgt.mesh.position.y = 0.5 + Math.sin(t * 2 + tgt.angle) * 0.5;
        tgt.light.position.copyFrom(tgt.mesh.position);
        tgt.light.intensity = 0.3 + Math.sin(t * 4 + tgt.angle) * 0.15;
      }
    }

    // radar sweep
    sweepArm.rotation.y = t * 1.2;

    // radar ring pulse
    for (let i = 0; i < radarRings.length; i++) {
      const rMat = radarRings[i].material as StandardMaterial;
      if (rMat) {
        rMat.alpha = 0.15 + Math.sin(t * 2 + i * 0.5) * 0.1;
      }
    }

    // scan beam rotation
    scanBeam.rotation.y = t * 0.8;

    // board shimmer
    boardMat.alpha = 0.4 + Math.sin(t * 2.5) * 0.1;

    // scanning beam alpha pulse
    scanMat.alpha = 0.1 + Math.sin(t * 3) * 0.06;
  });

  return scene;
}
