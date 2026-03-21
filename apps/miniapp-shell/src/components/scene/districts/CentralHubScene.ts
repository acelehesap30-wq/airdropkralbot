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
 * Central Hub District
 * Theme: Neon hex-grid ground, central beacon tower, floating orbital platforms,
 * particle aurora (blue/cyan/purple), ambient color-cycling lights, bloom on high.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.04, 0.04, 0.1, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera(
    'cam',
    -Math.PI / 2,
    Math.PI / 3.2,
    quality === 'low' ? 70 : 60,
    new Vector3(0, 5, 0),
    scene,
  );
  camera.lowerRadiusLimit = 30;
  camera.upperRadiusLimit = 120;
  camera.lowerBetaLimit = 0.3;
  camera.upperBetaLimit = Math.PI / 2.2;
  camera.attachControl(canvas, true);
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.15;
    camera.autoRotationBehavior.idleRotationWaitTime = 1000;
  }

  // ── Lights ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.2;
  hemi.diffuse = new Color3(0.1, 0.15, 0.25);

  const pointA = new PointLight('ptA', new Vector3(15, 12, 15), scene);
  pointA.diffuse = new Color3(0, 0.82, 1);
  pointA.intensity = 1.5;

  const pointB = new PointLight('ptB', new Vector3(-15, 10, -15), scene);
  pointB.diffuse = new Color3(0.6, 0.2, 1);
  pointB.intensity = 1.2;

  // ── Ground – neon hex-grid ──
  const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100, subdivisions: 2 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.02, 0.02, 0.06);
  groundMat.specularColor = Color3.Black();
  groundMat.emissiveColor = new Color3(0, 0.06, 0.12);
  ground.material = groundMat;

  // hex-grid lines (flat thin boxes as grid accents)
  const gridCount = quality === 'low' ? 8 : quality === 'medium' ? 14 : 20;
  const gridMat = new StandardMaterial('gridMat', scene);
  gridMat.emissiveColor = new Color3(0, 0.5, 0.7);
  gridMat.diffuseColor = Color3.Black();
  gridMat.alpha = 0.35;

  for (let i = 0; i < gridCount; i++) {
    const ring = MeshBuilder.CreateTorus(
      `hexRing${i}`,
      { diameter: 8 + i * 5, thickness: 0.08, tessellation: 6 },
      scene,
    );
    ring.position.y = 0.05;
    ring.rotation.y = i % 2 === 0 ? 0 : Math.PI / 6;
    ring.material = gridMat;
  }

  // ── Beacon Tower (stacked cylinders) ──
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
    const seg = MeshBuilder.CreateCylinder(
      `beacon${i}`,
      { height: h, diameterTop: r * 0.7, diameterBottom: r, tessellation: 8 },
      scene,
    );
    seg.position.y = i * (h * 0.85) + h / 2;
    seg.material = i % 2 === 0 ? beaconMat : beaconGlowMat;
  }

  // beacon tip sphere
  const tip = MeshBuilder.CreateSphere('tip', { diameter: 2.2, segments: 8 }, scene);
  tip.position.y = segmentCount * 2.2 + 1;
  tip.material = beaconGlowMat;

  // ── Floating Orbital Platforms ──
  const orbCount = quality === 'low' ? 4 : quality === 'medium' ? 6 : 8;
  const orbMat = new StandardMaterial('orbMat', scene);
  orbMat.emissiveColor = new Color3(0.1, 0.6, 0.9);
  orbMat.diffuseColor = new Color3(0.05, 0.15, 0.25);
  orbMat.alpha = 0.85;

  interface OrbitalPlatform {
    mesh: ReturnType<typeof MeshBuilder.CreateSphere>;
    angle: number;
    speed: number;
    radius: number;
    yOffset: number;
    yAmp: number;
  }
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
  aurPs.minLifeTime = 2;
  aurPs.maxLifeTime = 5;
  aurPs.minSize = 0.3;
  aurPs.maxSize = 0.8;
  aurPs.minEmitPower = 0.5;
  aurPs.maxEmitPower = 1.5;
  aurPs.emitRate = quality === 'low' ? 30 : quality === 'medium' ? 60 : 120;
  aurPs.color1 = new Color4(0, 0.6, 1, 0.4);
  aurPs.color2 = new Color4(0.5, 0.1, 0.9, 0.3);
  aurPs.colorDead = new Color4(0, 0.2, 0.5, 0);
  aurPs.gravity = new Vector3(0, -0.05, 0);
  aurPs.blendMode = ParticleSystem.BLENDMODE_ADD;
  aurPs.start();

  // ── Glow layer (medium+) ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 0.8 : 0.5;
  }

  // ── Bloom post-processing (high only) ──
  if (quality === 'high') {
    const pipeline = new DefaultRenderingPipeline('bloom', true, scene, [camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.35;
    pipeline.bloomWeight = 0.6;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
  }

  // ── Collectible Crystals (interactive game elements) ──
  interface CrystalNode {
    mesh: ReturnType<typeof MeshBuilder.CreatePolyhedron>;
    baseY: number;
    angle: number;
    radius: number;
    collected: boolean;
    respawnAt: number;
    pointLight: PointLight;
    type: 'sc' | 'hc' | 'rc';
  }
  const crystals: CrystalNode[] = [];
  const crystalColors: Record<string, Color3> = {
    sc: new Color3(0, 1, 0.53),    // green — SC
    hc: new Color3(0, 0.82, 1),     // cyan — HC
    rc: new Color3(0.88, 0.25, 0.98) // purple — RC
  };
  const crystalCount = quality === 'low' ? 5 : quality === 'medium' ? 8 : 12;
  const crystalTypes: Array<'sc' | 'hc' | 'rc'> = ['sc', 'sc', 'sc', 'hc', 'hc', 'rc'];

  for (let i = 0; i < crystalCount; i++) {
    const cType = crystalTypes[i % crystalTypes.length];
    const color = crystalColors[cType];
    const cMat = new StandardMaterial(`crystalMat${i}`, scene);
    cMat.emissiveColor = color.scale(0.8);
    cMat.diffuseColor = color.scale(0.3);
    cMat.alpha = 0.9;

    const crystal = MeshBuilder.CreatePolyhedron(
      `crystal${i}`,
      { type: 1, size: 0.6 + Math.random() * 0.4, sizeX: 0.8, sizeY: 1.2, sizeZ: 0.8 },
      scene,
    );
    const ang = (Math.PI * 2 / crystalCount) * i + Math.random() * 0.5;
    const rad = 15 + Math.random() * 20;
    crystal.position.set(Math.cos(ang) * rad, 2 + Math.random() * 3, Math.sin(ang) * rad);
    crystal.material = cMat;

    // small point light per crystal
    const cLight = new PointLight(`cLight${i}`, crystal.position.clone(), scene);
    cLight.diffuse = color;
    cLight.intensity = 0.5;
    cLight.range = 8;

    crystals.push({
      mesh: crystal,
      baseY: crystal.position.y,
      angle: ang,
      radius: rad,
      collected: false,
      respawnAt: 0,
      pointLight: cLight,
      type: cType,
    });
  }

  // Crystal collect burst particles
  const burstPs = new ParticleSystem('burst', 80, scene);
  burstPs.createPointEmitter(new Vector3(-1, -1, -1), new Vector3(1, 2, 1));
  burstPs.emitter = new Vector3(0, 0, 0);
  burstPs.minLifeTime = 0.3;
  burstPs.maxLifeTime = 0.8;
  burstPs.minSize = 0.1;
  burstPs.maxSize = 0.4;
  burstPs.minEmitPower = 3;
  burstPs.maxEmitPower = 8;
  burstPs.emitRate = 0; // manual burst
  burstPs.color1 = new Color4(0, 1, 0.8, 1);
  burstPs.color2 = new Color4(0, 0.6, 1, 0.8);
  burstPs.colorDead = new Color4(0, 0.2, 0.5, 0);
  burstPs.gravity = new Vector3(0, -5, 0);
  burstPs.blendMode = ParticleSystem.BLENDMODE_ADD;

  // Score display (HUD overlay created via scene metadata)
  let score = 0;
  let combo = 0;
  let lastCollectTime = 0;
  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = { score, combo, crystalsCollected: 0, totalCrystals: crystalCount };

  // Click handler for crystal collection
  scene.onPointerDown = (_evt, pickResult) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    const name = pickResult.pickedMesh.name;
    if (!name.startsWith('crystal')) return;
    const idx = parseInt(name.replace('crystal', ''), 10);
    const c = crystals[idx];
    if (!c || c.collected) return;

    // Collect!
    c.collected = true;
    c.mesh.setEnabled(false);
    c.pointLight.intensity = 0;
    const now = performance.now() / 1000;
    c.respawnAt = now + 5 + Math.random() * 5; // respawn in 5-10s

    // Burst effect
    burstPs.emitter = c.mesh.position.clone();
    const bColor = crystalColors[c.type];
    burstPs.color1 = new Color4(bColor.r, bColor.g, bColor.b, 1);
    burstPs.color2 = new Color4(bColor.r * 0.6, bColor.g * 0.6, bColor.b * 0.6, 0.8);
    burstPs.manualEmitCount = 30;
    burstPs.start();
    setTimeout(() => burstPs.stop(), 300);

    // Score & combo
    if (now - lastCollectTime < 3) {
      combo++;
    } else {
      combo = 1;
    }
    lastCollectTime = now;
    const pts = c.type === 'rc' ? 50 : c.type === 'hc' ? 20 : 5;
    score += pts * combo;
    scene.metadata.gameState = {
      score,
      combo,
      crystalsCollected: crystals.filter(cr => cr.collected).length,
      totalCrystals: crystalCount,
      lastType: c.type,
      lastPoints: pts * combo,
    };
  };

  // ── Portal Gate (entrance to districts) ──
  const portalMat = new StandardMaterial('portalMat', scene);
  portalMat.emissiveColor = new Color3(0, 0.9, 1);
  portalMat.diffuseColor = Color3.Black();
  portalMat.alpha = 0.4;
  portalMat.backFaceCulling = false;

  const portalFrame = MeshBuilder.CreateTorus('portalFrame', { diameter: 8, thickness: 0.4, tessellation: 32 }, scene);
  portalFrame.position.set(0, 6, -25);
  portalFrame.rotation.x = Math.PI / 2;
  const portalFrameMat = new StandardMaterial('portalFrameMat', scene);
  portalFrameMat.emissiveColor = new Color3(0, 0.7, 1);
  portalFrameMat.diffuseColor = new Color3(0, 0.15, 0.3);
  portalFrame.material = portalFrameMat;

  const portalDisc = MeshBuilder.CreateDisc('portalDisc', { radius: 3.8, tessellation: 32 }, scene);
  portalDisc.position.set(0, 6, -25);
  portalDisc.rotation.x = Math.PI / 2;
  portalDisc.material = portalMat;

  // Portal light
  const portalLight = new PointLight('portalLight', new Vector3(0, 6, -25), scene);
  portalLight.diffuse = new Color3(0, 0.9, 1);
  portalLight.intensity = 2;
  portalLight.range = 15;

  // ── Animation loop ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;

    // orbital motion
    for (const o of orbitals) {
      o.angle += o.speed;
      o.mesh.position.x = Math.cos(o.angle) * o.radius;
      o.mesh.position.z = Math.sin(o.angle) * o.radius;
      o.mesh.position.y = o.yOffset + Math.sin(t * 1.5 + o.angle) * o.yAmp;
    }

    // beacon tip pulse
    const s = 1 + Math.sin(t * 3) * 0.15;
    tip.scaling.setAll(s);

    // color cycling on point lights
    pointA.diffuse.r = 0.1 + Math.sin(t * 0.7) * 0.1;
    pointA.diffuse.g = 0.6 + Math.sin(t * 0.5) * 0.2;

    pointB.diffuse.r = 0.5 + Math.sin(t * 0.4) * 0.15;
    pointB.diffuse.b = 0.8 + Math.sin(t * 0.6) * 0.2;

    // Crystal animations — float, rotate, respawn
    const now = performance.now() / 1000;
    for (const c of crystals) {
      if (c.collected) {
        if (now >= c.respawnAt) {
          c.collected = false;
          c.mesh.setEnabled(true);
          c.pointLight.intensity = 0.5;
        }
        continue;
      }
      // floating bob
      c.mesh.position.y = c.baseY + Math.sin(t * 2 + c.angle) * 0.5;
      // slow spin
      c.mesh.rotation.y += 0.02;
      c.mesh.rotation.x += 0.005;
      // light pulse
      c.pointLight.intensity = 0.4 + Math.sin(t * 3 + c.angle * 2) * 0.2;
    }

    // Portal animation
    portalDisc.rotation.z += 0.01;
    portalMat.alpha = 0.3 + Math.sin(t * 2) * 0.15;
    portalLight.intensity = 1.5 + Math.sin(t * 3) * 0.5;
    portalFrameMat.emissiveColor.g = 0.6 + Math.sin(t * 2) * 0.2;
  });

  return scene;
}
