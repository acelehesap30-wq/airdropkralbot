'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';
import dynamic from 'next/dynamic';

const BabylonSceneHost = dynamic(
  () => import('@/components/scene/BabylonSceneHost').catch(() => ({ default: () => null })),
  { ssr: false }
);

/* ═══════════════════════════════════════
   PvP Arena — Full Game Mechanics
   API integration with simulation fallback
   ELO sparkline, match history, boss fight
   ═══════════════════════════════════════ */

type GameMode = 'safe' | 'balanced' | 'aggressive';
type GamePhase = 'idle' | 'searching' | 'fighting' | 'result';
type FightResult = 'victory' | 'defeat' | 'draw';

interface PvPState {
  phase: GamePhase;
  mode: GameMode;
  opponent: { name: string; tier: number; elo: number; avatar: string } | null;
  playerHP: number;
  opponentHP: number;
  round: number;
  maxRounds: number;
  log: string[];
  result: FightResult | null;
  rewards: { sc: number; hc: number; elo_delta: number; season_pts: number } | null;
  combo: number;
  lastCrit: 'player' | 'opponent' | null;
  shaking: boolean;
}

interface MatchHistoryEntry {
  opponent: string;
  result: FightResult;
  elo_delta: number;
  mode: GameMode;
  date: string;
}

const OPPONENTS = [
  { name: 'ShadowBlade', tier: 3, elo: 1250, avatar: '🥷' },
  { name: 'CryptoKnight', tier: 4, elo: 1400, avatar: '⚔️' },
  { name: 'NeonPhantom', tier: 5, elo: 1600, avatar: '👻' },
  { name: 'IronWarden', tier: 2, elo: 1100, avatar: '🛡️' },
  { name: 'VoltStrike', tier: 6, elo: 1800, avatar: '⚡' },
  { name: 'FrostBite', tier: 3, elo: 1300, avatar: '🧊' },
];

const MODE_CONFIG: Record<GameMode, { label_tr: string; label_en: string; dmg_mult: number; def_mult: number; crit_chance: number; color: string; icon: string; desc_tr: string; desc_en: string }> = {
  safe:       { label_tr: 'Temkinli', label_en: 'Safe', dmg_mult: 0.8, def_mult: 1.3, crit_chance: 0.05, color: '#00ff88', icon: '🟢', desc_tr: 'Yüksek savunma, düşük hasar', desc_en: 'High defense, low damage' },
  balanced:   { label_tr: 'Dengeli', label_en: 'Balanced', dmg_mult: 1.0, def_mult: 1.0, crit_chance: 0.15, color: '#ffd700', icon: '🟡', desc_tr: 'Dengeli saldırı ve savunma', desc_en: 'Balanced attack and defense' },
  aggressive: { label_tr: 'Saldırgan', label_en: 'Aggressive', dmg_mult: 1.4, def_mult: 0.7, crit_chance: 0.30, color: '#ff4444', icon: '🔴', desc_tr: 'Yüksek hasar, yüksek risk', desc_en: 'High damage, high risk' },
};

function rollDamage(base: number, mult: number, critChance: number) {
  const isCrit = Math.random() < critChance;
  const variance = 0.8 + Math.random() * 0.4;
  const dmg = Math.round(base * mult * variance * (isCrit ? 2 : 1));
  return { dmg, isCrit };
}

function getHPColor(hp: number): string {
  if (hp > 60) return '#00ff88';
  if (hp > 30) return '#ffaa00';
  return '#ff4444';
}

function getHPClass(hp: number): string {
  if (hp > 60) return 'healthy';
  if (hp > 30) return 'warning';
  return 'critical';
}

/** ELO sparkline SVG */
function EloSparkline({ data, width = 120, height = 32 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
  const trend = data[data.length - 1] >= data[data.length - 2];
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={trend ? '#00ff88' : '#ff4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={trend ? '#00ff88' : '#ff4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#eloGrad)"
      />
      <polyline
        points={points}
        fill="none"
        stroke={trend ? '#00ff88' : '#ff4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={width} cy={lastY} r="2.5" fill={trend ? '#00ff88' : '#ff4444'} />
    </svg>
  );
}

/** Confetti burst for victory */
function ConfettiOverlay() {
  const pieces = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: ['#ff4444', '#00ff88', '#ffd700', '#00d4ff', '#e040fb', '#ff8800'][Math.floor(Math.random() * 6)],
      delay: Math.random() * 1.5,
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
    }))
  ).current;

  return (
    <>
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </>
  );
}

export default function ArenaPage() {
  const { locale } = useTelegram();
  const { kingdomTier, balances, session } = useAppStore();
  const isTr = locale === 'tr';

  const [state, setState] = useState<PvPState>({
    phase: 'idle',
    mode: 'balanced',
    opponent: null,
    playerHP: 100,
    opponentHP: 100,
    round: 0,
    maxRounds: 5,
    log: [],
    result: null,
    rewards: null,
    combo: 0,
    lastCrit: null,
    shaking: false,
  });

  const [playerElo, setPlayerElo] = useState(1200 + kingdomTier * 80);
  const [eloHistory, setEloHistory] = useState<number[]>(() => {
    const base = 1200 + kingdomTier * 80;
    return Array.from({ length: 15 }, (_, i) => base - 50 + Math.round(Math.random() * 100) + i * 3);
  });
  const [stats, setStats] = useState({ wins: 14, losses: 6, winRate: 70, streak: 3 });
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([
    { opponent: 'ShadowBlade', result: 'victory', elo_delta: 18, mode: 'balanced', date: '2m ago' },
    { opponent: 'NeonPhantom', result: 'defeat', elo_delta: -12, mode: 'aggressive', date: '8m ago' },
    { opponent: 'IronWarden', result: 'victory', elo_delta: 22, mode: 'safe', date: '15m ago' },
    { opponent: 'CryptoKnight', result: 'victory', elo_delta: 15, mode: 'balanced', date: '1h ago' },
    { opponent: 'FrostBite', result: 'draw', elo_delta: 0, mode: 'aggressive', date: '2h ago' },
  ]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showDefeatOverlay, setShowDefeatOverlay] = useState(false);
  const [showBossSection, setShowBossSection] = useState(true);
  const [bossHP, setBossHP] = useState(72);
  const [bossMaxHP] = useState(100);
  const [communityDamage] = useState(28340);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll combat log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.log]);

  // Try API match initiation, fallback to simulation
  const startMatch = useCallback(async (mode: GameMode) => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    } catch {}

    setState(prev => ({
      ...prev,
      phase: 'searching',
      mode,
      opponent: null,
      playerHP: 100,
      opponentHP: 100,
      round: 0,
      log: [],
      result: null,
      rewards: null,
      lastCrit: null,
      shaking: false,
    }));

    // Try server API first
    try {
      const res = await fetch('/webapp/api/v2/pvp/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, elo: playerElo }),
      });
      if (res.ok) {
        const data = await res.json();
        setApiAvailable(true);
        setState(prev => ({
          ...prev,
          phase: 'fighting',
          opponent: data.opponent ?? OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)],
        }));
        return;
      }
    } catch {
      setApiAvailable(false);
    }

    // Fallback: local simulation
    const opp = OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)];
    setTimeout(() => {
      setState(prev => ({ ...prev, phase: 'fighting', opponent: opp }));
    }, 1500);
  }, [playerElo]);

  // Fight loop
  useEffect(() => {
    if (state.phase !== 'fighting') return;
    if (state.playerHP <= 0 || state.opponentHP <= 0 || state.round >= state.maxRounds) {
      const result: FightResult = state.playerHP > state.opponentHP ? 'victory' : state.playerHP < state.opponentHP ? 'defeat' : 'draw';
      const eloDelta = result === 'victory' ? Math.round(15 + Math.random() * 10) : result === 'defeat' ? -Math.round(10 + Math.random() * 8) : 0;
      const sc = result === 'victory' ? Math.round(80 + Math.random() * 120) : Math.round(20 + Math.random() * 30);
      const hc = result === 'victory' && Math.random() > 0.6 ? Math.round(1 + Math.random() * 3) : 0;

      // Try server for result
      (async () => {
        try {
          await fetch('/webapp/api/v2/pvp/result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ result, elo_delta: eloDelta }),
          });
        } catch {}
      })();

      const newCombo = result === 'victory' ? state.combo + 1 : 0;
      const rewards = { sc, hc, elo_delta: eloDelta, season_pts: result === 'victory' ? 25 : 5 };

      setState(prev => ({
        ...prev,
        phase: 'result',
        result,
        rewards,
        combo: newCombo,
      }));

      // Update ELO
      setPlayerElo(e => e + eloDelta);
      setEloHistory(prev => [...prev.slice(-14), playerElo + eloDelta]);

      // Update stats
      setStats(prev => {
        const newWins = prev.wins + (result === 'victory' ? 1 : 0);
        const newLosses = prev.losses + (result === 'defeat' ? 1 : 0);
        return {
          wins: newWins,
          losses: newLosses,
          winRate: Math.round((newWins / (newWins + newLosses)) * 100),
          streak: result === 'victory' ? prev.streak + 1 : 0,
        };
      });

      // Update match history
      setMatchHistory(prev => [{
        opponent: state.opponent?.name ?? 'Unknown',
        result,
        elo_delta: eloDelta,
        mode: state.mode,
        date: 'just now',
      }, ...prev].slice(0, 5));

      // Victory/defeat effects
      if (result === 'victory') {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch {}
      } else if (result === 'defeat') {
        setShowDefeatOverlay(true);
        setTimeout(() => setShowDefeatOverlay(false), 2000);
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch {}
      }

      return;
    }

    const timer = setTimeout(async () => {
      const cfg = MODE_CONFIG[state.mode];

      // Try server round
      let playerAtk: { dmg: number; isCrit: boolean };
      let oppAtk: { dmg: number; isCrit: boolean };
      let playerDef: number;
      let oppDef: number;

      try {
        const res = await fetch('/webapp/api/v2/pvp/round', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ round: state.round + 1, mode: state.mode }),
        });
        if (res.ok) {
          const data = await res.json();
          playerAtk = { dmg: data.player_dmg, isCrit: data.player_crit };
          oppAtk = { dmg: data.opp_dmg, isCrit: data.opp_crit };
          playerDef = data.opp_dmg;
          oppDef = data.player_dmg;
        } else {
          throw new Error('API failed');
        }
      } catch {
        // Fallback: local simulation
        playerAtk = rollDamage(18 + kingdomTier * 2, cfg.dmg_mult, cfg.crit_chance);
        oppAtk = rollDamage(16 + (state.opponent?.tier ?? 3) * 2, 1.0, 0.12);
        playerDef = Math.round(oppAtk.dmg * (1 - (cfg.def_mult - 1) * 0.5));
        oppDef = playerAtk.dmg;
      }

      const newLog = [...state.log];
      newLog.push(`R${state.round + 1}: ${isTr ? 'Sen' : 'You'} → ${oppDef}${playerAtk.isCrit ? ' CRIT!' : ''} | ${state.opponent?.name} → ${playerDef}${oppAtk.isCrit ? ' CRIT!' : ''}`);

      // Crit screen shake
      const hasCrit = playerAtk.isCrit || oppAtk.isCrit;
      if (hasCrit) {
        setState(prev => ({ ...prev, shaking: true, lastCrit: playerAtk.isCrit ? 'player' : 'opponent' }));
        setTimeout(() => setState(prev => ({ ...prev, shaking: false })), 300);
        try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy'); } catch {}
      } else {
        try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch {}
      }

      setState(prev => ({
        ...prev,
        round: prev.round + 1,
        playerHP: Math.max(0, prev.playerHP - playerDef),
        opponentHP: Math.max(0, prev.opponentHP - oppDef),
        log: newLog,
        lastCrit: hasCrit ? (playerAtk.isCrit ? 'player' : 'opponent') : null,
      }));
    }, 800);

    return () => clearTimeout(timer);
  }, [state.phase, state.round, state.playerHP, state.opponentHP, state.mode, state.opponent, state.maxRounds, state.log, kingdomTier, isTr, playerElo, state.combo]);

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Confetti overlay */}
      {showConfetti && <ConfettiOverlay />}

      {/* Defeat red overlay */}
      {showDefeatOverlay && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(255, 0, 0, 0.15)',
          zIndex: 9997, pointerEvents: 'none',
          animation: 'fade-in 0.3s ease-out',
        }} />
      )}

      {/* BabylonJS Scene */}
      <div style={{ height: 0, overflow: 'hidden' }}>
        <BabylonSceneHost districtKey="arena" />
      </div>

      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">⚔️ {isTr ? 'PvP Arena' : 'PvP Arena'}</h1>
        <p className="hero-desc">
          {isTr ? 'ELO tabanlı eşleşme, mod seçimi, combo zinciri ve ladder ilerlemesi.' : 'ELO-based matching, mode selection, combo chains and ladder progression.'}
        </p>
        {apiAvailable === false && (
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>
            ⚠ {isTr ? 'Simülasyon modu aktif' : 'Simulation mode active'}
          </div>
        )}
      </div>

      {/* Player Stats Bar + ELO Sparkline */}
      <div className="glass-card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ELO Rating</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{playerElo}</div>
            <div style={{ marginTop: 4 }}>
              <EloSparkline data={eloHistory} width={100} height={24} />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{isTr ? 'Galibiyet' : 'Win Rate'}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-success)' }}>{stats.winRate}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>W/L</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{stats.wins}/{stats.losses}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Combo</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-premium)' }}>🔥 {state.combo || stats.streak}</div>
          </div>
        </div>
      </div>

      {/* IDLE — Mode Selection */}
      {state.phase === 'idle' && (
        <div>
          <div className="section-header">
            <span className="section-title">🎯 {isTr ? 'Mod Seç ve Savaş' : 'Choose Mode & Fight'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(Object.entries(MODE_CONFIG) as [GameMode, typeof MODE_CONFIG['safe']][]).map(([key, cfg]) => (
              <button
                key={key}
                className="glass-card"
                onClick={() => startMatch(key)}
                style={{ padding: 14, cursor: 'pointer', border: `1px solid ${cfg.color}33`, textAlign: 'left', background: 'var(--color-surface)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: cfg.color }}>
                      {cfg.icon} {isTr ? cfg.label_tr : cfg.label_en}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {isTr ? cfg.desc_tr : cfg.desc_en}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      DMG x{cfg.dmg_mult} | DEF x{cfg.def_mult} | CRIT {Math.round(cfg.crit_chance * 100)}%
                    </div>
                  </div>
                  <span style={{ fontSize: 20, color: cfg.color, opacity: 0.7 }}>▶</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SEARCHING */}
      {state.phase === 'searching' && (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            <span className="neon-spinner" style={{ display: 'inline-block', width: 48, height: 48, borderWidth: 3 }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, animation: 'neon-pulse 1.5s infinite' }}>
            {isTr ? 'Rakip aranıyor...' : 'Searching for opponent...'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            ELO ±200 | Mode: {MODE_CONFIG[state.mode].icon} {isTr ? MODE_CONFIG[state.mode].label_tr : MODE_CONFIG[state.mode].label_en}
          </div>
          <div className="neon-progress" style={{ height: 3, marginTop: 12 }}>
            <div className="neon-progress-bar" style={{ width: '65%', animation: 'shimmer 1s infinite' }} />
          </div>
        </div>
      )}

      {/* FIGHTING */}
      {(state.phase === 'fighting' || state.phase === 'result') && state.opponent && (
        <>
          {/* HP Bars */}
          <div className={`glass-card ${state.shaking ? 'screen-shake' : ''}`} style={{ padding: 16 }}>
            {/* Player HP */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>👤 {isTr ? 'Sen' : 'You'} (T{kingdomTier})</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                color: getHPColor(state.playerHP),
                textShadow: state.playerHP <= 20 ? '0 0 8px #ff4444' : 'none',
              }}>
                {state.playerHP}/100 HP
              </span>
            </div>
            <div className="neon-progress" style={{ height: 12, marginBottom: 14 }}>
              <div
                className={`hp-bar-fill ${getHPClass(state.playerHP)}`}
                style={{
                  width: `${state.playerHP}%`,
                  height: '100%',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: `0 0 8px ${getHPColor(state.playerHP)}66`,
                }}
              />
            </div>

            {/* VS divider */}
            <div style={{
              textAlign: 'center', fontSize: 18, fontWeight: 800,
              color: 'var(--color-text-muted)', margin: '4px 0',
              letterSpacing: 4,
            }}>
              ⚔️ VS ⚔️
            </div>

            {/* Opponent HP */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{state.opponent.avatar} {state.opponent.name} (T{state.opponent.tier})</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                color: getHPColor(state.opponentHP),
              }}>
                {state.opponentHP}/100 HP
              </span>
            </div>
            <div className="neon-progress" style={{ height: 12 }}>
              <div
                className={`hp-bar-fill ${getHPClass(state.opponentHP)}`}
                style={{
                  width: `${state.opponentHP}%`,
                  height: '100%',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: `0 0 8px ${getHPColor(state.opponentHP)}66`,
                }}
              />
            </div>

            {/* Round & Mode indicator */}
            <div style={{ textAlign: 'center', marginTop: 10, display: 'flex', justifyContent: 'center', gap: 6 }}>
              <span className="neon-badge accent">R{state.round}/{state.maxRounds}</span>
              <span className="neon-badge" style={{ background: `${MODE_CONFIG[state.mode].color}15`, color: MODE_CONFIG[state.mode].color, border: `1px solid ${MODE_CONFIG[state.mode].color}33` }}>
                {MODE_CONFIG[state.mode].icon} {isTr ? MODE_CONFIG[state.mode].label_tr : MODE_CONFIG[state.mode].label_en}
              </span>
              {state.lastCrit && (
                <span className="neon-badge danger" style={{ animation: 'pulse-glow 0.5s ease-out' }}>
                  💥 CRIT!
                </span>
              )}
            </div>
          </div>

          {/* Combat Log */}
          <div className="glass-card" style={{ padding: 12, maxHeight: 180, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>Combat Log</div>
            {state.log.map((line, i) => {
              const hasCrit = line.includes('CRIT');
              return (
                <div key={i} style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: hasCrit ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                  fontWeight: hasCrit ? 700 : 400,
                  padding: '3px 0',
                  borderBottom: '1px solid rgba(42,42,62,0.1)',
                  animation: i === state.log.length - 1 ? 'slide-up 0.3s ease-out' : 'none',
                }}>
                  ⚔️ {line}
                </div>
              );
            })}
            {state.phase === 'fighting' && (
              <div style={{ fontSize: 11, color: 'var(--color-accent)', marginTop: 4 }}>
                <span className="breathe" style={{ display: 'inline-block' }}>⏳</span> {isTr ? 'Savaş devam ediyor...' : 'Battle in progress...'}
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </>
      )}

      {/* RESULT */}
      {state.phase === 'result' && state.rewards && (
        <div className={`glass-card ${state.result === 'victory' ? 'reward-reveal' : ''}`} style={{
          padding: 24,
          textAlign: 'center',
          borderColor: state.result === 'victory' ? 'rgba(0,255,136,0.4)' : state.result === 'defeat' ? 'rgba(255,68,68,0.4)' : 'rgba(255,215,0,0.3)',
          boxShadow: state.result === 'victory' ? '0 0 30px rgba(0,255,136,0.15)' : state.result === 'defeat' ? '0 0 30px rgba(255,68,68,0.15)' : 'none',
          background: state.result === 'victory'
            ? 'linear-gradient(135deg, rgba(0,255,136,0.06), rgba(0,212,255,0.03))'
            : state.result === 'defeat'
            ? 'linear-gradient(135deg, rgba(255,68,68,0.06), rgba(255,0,0,0.03))'
            : 'var(--color-surface-glass)',
        }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>
            {state.result === 'victory' ? '🏆' : state.result === 'defeat' ? '💀' : '🤝'}
          </div>
          <div style={{
            fontSize: 24, fontWeight: 800, letterSpacing: 2,
            color: state.result === 'victory' ? 'var(--color-success)' : state.result === 'defeat' ? 'var(--color-danger)' : 'var(--color-premium)',
            textShadow: `0 0 20px ${state.result === 'victory' ? 'rgba(0,255,136,0.5)' : state.result === 'defeat' ? 'rgba(255,68,68,0.5)' : 'rgba(255,215,0,0.5)'}`,
          }}>
            {state.result === 'victory' ? (isTr ? 'ZAFER!' : 'VICTORY!') : state.result === 'defeat' ? (isTr ? 'YENİLGİ' : 'DEFEAT') : (isTr ? 'BERABERE' : 'DRAW')}
          </div>
          {state.combo > 1 && state.result === 'victory' && (
            <div style={{ fontSize: 13, color: 'var(--color-premium)', marginTop: 4, fontWeight: 700 }}>
              🔥 {state.combo}x Combo Streak!
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
            <div className="count-up">
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>SC</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-sc)' }}>+{state.rewards.sc}</div>
            </div>
            <div className="count-up" style={{ animationDelay: '0.1s' }}>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>HC</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-hc)' }}>+{state.rewards.hc}</div>
            </div>
            <div className="count-up" style={{ animationDelay: '0.2s' }}>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>ELO</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: state.rewards.elo_delta > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {state.rewards.elo_delta > 0 ? '+' : ''}{state.rewards.elo_delta}
              </div>
            </div>
            <div className="count-up" style={{ animationDelay: '0.3s' }}>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Season</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent)' }}>+{state.rewards.season_pts}</div>
            </div>
          </div>

          <button className="neon-btn" onClick={() => setState(prev => ({ ...prev, phase: 'idle' }))} style={{ marginTop: 18, width: '100%', padding: '12px 20px' }}>
            ⚔️ {isTr ? 'Tekrar Savaş' : 'Fight Again'}
          </button>
        </div>
      )}

      {/* Match History */}
      {state.phase === 'idle' && matchHistory.length > 0 && (
        <div>
          <div className="section-header">
            <span className="section-title">📜 {isTr ? 'Son Maçlar' : 'Recent Matches'}</span>
            <span className="neon-badge accent" style={{ fontSize: 9 }}>{matchHistory.length}</span>
          </div>
          <div className="glass-card" style={{ padding: '0 12px' }}>
            {matchHistory.map((m, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < matchHistory.length - 1 ? '1px solid rgba(42,42,62,0.2)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: m.result === 'victory' ? '#00ff88' : m.result === 'defeat' ? '#ff4444' : '#ffd700',
                    boxShadow: `0 0 6px ${m.result === 'victory' ? '#00ff8866' : m.result === 'defeat' ? '#ff444466' : '#ffd70066'}`,
                  }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{m.opponent}</div>
                    <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
                      {MODE_CONFIG[m.mode].icon} {m.date}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                  color: m.elo_delta > 0 ? 'var(--color-success)' : m.elo_delta < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)',
                }}>
                  {m.elo_delta > 0 ? '+' : ''}{m.elo_delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily PvP Progress */}
      <div className="glass-card" style={{ padding: 14 }}>
        <div className="section-title" style={{ marginBottom: 8 }}>📊 {isTr ? 'Günlük PvP' : 'Daily PvP'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{isTr ? 'Günlük' : 'Daily'}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>3/5 {isTr ? 'maç' : 'fights'}</div>
            <div className="neon-progress" style={{ height: 4, marginTop: 4 }}>
              <div className="neon-progress-bar" style={{ width: '60%' }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{isTr ? 'Haftalık' : 'Weekly'}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>12/25 pts</div>
            <div className="neon-progress" style={{ height: 4, marginTop: 4 }}>
              <div className="neon-progress-bar" style={{ width: '48%', background: 'linear-gradient(90deg, #ffd700, #ff8800)' }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Arc Boss</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>W2/5</div>
            <div className="neon-progress" style={{ height: 4, marginTop: 4 }}>
              <div className="neon-progress-bar" style={{ width: '40%', background: 'linear-gradient(90deg, #e040fb, #ff4444)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Season Arc Boss Section */}
      {showBossSection && (
        <div className="glass-card" style={{
          padding: 16,
          borderColor: 'rgba(224,64,251,0.3)',
          background: 'linear-gradient(135deg, rgba(224,64,251,0.06), rgba(255,68,68,0.03))',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e040fb' }}>
                👹 {isTr ? 'Sezon Arc Boss' : 'Season Arc Boss'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                {isTr ? 'Topluluk boss savaşı — birlikte yenin!' : 'Community boss fight — defeat it together!'}
              </div>
            </div>
            <span className="neon-badge" style={{ background: 'rgba(224,64,251,0.15)', color: '#e040fb', border: '1px solid rgba(224,64,251,0.3)', fontSize: 9 }}>
              WEEK 2
            </span>
          </div>

          {/* Boss name & HP */}
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>🐉</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#ff4444', textShadow: '0 0 12px rgba(255,68,68,0.4)' }}>
              NEXUS DEVOURER
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Boss HP</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#ff4444', fontWeight: 700 }}>
              {bossHP}%
            </span>
          </div>
          <div className="neon-progress" style={{ height: 10, marginBottom: 10 }}>
            <div style={{
              width: `${bossHP}%`, height: '100%', borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(90deg, #ff4444, #e040fb)',
              boxShadow: '0 0 12px rgba(255,68,68,0.5)',
              transition: 'width 0.5s ease',
            }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{isTr ? 'Topluluk Hasar' : 'Community DMG'}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e040fb', fontFamily: 'var(--font-mono)' }}>{communityDamage.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{isTr ? 'Senin Hasarın' : 'Your DMG'}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>842</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{isTr ? 'Katılımcı' : 'Participants'}</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>1,247</div>
            </div>
          </div>

          <button
            className="neon-btn"
            onClick={() => {
              try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch {}
              setBossHP(prev => Math.max(0, prev - (1 + Math.random() * 2)));
            }}
            style={{
              marginTop: 12, width: '100%',
              background: 'linear-gradient(135deg, rgba(224,64,251,0.2), rgba(255,68,68,0.1))',
              borderColor: '#e040fb', color: '#e040fb',
            }}
          >
            ⚔️ {isTr ? 'Boss\'a Saldır' : 'Attack Boss'}
          </button>
        </div>
      )}
    </div>
  );
}
