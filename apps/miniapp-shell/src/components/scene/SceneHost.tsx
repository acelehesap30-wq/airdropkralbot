'use client';

import { useRef, useEffect, useState } from 'react';

/**
 * Blueprint Section 7: Enhanced 3D scene with particles
 * Procedural neon grid, beacon, floating particles, ambient light
 */
export function SceneHost() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    let disposed = false;

    async function initScene() {
      try {
        const {
          Engine, Scene, ArcRotateCamera, HemisphericLight,
          PointLight, Vector3, Color4, Color3,
          MeshBuilder, StandardMaterial, ParticleSystem, Texture,
        } = await import('@babylonjs/core');

        if (disposed || !canvasRef.current) return;

        const engine = new Engine(canvasRef.current, true, {
          preserveDrawingBuffer: false,
          stencil: false,
          antialias: true,
          powerPreference: 'low-power',
        });

        const scene = new Scene(engine);
        scene.clearColor = new Color4(0.02, 0.02, 0.03, 1);
        scene.fogMode = Scene.FOGMODE_EXP2;
        scene.fogDensity = 0.015;
        scene.fogColor = new Color3(0.02, 0.02, 0.04);

        // Camera — slow auto-rotate
        const camera = new ArcRotateCamera('camera', Math.PI / 4, Math.PI / 3.2, 14, Vector3.Zero(), scene);
        camera.attachControl(canvasRef.current, false);
        camera.lowerRadiusLimit = 8;
        camera.upperRadiusLimit = 22;
        camera.useAutoRotationBehavior = true;
        if (camera.autoRotationBehavior) {
          camera.autoRotationBehavior.idleRotationSpeed = 0.04;
          camera.autoRotationBehavior.idleRotationWaitTime = 1000;
        }

        // Lights
        const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0.3), scene);
        ambient.intensity = 0.5;
        ambient.diffuse = new Color3(0.4, 0.4, 0.6);

        const accentLight = new PointLight('accent', new Vector3(0, 6, 0), scene);
        accentLight.diffuse = new Color3(0, 0.83, 1);
        accentLight.intensity = 0.8;

        // Ground — neon grid
        const ground = MeshBuilder.CreateGround('ground', { width: 30, height: 30, subdivisions: 30 }, scene);
        ground.position.y = -0.5;
        const gridMat = new StandardMaterial('gridMat', scene);
        gridMat.wireframe = true;
        gridMat.emissiveColor = new Color3(0, 0.15, 0.25);
        gridMat.alpha = 0.5;
        ground.material = gridMat;

        // Central beacon
        const beacon = MeshBuilder.CreateCylinder('beacon', {
          height: 6, diameterTop: 0.05, diameterBottom: 1.2, tessellation: 6,
        }, scene);
        beacon.position.y = 2.5;
        const beaconMat = new StandardMaterial('beaconMat', scene);
        beaconMat.emissiveColor = new Color3(0, 0.83, 1);
        beaconMat.alpha = 0.35;
        beacon.material = beaconMat;

        // Inner beacon glow
        const innerBeacon = MeshBuilder.CreateCylinder('innerBeacon', {
          height: 5, diameterTop: 0.02, diameterBottom: 0.4, tessellation: 6,
        }, scene);
        innerBeacon.position.y = 2;
        const innerMat = new StandardMaterial('innerMat', scene);
        innerMat.emissiveColor = new Color3(0, 1, 0.8);
        innerMat.alpha = 0.6;
        innerBeacon.material = innerMat;

        // Floating ring platforms
        for (let i = 0; i < 5; i++) {
          const torus = MeshBuilder.CreateTorus(`ring${i}`, {
            diameter: 3 + i * 2.5, thickness: 0.08, tessellation: 32,
          }, scene);
          torus.position.y = -0.3 + (i * 0.15);
          const torusMat = new StandardMaterial(`ringMat${i}`, scene);
          torusMat.emissiveColor = new Color3(0, 0.2 + i * 0.1, 0.4 + i * 0.1);
          torusMat.alpha = 0.25 - (i * 0.03);
          torus.material = torusMat;
        }

        // Small floating spheres
        for (let i = 0; i < 8; i++) {
          const sphere = MeshBuilder.CreateSphere(`orb${i}`, { diameter: 0.15 + Math.random() * 0.1 }, scene);
          const angle = (i / 8) * Math.PI * 2;
          const radius = 4 + Math.random() * 4;
          sphere.position.x = Math.cos(angle) * radius;
          sphere.position.z = Math.sin(angle) * radius;
          sphere.position.y = 1 + Math.random() * 3;
          const orbMat = new StandardMaterial(`orbMat${i}`, scene);
          const colors = [new Color3(0, 0.83, 1), new Color3(1, 0.84, 0), new Color3(0.88, 0.25, 0.98)];
          orbMat.emissiveColor = colors[i % 3];
          orbMat.alpha = 0.6;
          sphere.material = orbMat;
        }

        engine.runRenderLoop(() => {
          // Animate beacon rotation
          beacon.rotation.y += 0.005;
          innerBeacon.rotation.y -= 0.008;
          scene.render();
        });

        const handleResize = () => engine.resize();
        window.addEventListener('resize', handleResize);
        setLoaded(true);

        return () => {
          disposed = true;
          window.removeEventListener('resize', handleResize);
          engine.dispose();
        };
      } catch (err) {
        console.warn('[SceneHost] Babylon.js init failed, using fallback:', err);
        setError(true);
      }
    }

    const cleanup = initScene();
    return () => {
      disposed = true;
      cleanup?.then((fn) => fn?.());
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        background: error || !loaded
          ? 'radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.06) 0%, rgba(0,100,200,0.02) 40%, var(--color-bg) 80%)'
          : 'transparent',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: error ? 'none' : 'block',
          opacity: loaded ? 0.35 : 0,
          transition: 'opacity 0.8s',
        }}
      />
    </div>
  );
}
