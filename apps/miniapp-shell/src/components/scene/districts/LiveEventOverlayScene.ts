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
 * Live Event Overlay Scene
 * Theme: Anomaly-infused event arena with concentric energy rings, countdown pillars,
 * plasma particle vortex (green/magenta/white), pulsating floor grid, dynamic storm clouds.
 * Active during seasonal events, kingdom wars, and anomaly surges.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.01, 0.05, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera(
    'cam',
    -Math.PI / 3,
    Math.PI / 3.5,
    quality === 'low' ? 70 : 55,
    new Vector3(0, 8, 0),
    scene,
  );
  camera.lowerRadiusLimit = 30;
  camera.upperRadiusLimit = 110;
  camera.lowerBetaLimit = 0.2;
  camera.upperBetaLimit = Math.PI / 2.1;
  camera.attachControl(canvas, true);
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.2;
    camera.autoRotationBehavior.idleRotationWaitTime = 800;
  }

  // ── Lights ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.15;
  hemi.diffuse = new Color3(0.1, 0.05, 0.15);

  const plasmaLight = new PointLight('plasma', new Vector3(0, 18, 0), scene);
  plasmaLight.diffuse = new Color3(0.2, 1, 0.5);
  plasmaLight.intensity = 2.0;

  const anomalyLight = new PointLight('anomaly', new Vector3(15, 8, -10), scene);
  anomalyLight.diffuse = new Color3(0.9, 0.2, 0.8);
  anomalyLight.intensity = 1.5;

  const stormLight = new PointLight('storm', new Vector3(-15, 12, 10), scene);
  stormLight.diffuse = new Color3(0.3, 0.8, 1);
  stormLight.intensity = 1.0;

  // ── Void Floor ──
  const floor = MeshBuilder.CreateGround('floor', { width: 100, height: 100, subdivisions: 2 }, scene);
  const floorMat = new StandardMaterial('floorMat', scene);
  floorMat.diffuseColor = new Color3(0.02, 0.01, 0.04);
  floorMat.specularColor = Color3.Black();
  floorMat.emissiveColor = new Color3(0.03, 0.01, 0.06);
  floor.material = floorMat;

  // pulsating energy grid
  const gridCount = quality === 'low' ? 6 : quality === 'medium' ? 10 : 16;
  const gridMat = new StandardMaterial('gridMat', scene);
  gridMat.emissiveColor = new Color3(0.15, 0.8, 0.4);
  gridMat.diffuseColor = Color3.Black();
  gridMat.alpha = 0.3;

  interface EnergyRing {
    mesh: ReturnType<typeof MeshBuilder.CreateTorus>;
    baseAlpha: number;
    phaseOffset: number;
    rotSpeed: number;
  }
  const energyRings: EnergyRing[] = [];

  for (let i = 0; i < gridCount; i++) {
    const ring = MeshBuilder.CreateTorus(
      `eRing${i}`,
      { diameter: 6 + i * 5.5, thickness: 0.12, tessellation: 48 },
      scene,
    );
    ring.position.y = 0.06;
    const rMat = gridMat.clone(`eRingMat${i}`);
    rMat.emissiveColor = i % 3 === 0
      ? new Color3(0.15, 0.9, 0.4)
      : i % 3 === 1
        ? new Color3(0.8, 0.15, 0.7)
        : new Color3(0.2, 0.6, 1);
    ring.material = rMat;
    energyRings.push({
      mesh: ring,
      baseAlpha: 0.25 + Math.random() * 0.15,
      phaseOffset: i * 0.5,
      rotSpeed: (i % 2 === 0 ? 1 : -1) * (0.001 + Math.random() * 0.003),
    });
  }

  // ── Countdown Pillars ──
  const pillarMat = new StandardMaterial('pillarMat', scene);
  pillarMat.emissiveColor = new Color3(0.2, 0.9, 0.5);
  pillarMat.diffuseColor = new Color3(0.03, 0.08, 0.05);

  const pillarGlowMat = new StandardMaterial('pillarGlow', scene);
  pillarGlowMat.emissiveColor = new Color3(0.8, 0.2, 0.9);
  pillarGlowMat.diffuseColor = Color3.Black();

  const pillarCount = quality === 'low' ? 4 : 6;
  interface EventPillar {
    segments: ReturnType<typeof MeshBuilder.CreateCylinder>[];
    baseY: number;
    pulsePhase: number;
  }
  const pillars: EventPillar[] = [];

  for (let i = 0; i < pillarCount; i++) {
    const angle = (Math.PI * 2 / pillarCount) * i;
    const dist = 20;
    const segments: ReturnType<typeof MeshBuilder.CreateCylinder>[] = [];
    const segCount = quality === 'low' ? 3 : 5;

    for (let s = 0; s < segCount; s++) {
      const seg = MeshBuilder.CreateCylinder(
        `pillar${i}_s${s}`,
        { height: 2, diameterTop: 1.2 - s * 0.15, diameterBottom: 1.5 - s * 0.15, tessellation: 6 },
        scene,
      );
      seg.position.x = Math.cos(angle) * dist;
      seg.position.z = Math.sin(angle) * dist;
      seg.position.y = s * 2.2 + 1;
      seg.material = s % 2 === 0 ? pillarMat : pillarGlowMat;
      segments.push(seg);
    }
    pillars.push({ segments, baseY: 1, pulsePhase: i * 1.2 });
  }

  // ── Central Anomaly Core ──
  const coreMat = new StandardMaterial('coreMat', scene);
  coreMat.emissiveColor = new Color3(0.3, 1, 0.6);
  coreMat.diffuseColor = Color3.Black();
  coreMat.alpha = 0.7;

  const core = MeshBuilder.CreateSphere('core', { diameter: 4, segments: quality === 'low' ? 8 : 16 }, scene);
  core.position.y = 12;
  core.material = coreMat;

  const coreShell = MeshBuilder.CreateSphere('coreShell', { diameter: 6, segments: quality === 'low' ? 6 : 12 }, scene);
  coreShell.position.y = 12;
  const shellMat = new StandardMaterial('shellMat', scene);
  shellMat.emissiveColor = new Color3(0.6, 0.1, 0.8);
  shellMat.diffuseColor = Color3.Black();
  shellMat.alpha = 0.2;
  shellMat.wireframe = true;
  coreShell.material = shellMat;

  // ── Plasma Vortex Particles ──
  const vortex = new ParticleSystem('vortex', quality === 'low' ? 200 : quality === 'medium' ? 600 : 1200, scene);
  vortex.createCylinderEmitter(8, 0.5, 0, 0);
  vortex.emitter = new Vector3(0, 6, 0);
  vortex.minLifeTime = 1.5;
  vortex.maxLifeTime = 4;
  vortex.minSize = 0.2;
  vortex.maxSize = 0.6;
  vortex.minEmitPower = 2;
  vortex.maxEmitPower = 5;
  vortex.emitRate = quality === 'low' ? 40 : quality === 'medium' ? 80 : 160;
  vortex.color1 = new Color4(0.2, 1, 0.5, 0.5);
  vortex.color2 = new Color4(0.8, 0.15, 0.9, 0.4);
  vortex.colorDead = new Color4(0.1, 0.3, 0.5, 0);
  vortex.gravity = new Vector3(0, 1.5, 0);
  vortex.blendMode = ParticleSystem.BLENDMODE_ADD;
  vortex.start();

  // ── Glow ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 0.9 : 0.5;
  }

  // ── Bloom (high) ──
  if (quality === 'high') {
    const pipeline = new DefaultRenderingPipeline('bloom', true, scene, [camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.25;
    pipeline.bloomWeight = 0.8;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
  }

  // ── Animation ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;

    // energy ring pulsation + rotation
    for (const er of energyRings) {
      er.mesh.rotation.y += er.rotSpeed;
      const mat = er.mesh.material as StandardMaterial;
      if (mat) {
        mat.alpha = er.baseAlpha + Math.sin(t * 2 + er.phaseOffset) * 0.1;
      }
    }

    // pillar segments pulse
    for (const p of pillars) {
      for (let s = 0; s < p.segments.length; s++) {
        const off = Math.sin(t * 3 + p.pulsePhase + s * 0.8) * 0.3;
        p.segments[s].position.y = p.baseY + s * 2.2 + off;
      }
    }

    // core rotation + breathing
    core.rotation.y += 0.01;
    core.rotation.x += 0.005;
    const coreScale = 1 + Math.sin(t * 2.5) * 0.15;
    core.scaling.setAll(coreScale);

    coreShell.rotation.y -= 0.008;
    coreShell.rotation.z += 0.004;
    const shellScale = 1 + Math.sin(t * 1.5) * 0.1;
    coreShell.scaling.setAll(shellScale);

    // dynamic lighting
    plasmaLight.intensity = 1.8 + Math.sin(t * 1.5) * 0.5;
    anomalyLight.diffuse.g = 0.2 + Math.sin(t * 2) * 0.15;
    stormLight.intensity = 0.8 + Math.sin(t * 3) * 0.4;
  });

  return scene;
}
