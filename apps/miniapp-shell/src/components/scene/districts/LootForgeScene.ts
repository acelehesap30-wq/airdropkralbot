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
 * Loot Forge District — ELEMENTAL CRAFTING
 * Mechanic: 3 element types (Fire/Water/Earth) are always visible around the anvil.
 * A recipe sequence is displayed (e.g., Fire→Water→Fire). Player must click elements
 * in the correct recipe order. Correct recipe = forge bonus. Wrong = recipe resets.
 * Theme: Fire/forge (orange/red/gold), anvil mesh, fire particles, molten ground.
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
    'cam', -Math.PI / 2, Math.PI / 3.2,
    quality === 'low' ? 65 : 55,
    new Vector3(0, 5, 0), scene,
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

  const spotDown = new SpotLight('spotDown', new Vector3(0, 20, 0), new Vector3(0, -1, 0), Math.PI / 4, 2, scene);
  spotDown.diffuse = new Color3(1, 0.5, 0.1);
  spotDown.intensity = 1.5;

  // ── Ground – molten glow ──
  const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100, subdivisions: 2 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.05, 0.02, 0.01);
  groundMat.specularColor = Color3.Black();
  groundMat.emissiveColor = new Color3(0.12, 0.03, 0.005);
  ground.material = groundMat;

  // molten cracks
  const crackMat = new StandardMaterial('crackMat', scene);
  crackMat.emissiveColor = new Color3(1, 0.35, 0);
  crackMat.diffuseColor = Color3.Black();
  crackMat.alpha = 0.6;

  const crackCount = quality === 'low' ? 6 : 12;
  for (let i = 0; i < crackCount; i++) {
    const crack = MeshBuilder.CreateBox(`crack${i}`, {
      width: 8 + Math.random() * 25, height: 0.04, depth: 0.15 + Math.random() * 0.2,
    }, scene);
    crack.position.set((Math.random() - 0.5) * 60, 0.03, (Math.random() - 0.5) * 60);
    crack.rotation.y = Math.random() * Math.PI;
    crack.material = crackMat;
  }

  // ── Anvil ──
  const anvilMat = new StandardMaterial('anvilMat', scene);
  anvilMat.diffuseColor = new Color3(0.15, 0.12, 0.1);
  anvilMat.specularColor = new Color3(0.3, 0.25, 0.2);
  anvilMat.emissiveColor = new Color3(0.04, 0.02, 0.01);

  const anvilBase = MeshBuilder.CreateBox('anvilBase', { width: 5, height: 2, depth: 3 }, scene);
  anvilBase.position.set(0, 1, 0); anvilBase.material = anvilMat;
  const anvilNeck = MeshBuilder.CreateBox('anvilNeck', { width: 3, height: 1.5, depth: 2 }, scene);
  anvilNeck.position.set(0, 2.75, 0); anvilNeck.material = anvilMat;
  const anvilFace = MeshBuilder.CreateBox('anvilFace', { width: 6, height: 0.8, depth: 3.5 }, scene);
  anvilFace.position.set(0, 3.9, 0); anvilFace.material = anvilMat;
  const anvilHorn = MeshBuilder.CreateCylinder('anvilHorn', { height: 3, diameterTop: 0.3, diameterBottom: 1.5, tessellation: 8 }, scene);
  anvilHorn.position.set(4, 3.9, 0); anvilHorn.rotation.z = -Math.PI / 2; anvilHorn.material = anvilMat;

  const hotMat = new StandardMaterial('hotMat', scene);
  hotMat.emissiveColor = new Color3(1, 0.4, 0);
  hotMat.diffuseColor = Color3.Black();
  hotMat.alpha = 0.5;
  const hotSpot = MeshBuilder.CreatePlane('hotSpot', { width: 2, height: 2 }, scene);
  hotSpot.position.set(0, 4.35, 0); hotSpot.rotation.x = Math.PI / 2; hotSpot.material = hotMat;

  // ── ELEMENTAL CRAFTING MECHANIC ──
  type ElementType = 'fire' | 'water' | 'earth';
  const ELEMENT_CFG = {
    fire:  { color: new Color3(1, 0.3, 0),   emissive: new Color3(1, 0.2, 0) },
    water: { color: new Color3(0.1, 0.4, 1),  emissive: new Color3(0.05, 0.3, 1) },
    earth: { color: new Color3(0.2, 0.8, 0.1), emissive: new Color3(0.1, 0.6, 0.05) },
  };

  // Create 3 element pedestals around the anvil
  interface ElementNode {
    mesh: ReturnType<typeof MeshBuilder.CreatePolyhedron>;
    light: PointLight;
    type: ElementType;
    basePos: Vector3;
    highlighted: boolean;
  }
  const elements: ElementNode[] = [];
  const elementTypes: ElementType[] = ['fire', 'water', 'earth'];

  for (let i = 0; i < 3; i++) {
    const etype = elementTypes[i];
    const cfg = ELEMENT_CFG[etype];
    const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
    const dist = 10;
    const pos = new Vector3(Math.cos(angle) * dist, 5, Math.sin(angle) * dist);

    const mat = new StandardMaterial(`elemMat_${etype}`, scene);
    mat.emissiveColor = cfg.emissive.scale(0.8);
    mat.diffuseColor = cfg.color.scale(0.3);
    mat.alpha = 0.9;

    const elem = MeshBuilder.CreatePolyhedron(`elem_${etype}`, { type: 1, size: 1.5 }, scene);
    elem.position.copyFrom(pos);
    elem.material = mat;

    // pedestal base
    const pedMat = new StandardMaterial(`pedMat${i}`, scene);
    pedMat.emissiveColor = cfg.emissive.scale(0.3);
    pedMat.diffuseColor = new Color3(0.08, 0.05, 0.03);
    const ped = MeshBuilder.CreateCylinder(`ped_${etype}`, { height: 3, diameter: 2.5, tessellation: 6 }, scene);
    ped.position.set(pos.x, 1.5, pos.z);
    ped.material = pedMat;

    const light = new PointLight(`eLight_${etype}`, pos.clone(), scene);
    light.diffuse = cfg.color;
    light.intensity = 0.6;
    light.range = 10;

    elements.push({ mesh: elem, light, type: etype, basePos: pos, highlighted: false });
  }

  // Also create extra clickable duplicates orbiting for variety
  const orbitCount = quality === 'low' ? 3 : quality === 'medium' ? 5 : 7;
  interface OrbitElement {
    mesh: ReturnType<typeof MeshBuilder.CreatePolyhedron>;
    type: ElementType;
    angle: number;
    radius: number;
    speed: number;
    baseY: number;
  }
  const orbitElements: OrbitElement[] = [];
  for (let i = 0; i < orbitCount; i++) {
    const etype = elementTypes[i % 3];
    const cfg = ELEMENT_CFG[etype];
    const mat = new StandardMaterial(`orbElemMat${i}`, scene);
    mat.emissiveColor = cfg.emissive.scale(0.6);
    mat.diffuseColor = cfg.color.scale(0.2);
    mat.alpha = 0.8;
    const orb = MeshBuilder.CreatePolyhedron(`orbElem_${etype}_${i}`, { type: 1, size: 0.8 }, scene);
    orb.material = mat;
    orbitElements.push({
      mesh: orb, type: etype,
      angle: (Math.PI * 2 / orbitCount) * i,
      radius: 16 + Math.random() * 8,
      speed: 0.004 + Math.random() * 0.004,
      baseY: 3 + Math.random() * 5,
    });
  }

  // Recipe system
  let currentRecipe: ElementType[] = [];
  let recipeStep = 0;
  let recipeLength = 3;
  let score = 0;
  let recipesForged = 0;
  let showingRecipe = true;
  let recipeShowStart = 0;

  function generateRecipe(): ElementType[] {
    const r: ElementType[] = [];
    for (let i = 0; i < recipeLength; i++) {
      r.push(elementTypes[Math.floor(Math.random() * 3)]);
    }
    return r;
  }

  currentRecipe = generateRecipe();
  recipeShowStart = performance.now();

  scene.metadata = scene.metadata || {};
  scene.metadata.gameState = {
    score: 0, combo: 0, crystalsCollected: 0, totalCrystals: 10,
    mechanic: 'crafting',
    recipe: currentRecipe.join(','),
    recipeStep: 0, recipesForged: 0, showingRecipe: true,
    lastType: '', lastPoints: 0,
  };

  // Forge burst effect
  const forgeBurst = new ParticleSystem('forgeBurst', quality === 'low' ? 30 : 60, scene);
  forgeBurst.createPointEmitter(new Vector3(-2, 0, -2), new Vector3(2, 4, 2));
  forgeBurst.emitter = new Vector3(0, 4.5, 0);
  forgeBurst.minLifeTime = 0.3; forgeBurst.maxLifeTime = 1;
  forgeBurst.minSize = 0.2; forgeBurst.maxSize = 0.6;
  forgeBurst.minEmitPower = 4; forgeBurst.maxEmitPower = 12;
  forgeBurst.emitRate = 0;
  forgeBurst.color1 = new Color4(1, 0.8, 0, 1);
  forgeBurst.color2 = new Color4(1, 0.3, 0, 0.8);
  forgeBurst.colorDead = new Color4(0.3, 0.1, 0, 0);
  forgeBurst.gravity = new Vector3(0, -3, 0);
  forgeBurst.blendMode = ParticleSystem.BLENDMODE_ADD;

  // Click handler
  scene.onPointerDown = (_evt: any, pickResult: any) => {
    if (!pickResult?.hit || !pickResult.pickedMesh) return;
    if (showingRecipe) return; // can't click while recipe is being shown

    const name = pickResult.pickedMesh.name;
    let clickedType: ElementType | null = null;

    // Check static elements
    for (const el of elements) {
      if (el.mesh.name === name) { clickedType = el.type; break; }
    }
    // Check orbiting elements
    if (!clickedType) {
      for (const oe of orbitElements) {
        if (oe.mesh.name === name) { clickedType = oe.type; break; }
      }
    }
    if (!clickedType) return;

    const expected = currentRecipe[recipeStep];
    if (clickedType === expected) {
      // Correct element!
      recipeStep++;

      // Flash the element
      const el = elements.find(e => e.type === clickedType);
      if (el) {
        el.highlighted = true;
        setTimeout(() => { el.highlighted = false; }, 300);
      }

      if (recipeStep >= currentRecipe.length) {
        // Recipe complete! FORGE!
        recipesForged++;
        const pts = recipeLength * 25 * recipesForged;
        score += pts;

        // Big forge burst
        forgeBurst.manualEmitCount = quality === 'low' ? 30 : 60;
        forgeBurst.start();
        setTimeout(() => forgeBurst.stop(), 500);

        scene.metadata.gameState = {
          score, combo: recipesForged,
          crystalsCollected: recipesForged, totalCrystals: 10,
          mechanic: 'crafting',
          recipe: '', recipeStep: 0, recipesForged,
          showingRecipe: true,
          lastType: recipeLength >= 5 ? 'rc' : recipeLength >= 4 ? 'hc' : 'sc',
          lastPoints: pts,
        };

        // Next recipe (longer)
        if (recipesForged % 3 === 0 && recipeLength < 7) recipeLength++;
        currentRecipe = generateRecipe();
        recipeStep = 0;
        showingRecipe = true;
        recipeShowStart = performance.now();
      } else {
        scene.metadata.gameState = {
          ...scene.metadata.gameState,
          score, recipeStep,
          recipe: currentRecipe.join(','),
        };
      }
    } else {
      // Wrong element! Recipe resets
      recipeStep = 0;
      showingRecipe = true;
      recipeShowStart = performance.now();
      scene.metadata.gameState = {
        ...scene.metadata.gameState,
        recipeStep: 0, showingRecipe: true,
        recipe: currentRecipe.join(','),
      };
    }
  };

  // ── Fire Particles ──
  const firePs = new ParticleSystem('fire', quality === 'low' ? 200 : quality === 'medium' ? 500 : 800, scene);
  firePs.createPointEmitter(new Vector3(-2, 0, -2), new Vector3(2, 3, 2));
  firePs.emitter = new Vector3(0, 4.5, 0);
  firePs.minLifeTime = 0.5; firePs.maxLifeTime = 1.5;
  firePs.minSize = 0.2; firePs.maxSize = 0.7;
  firePs.minEmitPower = 1; firePs.maxEmitPower = 3;
  firePs.emitRate = quality === 'low' ? 40 : 100;
  firePs.color1 = new Color4(1, 0.5, 0, 0.8);
  firePs.color2 = new Color4(1, 0.15, 0, 0.6);
  firePs.colorDead = new Color4(0.3, 0.05, 0, 0);
  firePs.gravity = new Vector3(0, 3, 0);
  firePs.blendMode = ParticleSystem.BLENDMODE_ADD;
  firePs.start();

  const emberPs = new ParticleSystem('embers', quality === 'low' ? 50 : 150, scene);
  emberPs.createPointEmitter(new Vector3(-15, 0, -15), new Vector3(15, 0, 15));
  emberPs.emitter = new Vector3(0, 1, 0);
  emberPs.minLifeTime = 2; emberPs.maxLifeTime = 5;
  emberPs.minSize = 0.05; emberPs.maxSize = 0.2;
  emberPs.minEmitPower = 0.5; emberPs.maxEmitPower = 2;
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

    // Recipe show phase: flash each recipe element in sequence
    if (showingRecipe) {
      const elapsed = performance.now() - recipeShowStart;
      const stepDuration = 600; // ms per step
      const currentShowStep = Math.floor(elapsed / stepDuration);

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const isInRecipe = currentShowStep < currentRecipe.length &&
                           currentRecipe[currentShowStep] === el.type;
        const mat = el.mesh.material as StandardMaterial;
        if (mat) {
          mat.alpha = isInRecipe ? 1.0 : 0.4;
        }
        el.light.intensity = isInRecipe ? 1.5 : 0.3;
        const scale = isInRecipe ? 1.4 : 1.0;
        el.mesh.scaling.setAll(scale);
      }

      if (currentShowStep >= currentRecipe.length + 1) {
        showingRecipe = false;
        // reset all elements to normal
        for (const el of elements) {
          const mat = el.mesh.material as StandardMaterial;
          if (mat) mat.alpha = 0.9;
          el.light.intensity = 0.6;
          el.mesh.scaling.setAll(1);
        }
        scene.metadata.gameState = {
          ...scene.metadata.gameState,
          showingRecipe: false,
          recipe: currentRecipe.join(','),
        };
      }
    } else {
      // Normal play: highlight next expected element gently
      for (const el of elements) {
        const isNext = el.type === currentRecipe[recipeStep];
        const mat = el.mesh.material as StandardMaterial;
        if (el.highlighted) {
          if (mat) mat.alpha = 1.0;
          el.light.intensity = 2.0;
          el.mesh.scaling.setAll(1.3);
        } else {
          if (mat) mat.alpha = isNext ? (0.8 + Math.sin(t * 5) * 0.15) : 0.7;
          el.light.intensity = isNext ? (0.6 + Math.sin(t * 4) * 0.3) : 0.4;
          el.mesh.scaling.setAll(1);
        }
        // float animation
        el.mesh.position.y = el.basePos.y + Math.sin(t * 2 + elements.indexOf(el) * 2) * 0.5;
        el.mesh.rotation.y += 0.015;
        el.light.position.copyFrom(el.mesh.position);
      }
    }

    // Orbit elements animation
    for (const oe of orbitElements) {
      oe.angle += oe.speed;
      oe.mesh.position.x = Math.cos(oe.angle) * oe.radius;
      oe.mesh.position.z = Math.sin(oe.angle) * oe.radius;
      oe.mesh.position.y = oe.baseY + Math.sin(t * 2 + oe.angle) * 1;
      oe.mesh.rotation.y += 0.02;
      oe.mesh.rotation.x += 0.01;
    }

    // fire light flicker
    firePt.intensity = 2.2 + Math.sin(t * 8) * 0.4 + Math.sin(t * 13) * 0.2;
    hotMat.alpha = 0.35 + Math.sin(t * 4) * 0.15;
    crackMat.emissiveColor.g = 0.3 + Math.sin(t * 1.5) * 0.08;
  });

  return scene;
}
