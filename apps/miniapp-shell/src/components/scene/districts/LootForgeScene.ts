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
 * Loot Forge District
 * Theme: Fire/forge (orange/red/gold), anvil mesh, floating rotating loot boxes,
 * fire particles, molten ground glow.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.06, 0.02, 0.01, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera(
    'cam',
    -Math.PI / 2,
    Math.PI / 3.2,
    quality === 'low' ? 65 : 55,
    new Vector3(0, 5, 0),
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
  hemi.intensity = 0.15;
  hemi.diffuse = new Color3(0.2, 0.08, 0.02);

  const firePt = new PointLight('firePt', new Vector3(0, 8, 0), scene);
  firePt.diffuse = new Color3(1, 0.4, 0.05);
  firePt.intensity = 2.5;
  firePt.range = 60;

  const goldPt = new PointLight('goldPt', new Vector3(-10, 6, 10), scene);
  goldPt.diffuse = new Color3(1, 0.85, 0.2);
  goldPt.intensity = 1.2;

  const spotDown = new SpotLight(
    'spotDown',
    new Vector3(0, 20, 0),
    new Vector3(0, -1, 0),
    Math.PI / 4,
    2,
    scene,
  );
  spotDown.diffuse = new Color3(1, 0.5, 0.1);
  spotDown.intensity = 1.5;

  // ── Ground – molten glow ──
  const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100, subdivisions: 2 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.05, 0.02, 0.01);
  groundMat.specularColor = Color3.Black();
  groundMat.emissiveColor = new Color3(0.12, 0.03, 0.005);
  ground.material = groundMat;

  // molten cracks (thin glowing strips)
  const crackMat = new StandardMaterial('crackMat', scene);
  crackMat.emissiveColor = new Color3(1, 0.35, 0);
  crackMat.diffuseColor = Color3.Black();
  crackMat.alpha = 0.6;

  const crackCount = quality === 'low' ? 6 : 12;
  for (let i = 0; i < crackCount; i++) {
    const crack = MeshBuilder.CreateBox(
      `crack${i}`,
      { width: 8 + Math.random() * 25, height: 0.04, depth: 0.15 + Math.random() * 0.2 },
      scene,
    );
    crack.position.set(
      (Math.random() - 0.5) * 60,
      0.03,
      (Math.random() - 0.5) * 60,
    );
    crack.rotation.y = Math.random() * Math.PI;
    crack.material = crackMat;
  }

  // ── Anvil (combined boxes) ──
  const anvilMat = new StandardMaterial('anvilMat', scene);
  anvilMat.diffuseColor = new Color3(0.15, 0.12, 0.1);
  anvilMat.specularColor = new Color3(0.3, 0.25, 0.2);
  anvilMat.emissiveColor = new Color3(0.04, 0.02, 0.01);

  // base
  const anvilBase = MeshBuilder.CreateBox('anvilBase', { width: 5, height: 2, depth: 3 }, scene);
  anvilBase.position.set(0, 1, 0);
  anvilBase.material = anvilMat;

  // neck
  const anvilNeck = MeshBuilder.CreateBox('anvilNeck', { width: 3, height: 1.5, depth: 2 }, scene);
  anvilNeck.position.set(0, 2.75, 0);
  anvilNeck.material = anvilMat;

  // face (top)
  const anvilFace = MeshBuilder.CreateBox('anvilFace', { width: 6, height: 0.8, depth: 3.5 }, scene);
  anvilFace.position.set(0, 3.9, 0);
  anvilFace.material = anvilMat;

  // horn
  const anvilHorn = MeshBuilder.CreateCylinder(
    'anvilHorn',
    { height: 3, diameterTop: 0.3, diameterBottom: 1.5, tessellation: 8 },
    scene,
  );
  anvilHorn.position.set(4, 3.9, 0);
  anvilHorn.rotation.z = -Math.PI / 2;
  anvilHorn.material = anvilMat;

  // hot glow on anvil face
  const hotMat = new StandardMaterial('hotMat', scene);
  hotMat.emissiveColor = new Color3(1, 0.4, 0);
  hotMat.diffuseColor = Color3.Black();
  hotMat.alpha = 0.5;

  const hotSpot = MeshBuilder.CreatePlane('hotSpot', { width: 2, height: 2 }, scene);
  hotSpot.position.set(0, 4.35, 0);
  hotSpot.rotation.x = Math.PI / 2;
  hotSpot.material = hotMat;

  // ── Floating Loot Boxes ──
  const boxMat = new StandardMaterial('boxMat', scene);
  boxMat.emissiveColor = new Color3(1, 0.7, 0);
  boxMat.diffuseColor = new Color3(0.3, 0.15, 0);

  const rareMat = new StandardMaterial('rareMat', scene);
  rareMat.emissiveColor = new Color3(1, 0.15, 0);
  rareMat.diffuseColor = new Color3(0.3, 0.05, 0);

  const boxCount = quality === 'low' ? 4 : quality === 'medium' ? 6 : 8;
  // Loot rarity types: common (gold), rare (red), epic (purple)
  type LootRarity = 'common' | 'rare' | 'epic';
  interface LootBox {
    mesh: ReturnType<typeof MeshBuilder.CreateBox>;
    angle: number;
    radius: number;
    speed: number;
    yBase: number;
    yAmp: number;
    rotSpeed: number;
    rarity: LootRarity;
    opened: boolean;
    respawnAt: number;
    light: InstanceType<typeof PointLight>;
  }
  const lootBoxes: LootBox[] = [];

  const epicMat = new StandardMaterial('epicMat', scene);
  epicMat.emissiveColor = new Color3(0.6, 0.1, 1);
  epicMat.diffuseColor = new Color3(0.2, 0.02, 0.3);

  const RARITY_CONFIG = {
    common: { points: 5, color: new Color3(1, 0.7, 0), mat: boxMat },
    rare: { points: 20, color: new Color3(1, 0.15, 0), mat: rareMat },
    epic: { points: 50, color: new Color3(0.6, 0.1, 1), mat: epicMat },
  } as const;

  for (let i = 0; i < boxCount; i++) {
    const rarity: LootRarity = i % 5 === 0 ? 'epic' : i % 3 === 0 ? 'rare' : 'common';
    const cfg = RARITY_CONFIG[rarity];
    const box = MeshBuilder.CreateBox(`loot${i}`, { size: 1.2 + Math.random() * 0.8 }, scene);
    box.material = cfg.mat;

    const light = new PointLight(`lootLight${i}`, Vector3.Zero(), scene);
    light.diffuse = cfg.color;
    light.intensity = 0.5;
    light.range = 6;

    lootBoxes.push({
      mesh: box,
      angle: (Math.PI * 2 / boxCount) * i,
      radius: 12 + Math.random() * 15,
      speed: 0.003 + Math.random() * 0.005,
      yBase: 4 + Math.random() * 6,
      yAmp: 1 + Math.random() * 1.5,
      rotSpeed: 0.01 + Math.random() * 0.02,
      rarity,
      opened: false,
      respawnAt: 0,
      light,
    });
  }

  // ── Game State ──
  let score = 0;
  let combo = 0;
  let lastOpenTime = 0;
  let cratesOpened = 0;
  const totalCrates = boxCount;

  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = { score: 0, combo: 0, crystalsCollected: 0, totalCrystals: totalCrates, lastType: '', lastPoints: 0 };

  // ── Click to open crates ──
  scene.onPointerDown = (_evt: any, pickResult: any) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    const name = pickResult.pickedMesh.name;

    for (const lb of lootBoxes) {
      if (lb.opened || lb.mesh.name !== name) continue;

      lb.opened = true;
      lb.mesh.setEnabled(false);
      lb.light.intensity = 0;

      const now = performance.now();
      // Combo: consecutive opens within 3 seconds
      if (now - lastOpenTime < 3000) {
        combo = Math.min(combo + 1, 10);
      } else {
        combo = 1;
      }
      lastOpenTime = now;

      const cfg = RARITY_CONFIG[lb.rarity];
      const pts = cfg.points * combo;
      score += pts;
      cratesOpened++;

      // Update game state
      scene.metadata.gameState = {
        score,
        combo,
        crystalsCollected: cratesOpened,
        totalCrystals: totalCrates,
        lastType: lb.rarity === 'epic' ? 'rc' : lb.rarity === 'rare' ? 'hc' : 'sc',
        lastPoints: pts,
      };

      // ── Open burst particles ──
      const burst = new ParticleSystem(`burst${lb.mesh.name}`, quality === 'low' ? 15 : 30, scene);
      burst.createPointEmitter(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
      burst.emitter = lb.mesh.position.clone();
      burst.minLifeTime = 0.3;
      burst.maxLifeTime = 0.8;
      burst.minSize = 0.15;
      burst.maxSize = 0.5;
      burst.minEmitPower = 3;
      burst.maxEmitPower = 8;
      burst.emitRate = 0;
      const c = cfg.color;
      burst.color1 = new Color4(c.r, c.g, c.b, 1);
      burst.color2 = new Color4(c.r * 0.7, c.g * 0.7, c.b * 0.7, 0.8);
      burst.colorDead = new Color4(c.r * 0.3, c.g * 0.3, c.b * 0.3, 0);
      burst.gravity = new Vector3(0, -2, 0);
      burst.blendMode = ParticleSystem.BLENDMODE_ADD;
      burst.manualEmitCount = quality === 'low' ? 15 : 30;
      burst.start();
      burst.targetStopDuration = 1;
      burst.disposeOnStop = true;

      // Respawn after 6-12 seconds
      lb.respawnAt = now + 6000 + Math.random() * 6000;
      break;
    }
  };

  // ── Fire Particles ──
  const firePs = new ParticleSystem('fire', quality === 'low' ? 200 : quality === 'medium' ? 500 : 800, scene);
  firePs.createPointEmitter(new Vector3(-2, 0, -2), new Vector3(2, 3, 2));
  firePs.emitter = new Vector3(0, 4.5, 0);
  firePs.minLifeTime = 0.5;
  firePs.maxLifeTime = 1.5;
  firePs.minSize = 0.2;
  firePs.maxSize = 0.7;
  firePs.minEmitPower = 1;
  firePs.maxEmitPower = 3;
  firePs.emitRate = quality === 'low' ? 40 : 100;
  firePs.color1 = new Color4(1, 0.5, 0, 0.8);
  firePs.color2 = new Color4(1, 0.15, 0, 0.6);
  firePs.colorDead = new Color4(0.3, 0.05, 0, 0);
  firePs.gravity = new Vector3(0, 3, 0);
  firePs.blendMode = ParticleSystem.BLENDMODE_ADD;
  firePs.start();

  // ember particles (drifting sparks)
  const emberPs = new ParticleSystem('embers', quality === 'low' ? 50 : 150, scene);
  emberPs.createPointEmitter(new Vector3(-15, 0, -15), new Vector3(15, 0, 15));
  emberPs.emitter = new Vector3(0, 1, 0);
  emberPs.minLifeTime = 2;
  emberPs.maxLifeTime = 5;
  emberPs.minSize = 0.05;
  emberPs.maxSize = 0.2;
  emberPs.minEmitPower = 0.5;
  emberPs.maxEmitPower = 2;
  emberPs.emitRate = quality === 'low' ? 10 : 30;
  emberPs.color1 = new Color4(1, 0.6, 0, 0.7);
  emberPs.color2 = new Color4(1, 0.3, 0, 0.5);
  emberPs.colorDead = new Color4(0.2, 0.05, 0, 0);
  emberPs.gravity = new Vector3(0, 1.5, 0);
  emberPs.blendMode = ParticleSystem.BLENDMODE_ADD;
  emberPs.start();

  // ── Glow ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 1.0 : 0.6;
  }

  // ── Bloom (high) ──
  if (quality === 'high') {
    const pipeline = new DefaultRenderingPipeline('bloom', true, scene, [camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.3;
    pipeline.bloomWeight = 0.7;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
  }

  // ── Animation ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;

    const now = performance.now();

    // loot box orbits, spin, and respawn
    for (const lb of lootBoxes) {
      // Respawn check
      if (lb.opened && lb.respawnAt > 0 && now >= lb.respawnAt) {
        lb.opened = false;
        lb.mesh.setEnabled(true);
        lb.respawnAt = 0;
        lb.angle = Math.random() * Math.PI * 2;
        cratesOpened = Math.max(0, cratesOpened - 1);
      }

      if (!lb.opened) {
        lb.angle += lb.speed;
        lb.mesh.position.x = Math.cos(lb.angle) * lb.radius;
        lb.mesh.position.z = Math.sin(lb.angle) * lb.radius;
        lb.mesh.position.y = lb.yBase + Math.sin(t * 2 + lb.angle) * lb.yAmp;
        lb.mesh.rotation.x += lb.rotSpeed;
        lb.mesh.rotation.y += lb.rotSpeed * 1.3;
        lb.light.position.copyFrom(lb.mesh.position);
        lb.light.intensity = 0.4 + Math.sin(t * 3 + lb.angle) * 0.2;
      }
    }

    // fire light flicker
    firePt.intensity = 2.2 + Math.sin(t * 8) * 0.4 + Math.sin(t * 13) * 0.2;

    // hot spot pulse
    hotMat.alpha = 0.35 + Math.sin(t * 4) * 0.15;

    // crack glow pulse
    crackMat.emissiveColor.g = 0.3 + Math.sin(t * 1.5) * 0.08;
  });

  return scene;
}
