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
 * Arena District
 * Theme: Combat (red/orange), colosseum walls, energy shield dome,
 * lightning bolt particles, combat ring on ground.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.06, 0.02, 0.02, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera(
    'cam',
    -Math.PI / 2,
    Math.PI / 3,
    quality === 'low' ? 70 : 60,
    new Vector3(0, 5, 0),
    scene,
  );
  camera.lowerRadiusLimit = 30;
  camera.upperRadiusLimit = 110;
  camera.lowerBetaLimit = 0.3;
  camera.upperBetaLimit = Math.PI / 2.2;
  camera.attachControl(canvas, true);
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.13;
    camera.autoRotationBehavior.idleRotationWaitTime = 900;
  }

  // ── Lights ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.15;
  hemi.diffuse = new Color3(0.2, 0.08, 0.05);

  const redPt = new PointLight('redPt', new Vector3(0, 12, 0), scene);
  redPt.diffuse = new Color3(1, 0.2, 0.05);
  redPt.intensity = 2.5;
  redPt.range = 60;

  const orangePt = new PointLight('orangePt', new Vector3(15, 8, 15), scene);
  orangePt.diffuse = new Color3(1, 0.5, 0);
  orangePt.intensity = 1.2;

  const rimPt = new PointLight('rimPt', new Vector3(-15, 8, -15), scene);
  rimPt.diffuse = new Color3(0.8, 0.15, 0);
  rimPt.intensity = 1;

  // ── Ground ──
  const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100, subdivisions: 2 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.05, 0.02, 0.02);
  groundMat.specularColor = Color3.Black();
  groundMat.emissiveColor = new Color3(0.04, 0.01, 0.005);
  ground.material = groundMat;

  // ── Combat Ring on Ground ──
  const ringMat = new StandardMaterial('ringMat', scene);
  ringMat.emissiveColor = new Color3(1, 0.2, 0);
  ringMat.diffuseColor = Color3.Black();
  ringMat.alpha = 0.5;

  // outer ring
  const outerRing = MeshBuilder.CreateTorus(
    'outerRing',
    { diameter: 30, thickness: 0.3, tessellation: 48 },
    scene,
  );
  outerRing.position.y = 0.06;
  outerRing.material = ringMat;

  // inner ring
  const innerRing = MeshBuilder.CreateTorus(
    'innerRing',
    { diameter: 20, thickness: 0.2, tessellation: 48 },
    scene,
  );
  innerRing.position.y = 0.06;
  innerRing.material = ringMat;

  // cross lines in ring
  const crossMat = new StandardMaterial('crossMat', scene);
  crossMat.emissiveColor = new Color3(0.8, 0.15, 0);
  crossMat.diffuseColor = Color3.Black();
  crossMat.alpha = 0.3;

  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 4) * i;
    const line = MeshBuilder.CreateBox(`cross${i}`, { width: 28, height: 0.03, depth: 0.12 }, scene);
    line.position.y = 0.05;
    line.rotation.y = angle;
    line.material = crossMat;
  }

  // ── Colosseum Walls (curved segments) ──
  const wallMat = new StandardMaterial('wallMat', scene);
  wallMat.diffuseColor = new Color3(0.12, 0.05, 0.03);
  wallMat.emissiveColor = new Color3(0.04, 0.015, 0.005);
  wallMat.specularColor = new Color3(0.1, 0.05, 0.02);

  const wallAccentMat = new StandardMaterial('wallAccMat', scene);
  wallAccentMat.emissiveColor = new Color3(0.8, 0.15, 0);
  wallAccentMat.diffuseColor = Color3.Black();
  wallAccentMat.alpha = 0.6;

  const wallSegments = quality === 'low' ? 8 : 16;
  for (let i = 0; i < wallSegments; i++) {
    const angle = (Math.PI * 2 / wallSegments) * i;
    const r = 35;

    // wall block
    const wall = MeshBuilder.CreateBox(
      `wall${i}`,
      { width: (2 * Math.PI * r) / wallSegments * 0.85, height: 10 + (i % 3) * 1.5, depth: 3 },
      scene,
    );
    wall.position.set(Math.cos(angle) * r, wall.scaling.y + 5, Math.sin(angle) * r);
    wall.rotation.y = -angle + Math.PI / 2;
    wall.material = wallMat;

    // accent strip on top
    if (quality !== 'low') {
      const accent = MeshBuilder.CreateBox(
        `wAcc${i}`,
        { width: (2 * Math.PI * r) / wallSegments * 0.8, height: 0.3, depth: 3.1 },
        scene,
      );
      accent.position.set(Math.cos(angle) * r, 10 + (i % 3) * 1.5, Math.sin(angle) * r);
      accent.rotation.y = -angle + Math.PI / 2;
      accent.material = wallAccentMat;
    }
  }

  // ── Energy Shield Dome (transparent sphere) ──
  const domeMat = new StandardMaterial('domeMat', scene);
  domeMat.emissiveColor = new Color3(0.3, 0.08, 0);
  domeMat.diffuseColor = Color3.Black();
  domeMat.alpha = 0.08;
  domeMat.backFaceCulling = false;

  const dome = MeshBuilder.CreateSphere(
    'dome',
    { diameter: 55, segments: quality === 'low' ? 8 : 16 },
    scene,
  );
  dome.position.y = 0;
  dome.material = domeMat;

  // dome edge ring
  const domeRing = MeshBuilder.CreateTorus(
    'domeRing',
    { diameter: 55, thickness: 0.2, tessellation: 48 },
    scene,
  );
  domeRing.position.y = 0.1;
  domeRing.material = wallAccentMat;

  // ── Lightning Bolt Particles ──
  const lightningPs = new ParticleSystem('lightning', quality === 'low' ? 100 : quality === 'medium' ? 300 : 500, scene);
  lightningPs.createPointEmitter(new Vector3(-10, 0, -10), new Vector3(10, 15, 10));
  lightningPs.emitter = new Vector3(0, 20, 0);
  lightningPs.minLifeTime = 0.2;
  lightningPs.maxLifeTime = 0.6;
  lightningPs.minSize = 0.1;
  lightningPs.maxSize = 0.5;
  lightningPs.minEmitPower = 5;
  lightningPs.maxEmitPower = 15;
  lightningPs.emitRate = quality === 'low' ? 15 : 40;
  lightningPs.color1 = new Color4(1, 0.4, 0, 0.9);
  lightningPs.color2 = new Color4(1, 0.15, 0, 0.7);
  lightningPs.colorDead = new Color4(0.5, 0.05, 0, 0);
  lightningPs.gravity = new Vector3(0, -10, 0);
  lightningPs.blendMode = ParticleSystem.BLENDMODE_ADD;
  lightningPs.start();

  // ambient sparks near ring
  const sparkPs = new ParticleSystem('sparks', quality === 'low' ? 50 : 150, scene);
  sparkPs.createPointEmitter(new Vector3(-12, 0, -12), new Vector3(12, 2, 12));
  sparkPs.emitter = new Vector3(0, 0.5, 0);
  sparkPs.minLifeTime = 1;
  sparkPs.maxLifeTime = 2.5;
  sparkPs.minSize = 0.05;
  sparkPs.maxSize = 0.15;
  sparkPs.minEmitPower = 0.5;
  sparkPs.maxEmitPower = 2;
  sparkPs.emitRate = quality === 'low' ? 10 : 30;
  sparkPs.color1 = new Color4(1, 0.5, 0, 0.6);
  sparkPs.color2 = new Color4(1, 0.2, 0, 0.4);
  sparkPs.colorDead = new Color4(0.3, 0.05, 0, 0);
  sparkPs.gravity = new Vector3(0, 1, 0);
  sparkPs.blendMode = ParticleSystem.BLENDMODE_ADD;
  sparkPs.start();

  // ── Glow ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 0.9 : 0.5;
  }

  // ── Bloom (high) ──
  if (quality === 'high') {
    const pipeline = new DefaultRenderingPipeline('bloom', true, scene, [camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.3;
    pipeline.bloomWeight = 0.6;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
  }

  // ── Combat Targets (interactive enemy drones) ──
  interface CombatDrone {
    body: ReturnType<typeof MeshBuilder.CreatePolyhedron>;
    shield: ReturnType<typeof MeshBuilder.CreateSphere>;
    hp: number;
    maxHp: number;
    angle: number;
    speed: number;
    radius: number;
    baseY: number;
    alive: boolean;
    respawnAt: number;
    light: PointLight;
  }
  const drones: CombatDrone[] = [];
  const droneCount = quality === 'low' ? 3 : quality === 'medium' ? 5 : 7;

  const droneMat = new StandardMaterial('droneMat', scene);
  droneMat.emissiveColor = new Color3(1, 0.15, 0);
  droneMat.diffuseColor = new Color3(0.2, 0.05, 0);

  const droneShieldMat = new StandardMaterial('droneShieldMat', scene);
  droneShieldMat.emissiveColor = new Color3(1, 0.3, 0);
  droneShieldMat.diffuseColor = Color3.Black();
  droneShieldMat.alpha = 0.15;
  droneShieldMat.backFaceCulling = false;

  for (let i = 0; i < droneCount; i++) {
    const ang = (Math.PI * 2 / droneCount) * i;
    const rad = 8 + Math.random() * 4;
    const droneBody = MeshBuilder.CreatePolyhedron(`drone${i}`, { type: 2, size: 0.8 }, scene);
    droneBody.position.set(Math.cos(ang) * rad, 3 + Math.random() * 2, Math.sin(ang) * rad);
    droneBody.material = droneMat;

    const droneShield = MeshBuilder.CreateSphere(`droneShield${i}`, { diameter: 2.5, segments: 8 }, scene);
    droneShield.position = droneBody.position.clone();
    droneShield.material = droneShieldMat;

    const dLight = new PointLight(`dLight${i}`, droneBody.position.clone(), scene);
    dLight.diffuse = new Color3(1, 0.3, 0);
    dLight.intensity = 0.4;
    dLight.range = 6;

    drones.push({
      body: droneBody,
      shield: droneShield,
      hp: 3,
      maxHp: 3,
      angle: ang,
      speed: 0.008 + Math.random() * 0.008,
      radius: rad,
      baseY: droneBody.position.y,
      alive: true,
      respawnAt: 0,
      light: dLight,
    });
  }

  // Hit burst effect
  const hitBurst = new ParticleSystem('hitBurst', 60, scene);
  hitBurst.createPointEmitter(new Vector3(-1, -1, -1), new Vector3(1, 2, 1));
  hitBurst.emitter = new Vector3(0, 0, 0);
  hitBurst.minLifeTime = 0.15;
  hitBurst.maxLifeTime = 0.4;
  hitBurst.minSize = 0.1;
  hitBurst.maxSize = 0.3;
  hitBurst.minEmitPower = 5;
  hitBurst.maxEmitPower = 12;
  hitBurst.emitRate = 0;
  hitBurst.color1 = new Color4(1, 0.5, 0, 1);
  hitBurst.color2 = new Color4(1, 0.1, 0, 0.8);
  hitBurst.colorDead = new Color4(0.3, 0, 0, 0);
  hitBurst.gravity = new Vector3(0, -8, 0);
  hitBurst.blendMode = ParticleSystem.BLENDMODE_ADD;

  // Kill explosion effect
  const killBurst = new ParticleSystem('killBurst', 120, scene);
  killBurst.createPointEmitter(new Vector3(-2, -1, -2), new Vector3(2, 3, 2));
  killBurst.emitter = new Vector3(0, 0, 0);
  killBurst.minLifeTime = 0.3;
  killBurst.maxLifeTime = 1;
  killBurst.minSize = 0.2;
  killBurst.maxSize = 0.6;
  killBurst.minEmitPower = 6;
  killBurst.maxEmitPower = 18;
  killBurst.emitRate = 0;
  killBurst.color1 = new Color4(1, 0.4, 0, 1);
  killBurst.color2 = new Color4(1, 0.8, 0, 0.9);
  killBurst.colorDead = new Color4(0.5, 0.1, 0, 0);
  killBurst.gravity = new Vector3(0, -4, 0);
  killBurst.blendMode = ParticleSystem.BLENDMODE_ADD;

  // Arena game state
  let arenaScore = 0;
  let killCount = 0;
  let hitStreak = 0;
  let lastHitTime = 0;
  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = { score: 0, kills: 0, streak: 0, dronesAlive: droneCount };

  // Click to attack drones
  scene.onPointerDown = (_evt, pickResult) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    const name = pickResult.pickedMesh.name;
    let droneIdx = -1;
    if (name.startsWith('drone')) {
      droneIdx = parseInt(name.replace('drone', '').replace('Shield', ''), 10);
    } else if (name.startsWith('droneShield')) {
      droneIdx = parseInt(name.replace('droneShield', ''), 10);
    }
    if (droneIdx < 0 || droneIdx >= drones.length) return;
    const d = drones[droneIdx];
    if (!d.alive) return;

    // Hit!
    d.hp--;
    const now = performance.now() / 1000;
    if (now - lastHitTime < 2) {
      hitStreak++;
    } else {
      hitStreak = 1;
    }
    lastHitTime = now;

    // Hit effect
    hitBurst.emitter = d.body.position.clone();
    hitBurst.manualEmitCount = 15;
    hitBurst.start();
    setTimeout(() => hitBurst.stop(), 200);

    // Flash shield on hit
    const shMat = d.shield.material as StandardMaterial;
    if (shMat) {
      shMat.alpha = 0.5;
      setTimeout(() => { shMat.alpha = 0.15; }, 150);
    }

    if (d.hp <= 0) {
      // Kill!
      d.alive = false;
      d.body.setEnabled(false);
      d.shield.setEnabled(false);
      d.light.intensity = 0;
      d.respawnAt = now + 4 + Math.random() * 4;

      // Kill explosion
      killBurst.emitter = d.body.position.clone();
      killBurst.manualEmitCount = 50;
      killBurst.start();
      setTimeout(() => killBurst.stop(), 400);

      killCount++;
      arenaScore += 100 * hitStreak;
    } else {
      arenaScore += 10 * hitStreak;
    }

    scene.metadata.gameState = {
      score: arenaScore,
      kills: killCount,
      streak: hitStreak,
      dronesAlive: drones.filter(dr => dr.alive).length,
    };
  };

  // ── Animation ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;

    // ring pulse
    ringMat.alpha = 0.4 + Math.sin(t * 3) * 0.15;
    ringMat.emissiveColor.g = 0.15 + Math.sin(t * 2) * 0.08;

    // dome flicker
    domeMat.alpha = 0.06 + Math.sin(t * 5) * 0.03 + Math.sin(t * 13) * 0.01;
    domeMat.emissiveColor.r = 0.25 + Math.sin(t * 4) * 0.1;

    // red light intensity flicker
    redPt.intensity = 2.2 + Math.sin(t * 6) * 0.5 + Math.sin(t * 10) * 0.2;

    // cross lines pulse
    crossMat.alpha = 0.25 + Math.sin(t * 2.5) * 0.1;

    // Drone animations — orbit, bob, respawn
    const now = performance.now() / 1000;
    for (const d of drones) {
      if (!d.alive) {
        if (now >= d.respawnAt) {
          d.alive = true;
          d.hp = d.maxHp;
          d.body.setEnabled(true);
          d.shield.setEnabled(true);
          d.light.intensity = 0.4;
        }
        continue;
      }
      // orbit around ring
      d.angle += d.speed;
      d.body.position.x = Math.cos(d.angle) * d.radius;
      d.body.position.z = Math.sin(d.angle) * d.radius;
      d.body.position.y = d.baseY + Math.sin(t * 2 + d.angle) * 0.8;
      // shield follows
      d.shield.position.copyFrom(d.body.position);
      d.light.position.copyFrom(d.body.position);
      // spin
      d.body.rotation.y += 0.03;
      d.body.rotation.x += 0.01;
      // light pulse based on HP
      const hpRatio = d.hp / d.maxHp;
      d.light.intensity = 0.3 + hpRatio * 0.3 + Math.sin(t * 4 + d.angle) * 0.1;
    }
  });

  return scene;
}
