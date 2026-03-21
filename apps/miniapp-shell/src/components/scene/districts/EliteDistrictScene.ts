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
 * Elite District Scene
 * Theme: Golden VIP palace zone with diamond-shaped towers, radial marble floor,
 * golden particle rain, floating trophy pedestals, warm amber + gold lighting.
 * Reserved for high-tier players — the premium area of the Nexus.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.06, 0.04, 0.02, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera(
    'cam',
    -Math.PI / 2.5,
    Math.PI / 3,
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
    camera.autoRotationBehavior.idleRotationSpeed = 0.1;
    camera.autoRotationBehavior.idleRotationWaitTime = 1200;
  }

  // ── Lights ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.25;
  hemi.diffuse = new Color3(0.25, 0.2, 0.1);

  const goldLight = new PointLight('goldPt', new Vector3(0, 20, 0), scene);
  goldLight.diffuse = new Color3(1, 0.85, 0.3);
  goldLight.intensity = 2.0;

  const amberLight = new PointLight('amberPt', new Vector3(20, 10, -15), scene);
  amberLight.diffuse = new Color3(1, 0.6, 0.15);
  amberLight.intensity = 1.2;

  const roseLight = new PointLight('rosePt', new Vector3(-20, 12, 15), scene);
  roseLight.diffuse = new Color3(0.9, 0.4, 0.6);
  roseLight.intensity = 0.8;

  // ── Marble Floor ──
  const floor = MeshBuilder.CreateGround('floor', { width: 90, height: 90, subdivisions: 2 }, scene);
  const floorMat = new StandardMaterial('floorMat', scene);
  floorMat.diffuseColor = new Color3(0.08, 0.06, 0.04);
  floorMat.specularColor = new Color3(0.3, 0.25, 0.15);
  floorMat.emissiveColor = new Color3(0.04, 0.03, 0.01);
  floor.material = floorMat;

  // radial gold ring accents
  const ringCount = quality === 'low' ? 6 : quality === 'medium' ? 10 : 14;
  const ringMat = new StandardMaterial('ringMat', scene);
  ringMat.emissiveColor = new Color3(0.8, 0.65, 0.1);
  ringMat.diffuseColor = Color3.Black();
  ringMat.alpha = 0.4;

  for (let i = 0; i < ringCount; i++) {
    const ring = MeshBuilder.CreateTorus(
      `goldRing${i}`,
      { diameter: 10 + i * 5.5, thickness: 0.1, tessellation: 32 },
      scene,
    );
    ring.position.y = 0.04;
    ring.material = ringMat;
  }

  // ── Diamond Towers (octahedrons) ──
  const diamondMat = new StandardMaterial('diamondMat', scene);
  diamondMat.diffuseColor = new Color3(0.15, 0.12, 0.05);
  diamondMat.emissiveColor = new Color3(0.6, 0.5, 0.1);
  diamondMat.specularColor = new Color3(1, 0.9, 0.5);
  diamondMat.specularPower = 64;

  const towerCount = quality === 'low' ? 4 : 6;
  interface DiamondTower {
    mesh: ReturnType<typeof MeshBuilder.CreatePolyhedron>;
    baseY: number;
    floatAmp: number;
    floatSpeed: number;
    rotSpeed: number;
  }
  const towers: DiamondTower[] = [];

  for (let i = 0; i < towerCount; i++) {
    const angle = (Math.PI * 2 / towerCount) * i;
    const dist = 18 + (i % 2) * 8;
    const size = 2.5 + Math.random() * 1.5;
    const tower = MeshBuilder.CreatePolyhedron(
      `diamond${i}`,
      { type: 1, size },
      scene,
    );
    tower.position.x = Math.cos(angle) * dist;
    tower.position.z = Math.sin(angle) * dist;
    tower.position.y = 6 + Math.random() * 4;
    tower.material = diamondMat;
    towers.push({
      mesh: tower,
      baseY: tower.position.y,
      floatAmp: 0.8 + Math.random() * 1.2,
      floatSpeed: 0.6 + Math.random() * 0.4,
      rotSpeed: 0.003 + Math.random() * 0.005,
    });
  }

  // ── Central Golden Obelisk ──
  const obeliskMat = new StandardMaterial('obeliskMat', scene);
  obeliskMat.emissiveColor = new Color3(0.9, 0.7, 0.15);
  obeliskMat.diffuseColor = new Color3(0.2, 0.15, 0.05);

  const obelisk = MeshBuilder.CreateCylinder('obelisk', {
    height: 16,
    diameterTop: 0.5,
    diameterBottom: 3,
    tessellation: 4,
  }, scene);
  obelisk.position.y = 8;
  obelisk.material = obeliskMat;

  const crown = MeshBuilder.CreatePolyhedron('crown', { type: 1, size: 1.8 }, scene);
  crown.position.y = 17;
  crown.material = obeliskMat;

  // ── Trophy Pedestals ──
  const pedestalMat = new StandardMaterial('pedestalMat', scene);
  pedestalMat.emissiveColor = new Color3(0.5, 0.4, 0.1);
  pedestalMat.diffuseColor = new Color3(0.1, 0.08, 0.03);

  const pedestalCount = quality === 'low' ? 3 : 5;
  for (let i = 0; i < pedestalCount; i++) {
    const angle = (Math.PI * 2 / pedestalCount) * i + Math.PI / pedestalCount;
    const base = MeshBuilder.CreateCylinder(`pedestal${i}`, {
      height: 2.5,
      diameterTop: 1.2,
      diameterBottom: 1.8,
      tessellation: 8,
    }, scene);
    base.position.x = Math.cos(angle) * 10;
    base.position.z = Math.sin(angle) * 10;
    base.position.y = 1.25;
    base.material = pedestalMat;

    const trophy = MeshBuilder.CreateSphere(`trophy${i}`, { diameter: 1.0, segments: 6 }, scene);
    trophy.position.x = base.position.x;
    trophy.position.z = base.position.z;
    trophy.position.y = 3;
    trophy.material = obeliskMat;
  }

  // ── Golden Particle Rain ──
  const ps = new ParticleSystem('goldRain', quality === 'low' ? 150 : quality === 'medium' ? 400 : 800, scene);
  ps.createPointEmitter(new Vector3(-25, 0, -25), new Vector3(25, 0, 25));
  ps.emitter = new Vector3(0, 25, 0);
  ps.minLifeTime = 3;
  ps.maxLifeTime = 6;
  ps.minSize = 0.15;
  ps.maxSize = 0.4;
  ps.minEmitPower = 0.2;
  ps.maxEmitPower = 0.6;
  ps.emitRate = quality === 'low' ? 20 : quality === 'medium' ? 50 : 100;
  ps.color1 = new Color4(1, 0.85, 0.2, 0.5);
  ps.color2 = new Color4(1, 0.7, 0.1, 0.4);
  ps.colorDead = new Color4(0.5, 0.35, 0.05, 0);
  ps.gravity = new Vector3(0, -0.3, 0);
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.start();

  // ── Glow layer ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 1.0 : 0.6;
  }

  // ── Bloom (high only) ──
  if (quality === 'high') {
    const pipeline = new DefaultRenderingPipeline('bloom', true, scene, [camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.3;
    pipeline.bloomWeight = 0.7;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
  }

  // ── Interactive Diamond Gems ──
  type GemTier = 'amber' | 'diamond' | 'platinum';
  interface DiamondGem {
    mesh: ReturnType<typeof MeshBuilder.CreateSphere>;
    angle: number; radius: number; speed: number; baseY: number;
    tier: GemTier; collected: boolean; respawnAt: number;
  }
  const GEM_CFG = {
    amber:    { points: 10, color: new Color3(1, 0.7, 0.1) },
    diamond:  { points: 25, color: new Color3(0.7, 0.9, 1) },
    platinum: { points: 60, color: new Color3(0.9, 0.85, 1) },
  } as const;

  const gemCount = quality === 'low' ? 5 : quality === 'medium' ? 8 : 11;
  const gems: DiamondGem[] = [];
  for (let i = 0; i < gemCount; i++) {
    const tier: GemTier = i % 6 === 0 ? 'platinum' : i % 3 === 0 ? 'diamond' : 'amber';
    const cfg = GEM_CFG[tier];
    const mesh = MeshBuilder.CreateSphere(`gem${i}`, { diameter: tier === 'platinum' ? 1.5 : 1, segments: 8 }, scene);
    const mat = new StandardMaterial(`gemMat${i}`, scene);
    mat.emissiveColor = cfg.color; mat.diffuseColor = Color3.Black(); mat.alpha = 0.9;
    mesh.material = mat;
    gems.push({
      mesh, angle: (Math.PI * 2 / gemCount) * i,
      radius: 8 + Math.random() * 16, speed: 0.004 + Math.random() * 0.006,
      baseY: 3 + Math.random() * 7, tier, collected: false, respawnAt: 0,
    });
  }

  let score = 0, combo = 0, lastGemTime = 0, gemsCollected = 0;
  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = { score: 0, combo: 0, crystalsCollected: 0, totalCrystals: gemCount, lastType: '', lastPoints: 0 };

  scene.onPointerDown = (_evt: any, pickResult: any) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    for (const g of gems) {
      if (g.collected || g.mesh.name !== pickResult.pickedMesh.name) continue;
      g.collected = true; g.mesh.setEnabled(false);
      const now = performance.now();
      combo = (now - lastGemTime < 3000) ? Math.min(combo + 1, 10) : 1;
      lastGemTime = now;
      const pts = GEM_CFG[g.tier].points * combo;
      score += pts; gemsCollected++;
      scene.metadata.gameState = { score, combo, crystalsCollected: gemsCollected, totalCrystals: gemCount,
        lastType: g.tier === 'platinum' ? 'rc' : g.tier === 'diamond' ? 'hc' : 'sc', lastPoints: pts };
      const burst = new ParticleSystem(`gBurst${g.mesh.name}`, 20, scene);
      burst.createPointEmitter(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5));
      burst.emitter = g.mesh.position.clone();
      burst.minLifeTime = 0.2; burst.maxLifeTime = 0.6; burst.minSize = 0.1; burst.maxSize = 0.4;
      burst.minEmitPower = 3; burst.maxEmitPower = 7; burst.emitRate = 0;
      const c = GEM_CFG[g.tier].color;
      burst.color1 = new Color4(c.r, c.g, c.b, 1); burst.colorDead = new Color4(0, 0, 0, 0);
      burst.blendMode = ParticleSystem.BLENDMODE_ADD;
      burst.manualEmitCount = 20; burst.start(); burst.targetStopDuration = 0.8; burst.disposeOnStop = true;
      g.respawnAt = now + 6000 + Math.random() * 5000;
      break;
    }
  };

  // ── Animation ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;
    const now = performance.now();

    // gem orbits and respawn
    for (const g of gems) {
      if (g.collected && g.respawnAt > 0 && now >= g.respawnAt) {
        g.collected = false; g.mesh.setEnabled(true); g.respawnAt = 0;
        g.angle = Math.random() * Math.PI * 2; gemsCollected = Math.max(0, gemsCollected - 1);
      }
      if (!g.collected) {
        g.angle += g.speed;
        g.mesh.position.set(Math.cos(g.angle) * g.radius, g.baseY + Math.sin(t * 2 + g.angle) * 1.2, Math.sin(g.angle) * g.radius);
      }
    }

    // floating diamond towers
    for (const tw of towers) {
      tw.mesh.rotation.y += tw.rotSpeed;
      tw.mesh.position.y = tw.baseY + Math.sin(t * tw.floatSpeed) * tw.floatAmp;
    }

    // crown rotation + pulse
    crown.rotation.y += 0.008;
    const s = 1 + Math.sin(t * 2) * 0.1;
    crown.scaling.setAll(s);

    // ambient light color shifts
    goldLight.intensity = 1.8 + Math.sin(t * 0.5) * 0.3;
    amberLight.diffuse.g = 0.55 + Math.sin(t * 0.7) * 0.1;
  });

  return scene;
}
