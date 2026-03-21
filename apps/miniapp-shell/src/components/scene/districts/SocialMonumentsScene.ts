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
 * Social Monuments — PAIR MATCH
 * Mechanic: Badges come in matching color PAIRS. Click first badge → selects it.
 * Click second badge → if same color = both collected for points.
 * If different color = both reset (briefly disabled). Clear all pairs = bonus round.
 * Theme: Community plaza, monument pillars, connection beams, teal/orange.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.03, 0.05, 0.08, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera('cam', -Math.PI / 2.8, Math.PI / 3.3, quality === 'low' ? 65 : 55, new Vector3(0, 5, 0), scene);
  camera.lowerRadiusLimit = 28; camera.upperRadiusLimit = 100;
  camera.lowerBetaLimit = 0.3; camera.upperBetaLimit = Math.PI / 2.2;
  camera.attachControl(canvas, true);
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.12;
    camera.autoRotationBehavior.idleRotationWaitTime = 1000;
  }

  // ── Lights ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.25; hemi.diffuse = new Color3(0.15, 0.2, 0.25);

  const tealLight = new PointLight('tealPt', new Vector3(10, 15, 10), scene);
  tealLight.diffuse = new Color3(0, 0.9, 0.8); tealLight.intensity = 1.8;

  const orangeLight = new PointLight('orangePt', new Vector3(-12, 10, -12), scene);
  orangeLight.diffuse = new Color3(1, 0.6, 0.15); orangeLight.intensity = 1.2;

  const whiteLight = new PointLight('whitePt', new Vector3(0, 20, 0), scene);
  whiteLight.diffuse = new Color3(0.9, 0.95, 1); whiteLight.intensity = 0.8;

  // ── Plaza Floor ──
  const floor = MeshBuilder.CreateDisc('floor', { radius: 45, tessellation: 48 }, scene);
  floor.rotation.x = Math.PI / 2; floor.position.y = 0;
  const floorMat = new StandardMaterial('floorMat', scene);
  floorMat.diffuseColor = new Color3(0.05, 0.07, 0.1);
  floorMat.specularColor = new Color3(0.15, 0.2, 0.25);
  floorMat.emissiveColor = new Color3(0.02, 0.04, 0.06);
  floor.material = floorMat;

  const socialRingMat = new StandardMaterial('socialRing', scene);
  socialRingMat.emissiveColor = new Color3(0, 0.7, 0.65);
  socialRingMat.diffuseColor = Color3.Black(); socialRingMat.alpha = 0.3;

  const sRingCount = quality === 'low' ? 5 : quality === 'medium' ? 8 : 12;
  for (let i = 0; i < sRingCount; i++) {
    const ring = MeshBuilder.CreateTorus(`sRing${i}`, { diameter: 8 + i * 6, thickness: 0.06, tessellation: 32 }, scene);
    ring.position.y = 0.04; ring.material = socialRingMat;
  }

  // ── Player Monument Pillars ──
  const monumentMat = new StandardMaterial('monumentMat', scene);
  monumentMat.emissiveColor = new Color3(0, 0.6, 0.55);
  monumentMat.diffuseColor = new Color3(0.06, 0.1, 0.12);

  const avatarMat = new StandardMaterial('avatarMat', scene);
  avatarMat.emissiveColor = new Color3(0.9, 0.5, 0.15);
  avatarMat.diffuseColor = Color3.Black();

  const monumentCount = quality === 'low' ? 6 : quality === 'medium' ? 8 : 12;
  interface Monument { pillar: ReturnType<typeof MeshBuilder.CreateCylinder>; avatar: ReturnType<typeof MeshBuilder.CreateSphere>; angle: number; baseHeight: number; pulsePhase: number; }
  const monuments: Monument[] = [];

  for (let i = 0; i < monumentCount; i++) {
    const angle = (Math.PI * 2 / monumentCount) * i;
    const dist = 26;
    const height = 4 + Math.random() * 6;
    const pillar = MeshBuilder.CreateCylinder(`monument${i}`, { height, diameterTop: 1.0, diameterBottom: 1.6, tessellation: 6 }, scene);
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
  holoMat.diffuseColor = Color3.Black(); holoMat.alpha = 0.5; holoMat.wireframe = true;

  const towerSegments = quality === 'low' ? 4 : 6;
  for (let i = 0; i < towerSegments; i++) {
    const seg = MeshBuilder.CreateCylinder(`tower${i}`, { height: 2.5, diameterTop: 2.5 - i * 0.3, diameterBottom: 3 - i * 0.3, tessellation: 8 }, scene);
    seg.position.y = i * 2.8 + 1.25;
    seg.material = i % 2 === 0 ? towerMat : holoMat;
  }

  const holoCrown = MeshBuilder.CreatePolyhedron('holoCrown', { type: 2, size: 2 }, scene);
  holoCrown.position.y = towerSegments * 2.8 + 2;
  holoCrown.material = holoMat;

  // ── Connection Beams ──
  const beamMat = new StandardMaterial('beamMat', scene);
  beamMat.emissiveColor = new Color3(1, 0.6, 0.2);
  beamMat.diffuseColor = Color3.Black(); beamMat.alpha = 0.2;

  const beamCount = Math.min(quality === 'low' ? 3 : quality === 'medium' ? 5 : 8, monumentCount - 1);
  for (let i = 0; i < beamCount; i++) {
    const a = monuments[i]; const b = monuments[(i + 1) % monuments.length];
    const midX = (a.pillar.position.x + b.pillar.position.x) / 2;
    const midZ = (a.pillar.position.z + b.pillar.position.z) / 2;
    const dx = b.pillar.position.x - a.pillar.position.x;
    const dz = b.pillar.position.z - a.pillar.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const beam = MeshBuilder.CreateCylinder(`beam${i}`, { height: dist, diameter: 0.08, tessellation: 4 }, scene);
    beam.position.x = midX; beam.position.z = midZ;
    beam.position.y = Math.min(a.baseHeight, b.baseHeight) + 0.5;
    beam.rotation.z = Math.PI / 2;
    beam.rotation.y = Math.atan2(dz, dx);
    beam.material = beamMat;
  }

  // ── Social Activity Particles ──
  const socialPs = new ParticleSystem('social', quality === 'low' ? 150 : quality === 'medium' ? 400 : 800, scene);
  socialPs.createCylinderEmitter(15, 1, 0, 0);
  socialPs.emitter = new Vector3(0, 2, 0);
  socialPs.minLifeTime = 2; socialPs.maxLifeTime = 5;
  socialPs.minSize = 0.15; socialPs.maxSize = 0.5;
  socialPs.minEmitPower = 0.8; socialPs.maxEmitPower = 2;
  socialPs.emitRate = quality === 'low' ? 25 : quality === 'medium' ? 50 : 100;
  socialPs.color1 = new Color4(0, 0.85, 0.75, 0.4);
  socialPs.color2 = new Color4(1, 0.5, 0.15, 0.35);
  socialPs.colorDead = new Color4(0.5, 0.5, 0.5, 0);
  socialPs.gravity = new Vector3(0, 0.5, 0);
  socialPs.blendMode = ParticleSystem.BLENDMODE_ADD;
  socialPs.start();

  // ── Glow & Bloom ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 0.8 : 0.5;
  }
  if (quality === 'high') {
    const pipeline = new DefaultRenderingPipeline('bloom', true, scene, [camera]);
    pipeline.bloomEnabled = true; pipeline.bloomThreshold = 0.3;
    pipeline.bloomWeight = 0.65; pipeline.bloomKernel = 64; pipeline.bloomScale = 0.5;
  }

  // ── PAIR MATCH MECHANIC ──
  const PAIR_COLORS = [
    { name: 'teal',   color: new Color3(0, 0.85, 0.75) },
    { name: 'orange', color: new Color3(1, 0.5, 0.15) },
    { name: 'pink',   color: new Color3(1, 0.4, 0.7) },
    { name: 'lime',   color: new Color3(0.5, 1, 0.2) },
    { name: 'sky',    color: new Color3(0.3, 0.7, 1) },
    { name: 'gold',   color: new Color3(1, 0.85, 0.1) },
  ];

  interface MatchBadge {
    mesh: ReturnType<typeof MeshBuilder.CreateSphere>;
    light: PointLight;
    pairId: number;    // which color pair (0-5)
    angle: number;
    radius: number;
    baseY: number;
    collected: boolean;
    selected: boolean;
    disabled: boolean; // briefly disabled after mismatch
    disableUntil: number;
  }

  let round = 1;
  let pairsPerRound = quality === 'low' ? 4 : quality === 'medium' ? 5 : 6;
  let score = 0;
  let pairsMatched = 0;
  let totalPairsEver = 0;
  let selectedBadge: MatchBadge | null = null;
  const badges: MatchBadge[] = [];

  function spawnPairs() {
    // Clear old
    for (const b of badges) { b.mesh.dispose(); b.light.dispose(); }
    badges.length = 0;
    selectedBadge = null;

    // Create pairs: each color appears exactly twice
    const pairIds: number[] = [];
    for (let i = 0; i < pairsPerRound; i++) {
      pairIds.push(i % PAIR_COLORS.length, i % PAIR_COLORS.length);
    }
    // Shuffle
    for (let i = pairIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairIds[i], pairIds[j]] = [pairIds[j], pairIds[i]];
    }

    const total = pairIds.length;
    for (let i = 0; i < total; i++) {
      const pairId = pairIds[i];
      const cfg = PAIR_COLORS[pairId];
      const mat = new StandardMaterial(`pairMat${i}`, scene);
      mat.emissiveColor = cfg.color.scale(0.6);
      mat.diffuseColor = Color3.Black();
      mat.alpha = 0.8;

      const mesh = MeshBuilder.CreateSphere(`pair${i}`, { diameter: 1.3, segments: 8 }, scene);
      mesh.material = mat;

      const angle = (Math.PI * 2 / total) * i + (Math.random() - 0.5) * 0.3;
      const radius = 8 + Math.random() * 14;
      const baseY = 2 + Math.random() * 5;
      mesh.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);

      const light = new PointLight(`pairLight${i}`, mesh.position.clone(), scene);
      light.diffuse = cfg.color; light.intensity = 0.3; light.range = 5;

      badges.push({
        mesh, light, pairId,
        angle, radius, baseY,
        collected: false, selected: false,
        disabled: false, disableUntil: 0,
      });
    }
  }

  spawnPairs();

  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = {
    score: 0, combo: 0,
    crystalsCollected: 0, totalCrystals: pairsPerRound,
    mechanic: 'pair_match',
    pairsMatched: 0, round: 1,
    lastType: '', lastPoints: 0,
  };

  // Match burst
  const matchBurst = new ParticleSystem('matchBurst', quality === 'low' ? 20 : 40, scene);
  matchBurst.createPointEmitter(new Vector3(-1, -1, -1), new Vector3(1, 2, 1));
  matchBurst.emitter = Vector3.Zero();
  matchBurst.minLifeTime = 0.3; matchBurst.maxLifeTime = 0.7;
  matchBurst.minSize = 0.1; matchBurst.maxSize = 0.4;
  matchBurst.minEmitPower = 3; matchBurst.maxEmitPower = 8;
  matchBurst.emitRate = 0;
  matchBurst.color1 = new Color4(0, 0.9, 0.8, 1);
  matchBurst.colorDead = new Color4(0, 0, 0, 0);
  matchBurst.gravity = new Vector3(0, -3, 0);
  matchBurst.blendMode = ParticleSystem.BLENDMODE_ADD;

  scene.onPointerDown = (_evt: any, pickResult: any) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    const name = pickResult.pickedMesh.name;
    if (!name.startsWith('pair')) return;

    const badge = badges.find(b => b.mesh.name === name && !b.collected && !b.disabled);
    if (!badge) return;

    if (!selectedBadge) {
      // First selection
      selectedBadge = badge;
      badge.selected = true;
    } else if (selectedBadge === badge) {
      // Clicked same badge — deselect
      badge.selected = false;
      selectedBadge = null;
    } else {
      // Second selection — check match
      if (badge.pairId === selectedBadge.pairId) {
        // MATCH!
        badge.collected = true;
        selectedBadge.collected = true;
        badge.mesh.setEnabled(false);
        selectedBadge.mesh.setEnabled(false);
        badge.light.intensity = 0;
        selectedBadge.light.intensity = 0;
        badge.selected = false;
        selectedBadge.selected = false;

        pairsMatched++;
        totalPairsEver++;
        const pts = 25 * round;
        score += pts;

        // Burst at both positions
        matchBurst.emitter = badge.mesh.position.clone();
        const c = PAIR_COLORS[badge.pairId].color;
        matchBurst.color1 = new Color4(c.r, c.g, c.b, 1);
        matchBurst.manualEmitCount = quality === 'low' ? 20 : 40;
        matchBurst.start();
        setTimeout(() => matchBurst.stop(), 300);

        selectedBadge = null;

        // Check if all pairs matched → new round
        const allMatched = badges.every(b => b.collected);
        if (allMatched) {
          const roundBonus = pairsPerRound * 50 * round;
          score += roundBonus;
          round++;
          if (round % 2 === 0 && pairsPerRound < 8) pairsPerRound++;
          pairsMatched = 0;

          scene.metadata.gameState = {
            score, combo: round,
            crystalsCollected: totalPairsEver, totalCrystals: pairsPerRound,
            mechanic: 'pair_match',
            pairsMatched: 0, round,
            lastType: 'rc', lastPoints: roundBonus,
          };

          setTimeout(() => spawnPairs(), 800);
        } else {
          scene.metadata.gameState = {
            score, combo: round,
            crystalsCollected: totalPairsEver, totalCrystals: pairsPerRound,
            mechanic: 'pair_match',
            pairsMatched, round,
            lastType: round > 3 ? 'hc' : 'sc', lastPoints: pts,
          };
        }
      } else {
        // MISMATCH! Both briefly disabled
        badge.selected = false;
        selectedBadge.selected = false;
        badge.disabled = true;
        selectedBadge.disabled = true;
        const now = performance.now();
        badge.disableUntil = now + 1000;
        selectedBadge.disableUntil = now + 1000;
        selectedBadge = null;

        score = Math.max(0, score - 5);
        scene.metadata.gameState = {
          ...scene.metadata.gameState,
          score,
          lastType: '', lastPoints: -5,
        };
      }
    }
  };

  // ── Animation ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;
    const now = performance.now();

    // Badge animations
    for (const b of badges) {
      if (b.collected) continue;

      // Re-enable after disable timeout
      if (b.disabled && now >= b.disableUntil) {
        b.disabled = false;
      }

      // Float and orbit gently
      b.mesh.position.y = b.baseY + Math.sin(t * 2 + b.angle) * 0.6;
      b.mesh.rotation.y += 0.015;
      b.light.position.copyFrom(b.mesh.position);

      const mat = b.mesh.material as StandardMaterial;
      if (b.selected) {
        // Selected: pulse bright and larger
        mat.alpha = 0.8 + Math.sin(t * 6) * 0.2;
        b.light.intensity = 0.6 + Math.sin(t * 6) * 0.3;
        b.mesh.scaling.setAll(1.3 + Math.sin(t * 5) * 0.1);
        // Show color fully
        mat.emissiveColor = PAIR_COLORS[b.pairId].color;
      } else if (b.disabled) {
        // Disabled: dim and small
        mat.alpha = 0.3;
        b.light.intensity = 0.1;
        b.mesh.scaling.setAll(0.7);
      } else {
        // Normal: partially hidden color (add mystery)
        mat.emissiveColor = PAIR_COLORS[b.pairId].color.scale(0.6);
        mat.alpha = 0.7;
        b.light.intensity = 0.3;
        b.mesh.scaling.setAll(1);
      }
    }

    // Monument avatar float
    for (const m of monuments) {
      m.avatar.position.y = m.baseHeight + 1 + Math.sin(t * 1.5 + m.pulsePhase) * 0.6;
      m.avatar.scaling.setAll(1 + Math.sin(t * 2 + m.pulsePhase) * 0.08);
    }

    holoCrown.rotation.y += 0.012;
    holoCrown.rotation.x = Math.sin(t * 0.8) * 0.15;
    holoCrown.scaling.setAll(1 + Math.sin(t * 1.8) * 0.1);

    tealLight.intensity = 1.5 + Math.sin(t * 0.6) * 0.3;
    orangeLight.intensity = 1.0 + Math.sin(t * 0.8) * 0.3;
  });

  return scene;
}
