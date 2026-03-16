'use client';

import { useState, useEffect, useRef } from 'react';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';

/* ═══════════════════════════════════════
   Blueprint: Game Engine — Task System
   Archetypes: scan, ambush, lockcrack, relay
   Mechanics: timer, risk modes, anomaly multipliers,
   pity counter, combo chains, streak bonuses
   ═══════════════════════════════════════ */

type TaskArchetype = 'scan' | 'ambush' | 'lockcrack' | 'relay';
type TaskRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type TaskStatus = 'available' | 'active' | 'completed' | 'failed';
type GameMode = 'safe' | 'balanced' | 'aggressive';

interface GameTask {
  id: string;
  archetype: TaskArchetype;
  rarity: TaskRarity;
  title_tr: string;
  title_en: string;
  desc_tr: string;
  desc_en: string;
  duration_sec: number;
  rewards: { sc: [number, number]; hc: [number, number]; rc_chance: number };
  status: TaskStatus;
  anomaly_bonus: number;
  xp: number;
}

const ARCHETYPE_META: Record<TaskArchetype, { icon: string; color: string; label_tr: string; label_en: string }> = {
  scan:      { icon: '🔍', color: '#00d2ff', label_tr: 'Tarama', label_en: 'Scan' },
  ambush:    { icon: '🎯', color: '#ff4444', label_tr: 'Pusu', label_en: 'Ambush' },
  lockcrack: { icon: '🔓', color: '#ffd700', label_tr: 'Kilit Kırma', label_en: 'Lockcrack' },
  relay:     { icon: '📡', color: '#e040fb', label_tr: 'Röle', label_en: 'Relay' },
};

const RARITY_META: Record<TaskRarity, { color: string; mult: number; glow: string }> = {
  common:    { color: '#aab0c0', mult: 1.0, glow: 'none' },
  uncommon:  { color: '#00ff88', mult: 1.3, glow: '0 0 6px #00ff8844' },
  rare:      { color: '#00d2ff', mult: 1.7, glow: '0 0 8px #00d2ff55' },
  epic:      { color: '#e040fb', mult: 2.2, glow: '0 0 10px #e040fb66' },
  legendary: { color: '#ffd700', mult: 3.5, glow: '0 0 14px #ffd70088' },
};

const TASKS: GameTask[] = [
  { id: 't1', archetype: 'scan', rarity: 'common', title_tr: 'Nexus Frekans Taraması', title_en: 'Nexus Frequency Scan', desc_tr: 'Grid sektör 7-B frekans anomalisi tara', desc_en: 'Scan frequency anomaly in grid sector 7-B', duration_sec: 120, rewards: { sc: [40, 80], hc: [0, 1], rc_chance: 0.02 }, status: 'available', anomaly_bonus: 1.2, xp: 15 },
  { id: 't2', archetype: 'ambush', rarity: 'uncommon', title_tr: 'Gölge Tesisi Baskını', title_en: 'Shadow Facility Raid', desc_tr: 'Karanlık bölgedeki gölge tesisini ele geçir', desc_en: 'Capture the shadow facility in dark zone', duration_sec: 180, rewards: { sc: [60, 120], hc: [1, 3], rc_chance: 0.05 }, status: 'available', anomaly_bonus: 1.5, xp: 25 },
  { id: 't3', archetype: 'lockcrack', rarity: 'rare', title_tr: 'Kripto Kasa Kırma', title_en: 'Crypto Vault Cracking', desc_tr: 'Yüksek güvenlikli veri kasasının şifresini kır', desc_en: 'Crack the high-security data vault encryption', duration_sec: 240, rewards: { sc: [100, 200], hc: [2, 5], rc_chance: 0.10 }, status: 'available', anomaly_bonus: 1.8, xp: 40 },
  { id: 't4', archetype: 'relay', rarity: 'epic', title_tr: 'Kuantum Köprü Kurulumu', title_en: 'Quantum Bridge Setup', desc_tr: 'İki nexus noktası arasında kuantum köprü kur', desc_en: 'Establish quantum bridge between two nexus points', duration_sec: 300, rewards: { sc: [200, 400], hc: [5, 10], rc_chance: 0.20 }, status: 'available', anomaly_bonus: 2.0, xp: 65 },
  { id: 't5', archetype: 'ambush', rarity: 'legendary', title_tr: 'Elmas Büyük Operasyon', title_en: 'Diamond Grand Operation', desc_tr: 'Son derece riskli — tüm bölge hakimiyeti operasyonu', desc_en: 'Extremely risky — full zone domination operation', duration_sec: 600, rewards: { sc: [500, 1000], hc: [10, 25], rc_chance: 0.35 }, status: 'available', anomaly_bonus: 3.0, xp: 120 },
  { id: 't6', archetype: 'scan', rarity: 'uncommon', title_tr: 'Anomali Deseni Analizi', title_en: 'Anomaly Pattern Analysis', desc_tr: 'Aktif anomali bölgesinin desen haritasını çıkar', desc_en: 'Map the pattern of the active anomaly zone', duration_sec: 150, rewards: { sc: [50, 100], hc: [0, 2], rc_chance: 0.04 }, status: 'available', anomaly_bonus: 1.3, xp: 20 },
];

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MissionsPage() {
  const { locale } = useTelegram();
  const { kingdomTier } = useAppStore();
  const isTr = locale === 'tr';
  
  const [tasks, setTasks] = useState(TASKS);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('balanced');
  const [showResult, setShowResult] = useState<{ task: GameTask; success: boolean; rewards: { sc: number; hc: number; rc: number; xp: number } } | null>(null);
  const [pityCounter, setPityCounter] = useState(0);
  const [combo, setCombo] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Anomaly effect — simulated live pressure
  const [anomalyActive] = useState(Math.random() > 0.4);
  const [anomalyType] = useState<'double_sc' | 'hc_boost' | 'speed' | 'none'>(
    anomalyActive ? (['double_sc', 'hc_boost', 'speed'] as const)[Math.floor(Math.random() * 3)] : 'none'
  );

  const ANOMALY_LABEL: Record<string, { tr: string; en: string; icon: string; color: string }> = {
    double_sc: { tr: '2x SC Haftası', en: '2x SC Week', icon: '🔥', color: '#ff4444' },
    hc_boost: { tr: 'HC Yağmuru', en: 'HC Rain', icon: '💎', color: '#e040fb' },
    speed: { tr: 'Hız Anomalisi', en: 'Speed Anomaly', icon: '⚡', color: '#ffd700' },
    none: { tr: '', en: '', icon: '', color: '' },
  };

  const MODE_MULTIPLIERS: Record<GameMode, { success_rate: number; reward_mult: number; label_tr: string; label_en: string; icon: string; color: string }> = {
    safe:       { success_rate: 0.92, reward_mult: 0.8, label_tr: 'Temkinli', label_en: 'Safe', icon: '🟢', color: '#00ff88' },
    balanced:   { success_rate: 0.75, reward_mult: 1.0, label_tr: 'Dengeli', label_en: 'Balanced', icon: '🟡', color: '#ffd700' },
    aggressive: { success_rate: 0.55, reward_mult: 1.5, label_tr: 'Saldırgan', label_en: 'Aggressive', icon: '🔴', color: '#ff4444' },
  };

  useEffect(() => {
    if (activeTask && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
    if (activeTask && timeLeft === 0) {
      finishTask();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTask, timeLeft]);

  function acceptTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || activeTask) return;
    const speed = anomalyType === 'speed' ? 0.5 : 1;
    setActiveTask(taskId);
    setTimeLeft(Math.round(task.duration_sec * speed));
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'active' as TaskStatus } : t));
  }

  function finishTask() {
    const task = tasks.find(t => t.id === activeTask);
    if (!task) return;
    const modeCfg = MODE_MULTIPLIERS[gameMode];
    const success = Math.random() < modeCfg.success_rate;
    
    const rarityMult = RARITY_META[task.rarity].mult;
    const tierBonus = 1 + kingdomTier * 0.1;
    const comboMult = 1 + combo * 0.05;
    const anomalyMult = anomalyType === 'double_sc' ? 2 : 1;
    const hcAnomalyMult = anomalyType === 'hc_boost' ? 1.5 : 1;

    let sc = 0, hc = 0, rc = 0, xp = 0;
    if (success) {
      sc = Math.round((task.rewards.sc[0] + Math.random() * (task.rewards.sc[1] - task.rewards.sc[0])) * modeCfg.reward_mult * rarityMult * tierBonus * comboMult * anomalyMult);
      hc = Math.round((task.rewards.hc[0] + Math.random() * (task.rewards.hc[1] - task.rewards.hc[0])) * modeCfg.reward_mult * hcAnomalyMult);
      rc = Math.random() < task.rewards.rc_chance * (pityCounter >= 5 ? 3 : 1) ? 1 : 0;
      xp = Math.round(task.xp * rarityMult * tierBonus);
      setCombo(c => c + 1);
      setPityCounter(rc > 0 ? 0 : p => p + 1);
    } else {
      sc = Math.round(task.rewards.sc[0] * 0.2);
      xp = Math.round(task.xp * 0.3);
      setCombo(0);
    }

    setShowResult({ task, success, rewards: { sc, hc, rc, xp } });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: (success ? 'completed' : 'failed') as TaskStatus } : t));
    setActiveTask(null);
  }

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">🎯 {isTr ? 'Görev Merkezi' : 'Mission Center'}</h1>
        <p className="hero-desc">
          {isTr ? 'Arketip görevleri tamamla, combo zinciri kur, pity sisteminden yararlan.' : 'Complete archetype missions, build combo chains, leverage pity system.'}
        </p>
      </div>

      {/* Anomaly Banner */}
      {anomalyActive && (
        <div className="glass-card" style={{ padding: 10, borderColor: `${ANOMALY_LABEL[anomalyType].color}44`, background: `${ANOMALY_LABEL[anomalyType].color}08` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{ANOMALY_LABEL[anomalyType].icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: ANOMALY_LABEL[anomalyType].color }}>
                {isTr ? 'AKTİF ANOMALİ' : 'ACTIVE ANOMALY'}: {isTr ? ANOMALY_LABEL[anomalyType].tr : ANOMALY_LABEL[anomalyType].en}
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                {isTr ? 'Tüm görevlere uygulanır' : 'Applies to all tasks'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Engine Stats */}
      <div className="glass-card" style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Combo</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-premium)' }}>🔥 x{combo}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Pity</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: pityCounter >= 5 ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
              {pityCounter}/7 {pityCounter >= 5 ? '✨' : ''}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Tier</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent)' }}>T{kingdomTier}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>XP Mult</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-success)' }}>x{(1 + kingdomTier * 0.1 + combo * 0.05).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(Object.entries(MODE_MULTIPLIERS) as [GameMode, typeof MODE_MULTIPLIERS['safe']][]).map(([key, cfg]) => (
          <button key={key} className={`neon-badge ${gameMode === key ? 'accent' : ''}`}
            onClick={() => !activeTask && setGameMode(key)}
            style={{
              flex: 1, cursor: activeTask ? 'not-allowed' : 'pointer', padding: '8px 4px', textAlign: 'center',
              background: gameMode === key ? `${cfg.color}20` : 'transparent',
              border: `1px solid ${gameMode === key ? cfg.color : 'rgba(42,42,62,0.15)'}`,
              color: gameMode === key ? cfg.color : 'var(--color-text-muted)',
              borderRadius: 8, fontSize: 11, fontWeight: 600,
            }}
          >
            {cfg.icon} {isTr ? cfg.label_tr : cfg.label_en}
          </button>
        ))}
      </div>

      {/* Active Task Timer */}
      {activeTask && (
        <div className="glass-card" style={{ padding: 16, borderColor: 'rgba(0,210,255,0.3)' }}>
          {(() => {
            const task = tasks.find(t => t.id === activeTask);
            if (!task) return null;
            const arch = ARCHETYPE_META[task.archetype];
            const totalTime = anomalyType === 'speed' ? Math.round(task.duration_sec * 0.5) : task.duration_sec;
            const pct = Math.round(((totalTime - timeLeft) / totalTime) * 100);
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: arch.color }}>{arch.icon} {isTr ? task.title_tr : task.title_en}</span>
                  <span className="neon-badge accent" style={{ fontFamily: 'var(--font-mono)' }}>⏱ {formatTime(timeLeft)}</span>
                </div>
                <div className="neon-progress" style={{ height: 8 }}>
                  <div className="neon-progress-bar" style={{ width: `${pct}%`, transition: 'width 1s linear' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 6, textAlign: 'center' }}>
                  {isTr ? `Mod: ${MODE_MULTIPLIERS[gameMode].label_tr} | Başarı: ${Math.round(MODE_MULTIPLIERS[gameMode].success_rate * 100)}%` : `Mode: ${MODE_MULTIPLIERS[gameMode].label_en} | Success: ${Math.round(MODE_MULTIPLIERS[gameMode].success_rate * 100)}%`}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Result Modal */}
      {showResult && (
        <div className="glass-card" style={{
          padding: 20, textAlign: 'center',
          borderColor: showResult.success ? 'rgba(0,255,136,0.3)' : 'rgba(255,68,68,0.3)',
          background: showResult.success ? 'rgba(0,255,136,0.03)' : 'rgba(255,68,68,0.03)',
        }}>
          <div style={{ fontSize: 32 }}>{showResult.success ? '🎉' : '💥'}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: showResult.success ? 'var(--color-success)' : 'var(--color-danger)', margin: '6px 0' }}>
            {showResult.success ? (isTr ? 'GÖREV BAŞARILI!' : 'MISSION COMPLETE!') : (isTr ? 'GÖREV BAŞARISIZ' : 'MISSION FAILED')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 10 }}>
            <div><div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>SC</div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-sc)' }}>+{showResult.rewards.sc}</div></div>
            <div><div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>HC</div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-hc)' }}>+{showResult.rewards.hc}</div></div>
            <div><div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>RC</div><div style={{ fontSize: 15, fontWeight: 700, color: showResult.rewards.rc > 0 ? 'var(--color-premium)' : 'var(--color-text-muted)' }}>{showResult.rewards.rc > 0 ? '💎 +1' : '—'}</div></div>
            <div><div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>XP</div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-accent)' }}>+{showResult.rewards.xp}</div></div>
          </div>
          <button className="neon-btn" onClick={() => setShowResult(null)} style={{ marginTop: 14, width: '100%' }}>
            {isTr ? 'Devam Et' : 'Continue'}
          </button>
        </div>
      )}

      {/* Task Pool */}
      <div>
        <div className="section-header">
          <span className="section-title">📋 {isTr ? 'Görev Havuzu' : 'Task Pool'}</span>
          <span className="section-badge">{tasks.filter(t => t.status === 'available').length} {isTr ? 'mevcut' : 'available'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(task => {
            const arch = ARCHETYPE_META[task.archetype];
            const rare = RARITY_META[task.rarity];
            const isActive = task.id === activeTask;
            const isDone = task.status === 'completed' || task.status === 'failed';
            return (
              <div key={task.id} className="glass-card" style={{
                padding: 12, opacity: isDone ? 0.5 : 1,
                borderColor: isActive ? `${arch.color}55` : `${rare.color}22`,
                boxShadow: rare.glow,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 14 }}>{arch.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{isTr ? task.title_tr : task.title_en}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>{isTr ? task.desc_tr : task.desc_en}</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span className="neon-badge" style={{ background: `${arch.color}15`, color: arch.color, border: `1px solid ${arch.color}33`, fontSize: 9 }}>{isTr ? arch.label_tr : arch.label_en}</span>
                      <span className="neon-badge" style={{ background: `${rare.color}15`, color: rare.color, border: `1px solid ${rare.color}33`, fontSize: 9 }}>{task.rarity.toUpperCase()}</span>
                      <span className="neon-badge" style={{ fontSize: 9 }}>⏱ {formatTime(task.duration_sec)}</span>
                      <span className="neon-badge" style={{ fontSize: 9, color: 'var(--color-sc)' }}>SC {task.rewards.sc[0]}~{task.rewards.sc[1]}</span>
                      {task.rewards.hc[1] > 0 && <span className="neon-badge" style={{ fontSize: 9, color: 'var(--color-hc)' }}>HC {task.rewards.hc[0]}~{task.rewards.hc[1]}</span>}
                    </div>
                  </div>
                  {task.status === 'available' && !activeTask && (
                    <button className="neon-btn" onClick={() => acceptTask(task.id)} style={{ padding: '6px 12px', fontSize: 11, whiteSpace: 'nowrap' }}>
                      ▶ {isTr ? 'Kabul' : 'Accept'}
                    </button>
                  )}
                  {task.status === 'completed' && <span style={{ fontSize: 18 }}>✅</span>}
                  {task.status === 'failed' && <span style={{ fontSize: 18 }}>❌</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
