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
 * Season Hall District — TROPHY RACE
 * Mechanic: Numbered trophies must be collected IN SEQUENCE (1→2→3→...).
 * A countdown timer ticks down. Each correct sequential collect adds time bonus.
 * Clicking out of order = time penalty. Clear all = new round with more trophies.
 * Theme: Grand/trophy (gold/white), trophy pedestals, confetti, golden beams.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high',
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.04, 0.03, 0.01, 1);

  // ── Camera ──
  const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.2, quality === 'low' ? 65 : 55, new Vector3(0, 6, 0), scene);
  camera.lowerRadiusLimit = 25; camera.upperRadiusLimit = 100;
  camera.lowerBetaLimit = 0.3; camera.upperBetaLimit = Math.PI / 2.2;
  camera.attachControl(canvas, true);
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.12;
    camera.autoRotationBehavior.idleRotationWaitTime = 1000;
  }

  // ── Lights ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.25; hemi.diffuse = new Color3(0.25, 0.22, 0.12);

  const goldPt1 = new PointLight('goldPt1', new Vector3(0, 15, 0), scene);
  goldPt1.diffuse = new Color3(1, 0.9, 0.4); goldPt1.intensity = 2;

  const goldPt2 = new PointLight('goldPt2', new Vector3(15, 8, 15), scene);
  goldPt2.diffuse = new Color3(1, 0.85, 0.3); goldPt2.intensity = 1;

  const whitePt = new PointLight('whitePt', new Vector3(-12, 10, -12), scene);
  whitePt.diffuse = new Color3(1, 0.95, 0.85); whitePt.intensity = 1.2;

  // ── Ground ──
  const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100, subdivisions: 2 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.06, 0.05, 0.03);
  groundMat.specularColor = new Color3(0.2, 0.18, 0.1);
  groundMat.emissiveColor = new Color3(0.03, 0.025, 0.01);
  ground.material = groundMat;

  // floor rings
  const floorRingMat = new StandardMaterial('floorRingMat', scene);
  floorRingMat.emissiveColor = new Color3(0.8, 0.7, 0.2);
  floorRingMat.diffuseColor = Color3.Black(); floorRingMat.alpha = 0.3;

  for (let i = 0; i < 3; i++) {
    const ring = MeshBuilder.CreateTorus(`flRing${i}`, { diameter: 20 + i * 12, thickness: 0.1, tessellation: 48 }, scene);
    ring.position.y = 0.05; ring.material = floorRingMat;
  }

  // ── Trophy Display Pedestals (decorative) ──
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

  interface TrophyDecor { cupBody: ReturnType<typeof MeshBuilder.CreateCylinder>; star: ReturnType<typeof MeshBuilder.CreateSphere>; baseY: number; rotSpeed: number; }
  const trophyDecors: TrophyDecor[] = [];

  for (let i = 0; i < pedestalData.length; i++) {
    const pd = pedestalData[i];
    const pedestal = MeshBuilder.CreateBox(`ped${i}`, { width: 3, height: pd.height, depth: 3 }, scene);
    pedestal.position = pd.pos.clone(); pedestal.position.y = pd.height / 2; pedestal.material = pedestalMat;

    const cup = MeshBuilder.CreateCylinder(`cup${i}`, { height: 2, diameterTop: 1.4, diameterBottom: 0.5, tessellation: 12 }, scene);
    cup.position = pd.pos.clone(); cup.position.y = pd.height + 1; cup.material = pd.trophyMat;

    const star = MeshBuilder.CreateSphere(`star${i}`, { diameter: 0.8, segments: 6 }, scene);
    star.position = pd.pos.clone(); star.position.y = pd.height + 2.5; star.material = pd.trophyMat;

    const ts = new SpotLight(`tSpot${i}`, new Vector3(pd.pos.x, pd.height + 8, pd.pos.z), new Vector3(0, -1, 0), Math.PI / 6, 2, scene);
    ts.diffuse = new Color3(1, 0.9, 0.5); ts.intensity = quality === 'low' ? 1.5 : 2.5;

    trophyDecors.push({ cupBody: cup, star, baseY: pd.height + 2.5, rotSpeed: 0.01 + Math.random() * 0.01 });
  }

  // ── Ranking Boards ──
  const boardMat = new StandardMaterial('boardMat', scene);
  boardMat.emissiveColor = new Color3(0.7, 0.6, 0.15);
  boardMat.diffuseColor = Color3.Black(); boardMat.alpha = 0.45;

  const boardL = MeshBuilder.CreatePlane('boardL', { width: 10, height: 8 }, scene);
  boardL.position.set(-20, 7, 0); boardL.rotation.y = Math.PI / 2; boardL.material = boardMat;

  const boardR = MeshBuilder.CreatePlane('boardR', { width: 10, height: 8 }, scene);
  boardR.position.set(20, 7, 0); boardR.rotation.y = -Math.PI / 2; boardR.material = boardMat;

  // ── Golden Light Beams ──
  const beamMat = new StandardMaterial('beamMat', scene);
  beamMat.emissiveColor = new Color3(1, 0.85, 0.2);
  beamMat.diffuseColor = Color3.Black(); beamMat.alpha = 0.08;

  const beamCount = quality === 'low' ? 3 : 6;
  for (let i = 0; i < beamCount; i++) {
    const angle = (Math.PI * 2 / beamCount) * i;
    const beam = MeshBuilder.CreateCylinder(`beam${i}`, { height: 30, diameterTop: 0.5, diameterBottom: 4, tessellation: 8 }, scene);
    beam.position.set(Math.cos(angle) * 25, 15, Math.sin(angle) * 25);
    beam.material = beamMat;
  }

  // ── Confetti Particles ──
  const confPs = new ParticleSystem('confetti', quality === 'low' ? 150 : quality === 'medium' ? 400 : 700, scene);
  confPs.createPointEmitter(new Vector3(-20, 0, -20), new Vector3(20, 3, 20));
  confPs.emitter = new Vector3(0, 18, 0);
  confPs.minLifeTime = 3; confPs.maxLifeTime = 6;
  confPs.minSize = 0.15; confPs.maxSize = 0.4;
  confPs.minEmitPower = 0.5; confPs.maxEmitPower = 2;
  confPs.emitRate = quality === 'low' ? 15 : 50;
  confPs.color1 = new Color4(1, 0.85, 0, 0.8);
  confPs.color2 = new Color4(1, 0.95, 0.7, 0.6);
  confPs.colorDead = new Color4(0.8, 0.7, 0.3, 0);
  confPs.gravity = new Vector3(0, -2, 0);
  confPs.blendMode = ParticleSystem.BLENDMODE_ADD;
  confPs.start();

  // ── Glow & Bloom ──
  if (quality !== 'low') {
    const gl = new GlowLayer('glow', scene);
    gl.intensity = quality === 'high' ? 0.9 : 0.5;
  }
  if (quality === 'high') {
    const pipeline = new DefaultRenderingPipeline('bloom', true, scene, [camera]);
    pipeline.bloomEnabled = true; pipeline.bloomThreshold = 0.3;
    pipeline.bloomWeight = 0.65; pipeline.bloomKernel = 64; pipeline.bloomScale = 0.5;
  }

  // ── TROPHY RACE MECHANIC ──
  // Numbered trophies. Collect in sequence 1→2→3... Timer counts down.
  interface RaceTrophy {
    mesh: ReturnType<typeof MeshBuilder.CreateSphere>;
    light: PointLight;
    seqNum: number;       // 1-based sequence number
    collected: boolean;
    angle: number;
    radius: number;
    baseY: number;
  }

  let round = 1;
  let trophyCount = quality === 'low' ? 5 : quality === 'medium' ? 7 : 9;
  let nextTarget = 1;
  let score = 0;
  let timeLeft = 30000; // 30 seconds
  let lastFrameTime = performance.now();
  const raceTrophies: RaceTrophy[] = [];

  const TROPHY_COLORS = [
    new Color3(1, 0.85, 0.1),   // gold
    new Color3(0.8, 0.8, 0.9),  // silver
    new Color3(0.8, 0.5, 0.2),  // bronze
  ];

  function spawnRaceTrophies() {
    // Clear old meshes
    for (const rt of raceTrophies) {
      rt.mesh.dispose();
      rt.light.dispose();
    }
    raceTrophies.length = 0;

    for (let i = 0; i < trophyCount; i++) {
      const seqNum = i + 1;
      const colorIdx = seqNum <= 3 ? 0 : seqNum <= 6 ? 1 : 2;
      const color = TROPHY_COLORS[colorIdx];
      const mat = new StandardMaterial(`rtMat${seqNum}`, scene);
      mat.emissiveColor = color.scale(0.7);
      mat.diffuseColor = Color3.Black();
      mat.alpha = 0.85;

      // Size decreases with number (first trophies are bigger/easier)
      const size = 1.4 - (seqNum / trophyCount) * 0.5;
      const mesh = MeshBuilder.CreateSphere(`race${seqNum}`, { diameter: size, segments: 8 }, scene);
      mesh.material = mat;

      const angle = (Math.PI * 2 / trophyCount) * i + (Math.random() - 0.5) * 0.5;
      const radius = 10 + Math.random() * 18;
      const baseY = 2 + Math.random() * 5;

      mesh.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);

      const light = new PointLight(`rtLight${seqNum}`, mesh.position.clone(), scene);
      light.diffuse = color; light.intensity = 0.4; light.range = 6;

      raceTrophies.push({ mesh, light, seqNum, collected: false, angle, radius, baseY });
    }
    nextTarget = 1;
  }

  spawnRaceTrophies();

  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = {
    score: 0, combo: 0,
    crystalsCollected: 0, totalCrystals: trophyCount,
    mechanic: 'trophy_race',
    nextTarget: 1, timeLeft: 30, round: 1,
    lastType: '', lastPoints: 0,
  };

  // Click handler
  scene.onPointerDown = (_evt: any, pickResult: any) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    if (timeLeft <= 0) return; // game over

    const name = pickResult.pickedMesh.name;
    if (!name.startsWith('race')) return;
    const clickedNum = parseInt(name.replace('race', ''), 10);

    const trophy = raceTrophies.find(rt => rt.seqNum === clickedNum && !rt.collected);
    if (!trophy) return;

    if (clickedNum === nextTarget) {
      // CORRECT! Collect in sequence
      trophy.collected = true;
      trophy.mesh.setEnabled(false);
      trophy.light.intensity = 0;

      const pts = 20 * round + (trophyCount - clickedNum) * 5; // later trophies worth more per round
      score += pts;
      timeLeft += 2000; // +2 seconds bonus
      nextTarget++;

      // Burst
      const burst = new ParticleSystem(`rBurst${clickedNum}`, 25, scene);
      burst.createPointEmitter(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5));
      burst.emitter = trophy.mesh.position.clone();
      burst.minLifeTime = 0.2; burst.maxLifeTime = 0.5;
      burst.minSize = 0.1; burst.maxSize = 0.35;
      burst.minEmitPower = 3; burst.maxEmitPower = 7;
      burst.emitRate = 0;
      burst.color1 = new Color4(1, 0.85, 0.1, 1);
      burst.colorDead = new Color4(0, 0, 0, 0);
      burst.blendMode = ParticleSystem.BLENDMODE_ADD;
      burst.manualEmitCount = 25; burst.start();
      burst.targetStopDuration = 0.6; burst.disposeOnStop = true;

      // Check if all collected → new round
      if (nextTarget > trophyCount) {
        round++;
        if (round % 2 === 0 && trophyCount < 15) trophyCount += 2;
        timeLeft += 10000; // +10 seconds for completing round
        spawnRaceTrophies();
      }

      scene.metadata.gameState = {
        score, combo: round,
        crystalsCollected: nextTarget - 1, totalCrystals: trophyCount,
        mechanic: 'trophy_race',
        nextTarget, timeLeft: Math.floor(timeLeft / 1000), round,
        lastType: clickedNum <= 3 ? 'rc' : clickedNum <= 6 ? 'hc' : 'sc',
        lastPoints: pts,
      };
    } else {
      // Wrong order! Time penalty
      timeLeft -= 3000; // -3 seconds
      scene.metadata.gameState = {
        ...scene.metadata.gameState,
        timeLeft: Math.floor(Math.max(0, timeLeft) / 1000),
      };
    }
  };

  // ── Animation ──
  let t = 0;
  scene.registerBeforeRender(() => {
    const dt = engine.getDeltaTime();
    t += dt * 0.001;
    const now = performance.now();

    // Timer countdown
    if (timeLeft > 0) {
      timeLeft -= (now - lastFrameTime);
      if (timeLeft <= 0) {
        timeLeft = 0;
        scene.metadata.gameState = { ...scene.metadata.gameState, timeLeft: 0 };
      }
    }
    lastFrameTime = now;

    // Race trophy animations
    for (const rt of raceTrophies) {
      if (rt.collected) continue;

      // Float and rotate
      rt.mesh.position.y = rt.baseY + Math.sin(t * 2 + rt.angle) * 0.8;
      rt.mesh.rotation.y += 0.02;
      rt.light.position.copyFrom(rt.mesh.position);

      // Highlight the NEXT target trophy (pulse brighter)
      const isNext = rt.seqNum === nextTarget;
      rt.light.intensity = isNext ? (0.6 + Math.sin(t * 5) * 0.4) : 0.3;
      const mat = rt.mesh.material as StandardMaterial;
      if (mat) {
        mat.alpha = isNext ? (0.7 + Math.sin(t * 5) * 0.3) : 0.6;
        // Next target pulses larger
        const scale = isNext ? (1.0 + Math.sin(t * 4) * 0.2) : 0.8;
        rt.mesh.scaling.setAll(scale);
      }
    }

    // Decorative trophy hover
    for (const tr of trophyDecors) {
      tr.star.position.y = tr.baseY + Math.sin(t * 2) * 0.3;
      tr.star.rotation.y += tr.rotSpeed;
      tr.cupBody.rotation.y += tr.rotSpeed * 0.5;
    }

    goldPt1.intensity = 1.8 + Math.sin(t * 1.5) * 0.4;
    boardMat.alpha = 0.4 + Math.sin(t * 2) * 0.08;
    beamMat.alpha = 0.06 + Math.sin(t * 0.8) * 0.03;
  });

  return scene;
}
