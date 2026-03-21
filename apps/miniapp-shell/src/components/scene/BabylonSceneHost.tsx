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

/** Game state exposed by interactive 3D scenes via scene.metadata.gameState. */
export interface GameState {
  score: number;
  combo?: number;
  kills?: number;
  streak?: number;
  crystalsCollected?: number;
  totalCrystals?: number;
  dronesAlive?: number;
  lastType?: string;
  lastPoints?: number;
}

interface BabylonSceneHostProps {
  /** Which district scene to render. */
  districtKey: DistrictKey;
  /** Override auto-detected quality. When unset, quality is determined automatically. */
  qualityOverride?: QualityProfile;
  /** Callback fired when game state changes in the 3D scene. */
  onGameStateChange?: (state: GameState) => void;
}

export function BabylonSceneHost({ districtKey, qualityOverride, onGameStateChange }: BabylonSceneHostProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef</* Engine */ any>(null);
  const sceneRef = useRef</* Scene */ any>(null);
  const renderLoopRef = useRef<(() => void) | null>(null);
  const onGameStateChangeRef = useRef(onGameStateChange);
  onGameStateChangeRef.current = onGameStateChange;

  const [profile, setProfile] = useState<QualityProfile>(
    qualityOverride ?? 'balanced',
  );
  const [fps, setFps] = useState(60);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ reward: { sc: number; hc: number; rc: number } } | null>(null);

  /** Map district to game type for claim API. */
  const gameType = districtKey === 'arena' ? 'arena_combat'
    : districtKey === 'central_hub' ? 'hub_crystals'
    : districtKey === 'loot_forge' ? 'hub_crystals'
    : districtKey === 'mission_quarter' ? 'hub_crystals'
    : null;

  /** Claim accumulated game rewards via backend. */
  const claimRewards = useCallback(async () => {
    if (!gameState || gameState.score <= 0 || claiming || !gameType) return;
    setClaiming(true);
    setClaimResult(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const uid = params.get('uid') || '';
      const ts = params.get('ts') || String(Date.now());
      const sig = params.get('sig') || '';

      const stats: Record<string, number> = {};
      if (gameType === 'hub_crystals') {
        stats.crystals_sc = Math.floor((gameState.crystalsCollected || 0) * 0.6);
        stats.crystals_hc = Math.floor((gameState.crystalsCollected || 0) * 0.3);
        stats.crystals_rc = Math.floor((gameState.crystalsCollected || 0) * 0.1);
      } else {
        stats.kills = gameState.kills || 0;
        stats.streak = gameState.streak || 0;
      }

      const resp = await fetch('/webapp/api/game/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid, ts, sig,
          game_type: gameType,
          score: gameState.score,
          stats,
          claim_id: `${gameType}_${uid}_${Date.now()}`
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setClaimResult({ reward: data.data.reward });
        // Reset scene game state after successful claim
        if (sceneRef.current?.metadata) {
          sceneRef.current.metadata.gameState = { score: 0 };
        }
        setGameState({ score: 0 });
      }
    } catch (err) {
      console.error('[BabylonSceneHost] Claim failed:', err);
    } finally {
      setClaiming(false);
    }
  }, [gameState, claiming, gameType]);

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

      // ── FPS monitoring & auto quality + game state polling ──
      let frameCount = 0;
      let lastCheck = performance.now();
      let lastGameScore = -1;

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

        // ── Game state polling (every frame, only updates on change) ──
        const gs = scene.metadata?.gameState as GameState | undefined;
        if (gs && gs.score !== lastGameScore) {
          lastGameScore = gs.score;
          setGameState({ ...gs });
          onGameStateChangeRef.current?.({ ...gs });
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
      <style>{`
        @keyframes fadeUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>
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

      {/* Game HUD overlay */}
      {!loading && gameState && gameState.score > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            fontFamily: 'var(--font-mono, monospace)',
            pointerEvents: 'none',
          }}
        >
          {/* Score */}
          <div
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(0,214,255,0.3)',
              borderRadius: 8,
              padding: '6px 12px',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: 9, color: 'rgba(0,214,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Score
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#00d6ff', lineHeight: 1 }}>
              {gameState.score.toLocaleString()}
            </div>
          </div>

          {/* Combo / Streak */}
          {((gameState.combo && gameState.combo > 1) || (gameState.streak && gameState.streak > 1)) && (
            <div
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,215,0,0.4)',
                borderRadius: 8,
                padding: '4px 12px',
                textAlign: 'right',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#ffd700' }}>
                x{gameState.combo || gameState.streak}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(255,215,0,0.6)', marginLeft: 4 }}>
                {gameState.combo ? 'COMBO' : 'STREAK'}
              </span>
            </div>
          )}

          {/* Kills (arena) */}
          {typeof gameState.kills === 'number' && gameState.kills > 0 && (
            <div
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,68,68,0.3)',
                borderRadius: 8,
                padding: '4px 12px',
                textAlign: 'right',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#ff4444' }}>
                {gameState.kills}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(255,68,68,0.6)', marginLeft: 4 }}>
                KILLS
              </span>
            </div>
          )}

          {/* Crystals collected (hub) */}
          {typeof gameState.crystalsCollected === 'number' && gameState.totalCrystals && gameState.crystalsCollected > 0 && (
            <div
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(0,255,136,0.3)',
                borderRadius: 8,
                padding: '4px 12px',
                textAlign: 'right',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#00ff88' }}>
                {gameState.crystalsCollected}/{gameState.totalCrystals}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(0,255,136,0.6)', marginLeft: 4 }}>
                CRYSTALS
              </span>
            </div>
          )}

          {/* Last collect flash */}
          {gameState.lastPoints && gameState.lastPoints > 0 && (
            <div
              key={gameState.score}
              style={{
                textAlign: 'right',
                fontSize: 16,
                fontWeight: 700,
                color: gameState.lastType === 'rc' ? '#e040fb' : gameState.lastType === 'hc' ? '#00d2ff' : '#00ff88',
                animation: 'fadeUp 0.8s ease-out forwards',
              }}
            >
              +{gameState.lastPoints}
            </div>
          )}

          {/* Claim Rewards Button */}
          {gameType && gameState.score >= 10 && (
            <button
              onClick={claimRewards}
              disabled={claiming}
              style={{
                marginTop: 6,
                padding: '8px 16px',
                background: claiming
                  ? 'rgba(100,100,100,0.6)'
                  : 'linear-gradient(135deg, #00d6ff 0%, #00ff88 100%)',
                border: 'none',
                borderRadius: 8,
                color: '#0a0a1a',
                fontWeight: 700,
                fontSize: 12,
                fontFamily: 'var(--font-mono, monospace)',
                cursor: claiming ? 'wait' : 'pointer',
                textTransform: 'uppercase',
                letterSpacing: 1,
                pointerEvents: 'auto',
              }}
            >
              {claiming ? 'Claiming...' : 'Claim Rewards'}
            </button>
          )}

          {/* Claim success flash */}
          {claimResult && (
            <div
              key={`claim-${Date.now()}`}
              style={{
                background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(0,255,136,0.5)',
                borderRadius: 8,
                padding: '6px 12px',
                textAlign: 'right',
                animation: 'fadeUp 2s ease-out forwards',
              }}
            >
              <div style={{ fontSize: 9, color: 'rgba(0,255,136,0.8)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Claimed!
              </div>
              <div style={{ fontSize: 11, color: '#fff', marginTop: 2 }}>
                {claimResult.reward.sc > 0 && <span style={{ color: '#00ff88' }}>+{claimResult.reward.sc} SC </span>}
                {claimResult.reward.hc > 0 && <span style={{ color: '#00d2ff' }}>+{claimResult.reward.hc} HC </span>}
                {claimResult.reward.rc > 0 && <span style={{ color: '#e040fb' }}>+{claimResult.reward.rc} RC</span>}
              </div>
            </div>
          )}
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
