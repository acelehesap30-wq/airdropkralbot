'use client';

import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── API layer ────────────────────────────────────────────────
const API_BASE = '/webapp/api/v2';

// ─── Types ────────────────────────────────────────────────────
interface QueueItem {
  id: number;
  kind: 'payout_request' | 'token_buy' | 'kyc_manual_review';
  status: string;
  user_id: number;
  amount: string;
  priority: 'critical' | 'high' | 'medium';
  age: string;
  policy: string;
  risk_signals?: string[];
  user_info?: { username?: string; kingdom_tier?: number; join_date?: string };
}

interface MetricsData {
  total_users: number;
  dau: number;
  wau: number;
  total_sc_distributed: number;
  total_hc_distributed: number;
  total_payouts: number;
  total_btc_paid: number;
  pending_queue: number;
  arena_sessions_today: number;
  bot_uptime: string;
  bot_response_time_ms?: number;
  api_error_rate?: number;
  payout_processing_time_ms?: number;
  user_growth_rate?: number;
  token_volume?: number;
  payout_volume?: number;
  trends?: Record<string, number[]>;
  prev?: Record<string, number>;
}

interface RuntimeFlag {
  key: string;
  value: boolean;
  group: 'Game' | 'Economy' | 'Security' | 'Webapp';
  updated_at?: string;
  updated_by?: string;
}

interface OpsLogEntry {
  timestamp: string;
  action: string;
  actor?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'ended';
  segment: string;
  started_at: string;
}

interface SystemHealth {
  api: 'green' | 'yellow' | 'red';
  bot: 'green' | 'yellow' | 'red';
  database: 'green' | 'yellow' | 'red';
  payouts: 'green' | 'yellow' | 'red';
}

// ─── Mock data (fallbacks) ────────────────────────────────────
const mockPayouts: QueueItem[] = [
  { id: 1, kind: 'payout_request', status: 'requested', user_id: 42, amount: '0.00015 BTC', priority: 'high', age: '2h 14m', policy: 'threshold_review', risk_signals: ['large_amount', 'new_account'], user_info: { username: 'whale42', kingdom_tier: 3, join_date: '2026-01-15' } },
  { id: 4, kind: 'payout_request', status: 'risk_review', user_id: 195, amount: '0.00032 BTC', priority: 'high', age: '1h 30m', policy: 'amount_review', risk_signals: ['velocity_spike'], user_info: { username: 'player195', kingdom_tier: 5, join_date: '2025-11-03' } },
];

const mockTokens: QueueItem[] = [
  { id: 2, kind: 'token_buy', status: 'pending', user_id: 108, amount: '500 NXT', priority: 'medium', age: '45m', policy: 'auto_approve', risk_signals: [], user_info: { username: 'nxt_fan108', kingdom_tier: 2, join_date: '2026-02-20' } },
];

const mockKyc: QueueItem[] = [
  { id: 3, kind: 'kyc_manual_review', status: 'pending', user_id: 87, amount: '\u2014', priority: 'critical', age: '4h 02m', policy: 'risk_threshold', risk_signals: ['document_mismatch', 'geo_flagged'], user_info: { username: 'user87', kingdom_tier: 1, join_date: '2026-03-10' } },
];

const mockMetrics: MetricsData = {
  total_users: 4892,
  dau: 312,
  wau: 1847,
  total_sc_distributed: 2450000,
  total_hc_distributed: 18200,
  total_payouts: 127,
  total_btc_paid: 0.0185,
  pending_queue: 4,
  arena_sessions_today: 1256,
  bot_uptime: '99.7%',
  bot_response_time_ms: 142,
  api_error_rate: 0.3,
  payout_processing_time_ms: 4200,
  user_growth_rate: 12.4,
  token_volume: 185000,
  payout_volume: 0.0412,
  trends: {
    dau: [280, 295, 310, 305, 298, 320, 312],
    total_users: [4750, 4780, 4810, 4835, 4855, 4878, 4892],
    arena_sessions_today: [1100, 1180, 1220, 1190, 1250, 1280, 1256],
  },
  prev: {
    total_users: 4750,
    dau: 280,
    wau: 1720,
    total_payouts: 112,
    arena_sessions_today: 1100,
  },
};

const mockFlags: RuntimeFlag[] = [
  { key: 'ARENA_AUTH_ENABLED', value: true, group: 'Game', updated_at: '2026-03-18 14:00', updated_by: 'admin' },
  { key: 'RAID_AUTH_ENABLED', value: true, group: 'Game', updated_at: '2026-03-17 10:30', updated_by: 'admin' },
  { key: 'PVP_WS_ENABLED', value: false, group: 'Game', updated_at: '2026-03-16 09:00', updated_by: 'admin' },
  { key: 'TOKEN_CURVE_ENABLED', value: true, group: 'Economy', updated_at: '2026-03-18 12:00', updated_by: 'admin' },
  { key: 'TOKEN_AUTO_APPROVE_ENABLED', value: true, group: 'Economy', updated_at: '2026-03-15 08:00', updated_by: 'admin' },
  { key: 'MONETIZATION_CORE_V1_ENABLED', value: true, group: 'Economy', updated_at: '2026-03-14 16:00', updated_by: 'admin' },
  { key: 'WALLET_AUTH_V1_ENABLED', value: true, group: 'Security', updated_at: '2026-03-18 11:00', updated_by: 'admin' },
  { key: 'KYC_THRESHOLD_V1_ENABLED', value: true, group: 'Security', updated_at: '2026-03-17 14:30', updated_by: 'admin' },
  { key: 'WEBAPP_V3_ENABLED', value: true, group: 'Webapp', updated_at: '2026-03-18 09:00', updated_by: 'admin' },
  { key: 'WEBAPP_TS_BUNDLE_ENABLED', value: true, group: 'Webapp', updated_at: '2026-03-16 20:00', updated_by: 'admin' },
];

const mockOpsLog: OpsLogEntry[] = [
  { timestamp: '2026-03-18 22:30', action: 'Payout Gate opened', actor: 'admin' },
  { timestamp: '2026-03-18 20:15', action: 'Bot restarted (auto)', actor: 'system' },
  { timestamp: '2026-03-18 18:00', action: 'Token price updated $0.0042', actor: 'admin' },
  { timestamp: '2026-03-18 14:30', action: 'KYC review batch #47 processed', actor: 'admin' },
  { timestamp: '2026-03-17 10:00', action: 'System freeze toggled OFF', actor: 'admin' },
];

const mockCampaigns: Campaign[] = [
  { id: 'c1', name: 'Spring Airdrop 2026', status: 'active', segment: 'All users, tier >= 2', started_at: '2026-03-15' },
  { id: 'c2', name: 'Referral Boost', status: 'active', segment: 'Users with 3+ referrals', started_at: '2026-03-10' },
  { id: 'c3', name: 'KYC Incentive', status: 'paused', segment: 'Non-KYC users', started_at: '2026-03-01' },
];

const mockHealth: SystemHealth = { api: 'green', bot: 'green', database: 'green', payouts: 'yellow' };

// ─── API functions ────────────────────────────────────────────
async function fetchQueue(): Promise<{ payouts: QueueItem[]; tokens: QueueItem[]; kyc: QueueItem[] }> {
  try {
    const res = await fetch(`${API_BASE}/admin/queue`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { payouts: mockPayouts, tokens: mockTokens, kyc: mockKyc };
  }
}

async function fetchMetrics(range = '24h'): Promise<MetricsData> {
  try {
    const res = await fetch(`${API_BASE}/admin/metrics?range=${range}`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return mockMetrics;
  }
}

async function fetchRuntime(): Promise<RuntimeFlag[]> {
  try {
    const res = await fetch(`${API_BASE}/admin/runtime`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return mockFlags;
  }
}

async function fetchOpsLog(): Promise<{ log: OpsLogEntry[]; campaigns: Campaign[]; health: SystemHealth; system_freeze: boolean; payout_gate: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/admin/ops`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { log: mockOpsLog, campaigns: mockCampaigns, health: mockHealth, system_freeze: false, payout_gate: true };
  }
}

async function postAdminAction(action: string, payload?: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { ok: false, message: 'API unavailable' };
  }
}

// ─── Haptic helper ────────────────────────────────────────────
function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  const tg = window.Telegram?.WebApp;
  if (!tg?.HapticFeedback) return;
  if (type === 'success' || type === 'warning' || type === 'error') {
    tg.HapticFeedback.notificationOccurred(type);
  } else {
    tg.HapticFeedback.impactOccurred(type);
  }
}

// ═══════════════════════════════════════════════════════════════
// Admin Confirm Modal — 8-second countdown confirmation
// ═══════════════════════════════════════════════════════════════
function AdminConfirmModal({ title, description, onConfirm, onCancel, variant = 'danger' }: {
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'success';
}) {
  const [countdown, setCountdown] = useState(8);
  const canConfirm = countdown <= 0;

  useEffect(() => {
    if (countdown <= 0) {
      haptic('success');
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      animation: 'fade-in 0.2s ease-out',
    }}>
      <div className="glass-card" style={{
        padding: 24, maxWidth: 340, width: '90%',
        border: `1px solid var(--color-${variant})`,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: `var(--color-${variant})` }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
            {description}
          </div>
        )}

        {/* Countdown progress */}
        <div className="neon-progress" style={{ marginBottom: 12 }}>
          <div
            className="neon-progress-bar"
            style={{
              width: `${((8 - countdown) / 8) * 100}%`,
              background: `var(--color-${variant})`,
              boxShadow: `0 0 8px var(--color-${variant}-glow, rgba(255,68,102,0.4))`,
              transition: 'width 1s linear',
            }}
          />
        </div>

        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
          {canConfirm ? 'READY TO CONFIRM' : `Confirm in ${countdown}s...`}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="neon-btn"
            onClick={() => { haptic('light'); onCancel(); }}
            style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
          >
            Cancel
          </button>
          <button
            className={`neon-btn ${variant}`}
            onClick={() => {
              if (!canConfirm) return;
              haptic('heavy');
              onConfirm();
            }}
            style={{
              flex: 1, padding: '8px 12px', fontSize: 12,
              opacity: canConfirm ? 1 : 0.3,
              cursor: canConfirm ? 'pointer' : 'not-allowed',
              transition: 'opacity 0.3s',
            }}
            disabled={!canConfirm}
          >
            {canConfirm ? 'CONFIRM' : `Wait ${countdown}s`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Toggle Switch Component
// ═══════════════════════════════════════════════════════════════
function ToggleSwitch({ checked, onChange, disabled }: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => { if (!disabled) onChange(!checked); }}
      disabled={disabled}
      style={{
        width: 42, height: 24, borderRadius: 12, border: 'none',
        background: checked ? 'var(--color-success)' : 'rgba(42,42,62,0.6)',
        position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 9,
        background: '#fff',
        position: 'absolute', top: 3,
        left: checked ? 21 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sparkline SVG Component
// ═══════════════════════════════════════════════════════════════
function Sparkline({ data, color = 'var(--color-accent)', width = 80, height = 24 }: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// Health Dot Component
// ═══════════════════════════════════════════════════════════════
function HealthDot({ status }: { status: 'green' | 'yellow' | 'red' }) {
  const colorMap = { green: 'var(--color-success)', yellow: 'var(--color-warning)', red: 'var(--color-danger)' };
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: 4,
      background: colorMap[status],
      boxShadow: `0 0 6px ${colorMap[status]}`,
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════
// Priority indicator
// ═══════════════════════════════════════════════════════════════
function PriorityDot({ priority }: { priority: 'critical' | 'high' | 'medium' }) {
  const map = { critical: '\u{1F534}', high: '\u{1F7E1}', medium: '\u{1F7E2}' };
  return <span style={{ fontSize: 10 }}>{map[priority]}</span>;
}

// ═══════════════════════════════════════════════════════════════
// Trend indicator
// ═══════════════════════════════════════════════════════════════
function TrendIndicator({ current, previous, invert }: { current: number; previous?: number; invert?: boolean }) {
  if (previous === undefined || previous === 0) return <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>\u2192</span>;
  const change = ((current - previous) / previous) * 100;
  const isUp = change > 0;
  const isNeutral = Math.abs(change) < 0.5;
  let color = isUp ? 'var(--color-success)' : 'var(--color-danger)';
  if (invert) color = isUp ? 'var(--color-danger)' : 'var(--color-success)';
  if (isNeutral) color = 'var(--color-text-muted)';
  const arrow = isNeutral ? '\u2192' : isUp ? '\u2191' : '\u2193';
  return (
    <span style={{ fontSize: 10, color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
      {arrow} {Math.abs(change).toFixed(1)}%
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN ADMIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function AdminPage() {
  const { user, webApp, locale } = useTelegram();
  const { telegramId, bootstrapped, bootstrapData } = useAppStore();
  const isTr = locale === 'tr';
  const [activeTab, setActiveTab] = useState<'queue' | 'metrics' | 'config' | 'ops'>('queue');

  // ── Auth ──
  const resolvedTelegramId = Number(bootstrapData?.admin?.telegram_id || telegramId || user?.id || 0);
  const configuredAdminId = Number(bootstrapData?.admin?.configured_admin_id || 0);
  const isAdmin = Boolean(bootstrapData?.admin?.is_admin) && configuredAdminId > 0 && resolvedTelegramId === configuredAdminId;

  // ── Queue state ──
  const [queuePayouts, setQueuePayouts] = useState<QueueItem[]>(mockPayouts);
  const [queueTokens, setQueueTokens] = useState<QueueItem[]>(mockTokens);
  const [queueKyc, setQueueKyc] = useState<QueueItem[]>(mockKyc);
  const [queueSubTab, setQueueSubTab] = useState<'all' | 'payouts' | 'tokens' | 'kyc'>('all');
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [queueFilter, setQueueFilter] = useState<{ priority: string; type: string; age: string }>({ priority: 'all', type: 'all', age: 'all' });

  // ── Metrics state ──
  const [metrics, setMetrics] = useState<MetricsData>(mockMetrics);
  const [metricsRange, setMetricsRange] = useState<string>('24h');

  // ── Config state ──
  const [flags, setFlags] = useState<RuntimeFlag[]>(mockFlags);
  const [flagHistory, setFlagHistory] = useState<OpsLogEntry[]>([]);

  // ── Ops state ──
  const [opsLog, setOpsLog] = useState<OpsLogEntry[]>(mockOpsLog);
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>(mockHealth);
  const [systemFreeze, setSystemFreeze] = useState(false);
  const [payoutGate, setPayoutGate] = useState(true);

  // ── Confirm modal ──
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description?: string;
    variant?: 'danger' | 'warning' | 'success';
    onConfirm: () => void;
  } | null>(null);

  // ── Refresh state ──
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [loading, setLoading] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch all data ──
  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [queueData, metricsData, runtimeData, opsData] = await Promise.all([
        fetchQueue(),
        fetchMetrics(metricsRange),
        fetchRuntime(),
        fetchOpsLog(),
      ]);
      setQueuePayouts(queueData.payouts);
      setQueueTokens(queueData.tokens);
      setQueueKyc(queueData.kyc);
      setMetrics(metricsData);
      setFlags(runtimeData);
      setOpsLog(opsData.log);
      setCampaigns(opsData.campaigns);
      setSystemHealth(opsData.health);
      setSystemFreeze(opsData.system_freeze);
      setPayoutGate(opsData.payout_gate);
      setLastUpdated(new Date());
    } catch { /* fallback data already set */ }
    setLoading(false);
  }, [metricsRange]);

  // ── Initial fetch ──
  useEffect(() => {
    if (isAdmin) refreshAll();
  }, [isAdmin, refreshAll]);

  // ── Auto-refresh queue every 30s ──
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'queue') {
      autoRefreshRef.current = setInterval(() => {
        refreshAll();
      }, 30000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [isAdmin, activeTab, refreshAll]);

  // ── Seconds-ago ticker ──
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(ticker);
  }, [lastUpdated]);

  // ── Refresh metrics when range changes ──
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const data = await fetchMetrics(metricsRange);
      setMetrics(data);
      setLastUpdated(new Date());
    })();
  }, [metricsRange, isAdmin]);

  // ── Auth screens (unchanged) ──
  if (!bootstrapped) {
    return (
      <div className="empty-state" style={{ height: '70vh' }}>
        <div className="empty-state-icon">&#x1F6F0;&#xFE0F;</div>
        <div className="empty-state-title">
          {isTr ? 'Admin kimligi dogrulaniyor' : 'Verifying admin identity'}
        </div>
        <div className="empty-state-desc">
          {isTr
            ? 'Onay, odeme ve runtime islemlerini gostermeden once canli oturum bilgisi dogrulaniyor.'
            : 'Live session metadata is being verified before approval, payout and runtime controls are shown.'}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="empty-state" style={{ height: '70vh' }}>
        <div className="empty-state-icon">&#x1F512;</div>
        <div className="empty-state-title" style={{ color: 'var(--color-danger)' }}>
          {isTr ? 'Eri\u015Fim Engellendi' : 'Access Denied'}
        </div>
        <div className="empty-state-desc">
          {isTr
            ? 'Bu sayfa sadece konfigured admin hesabina aciktir. Telegram kimliginiz canli admin kaydiyla eslesmedi.'
            : 'This page is only accessible to admin users. Your Telegram ID was not verified.'}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
          ID: {String(resolvedTelegramId || '\u2014')} \u2260 {configuredAdminId > 0 ? String(configuredAdminId) : 'ADMIN'}
        </div>
      </div>
    );
  }

  // ── Queue helpers ──
  const allQueue = [...queuePayouts, ...queueTokens, ...queueKyc];
  const getFilteredQueue = () => {
    let items: QueueItem[];
    switch (queueSubTab) {
      case 'payouts': items = queuePayouts; break;
      case 'tokens': items = queueTokens; break;
      case 'kyc': items = queueKyc; break;
      default: items = allQueue;
    }
    if (queueFilter.priority !== 'all') items = items.filter((i) => i.priority === queueFilter.priority);
    if (queueFilter.type !== 'all') items = items.filter((i) => i.kind === queueFilter.type);
    return items;
  };
  const filteredQueue = getFilteredQueue();
  const totalQueueCount = allQueue.length;

  const toggleSelectItem = (id: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredQueue.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredQueue.map((i) => i.id)));
    }
  };

  const handleQueueAction = (action: 'approve' | 'reject', ids: number[]) => {
    const label = action === 'approve' ? 'APPROVE' : 'REJECT';
    setConfirmModal({
      title: `${label} ${ids.length} item${ids.length > 1 ? 's' : ''}?`,
      description: `You are about to ${action} queue item${ids.length > 1 ? 's' : ''} #${ids.join(', #')}. This action cannot be undone.`,
      variant: action === 'approve' ? 'success' : 'danger',
      onConfirm: async () => {
        haptic('heavy');
        await postAdminAction(`queue_${action}`, { ids });
        // Remove processed items from local state
        const idSet = new Set(ids);
        setQueuePayouts((prev) => prev.filter((i) => !idSet.has(i.id)));
        setQueueTokens((prev) => prev.filter((i) => !idSet.has(i.id)));
        setQueueKyc((prev) => prev.filter((i) => !idSet.has(i.id)));
        setSelectedItems(new Set());
        setConfirmModal(null);
      },
    });
  };

  const handleFlagToggle = (flagKey: string, newValue: boolean) => {
    setConfirmModal({
      title: `Toggle ${flagKey}?`,
      description: `Set to ${newValue ? 'ON' : 'OFF'}. This will affect live system behavior.`,
      variant: 'warning',
      onConfirm: async () => {
        haptic('heavy');
        await postAdminAction('toggle_flag', { flag: flagKey, value: newValue });
        setFlags((prev) => prev.map((f) =>
          f.key === flagKey ? { ...f, value: newValue, updated_at: new Date().toISOString(), updated_by: 'admin' } : f
        ));
        setFlagHistory((prev) => [
          { timestamp: new Date().toLocaleString(), action: `${flagKey} set to ${newValue ? 'ON' : 'OFF'}`, actor: 'admin' },
          ...prev,
        ]);
        setConfirmModal(null);
      },
    });
  };

  const handleOpsAction = (action: string, title: string, description: string, variant: 'danger' | 'warning' | 'success' = 'danger') => {
    setConfirmModal({
      title,
      description,
      variant,
      onConfirm: async () => {
        haptic('heavy');
        const result = await postAdminAction(action);
        if (action === 'toggle_system_freeze') setSystemFreeze((prev) => !prev);
        if (action === 'toggle_payout_gate') setPayoutGate((prev) => !prev);
        setOpsLog((prev) => [
          { timestamp: new Date().toLocaleString(), action: title, actor: 'admin' },
          ...prev,
        ]);
        setConfirmModal(null);
      },
    });
  };

  // ── Flag groups ──
  const flagGroups: Array<{ group: RuntimeFlag['group']; label: string }> = [
    { group: 'Game', label: 'Game' },
    { group: 'Economy', label: 'Economy' },
    { group: 'Security', label: 'Security' },
    { group: 'Webapp', label: 'Webapp' },
  ];

  // ── Last updated text ──
  const lastUpdatedText = secondsAgo < 5 ? 'just now' : secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Confirm Modal */}
      {confirmModal && (
        <AdminConfirmModal
          title={confirmModal.title}
          description={confirmModal.description}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Admin Header */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          &#x1F6E1;&#xFE0F; ADMIN PANEL \u2014 {user?.first_name ?? 'Admin'}
          <span className="neon-badge danger" style={{ marginLeft: 'auto', fontSize: 8 }}>
            ID: {configuredAdminId}
          </span>
        </div>
        <div className="admin-panel-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', flex: 1 }}>
              {isTr
                ? 'Onay, red, payout ve runtime islemleri sadece dogrulanmis admin Telegram kimligiyle bu panelden yonetilir.'
                : 'Manage approvals, rejections, configurations and system operations here.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {lastUpdatedText}
              </span>
              <button
                className="neon-btn"
                onClick={() => { haptic('light'); refreshAll(); }}
                disabled={loading}
                style={{
                  padding: '4px 10px', fontSize: 10, minWidth: 32,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? '\u27F3' : '\u21BB'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['queue', 'metrics', 'config', 'ops'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { haptic('light'); setActiveTab(tab); }}
            style={{
              flex: 1,
              padding: '8px 4px',
              fontSize: 11,
              fontWeight: activeTab === tab ? 700 : 500,
              background: activeTab === tab ? 'var(--color-accent-glow-strong)' : 'var(--color-surface)',
              border: `1px solid ${activeTab === tab ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-sm)',
              color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              position: 'relative',
            }}
          >
            {tab === 'queue' && '\u{1F4CB}'}
            {tab === 'metrics' && '\u{1F4CA}'}
            {tab === 'config' && '\u2699\uFE0F'}
            {tab === 'ops' && '\u{1F527}'}
            {' '}{tab}
            {tab === 'queue' && totalQueueCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--color-danger)', color: '#fff',
                fontSize: 8, fontWeight: 700, borderRadius: 8,
                padding: '1px 5px', lineHeight: '14px', minWidth: 14,
                textAlign: 'center',
              }}>
                {totalQueueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* QUEUE TAB                                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'queue' && (
        <div>
          <div className="section-header">
            <span className="section-title">{isTr ? '\u{1F4CB} Onay Kuyrugu' : '\u{1F4CB} Approval Queue'}</span>
            <span className="neon-badge danger">{totalQueueCount} {isTr ? 'bekliyor' : 'pending'}</span>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {([
              { key: 'all' as const, label: 'All', count: allQueue.length },
              { key: 'payouts' as const, label: 'Payouts', count: queuePayouts.length },
              { key: 'tokens' as const, label: 'Tokens', count: queueTokens.length },
              { key: 'kyc' as const, label: 'KYC', count: queueKyc.length },
            ]).map((sub) => (
              <button
                key={sub.key}
                onClick={() => { setQueueSubTab(sub.key); setSelectedItems(new Set()); }}
                style={{
                  flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: queueSubTab === sub.key ? 700 : 500,
                  background: queueSubTab === sub.key ? 'var(--color-accent-glow)' : 'transparent',
                  border: `1px solid ${queueSubTab === sub.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-xs)', cursor: 'pointer',
                  color: queueSubTab === sub.key ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {sub.label} ({sub.count})
              </button>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <select
              value={queueFilter.priority}
              onChange={(e) => setQueueFilter((f) => ({ ...f, priority: e.target.value }))}
              style={{
                flex: 1, padding: '5px 8px', fontSize: 10, borderRadius: 'var(--radius-xs)',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)', cursor: 'pointer',
              }}
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>
            <select
              value={queueFilter.type}
              onChange={(e) => setQueueFilter((f) => ({ ...f, type: e.target.value }))}
              style={{
                flex: 1, padding: '5px 8px', fontSize: 10, borderRadius: 'var(--radius-xs)',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)', cursor: 'pointer',
              }}
            >
              <option value="all">All Types</option>
              <option value="payout_request">Payout</option>
              <option value="token_buy">Token</option>
              <option value="kyc_manual_review">KYC</option>
            </select>
          </div>

          {/* Batch actions */}
          {filteredQueue.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <button
                onClick={toggleSelectAll}
                style={{
                  padding: '3px 8px', fontSize: 9, cursor: 'pointer',
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xs)', color: 'var(--color-text-secondary)',
                }}
              >
                {selectedItems.size === filteredQueue.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedItems.size > 0 && (
                <>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{selectedItems.size} selected</span>
                  <button
                    className="neon-btn success"
                    onClick={() => handleQueueAction('approve', Array.from(selectedItems))}
                    style={{ padding: '3px 10px', fontSize: 9, marginLeft: 'auto' }}
                  >
                    Approve
                  </button>
                  <button
                    className="neon-btn danger"
                    onClick={() => handleQueueAction('reject', Array.from(selectedItems))}
                    style={{ padding: '3px 10px', fontSize: 9 }}
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          )}

          {/* Queue items */}
          {filteredQueue.length === 0 && (
            <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {isTr ? 'Kuyrukta bekleyen islem yok' : 'No items in queue matching filters'}
              </div>
            </div>
          )}

          {filteredQueue.map((item) => {
            const isExpanded = expandedItem === item.id;
            const isSelected = selectedItems.has(item.id);
            return (
              <div
                key={item.id}
                className="glass-card"
                style={{
                  padding: 14, marginBottom: 8,
                  borderColor: isSelected ? 'var(--color-accent)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}
                    style={{
                      width: 18, height: 18, borderRadius: 3, flexShrink: 0, marginTop: 1,
                      border: `1.5px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: isSelected ? 'var(--color-accent-glow-strong)' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: 'var(--color-accent)',
                    }}
                  >
                    {isSelected ? '\u2713' : ''}
                  </button>

                  {/* Main content */}
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <PriorityDot priority={item.priority} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>#{item.id}</span>
                      <span className={`neon-badge ${item.priority === 'critical' ? 'danger' : item.priority === 'high' ? 'warning' : 'accent'}`} style={{ fontSize: 8 }}>
                        {item.priority.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      {item.kind.replace(/_/g, ' ')} \u2022 User #{item.user_id}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {item.amount} \u2022 {item.age} \u2022 {item.policy}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="neon-btn success"
                      onClick={() => handleQueueAction('approve', [item.id])}
                      style={{ padding: '4px 10px', fontSize: 10 }}
                    >
                      \u2713
                    </button>
                    <button
                      className="neon-btn danger"
                      onClick={() => handleQueueAction('reject', [item.id])}
                      style={{ padding: '4px 10px', fontSize: 10 }}
                    >
                      \u2717
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{
                    marginTop: 10, paddingTop: 10,
                    borderTop: '1px solid var(--color-border)',
                    animation: 'slide-up 0.2s ease-out',
                  }}>
                    {item.user_info && (
                      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</div>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>@{item.user_info.username}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tier</div>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{item.user_info.kingdom_tier}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joined</div>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{item.user_info.join_date}</div>
                        </div>
                      </div>
                    )}
                    {item.risk_signals && item.risk_signals.length > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Risk Signals</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {item.risk_signals.map((signal) => (
                            <span key={signal} className="neon-badge danger" style={{ fontSize: 8 }}>
                              {signal.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(!item.risk_signals || item.risk_signals.length === 0) && (
                      <div style={{ fontSize: 10, color: 'var(--color-success)' }}>No risk signals detected</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* METRICS TAB                                             */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'metrics' && (
        <div>
          <div className="section-header">
            <span className="section-title">{isTr ? '\u{1F4CA} KPI Metrikleri' : '\u{1F4CA} KPI Metrics'}</span>
          </div>

          {/* Time range selector */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[
              { key: '24h', label: 'Today' },
              { key: '7d', label: '7d' },
              { key: '30d', label: '30d' },
              { key: 'all', label: 'All' },
            ].map((range) => (
              <button
                key={range.key}
                onClick={() => { haptic('light'); setMetricsRange(range.key); }}
                style={{
                  flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: metricsRange === range.key ? 700 : 500,
                  background: metricsRange === range.key ? 'var(--color-accent-glow)' : 'transparent',
                  border: `1px solid ${metricsRange === range.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-xs)', cursor: 'pointer',
                  color: metricsRange === range.key ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* KPI cards with trends */}
          <div className="currency-grid" style={{ marginBottom: 12 }}>
            <div className="currency-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="currency-label">{isTr ? 'Toplam Kullanici' : 'Total Users'}</span>
                <TrendIndicator current={metrics.total_users} previous={metrics.prev?.total_users} />
              </div>
              <span className="currency-value" style={{ color: 'var(--color-accent)', fontSize: 18 }}>{metrics.total_users.toLocaleString()}</span>
              {metrics.trends?.total_users && <Sparkline data={metrics.trends.total_users} color="var(--color-accent)" />}
            </div>
            <div className="currency-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="currency-label">DAU</span>
                <TrendIndicator current={metrics.dau} previous={metrics.prev?.dau} />
              </div>
              <span className="currency-value" style={{ color: 'var(--color-success)', fontSize: 18 }}>{metrics.dau.toLocaleString()}</span>
              {metrics.trends?.dau && <Sparkline data={metrics.trends.dau} color="var(--color-success)" />}
            </div>
            <div className="currency-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="currency-label">WAU</span>
                <TrendIndicator current={metrics.wau} previous={metrics.prev?.wau} />
              </div>
              <span className="currency-value" style={{ color: 'var(--color-warning)', fontSize: 18 }}>{metrics.wau.toLocaleString()}</span>
            </div>
            <div className="currency-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="currency-label">{isTr ? 'Kuyruk' : 'Queue'}</span>
              </div>
              <span className="currency-value" style={{ color: 'var(--color-danger)', fontSize: 18 }}>{metrics.pending_queue}</span>
            </div>
          </div>

          {/* New KPI row */}
          <div className="currency-grid" style={{ marginBottom: 12 }}>
            <div className="currency-card">
              <span className="currency-label">Bot Response</span>
              <span className="currency-value" style={{ color: 'var(--color-accent)', fontSize: 16 }}>{metrics.bot_response_time_ms ?? '\u2014'}ms</span>
            </div>
            <div className="currency-card">
              <span className="currency-label">API Error Rate</span>
              <span className="currency-value" style={{ color: (metrics.api_error_rate ?? 0) > 1 ? 'var(--color-danger)' : 'var(--color-success)', fontSize: 16 }}>
                {metrics.api_error_rate ?? '\u2014'}%
              </span>
            </div>
            <div className="currency-card">
              <span className="currency-label">Payout Time</span>
              <span className="currency-value" style={{ color: 'var(--color-premium)', fontSize: 16 }}>
                {metrics.payout_processing_time_ms ? `${(metrics.payout_processing_time_ms / 1000).toFixed(1)}s` : '\u2014'}
              </span>
            </div>
            <div className="currency-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="currency-label">User Growth</span>
              </div>
              <span className="currency-value" style={{ color: (metrics.user_growth_rate ?? 0) > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontSize: 16 }}>
                {metrics.user_growth_rate !== undefined ? `${metrics.user_growth_rate > 0 ? '+' : ''}${metrics.user_growth_rate}%` : '\u2014'}
              </span>
            </div>
          </div>

          {/* Revenue metrics */}
          <div className="currency-grid" style={{ marginBottom: 12 }}>
            <div className="currency-card">
              <span className="currency-label">Token Volume</span>
              <span className="currency-value" style={{ color: 'var(--color-nxt)', fontSize: 16 }}>{metrics.token_volume?.toLocaleString() ?? '\u2014'}</span>
            </div>
            <div className="currency-card">
              <span className="currency-label">Payout Volume</span>
              <span className="currency-value" style={{ color: 'var(--color-payout)', fontSize: 16 }}>{metrics.payout_volume?.toFixed(4) ?? '\u2014'} BTC</span>
            </div>
          </div>

          {/* Stat rows */}
          <div className="glass-card" style={{ padding: '0 14px' }}>
            <StatRow label={isTr ? 'Dagitilan SC' : 'SC Distributed'} value={metrics.total_sc_distributed.toLocaleString()} />
            <StatRow label={isTr ? 'Dagitilan HC' : 'HC Distributed'} value={metrics.total_hc_distributed.toLocaleString()} />
            <StatRow label={isTr ? 'Toplam Odeme' : 'Total Payouts'} value={String(metrics.total_payouts)} trend={<TrendIndicator current={metrics.total_payouts} previous={metrics.prev?.total_payouts} />} />
            <StatRow label={isTr ? 'Odenen BTC' : 'BTC Paid'} value={metrics.total_btc_paid.toFixed(4)} />
            <StatRow
              label={isTr ? 'Arena Oturumlari (Bugun)' : 'Arena Sessions (Today)'}
              value={metrics.arena_sessions_today.toLocaleString()}
              trend={<TrendIndicator current={metrics.arena_sessions_today} previous={metrics.prev?.arena_sessions_today} />}
              sparkline={metrics.trends?.arena_sessions_today ? <Sparkline data={metrics.trends.arena_sessions_today} color="var(--color-accent)" width={60} height={18} /> : undefined}
            />
            <StatRow label="Bot Uptime" value={metrics.bot_uptime} isLast />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CONFIG TAB                                              */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'config' && (
        <div>
          <div className="section-header">
            <span className="section-title">{isTr ? '\u2699\uFE0F Runtime Konfigurasyon' : '\u2699\uFE0F Runtime Config'}</span>
          </div>

          {flagGroups.map(({ group, label }) => {
            const groupFlags = flags.filter((f) => f.group === group);
            if (groupFlags.length === 0) return null;
            return (
              <div key={group} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  {label}
                </div>
                <div className="glass-card" style={{ padding: '0 14px' }}>
                  {groupFlags.map((flag, i) => (
                    <div key={flag.key} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: i === groupFlags.length - 1 ? 'none' : '1px solid rgba(42,42,62,0.2)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                          {flag.key}
                        </div>
                        {flag.updated_at && (
                          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
                            Last: {flag.updated_at}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: flag.value ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {flag.value ? 'ON' : 'OFF'}
                        </span>
                        <ToggleSwitch
                          checked={flag.value}
                          onChange={(val) => handleFlagToggle(flag.key, val)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Flag change history */}
          {flagHistory.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: 6 }}>
                Change History (this session)
              </div>
              <div className="glass-card" style={{ padding: 14 }}>
                {flagHistory.map((entry, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: 'var(--color-text-secondary)',
                    padding: '4px 0',
                    borderBottom: i === flagHistory.length - 1 ? 'none' : '1px solid rgba(42,42,62,0.15)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-muted)' }}>
                      {entry.timestamp}
                    </span>
                    {' \u2014 '}{entry.action}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* OPS TAB                                                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'ops' && (
        <div>
          <div className="section-header">
            <span className="section-title">{isTr ? '\u{1F527} Sistem Operasyonlari' : '\u{1F527} System Operations'}</span>
          </div>

          {/* System health */}
          <div className="glass-card" style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: 10 }}>
              System Health
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {(Object.entries(systemHealth) as Array<[string, 'green' | 'yellow' | 'red']>).map(([key, status]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <HealthDot status={status} />
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)' }}>
                    {key}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* System toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {/* System Freeze */}
            <div className="glass-card" style={{
              padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderColor: systemFreeze ? 'var(--color-warning)' : undefined,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  &#x1F9CA; {isTr ? 'Sistem Freeze' : 'System Freeze'}
                </div>
                <div style={{ fontSize: 10, color: systemFreeze ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                  {systemFreeze ? 'ACTIVE \u2014 System is frozen' : 'System is operating normally'}
                </div>
              </div>
              <ToggleSwitch
                checked={systemFreeze}
                onChange={() => handleOpsAction(
                  'toggle_system_freeze',
                  systemFreeze ? 'Disable System Freeze?' : 'Enable System Freeze?',
                  systemFreeze
                    ? 'The system will resume normal operations.'
                    : 'All user-facing operations will be paused. Only admin actions will remain active.',
                  'warning',
                )}
              />
            </div>

            {/* Payout Gate */}
            <div className="glass-card" style={{
              padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderColor: !payoutGate ? 'var(--color-danger)' : undefined,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  &#x1F4B0; {isTr ? 'Payout Gate' : 'Payout Gate'}
                </div>
                <div style={{ fontSize: 10, color: payoutGate ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {payoutGate ? 'OPEN \u2014 Payouts are processing' : 'CLOSED \u2014 Payouts are halted'}
                </div>
              </div>
              <ToggleSwitch
                checked={payoutGate}
                onChange={() => handleOpsAction(
                  'toggle_payout_gate',
                  payoutGate ? 'Close Payout Gate?' : 'Open Payout Gate?',
                  payoutGate
                    ? 'All pending and new payouts will be halted until the gate is reopened.'
                    : 'Pending payouts will begin processing again.',
                  payoutGate ? 'danger' : 'success',
                )}
              />
            </div>

            {/* Emergency Stop */}
            <button
              className="neon-btn danger"
              onClick={() => handleOpsAction(
                'emergency_stop',
                'EMERGENCY STOP',
                'This will immediately halt ALL system operations including bot, payouts, token operations, and arena sessions. Only use in critical situations.',
                'danger',
              )}
              style={{ width: '100%', padding: '12px 16px', justifyContent: 'flex-start', fontSize: 13 }}
            >
              &#x1F6A8; {isTr ? 'Acil Durum Durdur' : 'Emergency Stop'}
            </button>
          </div>

          {/* Live Ops Campaigns */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>
                Live Ops Campaigns
              </div>
              <button
                className="neon-btn"
                onClick={() => {
                  haptic('light');
                  handleOpsAction(
                    'create_campaign',
                    'Create New Campaign?',
                    'This will open the campaign creation flow.',
                    'success',
                  );
                }}
                style={{ padding: '3px 10px', fontSize: 9 }}
              >
                + New
              </button>
            </div>
            <div className="glass-card" style={{ padding: '0 14px' }}>
              {campaigns.map((campaign, i) => (
                <div key={campaign.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: i === campaigns.length - 1 ? 'none' : '1px solid rgba(42,42,62,0.2)',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{campaign.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {campaign.segment} \u2022 Since {campaign.started_at}
                    </div>
                  </div>
                  <span className={`neon-badge ${campaign.status === 'active' ? 'success' : campaign.status === 'paused' ? 'warning' : 'accent'}`} style={{ fontSize: 8 }}>
                    {campaign.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit log */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: 6 }}>
              Audit Log
            </div>
            <div className="glass-card" style={{ padding: 14 }}>
              {opsLog.map((entry, i) => (
                <div key={i} style={{
                  fontSize: 11, color: 'var(--color-text-secondary)',
                  padding: '5px 0',
                  borderBottom: i === opsLog.length - 1 ? 'none' : '1px solid rgba(42,42,62,0.15)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
                }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-muted)' }}>
                      {entry.timestamp}
                    </span>
                    {' \u2014 '}{entry.action}
                  </div>
                  {entry.actor && (
                    <span className="neon-badge accent" style={{ fontSize: 7, flexShrink: 0 }}>
                      {entry.actor}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="currency-card">
      <span className="currency-label">{label}</span>
      <span className="currency-value" style={{ color, fontSize: 18 }}>{value}</span>
    </div>
  );
}

function StatRow({ label, value, isLast, trend, sparkline }: {
  label: string;
  value: string;
  isLast?: boolean;
  trend?: React.ReactNode;
  sparkline?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid rgba(42,42,62,0.2)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {sparkline}
        {trend}
        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{value}</span>
      </div>
    </div>
  );
}

function FlagRow({ label, value, isLast }: { label: string; value: boolean; isLast?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid rgba(42,42,62,0.2)',
    }}>
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className={`neon-badge ${value ? 'success' : 'danger'}`} style={{ fontSize: 9 }}>
        {value ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}
