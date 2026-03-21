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
 * Social Monuments Scene
 * Theme: Community plaza with player monument pillars, friend connection beams,
 * holographic leaderboard tower, social activity particle streams (teal/orange/white).
 * Represents the social hub where community achievements are celebrated.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.03, 0.05, 0.08, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera(
    'cam',
    -Math.PI / 2.8,
    Math.PI / 3.3,
    quality === 'low' ? 65 : 55,
    new Vector3(0, 5, 0),
    scene,
  );
  camera.lowerRadiusLimit = 28;
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
  hemi.diffuse = new Color3(0.15, 0.2, 0.25);

  const tealLight = new PointLight('tealPt', new Vector3(10, 15, 10), scene);
  tealLight.diffuse = new Color3(0, 0.9, 0.8);
  tealLight.intensity = 1.8;

  const orangeLight = new PointLight('orangePt', new Vector3(-12, 10, -12), scene);
  orangeLight.diffuse = new Color3(1, 0.6, 0.15);
  orangeLight.intensity = 1.2;

  const whiteLight = new PointLight('whitePt', new Vector3(0, 20, 0), scene);
  whiteLight.diffuse = new Color3(0.9, 0.95, 1);
  whiteLight.intensity = 0.8;

  // ── Plaza Floor ──
  const floor = MeshBuilder.CreateDisc('floor', { radius: 45, tessellation: 48 }, scene);
  floor.rotation.x = Math.PI / 2;
  floor.position.y = 0;
  const floorMat = new StandardMaterial('floorMat', scene);
  floorMat.diffuseColor = new Color3(0.05, 0.07, 0.1);
  floorMat.specularColor = new Color3(0.15, 0.2, 0.25);
  floorMat.emissiveColor = new Color3(0.02, 0.04, 0.06);
  floor.material = floorMat;

  // concentric social rings
  const ringCount = quality === 'low' ? 5 : quality === 'medium' ? 8 : 12;
  const socialRingMat = new StandardMaterial('socialRing', scene);
  socialRingMat.emissiveColor = new Color3(0, 0.7, 0.65);
  socialRingMat.diffuseColor = Color3.Black();
  socialRingMat.alpha = 0.3;

  for (let i = 0; i < ringCount; i++) {
    const ring = MeshBuilder.CreateTorus(
      `sRing${i}`,
      { diameter: 8 + i * 6, thickness: 0.06, tessellation: 32 },
      scene,
    );
    ring.position.y = 0.04;
    ring.material = socialRingMat;
  }

  // ── Player Monument Pillars ──
  const monumentMat = new StandardMaterial('monumentMat', scene);
  monumentMat.emissiveColor = new Color3(0, 0.6, 0.55);
  monumentMat.diffuseColor = new Color3(0.06, 0.1, 0.12);

  const avatarMat = new StandardMaterial('avatarMat', scene);
  avatarMat.emissiveColor = new Color3(0.9, 0.5, 0.15);
  avatarMat.diffuseColor = Color3.Black();

  const monumentCount = quality === 'low' ? 6 : quality === 'medium' ? 8 : 12;
  interface Monument {
    pillar: ReturnType<typeof MeshBuilder.CreateCylinder>;
    avatar: ReturnType<typeof MeshBuilder.CreateSphere>;
    angle: number;
    baseHeight: number;
    pulsePhase: number;
  }
  const monuments: Monument[] = [];

  for (let i = 0; i < monumentCount; i++) {
    const angle = (Math.PI * 2 / monumentCount) * i;
    const dist = 22;
    const height = 4 + Math.random() * 6;

    const pillar = MeshBuilder.CreateCylinder(
      `monument${i}`,
      { height, diameterTop: 1.0, diameterBottom: 1.6, tessellation: 6 },
      scene,
    );
    pillar.position.x = Math.cos(angle) * dist;
    pillar.position.z = Math.sin(angle) * dist;
    pillar.position.y = height / 2;
    pillar.material = monumentMat;

    const avatar = MeshBuilder.CreateSphere(`avatar${i}`, { diameter: 1.5, segments: 6 }, scene);
    avatar.position.x = pillar.position.x;
    avatar.position.z = pillar.position.z;
    avatar.position.y = height + 1;
    avatar.material = avatarMat;

    monuments.push({ pillar, avatar, angle, baseHeight: height, pulsePhase: i * 0.8 });
  }

  // ── Central Leaderboard Tower ──
  const towerMat = new StandardMaterial('towerMat', scene);
  towerMat.emissiveColor = new Color3(0.1, 0.8, 0.7);
  towerMat.diffuseColor = new Color3(0.04, 0.08, 0.1);

  const holoMat = new StandardMaterial('holoMat', scene);
  holoMat.emissiveColor = new Color3(0.3, 0.95, 0.85);
  holoMat.diffuseColor = Color3.Black();
  holoMat.alpha = 0.5;
  holoMat.wireframe = true;

  const towerSegments = quality === 'low' ? 4 : 6;
  for (let i = 0; i < towerSegments; i++) {
    const seg = MeshBuilder.CreateCylinder(
      `tower${i}`,
      { height: 2.5, diameterTop: 2.5 - i * 0.3, diameterBottom: 3 - i * 0.3, tessellation: 8 },
      scene,
    );
    seg.position.y = i * 2.8 + 1.25;
    seg.material = i % 2 === 0 ? towerMat : holoMat;
  }

  // tower crown hologram
  const holoCrown = MeshBuilder.CreatePolyhedron('holoCrown', { type: 2, size: 2 }, scene);
  holoCrown.position.y = towerSegments * 2.8 + 2;
  holoCrown.material = holoMat;

  // ── Connection Beams (friend links between monuments) ──
  const beamMat = new StandardMaterial('beamMat', scene);
  beamMat.emissiveColor = new Color3(1, 0.6, 0.2);
  beamMat.diffuseColor = Color3.Black();
  beamMat.alpha = 0.2;

  const beamCount = Math.min(quality === 'low' ? 3 : quality === 'medium' ? 5 : 8, monumentCount - 1);
  for (let i = 0; i < beamCount; i++) {
    const a = monuments[i];
    const b = monuments[(i + 1) % monuments.length];
    const midX = (a.pillar.position.x + b.pillar.position.x) / 2;
    const midZ = (a.pillar.position.z + b.pillar.position.z) / 2;
    const dx = b.pillar.position.x - a.pillar.position.x;
    const dz = b.pillar.position.z - a.pillar.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const beam = MeshBuilder.CreateCylinder(
      `beam${i}`,
      { height: dist, diameter: 0.08, tessellation: 4 },
      scene,
    );
    beam.position.x = midX;
    beam.position.z = midZ;
    beam.position.y = Math.min(a.baseHeight, b.baseHeight) + 0.5;
    beam.rotation.z = Math.PI / 2;
    beam.rotation.y = Math.atan2(dz, dx);
    beam.material = beamMat;
  }

  // ── Social Activity Particles ──
  const socialPs = new ParticleSystem('social', quality === 'low' ? 150 : quality === 'medium' ? 400 : 800, scene);
  socialPs.createCylinderEmitter(15, 1, 0, 0);
  socialPs.emitter = new Vector3(0, 2, 0);
  socialPs.minLifeTime = 2;
  socialPs.maxLifeTime = 5;
  socialPs.minSize = 0.15;
  socialPs.maxSize = 0.5;
  socialPs.minEmitPower = 0.8;
  socialPs.maxEmitPower = 2;
  socialPs.emitRate = quality === 'low' ? 25 : quality === 'medium' ? 50 : 100;
  socialPs.color1 = new Color4(0, 0.85, 0.75, 0.4);
  socialPs.color2 = new Color4(1, 0.5, 0.15, 0.35);
  socialPs.colorDead = new Color4(0.5, 0.5, 0.5, 0);
  socialPs.gravity = new Vector3(0, 0.5, 0);
  socialPs.blendMode = ParticleSystem.BLENDMODE_ADD;
  socialPs.start();

  // ── Glow ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 0.8 : 0.5;
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

  // ── Interactive Social Badges ──
  type BadgeTier = 'friend' | 'ally' | 'legend';
  interface SocialBadge {
    mesh: ReturnType<typeof MeshBuilder.CreateSphere>;
    angle: number; radius: number; speed: number; baseY: number;
    tier: BadgeTier; collected: boolean; respawnAt: number;
  }
  const BADGE_CFG = {
    friend: { points: 5,  color: new Color3(0, 0.85, 0.75) },
    ally:   { points: 20, color: new Color3(1, 0.5, 0.15) },
    legend: { points: 50, color: new Color3(1, 1, 1) },
  } as const;

  const badgeCount = quality === 'low' ? 5 : quality === 'medium' ? 8 : 11;
  const badges: SocialBadge[] = [];
  for (let i = 0; i < badgeCount; i++) {
    const tier: BadgeTier = i % 6 === 0 ? 'legend' : i % 3 === 0 ? 'ally' : 'friend';
    const cfg = BADGE_CFG[tier];
    const mesh = MeshBuilder.CreateSphere(`badge${i}`, { diameter: tier === 'legend' ? 1.4 : 0.9, segments: 8 }, scene);
    const mat = new StandardMaterial(`badgeMat${i}`, scene);
    mat.emissiveColor = cfg.color; mat.diffuseColor = Color3.Black(); mat.alpha = 0.85;
    mesh.material = mat;
    badges.push({
      mesh, angle: (Math.PI * 2 / badgeCount) * i,
      radius: 8 + Math.random() * 15, speed: 0.004 + Math.random() * 0.006,
      baseY: 2 + Math.random() * 6, tier, collected: false, respawnAt: 0,
    });
  }

  let score = 0, combo = 0, lastBadgeTime = 0, badgesCollected = 0;
  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = { score: 0, combo: 0, crystalsCollected: 0, totalCrystals: badgeCount, lastType: '', lastPoints: 0 };

  scene.onPointerDown = (_evt: any, pickResult: any) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    for (const b of badges) {
      if (b.collected || b.mesh.name !== pickResult.pickedMesh.name) continue;
      b.collected = true; b.mesh.setEnabled(false);
      const now = performance.now();
      combo = (now - lastBadgeTime < 3000) ? Math.min(combo + 1, 10) : 1;
      lastBadgeTime = now;
      const pts = BADGE_CFG[b.tier].points * combo;
      score += pts; badgesCollected++;
      scene.metadata.gameState = { score, combo, crystalsCollected: badgesCollected, totalCrystals: badgeCount,
        lastType: b.tier === 'legend' ? 'rc' : b.tier === 'ally' ? 'hc' : 'sc', lastPoints: pts };
      const burst = new ParticleSystem(`bBurst${b.mesh.name}`, 20, scene);
      burst.createPointEmitter(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5));
      burst.emitter = b.mesh.position.clone();
      burst.minLifeTime = 0.2; burst.maxLifeTime = 0.6; burst.minSize = 0.1; burst.maxSize = 0.35;
      burst.minEmitPower = 3; burst.maxEmitPower = 6; burst.emitRate = 0;
      const c = BADGE_CFG[b.tier].color;
      burst.color1 = new Color4(c.r, c.g, c.b, 1); burst.colorDead = new Color4(0, 0, 0, 0);
      burst.blendMode = ParticleSystem.BLENDMODE_ADD;
      burst.manualEmitCount = 20; burst.start(); burst.targetStopDuration = 0.8; burst.disposeOnStop = true;
      b.respawnAt = now + 6000 + Math.random() * 5000;
      break;
    }
  };

  // ── Animation ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;
    const now = performance.now();

    // badge orbits and respawn
    for (const b of badges) {
      if (b.collected && b.respawnAt > 0 && now >= b.respawnAt) {
        b.collected = false; b.mesh.setEnabled(true); b.respawnAt = 0;
        b.angle = Math.random() * Math.PI * 2; badgesCollected = Math.max(0, badgesCollected - 1);
      }
      if (!b.collected) {
        b.angle += b.speed;
        b.mesh.position.set(Math.cos(b.angle) * b.radius, b.baseY + Math.sin(t * 2 + b.angle) * 1, Math.sin(b.angle) * b.radius);
      }
    }

    // monument avatar float + glow pulse
    for (const m of monuments) {
      m.avatar.position.y = m.baseHeight + 1 + Math.sin(t * 1.5 + m.pulsePhase) * 0.6;
      const scale = 1 + Math.sin(t * 2 + m.pulsePhase) * 0.08;
      m.avatar.scaling.setAll(scale);
    }

    // holographic crown rotation
    holoCrown.rotation.y += 0.012;
    holoCrown.rotation.x = Math.sin(t * 0.8) * 0.15;
    const crownScale = 1 + Math.sin(t * 1.8) * 0.1;
    holoCrown.scaling.setAll(crownScale);

    // ambient light shifts
    tealLight.intensity = 1.5 + Math.sin(t * 0.6) * 0.3;
    orangeLight.intensity = 1.0 + Math.sin(t * 0.8) * 0.3;
    tealLight.diffuse.g = 0.8 + Math.sin(t * 0.5) * 0.1;
  });

  return scene;
}
