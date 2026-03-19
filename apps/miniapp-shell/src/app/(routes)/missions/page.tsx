'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';

/* ═══════════════════════════════════════
   Mission Center — Full Game Mechanics
   API integration with simulation fallback
   Mission chains, daily/weekly, archetype mastery
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
  chain_step?: number;
  chain_total?: number;
  chain_name?: string;
}

interface DailyObjective {
  id: string;
  title_tr: string;
  title_en: string;
  current: number;
  target: number;
  reward: string;
  icon: string;
  completed: boolean;
}

interface WeeklyObjective {
  id: string;
  title_tr: string;
  title_en: string;
  current: number;
  target: number;
  reward: string;
  icon: string;
  completed: boolean;
}

const ARCHETYPE_META: Record<TaskArchetype, { icon: string; color: string; label_tr: string; label_en: string; desc_tr: string; desc_en: string }> = {
  scan:      { icon: '🔍', color: '#00d2ff', label_tr: 'Tarama', label_en: 'Scan', desc_tr: 'Çevre keşfi', desc_en: 'Area recon' },
  ambush:    { icon: '🎯', color: '#ff4444', label_tr: 'Pusu', label_en: 'Ambush', desc_tr: 'Saldırı ops', desc_en: 'Attack ops' },
  lockcrack: { icon: '🔓', color: '#ffd700', label_tr: 'Kilit Kırma', label_en: 'Lockcrack', desc_tr: 'Şifre kırma', desc_en: 'Code breaking' },
  relay:     { icon: '📡', color: '#e040fb', label_tr: 'Röle', label_en: 'Relay', desc_tr: 'İletişim ağı', desc_en: 'Comms network' },
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
  { id: 't3', archetype: 'lockcrack', rarity: 'rare', title_tr: 'Kripto Kasa Kırma', title_en: 'Crypto Vault Cracking', desc_tr: 'Yüksek güvenlikli veri kasasının şifresini kır', desc_en: 'Crack the high-security data vault encryption', duration_sec: 240, rewards: { sc: [100, 200], hc: [2, 5], rc_chance: 0.10 }, status: 'available', anomaly_bonus: 1.8, xp: 40, chain_step: 1, chain_total: 3, chain_name: 'Vault Heist' },
  { id: 't4', archetype: 'relay', rarity: 'epic', title_tr: 'Kuantum Köprü Kurulumu', title_en: 'Quantum Bridge Setup', desc_tr: 'İki nexus noktası arasında kuantum köprü kur', desc_en: 'Establish quantum bridge between two nexus points', duration_sec: 300, rewards: { sc: [200, 400], hc: [5, 10], rc_chance: 0.20 }, status: 'available', anomaly_bonus: 2.0, xp: 65 },
  { id: 't5', archetype: 'ambush', rarity: 'legendary', title_tr: 'Elmas Büyük Operasyon', title_en: 'Diamond Grand Operation', desc_tr: 'Son derece riskli — tüm bölge hakimiyeti operasyonu', desc_en: 'Extremely risky — full zone domination operation', duration_sec: 600, rewards: { sc: [500, 1000], hc: [10, 25], rc_chance: 0.35 }, status: 'available', anomaly_bonus: 3.0, xp: 120, chain_step: 1, chain_total: 5, chain_name: 'Omega Strike' },
  { id: 't6', archetype: 'scan', rarity: 'uncommon', title_tr: 'Anomali Deseni Analizi', title_en: 'Anomaly Pattern Analysis', desc_tr: 'Aktif anomali bölgesinin desen haritasını çıkar', desc_en: 'Map the pattern of the active anomaly zone', duration_sec: 150, rewards: { sc: [50, 100], hc: [0, 2], rc_chance: 0.04 }, status: 'available', anomaly_bonus: 1.3, xp: 20 },
];

const DAILY_OBJECTIVES: DailyObjective[] = [
  { id: 'd1', title_tr: '3 Görev Tamamla', title_en: 'Complete 3 Missions', current: 1, target: 3, reward: '100 SC', icon: '🎯', completed: false },
  { id: 'd2', title_tr: '1 Pusu Görevi Yap', title_en: 'Complete 1 Ambush', current: 0, target: 1, reward: '2 HC', icon: '⚔️', completed: false },
  { id: 'd3', title_tr: '500 XP Kazan', title_en: 'Earn 500 XP', current: 320, target: 500, reward: '50 SC', icon: '✨', completed: false },
];

const WEEKLY_OBJECTIVES: WeeklyObjective[] = [
  { id: 'w1', title_tr: 'Her Arketipten 2 Görev', title_en: '2 of Each Archetype', current: 5, target: 8, reward: '500 SC + 5 HC', icon: '🏅', completed: false },
  { id: 'w2', title_tr: '3x Combo Zinciri', title_en: '3x Combo Chain', current: 2, target: 3, reward: '10 HC', icon: '🔥', completed: false },
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
  const [totalXP, setTotalXP] = useState(320);
  const [showObjectives, setShowObjectives] = useState(false);
  const [dailyObjs, setDailyObjs] = useState(DAILY_OBJECTIVES);
  const [weeklyObjs] = useState(WEEKLY_OBJECTIVES);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Archetype mastery tracker
  const [archetypeMastery] = useState<Record<TaskArchetype, number>>({
    scan: 12, ambush: 8, lockcrack: 5, relay: 3,
  });

  // Anomaly effect
  const [anomalyActive] = useState(Math.random() > 0.4);
  const [anomalyType] = useState<'double_sc' | 'hc_boost' | 'speed' | 'none'>(
    anomalyActive ? (['double_sc', 'hc_boost', 'speed'] as const)[Math.floor(Math.random() * 3)] : 'none'
  );
  const [anomalyTimeLeft] = useState(() => Math.floor(3600 + Math.random() * 7200));

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

  const acceptTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || activeTask) return;

    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch {}

    // Try server API
    try {
      const res = await fetch('/webapp/api/v2/tasks/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, mode: gameMode }),
      });
      if (res.ok) {
        setApiAvailable(true);
      }
    } catch {
      setApiAvailable(false);
    }

    const speed = anomalyType === 'speed' ? 0.5 : 1;
    setActiveTask(taskId);
    setTimeLeft(Math.round(task.duration_sec * speed));
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'active' as TaskStatus } : t));
  }, [tasks, activeTask, gameMode, anomalyType]);

  async function finishTask() {
    const task = tasks.find(t => t.id === activeTask);
    if (!task) return;

    let success: boolean;
    let sc: number, hc: number, rc: number, xp: number;

    // Try server API
    try {
      const res = await fetch('/webapp/api/v2/tasks/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id, mode: gameMode }),
      });
      if (res.ok) {
        const data = await res.json();
        success = data.success;
        sc = data.rewards?.sc ?? 0;
        hc = data.rewards?.hc ?? 0;
        rc = data.rewards?.rc ?? 0;
        xp = data.rewards?.xp ?? 0;
        setApiAvailable(true);
      } else {
        throw new Error('API failed');
      }
    } catch {
      setApiAvailable(false);
      // Fallback: local simulation
      const modeCfg = MODE_MULTIPLIERS[gameMode];
      success = Math.random() < modeCfg.success_rate;

      const rarityMult = RARITY_META[task.rarity].mult;
      const tierBonus = 1 + kingdomTier * 0.1;
      const comboMult = 1 + combo * 0.05;
      const anomalyMult = anomalyType === 'double_sc' ? 2 : 1;
      const hcAnomalyMult = anomalyType === 'hc_boost' ? 1.5 : 1;

      if (success) {
        sc = Math.round((task.rewards.sc[0] + Math.random() * (task.rewards.sc[1] - task.rewards.sc[0])) * modeCfg.reward_mult * rarityMult * tierBonus * comboMult * anomalyMult);
        hc = Math.round((task.rewards.hc[0] + Math.random() * (task.rewards.hc[1] - task.rewards.hc[0])) * modeCfg.reward_mult * hcAnomalyMult);
        rc = Math.random() < task.rewards.rc_chance * (pityCounter >= 5 ? 3 : 1) ? 1 : 0;
        xp = Math.round(task.xp * rarityMult * tierBonus);
      } else {
        sc = Math.round(task.rewards.sc[0] * 0.2);
        hc = 0;
        rc = 0;
        xp = Math.round(task.xp * 0.3);
      }
    }

    if (success) {
      setCombo(c => c + 1);
      setPityCounter(rc > 0 ? 0 : p => p + 1);
      setTotalXP(prev => prev + xp);
      setDailyObjs(prev => prev.map(d => d.id === 'd1' ? { ...d, current: Math.min(d.current + 1, d.target) } : d.id === 'd3' ? { ...d, current: Math.min(d.current + xp, d.target) } : d));
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch {}
    } else {
      setCombo(0);
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch {}
    }

    setShowResult({ task, success, rewards: { sc, hc, rc, xp } });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: (success ? 'completed' : 'failed') as TaskStatus } : t));
    setActiveTask(null);
  }

  // Load task pool from server (fallback to static data)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/webapp/api/v2/tasks/pool');
        if (res.ok) {
          const data = await res.json();
          if (data.tasks && Array.isArray(data.tasks)) {
            setTasks(data.tasks);
          }
          setApiAvailable(true);
        }
      } catch {
        setApiAvailable(false);
      }
    })();
  }, []);

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">🎯 {isTr ? 'Görev Merkezi' : 'Mission Center'}</h1>
        <p className="hero-desc">
          {isTr ? 'Arketip görevleri tamamla, combo zinciri kur, pity sisteminden yararlan.' : 'Complete archetype missions, build combo chains, leverage pity system.'}
        </p>
        {apiAvailable === false && (
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>
            ⚠ {isTr ? 'Simülasyon modu' : 'Simulation mode'}
          </div>
        )}
      </div>

      {/* Anomaly Banner with countdown */}
      {anomalyActive && (
        <div className="glass-card pulse-glow" style={{
          padding: 12,
          borderColor: `${ANOMALY_LABEL[anomalyType].color}55`,
          background: `linear-gradient(135deg, ${ANOMALY_LABEL[anomalyType].color}10, transparent)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24, animation: 'float 2s ease-in-out infinite' }}>{ANOMALY_LABEL[anomalyType].icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: ANOMALY_LABEL[anomalyType].color, textShadow: `0 0 10px ${ANOMALY_LABEL[anomalyType].color}66` }}>
                  {isTr ? 'AKTİF ANOMALİ' : 'ACTIVE ANOMALY'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  {isTr ? ANOMALY_LABEL[anomalyType].tr : ANOMALY_LABEL[anomalyType].en}
                </div>
              </div>
            </div>
            <span className="timer-display" style={{ fontSize: 10 }}>
              ⏱ {formatTime(anomalyTimeLeft)}
            </span>
          </div>
        </div>
      )}

      {/* Archetype Mastery Tracker */}
      <div className="glass-card" style={{ padding: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px', fontWeight: 600 }}>
          {isTr ? 'Arketip Ustalığı' : 'Archetype Mastery'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
          {(Object.entries(ARCHETYPE_META) as [TaskArchetype, typeof ARCHETYPE_META['scan']][]).map(([key, meta]) => {
            const count = archetypeMastery[key];
            const level = Math.floor(count / 5);
            const progress = (count % 5) / 5 * 100;
            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: `${meta.color}15`, border: `2px solid ${meta.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, position: 'relative',
                }}>
                  {meta.icon}
                  {level > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4,
                      background: meta.color, color: '#000', borderRadius: '50%',
                      width: 16, height: 16, fontSize: 9, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {level}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: meta.color }}>{isTr ? meta.label_tr : meta.label_en}</div>
                <div className="neon-progress" style={{ height: 3, width: '100%' }}>
                  <div className="neon-progress-bar" style={{ width: `${progress}%`, background: meta.color }} />
                </div>
                <div style={{ fontSize: 8, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{count} done</div>
              </div>
            );
          })}
        </div>
      </div>

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

      {/* Daily/Weekly Objectives Toggle */}
      <button
        className="glass-card"
        onClick={() => setShowObjectives(!showObjectives)}
        style={{ padding: 12, cursor: 'pointer', textAlign: 'left', background: 'var(--color-surface)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            📋 {isTr ? 'Günlük/Haftalık Hedefler' : 'Daily/Weekly Objectives'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="neon-badge success" style={{ fontSize: 9 }}>
              {dailyObjs.filter(d => d.current >= d.target).length}/{dailyObjs.length}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', transform: showObjectives ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
          </div>
        </div>
      </button>

      {/* Objectives Overlay */}
      {showObjectives && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, animation: 'slide-up 0.3s ease-out' }}>
          {/* Daily */}
          <div className="glass-card" style={{ padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: 8 }}>
              {isTr ? 'Günlük Hedefler' : 'Daily Objectives'}
            </div>
            {dailyObjs.map(obj => {
              const pct = Math.min(100, Math.round((obj.current / obj.target) * 100));
              return (
                <div key={obj.id} style={{ marginBottom: 8, opacity: obj.completed ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{obj.icon} {isTr ? obj.title_tr : obj.title_en}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{obj.current}/{obj.target}</span>
                  </div>
                  <div className="neon-progress" style={{ height: 4 }}>
                    <div className="neon-progress-bar" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--color-success)' : undefined }} />
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--color-sc)', marginTop: 2 }}>🎁 {obj.reward}</div>
                </div>
              );
            })}
          </div>
          {/* Weekly */}
          <div className="glass-card" style={{ padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-premium)', textTransform: 'uppercase', marginBottom: 8 }}>
              {isTr ? 'Haftalık Hedefler' : 'Weekly Objectives'}
            </div>
            {weeklyObjs.map(obj => {
              const pct = Math.min(100, Math.round((obj.current / obj.target) * 100));
              return (
                <div key={obj.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{obj.icon} {isTr ? obj.title_tr : obj.title_en}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{obj.current}/{obj.target}</span>
                  </div>
                  <div className="neon-progress" style={{ height: 4 }}>
                    <div className="neon-progress-bar" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #ffd700, #ff8800)' }} />
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--color-hc)', marginTop: 2 }}>🎁 {obj.reward}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              transition: 'all 0.2s ease',
            }}
          >
            {cfg.icon} {isTr ? cfg.label_tr : cfg.label_en}
            <div style={{ fontSize: 8, opacity: 0.7, marginTop: 2 }}>{Math.round(cfg.success_rate * 100)}%</div>
          </button>
        ))}
      </div>

      {/* Active Task Timer */}
      {activeTask && (
        <div className="glass-card pulse-glow" style={{ padding: 16, borderColor: 'rgba(0,210,255,0.4)' }}>
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
                  <span className="timer-display" style={{ fontSize: 11 }}>⏱ {formatTime(timeLeft)}</span>
                </div>

                {/* Chain info */}
                {task.chain_step && (
                  <div style={{ fontSize: 10, color: 'var(--color-premium)', marginBottom: 6, fontWeight: 600 }}>
                    🔗 {task.chain_name} — Step {task.chain_step}/{task.chain_total}
                  </div>
                )}

                {/* Pulsing progress */}
                <div className="neon-progress" style={{ height: 10 }}>
                  <div className="neon-progress-bar" style={{
                    width: `${pct}%`,
                    transition: 'width 1s linear',
                    boxShadow: `0 0 12px rgba(0,212,255,${0.3 + Math.sin(Date.now() / 500) * 0.2})`,
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                    {isTr ? `Mod: ${MODE_MULTIPLIERS[gameMode].label_tr}` : `Mode: ${MODE_MULTIPLIERS[gameMode].label_en}`} | {Math.round(MODE_MULTIPLIERS[gameMode].success_rate * 100)}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                    {pct}%
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Result Modal */}
      {showResult && (
        <div className={`glass-card ${showResult.success ? 'reward-reveal' : ''}`} style={{
          padding: 20, textAlign: 'center',
          borderColor: showResult.success ? 'rgba(0,255,136,0.4)' : 'rgba(255,68,68,0.4)',
          background: showResult.success
            ? 'linear-gradient(135deg, rgba(0,255,136,0.06), rgba(0,212,255,0.03))'
            : 'linear-gradient(135deg, rgba(255,68,68,0.06), rgba(255,0,0,0.03))',
          boxShadow: showResult.success ? '0 0 30px rgba(0,255,136,0.15)' : '0 0 30px rgba(255,68,68,0.15)',
        }}>
          <div style={{ fontSize: 40 }}>{showResult.success ? '🎉' : '💥'}</div>
          <div style={{
            fontSize: 20, fontWeight: 800, letterSpacing: 1,
            color: showResult.success ? 'var(--color-success)' : 'var(--color-danger)',
            textShadow: showResult.success ? '0 0 15px rgba(0,255,136,0.4)' : '0 0 15px rgba(255,68,68,0.4)',
            margin: '6px 0',
          }}>
            {showResult.success ? (isTr ? 'GÖREV BAŞARILI!' : 'MISSION COMPLETE!') : (isTr ? 'GÖREV BAŞARISIZ' : 'MISSION FAILED')}
          </div>

          {/* Chain progress */}
          {showResult.task.chain_step && showResult.success && (
            <div style={{
              fontSize: 11, color: 'var(--color-premium)', marginBottom: 6, fontWeight: 600,
              padding: '4px 12px', background: 'rgba(255,215,0,0.1)', borderRadius: 20, display: 'inline-block',
            }}>
              🔗 {showResult.task.chain_name} — Step {showResult.task.chain_step}/{showResult.task.chain_total} Complete
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
            <div className="count-up">
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>SC</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-sc)' }}>+{showResult.rewards.sc}</div>
            </div>
            <div className="count-up" style={{ animationDelay: '0.1s' }}>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>HC</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-hc)' }}>+{showResult.rewards.hc}</div>
            </div>
            <div className="count-up" style={{ animationDelay: '0.2s' }}>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>RC</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: showResult.rewards.rc > 0 ? 'var(--color-premium)' : 'var(--color-text-muted)' }}>
                {showResult.rewards.rc > 0 ? '💎 +1' : '—'}
              </div>
            </div>
            <div className="count-up" style={{ animationDelay: '0.3s' }}>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>XP</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-accent)' }}>+{showResult.rewards.xp}</div>
            </div>
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
          {tasks.map((task, idx) => {
            const arch = ARCHETYPE_META[task.archetype];
            const rare = RARITY_META[task.rarity];
            const isActive = task.id === activeTask;
            const isDone = task.status === 'completed' || task.status === 'failed';
            return (
              <div key={task.id} className="glass-card" style={{
                padding: 12, opacity: isDone ? 0.5 : 1,
                borderColor: isActive ? `${arch.color}55` : `${rare.color}22`,
                boxShadow: rare.glow,
                animation: `slide-up 0.4s ease-out ${idx * 80}ms both`,
                transition: 'all 0.3s ease',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 14 }}>{arch.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{isTr ? task.title_tr : task.title_en}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>{isTr ? task.desc_tr : task.desc_en}</div>

                    {/* Chain indicator */}
                    {task.chain_step && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--color-premium)', fontWeight: 700 }}>
                          🔗 {task.chain_name}
                        </span>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {Array.from({ length: task.chain_total! }).map((_, i) => (
                            <div key={i} style={{
                              width: 12, height: 3, borderRadius: 2,
                              background: i < task.chain_step! ? 'var(--color-premium)' : 'rgba(42,42,62,0.4)',
                            }} />
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span className="neon-badge" style={{ background: `${arch.color}15`, color: arch.color, border: `1px solid ${arch.color}33`, fontSize: 9 }}>{isTr ? arch.label_tr : arch.label_en}</span>
                      <span className="neon-badge" style={{ background: `${rare.color}15`, color: rare.color, border: `1px solid ${rare.color}33`, fontSize: 9 }}>{task.rarity.toUpperCase()}</span>
                      <span className="neon-badge" style={{ fontSize: 9 }}>⏱ {formatTime(task.duration_sec)}</span>
                      <span className="neon-badge" style={{ fontSize: 9, color: 'var(--color-sc)' }}>SC {task.rewards.sc[0]}~{task.rewards.sc[1]}</span>
                      {task.rewards.hc[1] > 0 && <span className="neon-badge" style={{ fontSize: 9, color: 'var(--color-hc)' }}>HC {task.rewards.hc[0]}~{task.rewards.hc[1]}</span>}
                      {task.anomaly_bonus > 1 && anomalyActive && (
                        <span className="neon-badge" style={{ fontSize: 9, color: ANOMALY_LABEL[anomalyType].color, border: `1px solid ${ANOMALY_LABEL[anomalyType].color}33`, background: `${ANOMALY_LABEL[anomalyType].color}10` }}>
                          {ANOMALY_LABEL[anomalyType].icon} x{task.anomaly_bonus}
                        </span>
                      )}
                    </div>
                  </div>
                  {task.status === 'available' && !activeTask && (
                    <button className="neon-btn" onClick={() => acceptTask(task.id)} style={{ padding: '6px 12px', fontSize: 11, whiteSpace: 'nowrap' }}>
                      ▶ {isTr ? 'Kabul' : 'Accept'}
                    </button>
                  )}
                  {task.status === 'completed' && <span style={{ fontSize: 20 }}>✅</span>}
                  {task.status === 'failed' && <span style={{ fontSize: 20 }}>❌</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
