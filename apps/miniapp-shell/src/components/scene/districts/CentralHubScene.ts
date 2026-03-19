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
  });

  return scene;
}
