import { useRef, useEffect, useState, useCallback, type CSSProperties } from "react";
import type { TabKey } from "../../types";

/**
 * NexusScene – Inline 3D BabylonJS district renderer for the webapp.
 *
 * IMPORTANT: Reuses a single BabylonJS Engine across tab switches to avoid
 * WebGL context exhaustion. Only the Scene is swapped on tab change.
 */

/** Tab → district scene key mapping */
const TAB_DISTRICT_MAP: Partial<Record<TabKey, string>> = {
  home: "central_hub",
  pvp: "arena",
  tasks: "mission_quarter",
  forge: "loot_forge",
  exchange: "exchange_district",
  season: "season_hall",
  events: "live_event_overlay",
};

/** Explicit import map for Vite tree-shaking */
const SCENE_LOADERS: Record<string, () => Promise<any>> = {
  central_hub: () => import("../../../../../../apps/miniapp-shell/src/components/scene/districts/CentralHubScene.ts"),
  arena: () => import("../../../../../../apps/miniapp-shell/src/components/scene/districts/ArenaScene.ts"),
  mission_quarter: () => import("../../../../../../apps/miniapp-shell/src/components/scene/districts/MissionQuarterScene.ts"),
  loot_forge: () => import("../../../../../../apps/miniapp-shell/src/components/scene/districts/LootForgeScene.ts"),
  exchange_district: () => import("../../../../../../apps/miniapp-shell/src/components/scene/districts/ExchangeDistrictScene.ts"),
  season_hall: () => import("../../../../../../apps/miniapp-shell/src/components/scene/districts/SeasonHallScene.ts"),
  live_event_overlay: () => import("../../../../../../apps/miniapp-shell/src/components/scene/districts/LiveEventOverlayScene.ts"),
};

/** Quality detection based on device */
function detectQuality(): "low" | "medium" | "high" {
  if (typeof navigator === "undefined") return "medium";
  const cores = navigator.hardwareConcurrency || 2;
  if (cores <= 2) return "low";
  if (cores >= 8) return "high";
  return "medium";
}

const QUALITY = detectQuality();

interface GameState {
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

type NexusSceneProps = {
  tab: TabKey;
  lang: "tr" | "en";
};

/** Module-level singleton for the BabylonJS engine (survives tab switches) */
let _sharedEngine: any = null;
let _sharedCanvas: HTMLCanvasElement | null = null;
let _babylonModule: any = null;

export function NexusScene({ tab, lang }: NexusSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);
  const renderLoopRef = useRef<(() => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{
    reward: { sc: number; hc: number; rc: number };
  } | null>(null);

  const districtKey = TAB_DISTRICT_MAP[tab];

  /** Claim game rewards from the API */
  const claimRewards = useCallback(async () => {
    if (!gameState || gameState.score <= 0 || claiming) return;
    setClaiming(true);
    setClaimResult(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const uid = params.get("uid") || "";
      const ts = params.get("ts") || String(Date.now());
      const sig = params.get("sig") || "";

      const gameType = tab === "pvp" ? "arena_combat" : "hub_crystals";
      const stats: Record<string, number> = {};
      if (gameType === "hub_crystals") {
        stats.crystals_sc = Math.floor(
          (gameState.crystalsCollected || 0) * 0.6
        );
        stats.crystals_hc = Math.floor(
          (gameState.crystalsCollected || 0) * 0.3
        );
        stats.crystals_rc = Math.floor(
          (gameState.crystalsCollected || 0) * 0.1
        );
      } else {
        stats.kills = gameState.kills || 0;
        stats.streak = gameState.streak || 0;
      }

      const resp = await fetch("/webapp/api/game/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          ts,
          sig,
          game_type: gameType,
          score: gameState.score,
          stats,
          claim_id: `${gameType}_${uid}_${Date.now()}`,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setClaimResult({ reward: data.data.reward });
        if (sceneRef.current?.metadata) {
          sceneRef.current.metadata.gameState = { score: 0 };
        }
        setGameState({ score: 0 });
      }
    } catch (err) {
      console.error("[NexusScene] Claim failed:", err);
    } finally {
      setClaiming(false);
    }
  }, [gameState, claiming, tab]);

  // ── Engine init (once per component mount) ──
  useEffect(() => {
    if (!canvasRef.current) return;

    let cancelled = false;

    async function initEngine() {
      try {
        if (!_babylonModule) {
          _babylonModule = await import("@babylonjs/core");
        }
        if (cancelled) return;

        const canvas = canvasRef.current!;

        // Reuse engine if canvas matches, else create new
        if (!_sharedEngine || _sharedCanvas !== canvas) {
          if (_sharedEngine) {
            try { _sharedEngine.stopRenderLoop(); } catch (_) {}
            try { _sharedEngine.dispose(); } catch (_) {}
          }
          _sharedEngine = new _babylonModule.Engine(canvas, true, {
            preserveDrawingBuffer: false,
            stencil: true,
            antialias: QUALITY !== "low",
            powerPreference: QUALITY === "high" ? "high-performance" : "default",
          });
          _sharedCanvas = canvas;

          const resizeHandler = () => {
            if (_sharedEngine) _sharedEngine.resize();
          };
          window.addEventListener("resize", resizeHandler);
        }
      } catch (err) {
        console.error("[NexusScene] Engine init failed:", err);
      }
    }

    initEngine();

    return () => {
      cancelled = true;
    };
  }, []); // Only runs once on mount

  // ── Scene swap (runs on each tab change) ──
  useEffect(() => {
    if (!districtKey || !canvasRef.current) return;

    let disposed = false;

    async function loadScene() {
      try {
        // Ensure engine is ready
        if (!_babylonModule) {
          _babylonModule = await import("@babylonjs/core");
        }
        if (disposed) return;

        const canvas = canvasRef.current!;

        // Ensure engine exists
        if (!_sharedEngine || _sharedCanvas !== canvas) {
          _sharedEngine = new _babylonModule.Engine(canvas, true, {
            preserveDrawingBuffer: false,
            stencil: true,
            antialias: QUALITY !== "low",
            powerPreference: QUALITY === "high" ? "high-performance" : "default",
          });
          _sharedCanvas = canvas;
          window.addEventListener("resize", () => _sharedEngine?.resize());
        }

        // Stop any existing render loop
        _sharedEngine.stopRenderLoop();

        // Dispose previous scene (NOT the engine)
        if (sceneRef.current) {
          try { sceneRef.current.dispose(); } catch (_) {}
          sceneRef.current = null;
        }

        if (disposed) return;

        // Load the new district scene module
        const loader = SCENE_LOADERS[districtKey];
        if (!loader) throw new Error(`No scene for district: ${districtKey}`);

        const sceneModule = await loader();
        if (disposed) return;

        const scene = sceneModule.createScene(_sharedEngine, canvas, QUALITY);
        if (disposed) {
          scene.dispose();
          return;
        }
        sceneRef.current = scene;

        // Game state polling
        let lastScore = -1;
        scene.registerAfterRender(() => {
          if (disposed) return;
          const gs = scene.metadata?.gameState as GameState | undefined;
          if (gs && gs.score !== lastScore) {
            lastScore = gs.score;
            setGameState({ ...gs });
          }
        });

        // Start render loop for new scene
        const renderFn = () => scene.render();
        renderLoopRef.current = renderFn;
        _sharedEngine.runRenderLoop(renderFn);

        setLoading(false);
        setError(null);
      } catch (err) {
        console.error("[NexusScene] Scene load failed:", err);
        if (!disposed) {
          setError(String(err));
          setLoading(false);
        }
      }
    }

    setLoading(true);
    setError(null);
    setGameState(null);
    setClaimResult(null);
    loadScene();

    return () => {
      disposed = true;
      // Stop render loop but keep the engine alive
      if (_sharedEngine) {
        _sharedEngine.stopRenderLoop();
      }
      if (sceneRef.current) {
        try { sceneRef.current.dispose(); } catch (_) {}
        sceneRef.current = null;
      }
    };
  }, [districtKey]);

  // ── Cleanup engine only on full unmount ──
  useEffect(() => {
    return () => {
      if (_sharedEngine) {
        _sharedEngine.stopRenderLoop();
        _sharedEngine.dispose();
        _sharedEngine = null;
        _sharedCanvas = null;
      }
    };
  }, []);

  // Don't render for tabs without districts (vault, settings)
  if (!districtKey) return null;

  const containerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: 280,
    borderRadius: 12,
    overflow: "hidden",
    background: "#0a0a1a",
    marginBottom: 12,
  };

  const canvasStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "block",
    outline: "none",
    touchAction: "none",
  };

  return (
    <div style={containerStyle} className="akrNexusScene">
      <canvas
        ref={canvasRef}
        style={canvasStyle}
      />

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10, 10, 26, 0.9)",
            color: "#555",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 12,
          }}
        >
          {lang === "tr" ? "3D sahne yükleniyor..." : "Loading 3D scene..."}
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10, 10, 26, 0.9)",
            color: "#f44",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            padding: 16,
            textAlign: "center",
          }}
        >
          {lang === "tr" ? "Sahne yüklenemedi" : "Scene failed to load"}
        </div>
      )}

      {/* Game HUD */}
      {!loading && gameState && gameState.score > 0 && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
            pointerEvents: "none",
          }}
        >
          {/* Score */}
          <div
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(0,180,255,0.3)",
              borderRadius: 8,
              padding: "4px 10px",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 14,
              fontWeight: 700,
              color: "#00d2ff",
            }}
          >
            {gameState.score}
          </div>

          {/* Combo/Streak */}
          {((gameState.combo || 0) > 1 || (gameState.streak || 0) > 1) && (
            <div
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,200,0,0.4)",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 700,
                color: "#ffc800",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              x{gameState.combo || gameState.streak}
            </div>
          )}

          {/* Kills (arena) */}
          {tab === "pvp" && (gameState.kills || 0) > 0 && (
            <div
              style={{
                fontSize: 10,
                color: "#ff4444",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {gameState.kills} {lang === "tr" ? "öldürme" : "kills"}
            </div>
          )}

          {/* Crystal counter */}
          {(gameState.crystalsCollected || 0) > 0 && (
            <div
              style={{
                fontSize: 10,
                color: "#00ff88",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {gameState.crystalsCollected}/{gameState.totalCrystals}
            </div>
          )}

          {/* Points flash */}
          {gameState.lastPoints && gameState.lastPoints > 0 && (
            <div
              key={gameState.score}
              style={{
                fontSize: 14,
                fontWeight: 700,
                color:
                  gameState.lastType === "rc"
                    ? "#e040fb"
                    : gameState.lastType === "hc"
                      ? "#00d2ff"
                      : "#00ff88",
                animation: "nexusFadeUp 0.8s ease-out forwards",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              +{gameState.lastPoints}
            </div>
          )}

          {/* Claim button */}
          {gameState.score >= 10 && (
            <button
              onClick={claimRewards}
              disabled={claiming}
              style={{
                marginTop: 4,
                padding: "6px 14px",
                background: claiming
                  ? "rgba(100,100,100,0.6)"
                  : "linear-gradient(135deg, #00d6ff 0%, #00ff88 100%)",
                border: "none",
                borderRadius: 8,
                color: "#0a0a1a",
                fontWeight: 700,
                fontSize: 11,
                fontFamily: "var(--font-mono, monospace)",
                cursor: claiming ? "wait" : "pointer",
                textTransform: "uppercase",
                letterSpacing: 1,
                pointerEvents: "auto",
              }}
            >
              {claiming
                ? lang === "tr"
                  ? "Talep ediliyor..."
                  : "Claiming..."
                : lang === "tr"
                  ? "Ödül Al"
                  : "Claim"}
            </button>
          )}

          {/* Claim result */}
          {claimResult && (
            <div
              style={{
                background: "rgba(0,0,0,0.7)",
                border: "1px solid rgba(0,255,136,0.5)",
                borderRadius: 8,
                padding: "4px 10px",
                textAlign: "right",
                animation: "nexusFadeUp 2s ease-out forwards",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(0,255,136,0.8)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {lang === "tr" ? "Alındı!" : "Claimed!"}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#fff",
                  marginTop: 2,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {claimResult.reward.sc > 0 && (
                  <span style={{ color: "#00ff88" }}>
                    +{claimResult.reward.sc} SC{" "}
                  </span>
                )}
                {claimResult.reward.hc > 0 && (
                  <span style={{ color: "#00d2ff" }}>
                    +{claimResult.reward.hc} HC{" "}
                  </span>
                )}
                {claimResult.reward.rc > 0 && (
                  <span style={{ color: "#e040fb" }}>
                    +{claimResult.reward.rc} RC
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tap hint */}
      {!loading && !error && (!gameState || gameState.score === 0) && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.5)",
            borderRadius: 6,
            padding: "4px 12px",
            color: "rgba(255,255,255,0.4)",
            fontSize: 10,
            fontFamily: "var(--font-mono, monospace)",
            pointerEvents: "none",
          }}
        >
          {lang === "tr"
            ? "Parlayan nesnelere dokun ve puan topla"
            : "Tap glowing objects to collect points"}
        </div>
      )}
    </div>
  );
}
