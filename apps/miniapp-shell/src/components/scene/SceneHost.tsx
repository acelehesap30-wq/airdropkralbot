'use client';

import { useRef, useEffect, useState } from 'react';

/**
 * Blueprint Section 7: Babylon.js scene bridge
 * Quality profiles: safe_low (30fps), balanced (45fps), immersive_high (60fps)
 * Hard budgets: scene runtime <= 650KB gzip, district bundle <= 900KB gzip
 *
 * Lazy-loads Babylon.js engine only when component mounts.
 * Falls back to gradient background on low-end or error.
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
        // Dynamic import to keep initial bundle small
        const { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, Color4 } =
          await import('@babylonjs/core');

        if (disposed || !canvasRef.current) return;

        const engine = new Engine(canvasRef.current, true, {
          preserveDrawingBuffer: false,
          stencil: false,
          antialias: true,
          powerPreference: 'low-power', // Blueprint: safe_low default
        });

        const scene = new Scene(engine);
        scene.clearColor = new Color4(0.04, 0.04, 0.06, 1); // Match --color-bg

        // Blueprint: central_hub default camera
        const camera = new ArcRotateCamera(
          'camera',
          Math.PI / 4,
          Math.PI / 3,
          12,
          Vector3.Zero(),
          scene,
        );
        camera.attachControl(canvasRef.current, false);
        camera.lowerRadiusLimit = 6;
        camera.upperRadiusLimit = 20;

        // Ambient light
        const light = new HemisphericLight('ambient', new Vector3(0, 1, 0.3), scene);
        light.intensity = 0.8;

        // Blueprint: procedural fallback scene (until district GLB loads)
        const { MeshBuilder } = await import('@babylonjs/core');
        const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, scene);
        ground.position.y = -0.5;

        // Neon grid effect
        const { StandardMaterial, Color3 } = await import('@babylonjs/core');
        const gridMat = new StandardMaterial('gridMat', scene);
        gridMat.wireframe = true;
        gridMat.emissiveColor = new Color3(0, 0.3, 0.5);
        ground.material = gridMat;

        // Central hub beacon
        const beacon = MeshBuilder.CreateCylinder('beacon', {
          height: 4,
          diameterTop: 0.1,
          diameterBottom: 0.8,
        }, scene);
        beacon.position.y = 1.5;
        const beaconMat = new StandardMaterial('beaconMat', scene);
        beaconMat.emissiveColor = new Color3(0, 0.83, 1); // --color-accent
        beaconMat.alpha = 0.6;
        beacon.material = beaconMat;

        engine.runRenderLoop(() => scene.render());

        const handleResize = () => engine.resize();
        window.addEventListener('resize', handleResize);

        setLoaded(true);

        // Cleanup
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
          ? 'radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.08) 0%, var(--color-bg) 70%)'
          : 'transparent',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: error ? 'none' : 'block',
          opacity: loaded ? 0.4 : 0,
          transition: 'opacity 0.5s',
        }}
      />
    </div>
  );
}
