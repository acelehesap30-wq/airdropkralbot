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
  SpotLight,
  HemisphericLight,
  ParticleSystem,
  DefaultRenderingPipeline,
  GlowLayer,
} from '@babylonjs/core';

/**
 * Season Hall District
 * Theme: Grand/trophy (gold/white), trophy display pedestals, ranking boards,
 * confetti-like particles, golden light beams.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.04, 0.03, 0.01, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera(
    'cam',
    -Math.PI / 2,
    Math.PI / 3.2,
    quality === 'low' ? 65 : 55,
    new Vector3(0, 6, 0),
    scene,
  );
  camera.lowerRadiusLimit = 25;
  camera.upperRadiusLimit = 100;
  camera.lowerBetaLimit = 0.3;
  camera.upperBetaLimit = Math.PI / 2.2;
  camera.attachControl(canvas, true);
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.12;
    camera.autoRotationBehavior.idleRotationWaitTime = 1000;
  }

  // ── Lights ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.25;
  hemi.diffuse = new Color3(0.25, 0.22, 0.12);

  const goldPt1 = new PointLight('goldPt1', new Vector3(0, 15, 0), scene);
  goldPt1.diffuse = new Color3(1, 0.9, 0.4);
  goldPt1.intensity = 2;

  const goldPt2 = new PointLight('goldPt2', new Vector3(15, 8, 15), scene);
  goldPt2.diffuse = new Color3(1, 0.85, 0.3);
  goldPt2.intensity = 1;

  const whitePt = new PointLight('whitePt', new Vector3(-12, 10, -12), scene);
  whitePt.diffuse = new Color3(1, 0.95, 0.85);
  whitePt.intensity = 1.2;

  // ── Ground ──
  const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100, subdivisions: 2 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.06, 0.05, 0.03);
  groundMat.specularColor = new Color3(0.2, 0.18, 0.1);
  groundMat.emissiveColor = new Color3(0.03, 0.025, 0.01);
  ground.material = groundMat;

  // decorative floor ring
  const floorRingMat = new StandardMaterial('floorRingMat', scene);
  floorRingMat.emissiveColor = new Color3(0.8, 0.7, 0.2);
  floorRingMat.diffuseColor = Color3.Black();
  floorRingMat.alpha = 0.3;

  for (let i = 0; i < 3; i++) {
    const ring = MeshBuilder.CreateTorus(
      `flRing${i}`,
      { diameter: 20 + i * 12, thickness: 0.1, tessellation: 48 },
      scene,
    );
    ring.position.y = 0.05;
    ring.material = floorRingMat;
  }

  // ── Trophy Display Pedestals ──
  const pedestalMat = new StandardMaterial('pedestalMat', scene);
  pedestalMat.diffuseColor = new Color3(0.85, 0.78, 0.55);
  pedestalMat.specularColor = new Color3(0.4, 0.35, 0.2);
  pedestalMat.emissiveColor = new Color3(0.06, 0.05, 0.02);

  const trophyGoldMat = new StandardMaterial('trophyGold', scene);
  trophyGoldMat.diffuseColor = new Color3(0.9, 0.75, 0.2);
  trophyGoldMat.specularColor = new Color3(1, 0.9, 0.5);
  trophyGoldMat.emissiveColor = new Color3(0.3, 0.25, 0.05);

  const trophySilverMat = new StandardMaterial('trophySilver', scene);
  trophySilverMat.diffuseColor = new Color3(0.7, 0.7, 0.75);
  trophySilverMat.specularColor = new Color3(0.9, 0.9, 0.95);
  trophySilverMat.emissiveColor = new Color3(0.1, 0.1, 0.12);

  const trophyBronzeMat = new StandardMaterial('trophyBronze', scene);
  trophyBronzeMat.diffuseColor = new Color3(0.7, 0.45, 0.2);
  trophyBronzeMat.specularColor = new Color3(0.8, 0.55, 0.3);
  trophyBronzeMat.emissiveColor = new Color3(0.12, 0.07, 0.02);

  const pedestalData = [
    { pos: new Vector3(0, 0, -8), height: 5, trophyMat: trophyGoldMat },
    { pos: new Vector3(-6, 0, -6), height: 3.5, trophyMat: trophySilverMat },
    { pos: new Vector3(6, 0, -6), height: 3, trophyMat: trophyBronzeMat },
    { pos: new Vector3(-12, 0, -3), height: 2, trophyMat: trophyGoldMat },
    { pos: new Vector3(12, 0, -3), height: 2, trophyMat: trophySilverMat },
  ];

  interface TrophyMesh {
    cupBody: ReturnType<typeof MeshBuilder.CreateCylinder>;
    star: ReturnType<typeof MeshBuilder.CreateSphere>;
    baseY: number;
    rotSpeed: number;
  }
  const trophies: TrophyMesh[] = [];

  for (let i = 0; i < pedestalData.length; i++) {
    const pd = pedestalData[i];

    // pedestal
    const pedestal = MeshBuilder.CreateBox(
      `ped${i}`,
      { width: 3, height: pd.height, depth: 3 },
      scene,
    );
    pedestal.position = pd.pos.clone();
    pedestal.position.y = pd.height / 2;
    pedestal.material = pedestalMat;

    // trophy: cup body (cylinder)
    const cup = MeshBuilder.CreateCylinder(
      `cup${i}`,
      { height: 2, diameterTop: 1.4, diameterBottom: 0.5, tessellation: 12 },
      scene,
    );
    cup.position = pd.pos.clone();
    cup.position.y = pd.height + 1;
    cup.material = pd.trophyMat;

    // trophy star (sphere on top)
    const star = MeshBuilder.CreateSphere(`star${i}`, { diameter: 0.8, segments: 6 }, scene);
    star.position = pd.pos.clone();
    star.position.y = pd.height + 2.5;
    star.material = pd.trophyMat;

    // spotlight on trophy
    const ts = new SpotLight(
      `tSpot${i}`,
      new Vector3(pd.pos.x, pd.height + 8, pd.pos.z),
      new Vector3(0, -1, 0),
      Math.PI / 6,
      2,
      scene,
    );
    ts.diffuse = new Color3(1, 0.9, 0.5);
    ts.intensity = quality === 'low' ? 1.5 : 2.5;

    trophies.push({
      cupBody: cup,
      star,
      baseY: pd.height + 2.5,
      rotSpeed: 0.01 + Math.random() * 0.01,
    });
  }

  // ── Ranking Board Displays ──
  const boardMat = new StandardMaterial('boardMat', scene);
  boardMat.emissiveColor = new Color3(0.7, 0.6, 0.15);
  boardMat.diffuseColor = Color3.Black();
  boardMat.alpha = 0.45;

  const boardLineMat = new StandardMaterial('boardLineMat', scene);
  boardLineMat.emissiveColor = new Color3(1, 0.9, 0.5);
  boardLineMat.diffuseColor = Color3.Black();
  boardLineMat.alpha = 0.6;

  // left board
  const boardL = MeshBuilder.CreatePlane('boardL', { width: 10, height: 8 }, scene);
  boardL.position.set(-20, 7, 0);
  boardL.rotation.y = Math.PI / 2;
  boardL.material = boardMat;

  // right board
  const boardR = MeshBuilder.CreatePlane('boardR', { width: 10, height: 8 }, scene);
  boardR.position.set(20, 7, 0);
  boardR.rotation.y = -Math.PI / 2;
  boardR.material = boardMat;

  // ranking lines on boards
  const rankCount = quality === 'low' ? 4 : 6;
  for (let i = 0; i < rankCount; i++) {
    const lnL = MeshBuilder.CreatePlane(`rnkL${i}`, { width: 7, height: 0.3 }, scene);
    lnL.position.set(-19.95, 9.5 - i * 1.2, 0);
    lnL.rotation.y = Math.PI / 2;
    lnL.material = boardLineMat;

    const lnR = MeshBuilder.CreatePlane(`rnkR${i}`, { width: 7, height: 0.3 }, scene);
    lnR.position.set(19.95, 9.5 - i * 1.2, 0);
    lnR.rotation.y = -Math.PI / 2;
    lnR.material = boardLineMat;
  }

  // ── Golden Light Beams ──
  const beamMat = new StandardMaterial('beamMat', scene);
  beamMat.emissiveColor = new Color3(1, 0.85, 0.2);
  beamMat.diffuseColor = Color3.Black();
  beamMat.alpha = 0.08;

  const beamCount = quality === 'low' ? 3 : 6;
  for (let i = 0; i < beamCount; i++) {
    const angle = (Math.PI * 2 / beamCount) * i;
    const beam = MeshBuilder.CreateCylinder(
      `beam${i}`,
      { height: 30, diameterTop: 0.5, diameterBottom: 4, tessellation: 8 },
      scene,
    );
    beam.position.set(Math.cos(angle) * 25, 15, Math.sin(angle) * 25);
    beam.material = beamMat;
  }

  // ── Confetti Particles ──
  const confPs = new ParticleSystem('confetti', quality === 'low' ? 150 : quality === 'medium' ? 400 : 700, scene);
  confPs.createPointEmitter(new Vector3(-20, 0, -20), new Vector3(20, 3, 20));
  confPs.emitter = new Vector3(0, 18, 0);
  confPs.minLifeTime = 3;
  confPs.maxLifeTime = 6;
  confPs.minSize = 0.15;
  confPs.maxSize = 0.4;
  confPs.minEmitPower = 0.5;
  confPs.maxEmitPower = 2;
  confPs.emitRate = quality === 'low' ? 15 : 50;
  confPs.color1 = new Color4(1, 0.85, 0, 0.8);
  confPs.color2 = new Color4(1, 0.95, 0.7, 0.6);
  confPs.colorDead = new Color4(0.8, 0.7, 0.3, 0);
  confPs.gravity = new Vector3(0, -2, 0);
  confPs.blendMode = ParticleSystem.BLENDMODE_ADD;
  confPs.start();

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
    pipeline.bloomWeight = 0.65;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
  }

  // ── Interactive Trophy Shards ──
  type ShardTier = 'bronze' | 'silver' | 'gold';
  interface TrophyShard {
    mesh: ReturnType<typeof MeshBuilder.CreateSphere>;
    angle: number;
    radius: number;
    speed: number;
    baseY: number;
    tier: ShardTier;
    collected: boolean;
    respawnAt: number;
  }
  const SHARD_CFG = {
    bronze: { points: 5, color: new Color3(0.8, 0.5, 0.2) },
    silver: { points: 20, color: new Color3(0.8, 0.8, 0.9) },
    gold: { points: 50, color: new Color3(1, 0.85, 0.1) },
  } as const;

  const shardCount = quality === 'low' ? 5 : quality === 'medium' ? 8 : 12;
  const shards: TrophyShard[] = [];
  for (let i = 0; i < shardCount; i++) {
    const tier: ShardTier = i % 5 === 0 ? 'gold' : i % 3 === 0 ? 'silver' : 'bronze';
    const cfg = SHARD_CFG[tier];
    const mesh = MeshBuilder.CreateSphere(`shard${i}`, { diameter: tier === 'gold' ? 1.4 : 0.9, segments: 8 }, scene);
    const mat = new StandardMaterial(`shardMat${i}`, scene);
    mat.emissiveColor = cfg.color;
    mat.diffuseColor = Color3.Black();
    mat.alpha = 0.85;
    mesh.material = mat;
    shards.push({
      mesh, angle: (Math.PI * 2 / shardCount) * i,
      radius: 8 + Math.random() * 16, speed: 0.004 + Math.random() * 0.006,
      baseY: 2 + Math.random() * 6, tier, collected: false, respawnAt: 0,
    });
  }

  let score = 0, combo = 0, lastCollectTime = 0, shardsCollected = 0;
  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = { score: 0, combo: 0, crystalsCollected: 0, totalCrystals: shardCount, lastType: '', lastPoints: 0 };

  scene.onPointerDown = (_evt: any, pickResult: any) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    for (const s of shards) {
      if (s.collected || s.mesh.name !== pickResult.pickedMesh.name) continue;
      s.collected = true; s.mesh.setEnabled(false);
      const now = performance.now();
      combo = (now - lastCollectTime < 3000) ? Math.min(combo + 1, 10) : 1;
      lastCollectTime = now;
      const pts = SHARD_CFG[s.tier].points * combo;
      score += pts; shardsCollected++;
      scene.metadata.gameState = { score, combo, crystalsCollected: shardsCollected, totalCrystals: shardCount,
        lastType: s.tier === 'gold' ? 'rc' : s.tier === 'silver' ? 'hc' : 'sc', lastPoints: pts };
      const burst = new ParticleSystem(`sBurst${s.mesh.name}`, 20, scene);
      burst.createPointEmitter(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5));
      burst.emitter = s.mesh.position.clone();
      burst.minLifeTime = 0.2; burst.maxLifeTime = 0.6; burst.minSize = 0.1; burst.maxSize = 0.35;
      burst.minEmitPower = 3; burst.maxEmitPower = 6; burst.emitRate = 0;
      const c = SHARD_CFG[s.tier].color;
      burst.color1 = new Color4(c.r, c.g, c.b, 1); burst.colorDead = new Color4(0, 0, 0, 0);
      burst.blendMode = ParticleSystem.BLENDMODE_ADD;
      burst.manualEmitCount = 20; burst.start(); burst.targetStopDuration = 0.8; burst.disposeOnStop = true;
      s.respawnAt = now + 6000 + Math.random() * 5000;
      break;
    }
  };

  // ── Animation ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;
    const now = performance.now();

    // shard orbits and respawn
    for (const s of shards) {
      if (s.collected && s.respawnAt > 0 && now >= s.respawnAt) {
        s.collected = false; s.mesh.setEnabled(true); s.respawnAt = 0;
        s.angle = Math.random() * Math.PI * 2; shardsCollected = Math.max(0, shardsCollected - 1);
      }
      if (!s.collected) {
        s.angle += s.speed;
        s.mesh.position.set(Math.cos(s.angle) * s.radius, s.baseY + Math.sin(t * 2 + s.angle) * 1, Math.sin(s.angle) * s.radius);
      }
    }

    // trophy hover and rotate
    for (const tr of trophies) {
      tr.star.position.y = tr.baseY + Math.sin(t * 2) * 0.3;
      tr.star.rotation.y += tr.rotSpeed;
      tr.cupBody.rotation.y += tr.rotSpeed * 0.5;
    }

    // golden light intensity pulse
    goldPt1.intensity = 1.8 + Math.sin(t * 1.5) * 0.4;

    // board shimmer
    boardMat.alpha = 0.4 + Math.sin(t * 2) * 0.08;

    // beam alpha pulse
    beamMat.alpha = 0.06 + Math.sin(t * 0.8) * 0.03;
  });

  return scene;
}
