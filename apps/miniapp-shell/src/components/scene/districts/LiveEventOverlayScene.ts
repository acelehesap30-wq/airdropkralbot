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
 * Live Event Overlay — ANOMALY BOSS FIGHT
 * Mechanic: Central anomaly core is the BOSS with HP. Click core to deal damage.
 * Boss periodically spawns DANGER ORBS that expand outward.
 * Clicking a danger orb = score penalty. Destroying boss = big bonus + respawn harder.
 * Theme: Anomaly-infused arena, energy rings, plasma vortex, storm lighting.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.01, 0.05, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera('cam', -Math.PI / 3, Math.PI / 3.5, quality === 'low' ? 70 : 55, new Vector3(0, 8, 0), scene);
  camera.lowerRadiusLimit = 30; camera.upperRadiusLimit = 110;
  camera.lowerBetaLimit = 0.2; camera.upperBetaLimit = Math.PI / 2.1;
  camera.attachControl(canvas, true);
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.2;
    camera.autoRotationBehavior.idleRotationWaitTime = 800;
  }

  // ── Lights ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.15; hemi.diffuse = new Color3(0.1, 0.05, 0.15);

  const plasmaLight = new PointLight('plasma', new Vector3(0, 18, 0), scene);
  plasmaLight.diffuse = new Color3(0.2, 1, 0.5); plasmaLight.intensity = 2.0;

  const anomalyLight = new PointLight('anomaly', new Vector3(15, 8, -10), scene);
  anomalyLight.diffuse = new Color3(0.9, 0.2, 0.8); anomalyLight.intensity = 1.5;

  const stormLight = new PointLight('storm', new Vector3(-15, 12, 10), scene);
  stormLight.diffuse = new Color3(0.3, 0.8, 1); stormLight.intensity = 1.0;

  // ── Void Floor ──
  const floor = MeshBuilder.CreateGround('floor', { width: 100, height: 100, subdivisions: 2 }, scene);
  const floorMat = new StandardMaterial('floorMat', scene);
  floorMat.diffuseColor = new Color3(0.02, 0.01, 0.04);
  floorMat.specularColor = Color3.Black();
  floorMat.emissiveColor = new Color3(0.03, 0.01, 0.06);
  floor.material = floorMat;

  // energy rings
  const gridCount = quality === 'low' ? 6 : quality === 'medium' ? 10 : 16;
  const gridMat = new StandardMaterial('gridMat', scene);
  gridMat.emissiveColor = new Color3(0.15, 0.8, 0.4);
  gridMat.diffuseColor = Color3.Black(); gridMat.alpha = 0.3;

  interface EnergyRing { mesh: ReturnType<typeof MeshBuilder.CreateTorus>; baseAlpha: number; phaseOffset: number; rotSpeed: number; }
  const energyRings: EnergyRing[] = [];

  for (let i = 0; i < gridCount; i++) {
    const ring = MeshBuilder.CreateTorus(`eRing${i}`, { diameter: 6 + i * 5.5, thickness: 0.12, tessellation: 48 }, scene);
    ring.position.y = 0.06;
    const rMat = gridMat.clone(`eRingMat${i}`);
    rMat.emissiveColor = i % 3 === 0 ? new Color3(0.15, 0.9, 0.4) : i % 3 === 1 ? new Color3(0.8, 0.15, 0.7) : new Color3(0.2, 0.6, 1);
    ring.material = rMat;
    energyRings.push({ mesh: ring, baseAlpha: 0.25 + Math.random() * 0.15, phaseOffset: i * 0.5, rotSpeed: (i % 2 === 0 ? 1 : -1) * (0.001 + Math.random() * 0.003) });
  }

  // ── Countdown Pillars ──
  const pillarMat = new StandardMaterial('pillarMat', scene);
  pillarMat.emissiveColor = new Color3(0.2, 0.9, 0.5);
  pillarMat.diffuseColor = new Color3(0.03, 0.08, 0.05);

  const pillarGlowMat = new StandardMaterial('pillarGlow', scene);
  pillarGlowMat.emissiveColor = new Color3(0.8, 0.2, 0.9);
  pillarGlowMat.diffuseColor = Color3.Black();

  const pillarCount = quality === 'low' ? 4 : 6;
  interface EventPillar { segments: ReturnType<typeof MeshBuilder.CreateCylinder>[]; baseY: number; pulsePhase: number; }
  const pillars: EventPillar[] = [];

  for (let i = 0; i < pillarCount; i++) {
    const angle = (Math.PI * 2 / pillarCount) * i;
    const dist = 20;
    const segments: ReturnType<typeof MeshBuilder.CreateCylinder>[] = [];
    const segCount = quality === 'low' ? 3 : 5;
    for (let s = 0; s < segCount; s++) {
      const seg = MeshBuilder.CreateCylinder(`pillar${i}_s${s}`, { height: 2, diameterTop: 1.2 - s * 0.15, diameterBottom: 1.5 - s * 0.15, tessellation: 6 }, scene);
      seg.position.x = Math.cos(angle) * dist;
      seg.position.z = Math.sin(angle) * dist;
      seg.position.y = s * 2.2 + 1;
      seg.material = s % 2 === 0 ? pillarMat : pillarGlowMat;
      segments.push(seg);
    }
    pillars.push({ segments, baseY: 1, pulsePhase: i * 1.2 });
  }

  // ── BOSS CORE (clickable target) ──
  const coreMat = new StandardMaterial('coreMat', scene);
  coreMat.emissiveColor = new Color3(0.3, 1, 0.6);
  coreMat.diffuseColor = Color3.Black();
  coreMat.alpha = 0.7;

  const core = MeshBuilder.CreateSphere('bossCore', { diameter: 4, segments: quality === 'low' ? 8 : 16 }, scene);
  core.position.y = 12;
  core.material = coreMat;

  const coreShell = MeshBuilder.CreateSphere('bossShell', { diameter: 6, segments: quality === 'low' ? 6 : 12 }, scene);
  coreShell.position.y = 12;
  const shellMat = new StandardMaterial('shellMat', scene);
  shellMat.emissiveColor = new Color3(0.6, 0.1, 0.8);
  shellMat.diffuseColor = Color3.Black();
  shellMat.alpha = 0.2; shellMat.wireframe = true;
  coreShell.material = shellMat;

  // ── DANGER ORBS (clicking these = penalty) ──
  interface DangerOrb {
    mesh: ReturnType<typeof MeshBuilder.CreateSphere>;
    spawnTime: number;
    lifeMs: number;
    startPos: Vector3;
    direction: Vector3;
    speed: number;
    active: boolean;
  }
  const dangerOrbs: DangerOrb[] = [];
  const dangerMat = new StandardMaterial('dangerMat', scene);
  dangerMat.emissiveColor = new Color3(1, 0.1, 0.2);
  dangerMat.diffuseColor = Color3.Black();
  dangerMat.alpha = 0.7;

  const maxDangerOrbs = quality === 'low' ? 4 : quality === 'medium' ? 6 : 8;
  for (let i = 0; i < maxDangerOrbs; i++) {
    const orb = MeshBuilder.CreateSphere(`danger${i}`, { diameter: 1.5, segments: 6 }, scene);
    orb.material = dangerMat;
    orb.setEnabled(false);
    dangerOrbs.push({
      mesh: orb, spawnTime: 0, lifeMs: 3000,
      startPos: Vector3.Zero(), direction: Vector3.Zero(),
      speed: 0.02, active: false,
    });
  }

  // ── Boss State ──
  let bossHp = 20;
  let bossMaxHp = 20;
  let bossPhase = 1;
  let score = 0;
  let damageDealt = 0;
  let bossesKilled = 0;
  let lastDangerSpawn = 0;
  let dangerSpawnInterval = 2000; // ms between danger spawns

  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = {
    score: 0, combo: 0,
    crystalsCollected: 0, totalCrystals: bossMaxHp,
    mechanic: 'boss_fight',
    bossHp, bossMaxHp, phase: bossPhase,
    lastType: '', lastPoints: 0,
  };

  // Hit burst
  const hitBurst = new ParticleSystem('hitBurst', quality === 'low' ? 20 : 40, scene);
  hitBurst.createPointEmitter(new Vector3(-1, -1, -1), new Vector3(1, 2, 1));
  hitBurst.emitter = new Vector3(0, 12, 0);
  hitBurst.minLifeTime = 0.2; hitBurst.maxLifeTime = 0.5;
  hitBurst.minSize = 0.15; hitBurst.maxSize = 0.4;
  hitBurst.minEmitPower = 4; hitBurst.maxEmitPower = 10;
  hitBurst.emitRate = 0;
  hitBurst.color1 = new Color4(0.3, 1, 0.6, 1);
  hitBurst.color2 = new Color4(0.8, 0.2, 0.9, 0.8);
  hitBurst.colorDead = new Color4(0, 0, 0, 0);
  hitBurst.gravity = new Vector3(0, -5, 0);
  hitBurst.blendMode = ParticleSystem.BLENDMODE_ADD;

  // Kill explosion
  const killBurst = new ParticleSystem('killBurst', quality === 'low' ? 40 : 80, scene);
  killBurst.createPointEmitter(new Vector3(-3, -3, -3), new Vector3(3, 3, 3));
  killBurst.emitter = new Vector3(0, 12, 0);
  killBurst.minLifeTime = 0.5; killBurst.maxLifeTime = 1.5;
  killBurst.minSize = 0.3; killBurst.maxSize = 1;
  killBurst.minEmitPower = 8; killBurst.maxEmitPower = 20;
  killBurst.emitRate = 0;
  killBurst.color1 = new Color4(0.5, 1, 0.7, 1);
  killBurst.color2 = new Color4(1, 0.5, 1, 0.9);
  killBurst.colorDead = new Color4(0, 0, 0, 0);
  killBurst.gravity = new Vector3(0, -2, 0);
  killBurst.blendMode = ParticleSystem.BLENDMODE_ADD;

  scene.onPointerDown = (_evt: any, pickResult: any) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    const name = pickResult.pickedMesh.name;

    // Clicked a danger orb? PENALTY!
    if (name.startsWith('danger')) {
      const idx = parseInt(name.replace('danger', ''), 10);
      const d = dangerOrbs[idx];
      if (d && d.active) {
        d.active = false;
        d.mesh.setEnabled(false);
        score = Math.max(0, score - 30 * bossPhase);
        scene.metadata.gameState = {
          ...scene.metadata.gameState,
          score,
          lastType: '', lastPoints: -30 * bossPhase,
        };
        return;
      }
    }

    // Clicked boss core? DAMAGE!
    if (name === 'bossCore' || name === 'bossShell') {
      bossHp--;
      damageDealt++;
      const pts = 15 * bossPhase;
      score += pts;

      hitBurst.manualEmitCount = quality === 'low' ? 20 : 40;
      hitBurst.start();
      setTimeout(() => hitBurst.stop(), 200);

      // Flash core
      coreMat.alpha = 1;
      setTimeout(() => { coreMat.alpha = 0.7; }, 100);

      if (bossHp <= 0) {
        // BOSS KILLED!
        bossesKilled++;
        const killPts = 200 * bossPhase;
        score += killPts;

        killBurst.manualEmitCount = quality === 'low' ? 40 : 80;
        killBurst.start();
        setTimeout(() => killBurst.stop(), 500);

        // Respawn harder boss
        bossPhase++;
        bossMaxHp = 20 + bossPhase * 5;
        bossHp = bossMaxHp;
        dangerSpawnInterval = Math.max(800, 2000 - bossPhase * 200);

        scene.metadata.gameState = {
          score, combo: bossPhase,
          crystalsCollected: bossesKilled, totalCrystals: bossMaxHp,
          mechanic: 'boss_fight',
          bossHp, bossMaxHp, phase: bossPhase,
          lastType: 'rc', lastPoints: killPts,
        };
      } else {
        scene.metadata.gameState = {
          score, combo: bossPhase,
          crystalsCollected: damageDealt, totalCrystals: bossMaxHp,
          mechanic: 'boss_fight',
          bossHp, bossMaxHp, phase: bossPhase,
          lastType: bossHp < bossMaxHp * 0.3 ? 'hc' : 'sc',
          lastPoints: pts,
        };
      }
    }
  };

  // ── Plasma Vortex Particles ──
  const vortex = new ParticleSystem('vortex', quality === 'low' ? 200 : quality === 'medium' ? 600 : 1200, scene);
  vortex.createCylinderEmitter(8, 0.5, 0, 0);
  vortex.emitter = new Vector3(0, 6, 0);
  vortex.minLifeTime = 1.5; vortex.maxLifeTime = 4;
  vortex.minSize = 0.2; vortex.maxSize = 0.6;
  vortex.minEmitPower = 2; vortex.maxEmitPower = 5;
  vortex.emitRate = quality === 'low' ? 40 : quality === 'medium' ? 80 : 160;
  vortex.color1 = new Color4(0.2, 1, 0.5, 0.5);
  vortex.color2 = new Color4(0.8, 0.15, 0.9, 0.4);
  vortex.colorDead = new Color4(0.1, 0.3, 0.5, 0);
  vortex.gravity = new Vector3(0, 1.5, 0);
  vortex.blendMode = ParticleSystem.BLENDMODE_ADD;
  vortex.start();

  // ── Glow & Bloom ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 0.9 : 0.5;
  }
  if (quality === 'high') {
    const pipeline = new DefaultRenderingPipeline('bloom', true, scene, [camera]);
    pipeline.bloomEnabled = true; pipeline.bloomThreshold = 0.25;
    pipeline.bloomWeight = 0.8; pipeline.bloomKernel = 64; pipeline.bloomScale = 0.5;
  }

  // ── Animation ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;
    const now = performance.now();

    // Boss core animation — shake more when low HP
    const hpRatio = bossHp / bossMaxHp;
    const shake = (1 - hpRatio) * 0.5;
    core.position.x = Math.sin(t * 15) * shake;
    core.position.z = Math.cos(t * 12) * shake;
    core.rotation.y += 0.01 + (1 - hpRatio) * 0.02;
    core.rotation.x += 0.005;
    const coreScale = 1 + Math.sin(t * 2.5) * 0.15;
    core.scaling.setAll(coreScale);

    // Boss color shifts to red when low HP
    coreMat.emissiveColor.r = 0.3 + (1 - hpRatio) * 0.7;
    coreMat.emissiveColor.g = 1 * hpRatio;

    coreShell.rotation.y -= 0.008;
    coreShell.rotation.z += 0.004;
    coreShell.scaling.setAll(1 + Math.sin(t * 1.5) * 0.1);

    // Spawn danger orbs periodically
    if (now - lastDangerSpawn > dangerSpawnInterval) {
      lastDangerSpawn = now;
      const inactiveOrb = dangerOrbs.find(d => !d.active);
      if (inactiveOrb) {
        inactiveOrb.active = true;
        inactiveOrb.spawnTime = now;
        inactiveOrb.lifeMs = 2500 + Math.random() * 1500;
        // Spawn near core, move outward
        const angle = Math.random() * Math.PI * 2;
        inactiveOrb.startPos = new Vector3(Math.cos(angle) * 2, 12, Math.sin(angle) * 2);
        inactiveOrb.direction = new Vector3(Math.cos(angle), -0.3, Math.sin(angle));
        inactiveOrb.speed = 0.015 + bossPhase * 0.003;
        inactiveOrb.mesh.position.copyFrom(inactiveOrb.startPos);
        inactiveOrb.mesh.setEnabled(true);
        inactiveOrb.mesh.scaling.setAll(0.3);
      }
    }

    // Animate danger orbs
    for (const d of dangerOrbs) {
      if (!d.active) continue;
      const age = now - d.spawnTime;
      if (age > d.lifeMs) {
        d.active = false;
        d.mesh.setEnabled(false);
        continue;
      }
      // Move outward from core
      d.mesh.position.addInPlace(d.direction.scale(d.speed * engine.getDeltaTime()));
      // Grow as they move outward
      const growFactor = 0.3 + (age / d.lifeMs) * 1.2;
      d.mesh.scaling.setAll(growFactor);
      // Fade out near end
      const danMat = d.mesh.material as StandardMaterial;
      if (danMat) {
        danMat.alpha = age > d.lifeMs * 0.7 ? 0.3 : 0.7;
      }
    }

    // Energy ring pulsation + rotation
    for (const er of energyRings) {
      er.mesh.rotation.y += er.rotSpeed;
      const mat = er.mesh.material as StandardMaterial;
      if (mat) mat.alpha = er.baseAlpha + Math.sin(t * 2 + er.phaseOffset) * 0.1;
    }

    // Pillar segments pulse
    for (const p of pillars) {
      for (let s = 0; s < p.segments.length; s++) {
        p.segments[s].position.y = p.baseY + s * 2.2 + Math.sin(t * 3 + p.pulsePhase + s * 0.8) * 0.3;
      }
    }

    // Dynamic lighting
    plasmaLight.intensity = 1.8 + Math.sin(t * 1.5) * 0.5;
    anomalyLight.diffuse.g = 0.2 + Math.sin(t * 2) * 0.15;
    stormLight.intensity = 0.8 + Math.sin(t * 3) * 0.4;
  });

  return scene;
}
