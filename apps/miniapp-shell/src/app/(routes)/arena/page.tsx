'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';

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
}

const OPPONENTS = [
  { name: 'ShadowBlade', tier: 3, elo: 1250, avatar: '🥷' },
  { name: 'CryptoKnight', tier: 4, elo: 1400, avatar: '⚔️' },
  { name: 'NeonPhantom', tier: 5, elo: 1600, avatar: '👻' },
  { name: 'IronWarden', tier: 2, elo: 1100, avatar: '🛡️' },
  { name: 'VoltStrike', tier: 6, elo: 1800, avatar: '⚡' },
  { name: 'FrostBite', tier: 3, elo: 1300, avatar: '🧊' },
];

const MODE_CONFIG: Record<GameMode, { label_tr: string; label_en: string; dmg_mult: number; def_mult: number; crit_chance: number; color: string; icon: string }> = {
  safe:       { label_tr: 'Temkinli', label_en: 'Safe', dmg_mult: 0.8, def_mult: 1.3, crit_chance: 0.05, color: '#00ff88', icon: '🟢' },
  balanced:   { label_tr: 'Dengeli', label_en: 'Balanced', dmg_mult: 1.0, def_mult: 1.0, crit_chance: 0.15, color: '#ffd700', icon: '🟡' },
  aggressive: { label_tr: 'Saldırgan', label_en: 'Aggressive', dmg_mult: 1.4, def_mult: 0.7, crit_chance: 0.30, color: '#ff4444', icon: '🔴' },
};

function rollDamage(base: number, mult: number, critChance: number) {
  const isCrit = Math.random() < critChance;
  const variance = 0.8 + Math.random() * 0.4;
  const dmg = Math.round(base * mult * variance * (isCrit ? 2 : 1));
  return { dmg, isCrit };
}

export default function ArenaPage() {
  const { locale } = useTelegram();
  const { kingdomTier, balances } = useAppStore();
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
  });

  const [playerElo] = useState(1200 + kingdomTier * 80);
  const [stats] = useState({ wins: 14, losses: 6, winRate: 70, streak: 3 });

  const startMatch = useCallback((mode: GameMode) => {
    const opp = OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)];
    setState(prev => ({
      ...prev,
      phase: 'searching',
      mode,
      opponent: opp,
      playerHP: 100,
      opponentHP: 100,
      round: 0,
      log: [],
      result: null,
      rewards: null,
    }));
    setTimeout(() => {
      setState(prev => ({ ...prev, phase: 'fighting' }));
    }, 1500);
  }, []);

  useEffect(() => {
    if (state.phase !== 'fighting') return;
    if (state.playerHP <= 0 || state.opponentHP <= 0 || state.round >= state.maxRounds) {
      const result: FightResult = state.playerHP > state.opponentHP ? 'victory' : state.playerHP < state.opponentHP ? 'defeat' : 'draw';
      const eloDelta = result === 'victory' ? Math.round(15 + Math.random() * 10) : result === 'defeat' ? -Math.round(10 + Math.random() * 8) : 0;
      const sc = result === 'victory' ? Math.round(80 + Math.random() * 120) : Math.round(20 + Math.random() * 30);
      const hc = result === 'victory' && Math.random() > 0.6 ? Math.round(1 + Math.random() * 3) : 0;
      setState(prev => ({
        ...prev,
        phase: 'result',
        result,
        rewards: { sc, hc, elo_delta: eloDelta, season_pts: result === 'victory' ? 25 : 5 },
        combo: result === 'victory' ? prev.combo + 1 : 0,
      }));
      return;
    }

    const timer = setTimeout(() => {
      const cfg = MODE_CONFIG[state.mode];
      const playerAtk = rollDamage(18 + kingdomTier * 2, cfg.dmg_mult, cfg.crit_chance);
      const oppAtk = rollDamage(16 + (state.opponent?.tier ?? 3) * 2, 1.0, 0.12);
      const playerDef = Math.round(oppAtk.dmg * (1 - (cfg.def_mult - 1) * 0.5));
      const oppDef = playerAtk.dmg;

      const newLog = [...state.log];
      newLog.push(`⚔️ R${state.round + 1}: ${isTr ? 'Sen' : 'You'} → ${oppDef}${playerAtk.isCrit ? ' 💥CRIT' : ''} | ${state.opponent?.name} → ${playerDef}${oppAtk.isCrit ? ' 💥CRIT' : ''}`);

      setState(prev => ({
        ...prev,
        round: prev.round + 1,
        playerHP: Math.max(0, prev.playerHP - playerDef),
        opponentHP: Math.max(0, prev.opponentHP - oppDef),
        log: newLog,
      }));
    }, 800);

    return () => clearTimeout(timer);
  }, [state.phase, state.round, state.playerHP, state.opponentHP, state.mode, state.opponent, state.maxRounds, state.log, kingdomTier, isTr]);

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">⚔️ {isTr ? 'PvP Arena' : 'PvP Arena'}</h1>
        <p className="hero-desc">
          {isTr ? 'ELO tabanlı eşleşme, mod seçimi, combo zinciri ve ladder ilerlemesi.' : 'ELO-based matching, mode selection, combo chains and ladder progression.'}
        </p>
      </div>

      {/* Player Stats Bar */}
      <div className="glass-card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ELO Rating</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{playerElo}</div>
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
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      DMG x{cfg.dmg_mult} | DEF x{cfg.def_mult} | CRIT {Math.round(cfg.crit_chance * 100)}%
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: cfg.color, fontFamily: 'var(--font-mono)' }}>▶</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SEARCHING */}
      {state.phase === 'searching' && (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'pulse-glow 1s infinite' }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {isTr ? 'Rakip aranıyor...' : 'Searching for opponent...'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            ELO ±200 | Mode: {MODE_CONFIG[state.mode].icon} {isTr ? MODE_CONFIG[state.mode].label_tr : MODE_CONFIG[state.mode].label_en}
          </div>
        </div>
      )}

      {/* FIGHTING */}
      {(state.phase === 'fighting' || state.phase === 'result') && state.opponent && (
        <>
          {/* HP Bars */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>👤 {isTr ? 'Sen' : 'You'} (T{kingdomTier})</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: state.playerHP > 30 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {state.playerHP}/100 HP
              </span>
            </div>
            <div className="neon-progress" style={{ height: 10, marginBottom: 14 }}>
              <div className="neon-progress-bar" style={{ width: `${state.playerHP}%`, background: state.playerHP > 30 ? 'var(--color-success)' : 'var(--color-danger)', transition: 'width 0.4s' }} />
            </div>

            <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: 'var(--color-text-muted)', margin: '4px 0' }}>⚔️ VS ⚔️</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{state.opponent.avatar} {state.opponent.name} (T{state.opponent.tier})</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: state.opponentHP > 30 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {state.opponentHP}/100 HP
              </span>
            </div>
            <div className="neon-progress" style={{ height: 10 }}>
              <div className="neon-progress-bar" style={{ width: `${state.opponentHP}%`, background: 'var(--color-danger)', transition: 'width 0.4s' }} />
            </div>

            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <span className="neon-badge accent">R{state.round}/{state.maxRounds}</span>
              <span className="neon-badge" style={{ marginLeft: 6, background: `${MODE_CONFIG[state.mode].color}15`, color: MODE_CONFIG[state.mode].color, border: `1px solid ${MODE_CONFIG[state.mode].color}33` }}>
                {MODE_CONFIG[state.mode].icon} {isTr ? MODE_CONFIG[state.mode].label_tr : MODE_CONFIG[state.mode].label_en}
              </span>
            </div>
          </div>

          {/* Combat Log */}
          <div className="glass-card" style={{ padding: 12, maxHeight: 160, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Combat Log</div>
            {state.log.map((line, i) => (
              <div key={i} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', padding: '2px 0', borderBottom: '1px solid rgba(42,42,62,0.1)' }}>
                {line}
              </div>
            ))}
            {state.phase === 'fighting' && (
              <div style={{ fontSize: 11, color: 'var(--color-accent)', animation: 'pulse-glow 1s infinite', marginTop: 4 }}>
                ⏳ {isTr ? 'Savaş devam ediyor...' : 'Battle in progress...'}
              </div>
            )}
          </div>
        </>
      )}

      {/* RESULT */}
      {state.phase === 'result' && state.rewards && (
        <div className="glass-card" style={{
          padding: 20,
          textAlign: 'center',
          borderColor: state.result === 'victory' ? 'rgba(0,255,136,0.3)' : state.result === 'defeat' ? 'rgba(255,68,68,0.3)' : 'rgba(255,215,0,0.3)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>
            {state.result === 'victory' ? '🏆' : state.result === 'defeat' ? '💀' : '🤝'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: state.result === 'victory' ? 'var(--color-success)' : state.result === 'defeat' ? 'var(--color-danger)' : 'var(--color-premium)' }}>
            {state.result === 'victory' ? (isTr ? 'ZAFERRRddd!' : 'VICTORY!') : state.result === 'defeat' ? (isTr ? 'YENİLGİ' : 'DEFEAT') : (isTr ? 'BERABERE' : 'DRAW')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
            <div><div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>SC</div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-sc)' }}>+{state.rewards.sc}</div></div>
            <div><div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>HC</div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-hc)' }}>+{state.rewards.hc}</div></div>
            <div><div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>ELO</div><div style={{ fontSize: 14, fontWeight: 700, color: state.rewards.elo_delta > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{state.rewards.elo_delta > 0 ? '+' : ''}{state.rewards.elo_delta}</div></div>
            <div><div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Season</div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-accent)' }}>+{state.rewards.season_pts}</div></div>
          </div>

          <button className="neon-btn" onClick={() => setState(prev => ({ ...prev, phase: 'idle' }))} style={{ marginTop: 16, width: '100%' }}>
            ⚔️ {isTr ? 'Tekrar Savaş' : 'Fight Again'}
          </button>
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
    </div>
  );
}
