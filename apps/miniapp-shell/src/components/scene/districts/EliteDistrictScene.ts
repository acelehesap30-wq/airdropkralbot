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
 * Elite District — MEMORY VAULT (Simon Says)
 * Mechanic: 5 gem pedestals arranged around the obelisk. System flashes gems in a
 * sequence. Player must reproduce the sequence by clicking gems in order.
 * Each completed round adds one more step. Wrong click = reset to round 1.
 * Higher rounds = exponential score multiplier.
 * Theme: Golden VIP palace, diamond towers, golden particle rain, luxury.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.06, 0.04, 0.02, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera('cam', -Math.PI / 2.5, Math.PI / 3, quality === 'low' ? 65 : 55, new Vector3(0, 6, 0), scene);
  camera.lowerRadiusLimit = 25; camera.upperRadiusLimit = 100;
  camera.lowerBetaLimit = 0.3; camera.upperBetaLimit = Math.PI / 2.2;
  camera.attachControl(canvas, true);
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.1;
    camera.autoRotationBehavior.idleRotationWaitTime = 1200;
  }

  // ── Lights ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.25; hemi.diffuse = new Color3(0.25, 0.2, 0.1);

  const goldLight = new PointLight('goldPt', new Vector3(0, 20, 0), scene);
  goldLight.diffuse = new Color3(1, 0.85, 0.3); goldLight.intensity = 2.0;

  const amberLight = new PointLight('amberPt', new Vector3(20, 10, -15), scene);
  amberLight.diffuse = new Color3(1, 0.6, 0.15); amberLight.intensity = 1.2;

  const roseLight = new PointLight('rosePt', new Vector3(-20, 12, 15), scene);
  roseLight.diffuse = new Color3(0.9, 0.4, 0.6); roseLight.intensity = 0.8;

  // ── Marble Floor ──
  const floor = MeshBuilder.CreateGround('floor', { width: 90, height: 90, subdivisions: 2 }, scene);
  const floorMat = new StandardMaterial('floorMat', scene);
  floorMat.diffuseColor = new Color3(0.08, 0.06, 0.04);
  floorMat.specularColor = new Color3(0.3, 0.25, 0.15);
  floorMat.emissiveColor = new Color3(0.04, 0.03, 0.01);
  floor.material = floorMat;

  const ringCount = quality === 'low' ? 6 : quality === 'medium' ? 10 : 14;
  const ringMat = new StandardMaterial('ringMat', scene);
  ringMat.emissiveColor = new Color3(0.8, 0.65, 0.1);
  ringMat.diffuseColor = Color3.Black(); ringMat.alpha = 0.4;

  for (let i = 0; i < ringCount; i++) {
    const ring = MeshBuilder.CreateTorus(`goldRing${i}`, { diameter: 10 + i * 5.5, thickness: 0.1, tessellation: 32 }, scene);
    ring.position.y = 0.04; ring.material = ringMat;
  }

  // ── Diamond Towers (decorative) ──
  const diamondMat = new StandardMaterial('diamondMat', scene);
  diamondMat.diffuseColor = new Color3(0.15, 0.12, 0.05);
  diamondMat.emissiveColor = new Color3(0.6, 0.5, 0.1);
  diamondMat.specularColor = new Color3(1, 0.9, 0.5);
  diamondMat.specularPower = 64;

  const towerCount = quality === 'low' ? 4 : 6;
  interface DiamondTower { mesh: ReturnType<typeof MeshBuilder.CreatePolyhedron>; baseY: number; floatAmp: number; floatSpeed: number; rotSpeed: number; }
  const towers: DiamondTower[] = [];

  for (let i = 0; i < towerCount; i++) {
    const angle = (Math.PI * 2 / towerCount) * i;
    const dist = 22 + (i % 2) * 6;
    const size = 2 + Math.random() * 1.5;
    const tower = MeshBuilder.CreatePolyhedron(`diamond${i}`, { type: 1, size }, scene);
    tower.position.x = Math.cos(angle) * dist;
    tower.position.z = Math.sin(angle) * dist;
    tower.position.y = 6 + Math.random() * 4;
    tower.material = diamondMat;
    towers.push({ mesh: tower, baseY: tower.position.y, floatAmp: 0.8 + Math.random() * 1.2, floatSpeed: 0.6 + Math.random() * 0.4, rotSpeed: 0.003 + Math.random() * 0.005 });
  }

  // ── Central Golden Obelisk ──
  const obeliskMat = new StandardMaterial('obeliskMat', scene);
  obeliskMat.emissiveColor = new Color3(0.9, 0.7, 0.15);
  obeliskMat.diffuseColor = new Color3(0.2, 0.15, 0.05);

  const obelisk = MeshBuilder.CreateCylinder('obelisk', { height: 16, diameterTop: 0.5, diameterBottom: 3, tessellation: 4 }, scene);
  obelisk.position.y = 8; obelisk.material = obeliskMat;

  const crown = MeshBuilder.CreatePolyhedron('crown', { type: 1, size: 1.8 }, scene);
  crown.position.y = 17; crown.material = obeliskMat;

  // ── MEMORY VAULT GEM PEDESTALS ──
  const GEM_COLORS = [
    { name: 'ruby',     color: new Color3(1, 0.15, 0.15), emissive: new Color3(1, 0.1, 0.1) },
    { name: 'sapphire', color: new Color3(0.1, 0.3, 1),   emissive: new Color3(0.05, 0.2, 1) },
    { name: 'emerald',  color: new Color3(0.1, 0.9, 0.3), emissive: new Color3(0.05, 0.8, 0.2) },
    { name: 'topaz',    color: new Color3(1, 0.85, 0.1),  emissive: new Color3(1, 0.75, 0.05) },
    { name: 'amethyst', color: new Color3(0.7, 0.2, 1),   emissive: new Color3(0.6, 0.1, 0.9) },
  ];

  const GEM_COUNT = 5;
  interface MemoryGem {
    mesh: ReturnType<typeof MeshBuilder.CreatePolyhedron>;
    pedestal: ReturnType<typeof MeshBuilder.CreateCylinder>;
    light: PointLight;
    mat: StandardMaterial;
    colorIdx: number;
    basePos: Vector3;
    lit: boolean; // currently flashing
  }
  const gems: MemoryGem[] = [];

  for (let i = 0; i < GEM_COUNT; i++) {
    const angle = (Math.PI * 2 / GEM_COUNT) * i - Math.PI / 2;
    const dist = 12;
    const pos = new Vector3(Math.cos(angle) * dist, 4.5, Math.sin(angle) * dist);
    const gcfg = GEM_COLORS[i];

    // Pedestal
    const pedMat = new StandardMaterial(`pedMat${i}`, scene);
    pedMat.emissiveColor = gcfg.emissive.scale(0.2);
    pedMat.diffuseColor = new Color3(0.1, 0.08, 0.04);
    pedMat.specularColor = new Color3(0.3, 0.25, 0.15);
    const ped = MeshBuilder.CreateCylinder(`gemPed${i}`, { height: 3.5, diameterTop: 1.5, diameterBottom: 2.2, tessellation: 8 }, scene);
    ped.position.set(pos.x, 1.75, pos.z); ped.material = pedMat;

    // Gem
    const mat = new StandardMaterial(`gemMat${i}`, scene);
    mat.emissiveColor = gcfg.emissive.scale(0.4); // dim by default
    mat.diffuseColor = gcfg.color.scale(0.2);
    mat.alpha = 0.7;
    const gem = MeshBuilder.CreatePolyhedron(`memGem${i}`, { type: 2, size: 1.2 }, scene);
    gem.position.copyFrom(pos); gem.material = mat;

    const light = new PointLight(`gemLight${i}`, pos.clone(), scene);
    light.diffuse = gcfg.color; light.intensity = 0.3; light.range = 8;

    gems.push({ mesh: gem, pedestal: ped, light, mat, colorIdx: i, basePos: pos, lit: false });
  }

  // ── Memory Game State ──
  let sequence: number[] = [];        // the correct sequence (indices into gems)
  let playerStep = 0;                 // player's current position in reproducing
  let showingPattern = true;           // currently showing the sequence
  let patternShowStart = 0;
  let memoryRound = 0;
  let score = 0;
  let bestRound = 0;

  function generateNextSequence() {
    if (sequence.length === 0) {
      // First round: 2 steps
      sequence = [
        Math.floor(Math.random() * GEM_COUNT),
        Math.floor(Math.random() * GEM_COUNT),
      ];
    } else {
      // Add one more step
      sequence.push(Math.floor(Math.random() * GEM_COUNT));
    }
    memoryRound = sequence.length - 1; // 0-indexed round number
    playerStep = 0;
    showingPattern = true;
    patternShowStart = performance.now();
  }

  generateNextSequence();

  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = {
    score: 0, combo: 0,
    crystalsCollected: 0, totalCrystals: GEM_COUNT,
    mechanic: 'memory_vault',
    round: memoryRound, sequenceLength: sequence.length,
    showingPattern: true, bestRound: 0,
    lastType: '', lastPoints: 0,
  };

  // Success burst
  const successBurst = new ParticleSystem('successBurst', quality === 'low' ? 30 : 60, scene);
  successBurst.createPointEmitter(new Vector3(-2, -1, -2), new Vector3(2, 3, 2));
  successBurst.emitter = new Vector3(0, 5, 0);
  successBurst.minLifeTime = 0.3; successBurst.maxLifeTime = 0.8;
  successBurst.minSize = 0.15; successBurst.maxSize = 0.5;
  successBurst.minEmitPower = 4; successBurst.maxEmitPower = 10;
  successBurst.emitRate = 0;
  successBurst.color1 = new Color4(1, 0.85, 0.1, 1);
  successBurst.color2 = new Color4(1, 0.5, 0, 0.8);
  successBurst.colorDead = new Color4(0, 0, 0, 0);
  successBurst.gravity = new Vector3(0, -3, 0);
  successBurst.blendMode = ParticleSystem.BLENDMODE_ADD;

  // Click handler
  scene.onPointerDown = (_evt: any, pickResult: any) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    if (showingPattern) return; // can't click while showing

    const name = pickResult.pickedMesh.name;
    if (!name.startsWith('memGem')) return;
    const gemIdx = parseInt(name.replace('memGem', ''), 10);
    if (gemIdx < 0 || gemIdx >= GEM_COUNT) return;

    const expected = sequence[playerStep];

    // Flash the clicked gem
    const g = gems[gemIdx];
    g.lit = true;
    setTimeout(() => { g.lit = false; }, 300);

    if (gemIdx === expected) {
      // Correct!
      playerStep++;

      if (playerStep >= sequence.length) {
        // Round complete!
        const roundScore = sequence.length * sequence.length * 10; // exponential scoring
        score += roundScore;
        bestRound = Math.max(bestRound, sequence.length);

        successBurst.emitter = new Vector3(0, 8, 0);
        successBurst.manualEmitCount = quality === 'low' ? 30 : 60;
        successBurst.start();
        setTimeout(() => successBurst.stop(), 400);

        scene.metadata.gameState = {
          score, combo: sequence.length,
          crystalsCollected: bestRound, totalCrystals: GEM_COUNT,
          mechanic: 'memory_vault',
          round: sequence.length, sequenceLength: sequence.length,
          showingPattern: true, bestRound,
          lastType: sequence.length >= 7 ? 'rc' : sequence.length >= 5 ? 'hc' : 'sc',
          lastPoints: roundScore,
        };

        // Start next round (adds one more step)
        setTimeout(() => generateNextSequence(), 800);
      } else {
        scene.metadata.gameState = {
          ...scene.metadata.gameState,
          score,
        };
      }
    } else {
      // Wrong! Reset to round 1
      sequence = [];
      score = Math.max(0, score - 20);
      generateNextSequence();

      scene.metadata.gameState = {
        score, combo: 0,
        crystalsCollected: bestRound, totalCrystals: GEM_COUNT,
        mechanic: 'memory_vault',
        round: 0, sequenceLength: sequence.length,
        showingPattern: true, bestRound,
        lastType: '', lastPoints: -20,
      };
    }
  };

  // ── Golden Particle Rain ──
  const ps = new ParticleSystem('goldRain', quality === 'low' ? 150 : quality === 'medium' ? 400 : 800, scene);
  ps.createPointEmitter(new Vector3(-25, 0, -25), new Vector3(25, 0, 25));
  ps.emitter = new Vector3(0, 25, 0);
  ps.minLifeTime = 3; ps.maxLifeTime = 6;
  ps.minSize = 0.15; ps.maxSize = 0.4;
  ps.minEmitPower = 0.2; ps.maxEmitPower = 0.6;
  ps.emitRate = quality === 'low' ? 20 : quality === 'medium' ? 50 : 100;
  ps.color1 = new Color4(1, 0.85, 0.2, 0.5);
  ps.color2 = new Color4(1, 0.7, 0.1, 0.4);
  ps.colorDead = new Color4(0.5, 0.35, 0.05, 0);
  ps.gravity = new Vector3(0, -0.3, 0);
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.start();

  // ── Glow & Bloom ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 1.0 : 0.6;
  }
  if (quality === 'high') {
    const pipeline = new DefaultRenderingPipeline('bloom', true, scene, [camera]);
    pipeline.bloomEnabled = true; pipeline.bloomThreshold = 0.3;
    pipeline.bloomWeight = 0.7; pipeline.bloomKernel = 64; pipeline.bloomScale = 0.5;
  }

  // ── Animation ──
  let t = 0;
  scene.registerBeforeRender(() => {
    t += engine.getDeltaTime() * 0.001;

    // Pattern show phase: flash each gem in sequence
    if (showingPattern) {
      const elapsed = performance.now() - patternShowStart;
      const stepDuration = 600;
      const gap = 200;
      const currentShowStep = Math.floor(elapsed / (stepDuration + gap));

      for (let i = 0; i < gems.length; i++) {
        const g = gems[i];
        const isActive = currentShowStep < sequence.length && sequence[currentShowStep] === i;
        const withinFlash = (elapsed % (stepDuration + gap)) < stepDuration;
        const shouldLight = isActive && withinFlash;

        if (shouldLight) {
          g.mat.emissiveColor = GEM_COLORS[i].emissive;
          g.mat.alpha = 1;
          g.light.intensity = 1.5;
          g.mesh.scaling.setAll(1.3);
        } else {
          g.mat.emissiveColor = GEM_COLORS[i].emissive.scale(0.3);
          g.mat.alpha = 0.5;
          g.light.intensity = 0.2;
          g.mesh.scaling.setAll(1);
        }
      }

      if (currentShowStep >= sequence.length + 1) {
        showingPattern = false;
        for (const g of gems) {
          g.mat.emissiveColor = GEM_COLORS[g.colorIdx].emissive.scale(0.4);
          g.mat.alpha = 0.7;
          g.light.intensity = 0.3;
          g.mesh.scaling.setAll(1);
        }
        scene.metadata.gameState = { ...scene.metadata.gameState, showingPattern: false };
      }
    } else {
      // Player input phase: gems at base state, lit ones flash
      for (const g of gems) {
        if (g.lit) {
          g.mat.emissiveColor = GEM_COLORS[g.colorIdx].emissive;
          g.mat.alpha = 1;
          g.light.intensity = 1.5;
          g.mesh.scaling.setAll(1.2);
        } else {
          g.mat.emissiveColor = GEM_COLORS[g.colorIdx].emissive.scale(0.4);
          g.mat.alpha = 0.7;
          g.light.intensity = 0.3;
          g.mesh.scaling.setAll(1);
        }
        // gentle float
        g.mesh.position.y = g.basePos.y + Math.sin(t * 1.5 + g.colorIdx) * 0.3;
        g.mesh.rotation.y += 0.01;
        g.light.position.copyFrom(g.mesh.position);
      }
    }

    // Floating diamond towers
    for (const tw of towers) {
      tw.mesh.rotation.y += tw.rotSpeed;
      tw.mesh.position.y = tw.baseY + Math.sin(t * tw.floatSpeed) * tw.floatAmp;
    }

    // Crown rotation
    crown.rotation.y += 0.008;
    crown.scaling.setAll(1 + Math.sin(t * 2) * 0.1);

    goldLight.intensity = 1.8 + Math.sin(t * 0.5) * 0.3;
    amberLight.diffuse.g = 0.55 + Math.sin(t * 0.7) * 0.1;
  });

  return scene;
}
