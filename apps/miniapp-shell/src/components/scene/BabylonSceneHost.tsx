'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { DistrictKey, QualityTier } from './districts';

/* ═══════════════════════════════════════
   BabylonJS 3D Scene Host
   - Lazy-loads @babylonjs/core + district modules
   - Falls back to Canvas2D SceneHost on WebGL failure
   - Auto-detects quality tier with performance monitoring
   - Respects prefers-reduced-motion
   - Cleans up engine on unmount
   ═══════════════════════════════════════ */

/** Quality tier mapped to target FPS thresholds used for auto-detection. */
const QUALITY_FPS_THRESHOLDS = {
  safe_low: 30,
  balanced: 45,
  immersive_high: 60,
} as const;

type QualityProfile = keyof typeof QUALITY_FPS_THRESHOLDS;

function profileToTier(profile: QualityProfile): QualityTier {
  switch (profile) {
    case 'safe_low':
      return 'low';
    case 'balanced':
      return 'medium';
    case 'immersive_high':
      return 'high';
  }
}

/** Detect if user prefers reduced motion. */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

/** Quick WebGL availability check. */
function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

interface BabylonSceneHostProps {
  /** Which district scene to render. */
  districtKey: DistrictKey;
  /** Override auto-detected quality. When unset, quality is determined automatically. */
  qualityOverride?: QualityProfile;
}

export function BabylonSceneHost({ districtKey, qualityOverride }: BabylonSceneHostProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef</* Engine */ any>(null);
  const sceneRef = useRef</* Scene */ any>(null);
  const renderLoopRef = useRef<(() => void) | null>(null);

  const [profile, setProfile] = useState<QualityProfile>(
    qualityOverride ?? 'balanced',
  );
  const [fps, setFps] = useState(60);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Map profile to BabylonJS quality tier. */
  const quality = profileToTier(profile);

  /** Core bootstrap: dynamic-import Babylon, create engine + scene. */
  const bootstrap = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // WebGL pre-check
    if (!isWebGLAvailable()) {
      setFallback(true);
      return;
    }

    try {
      // Dynamic import keeps BabylonJS out of the critical bundle.
      const [{ Engine }, { loadDistrictScene }] = await Promise.all([
        import('@babylonjs/core'),
        import('./districts'),
      ]);

      // Dispose previous engine if district changed.
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
        sceneRef.current = null;
      }

      const engine = new Engine(canvas, true, {
        preserveDrawingBuffer: false,
        stencil: true,
        antialias: quality !== 'low',
        adaptToDeviceRatio: quality !== 'low',
        powerPreference: quality === 'high' ? 'high-performance' : 'default',
      });

      engineRef.current = engine;

      // Reduced motion: lock low quality, skip particles later (scenes respect quality=low).
      const effectiveQuality: QualityTier = prefersReducedMotion() ? 'low' : quality;

      // Load district-specific scene factory.
      const createScene = await loadDistrictScene(districtKey);
      const scene = createScene(engine, canvas, effectiveQuality);
      sceneRef.current = scene;

      // ── FPS monitoring & auto quality ──
      let frameCount = 0;
      let lastCheck = performance.now();

      const renderFn = () => {
        scene.render();

        // Perf monitoring every ~2 seconds
        frameCount++;
        const now = performance.now();
        const elapsed = now - lastCheck;
        if (elapsed >= 2000) {
          const currentFps = Math.round((frameCount * 1000) / elapsed);
          setFps(currentFps);
          frameCount = 0;
          lastCheck = now;

          // Auto-adjust quality (only when no override set).
          if (!qualityOverride) {
            if (currentFps < QUALITY_FPS_THRESHOLDS.safe_low && profile !== 'safe_low') {
              setProfile('safe_low');
            } else if (
              currentFps < QUALITY_FPS_THRESHOLDS.balanced &&
              profile === 'immersive_high'
            ) {
              setProfile('balanced');
            }
          }
        }
      };

      renderLoopRef.current = renderFn;
      engine.runRenderLoop(renderFn);

      // Handle browser resize.
      const onResize = () => engine.resize();
      window.addEventListener('resize', onResize);

      // Stash resize handler for cleanup.
      (canvas as any).__bjsResize = onResize;

      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('[BabylonSceneHost] Init failed, falling back to Canvas2D:', err);
      setFallback(true);
      setLoading(false);
      setError(String(err));
    }
  }, [districtKey, quality, profile, qualityOverride]);

  // ── Lifecycle ──
  useEffect(() => {
    bootstrap();

    return () => {
      // Cleanup
      const canvas = canvasRef.current;
      if (canvas && (canvas as any).__bjsResize) {
        window.removeEventListener('resize', (canvas as any).__bjsResize);
        delete (canvas as any).__bjsResize;
      }
      if (engineRef.current) {
        if (renderLoopRef.current) {
          engineRef.current.stopRenderLoop(renderLoopRef.current);
          renderLoopRef.current = null;
        }
        sceneRef.current?.dispose();
        engineRef.current.dispose();
        engineRef.current = null;
        sceneRef.current = null;
      }
    };
    // Re-bootstrap when district or quality changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtKey, quality]);

  // ── Fallback to Canvas2D ──
  if (fallback) {
    // Lazy-import the original Canvas2D SceneHost.
    // We use a simple dynamic import here to avoid bundling it when not needed.
    return <Canvas2DFallback />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 280 }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          borderRadius: 12,
          outline: 'none',
          touchAction: 'none',
        }}
      />

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10,10,26,0.85)',
            borderRadius: 12,
            color: '#00d2ff',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 13,
          }}
        >
          Loading 3D scene...
        </div>
      )}

      {/* Error overlay (still shows scene if possible) */}
      {error && !loading && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontSize: 9,
            fontFamily: 'var(--font-mono, monospace)',
            color: 'rgba(255,68,68,0.7)',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 6px',
            borderRadius: 4,
            maxWidth: '80%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {error}
        </div>
      )}

      {/* HUD: FPS + quality badge */}
      {!loading && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            fontSize: 9,
            fontFamily: 'var(--font-mono, monospace)',
            color:
              fps >= QUALITY_FPS_THRESHOLDS.balanced
                ? 'rgba(0,255,136,0.5)'
                : fps >= QUALITY_FPS_THRESHOLDS.safe_low
                  ? 'rgba(255,200,0,0.5)'
                  : 'rgba(255,68,68,0.5)',
            background: 'rgba(0,0,0,0.3)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          {fps} FPS &bull; {profile.toUpperCase().replace('_', ' ')}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Canvas2D fallback wrapper
   ───────────────────────────────────────── */

function Canvas2DFallback() {
  const [Comp, setComp] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    import('./SceneHost').then((mod) => {
      setComp(() => mod.SceneHost);
    });
  }, []);

  if (!Comp) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a1a',
          borderRadius: 12,
          color: '#555',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 12,
        }}
      >
        Loading fallback scene...
      </div>
    );
  }

  return <Comp />;
}

export default BabylonSceneHost;
