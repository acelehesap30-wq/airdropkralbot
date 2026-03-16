'use client';

import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';
import { useState, useEffect } from 'react';

const ADMIN_TELEGRAM_ID = 1995400205;

export default function AdminPage() {
  const { user, locale } = useTelegram();
  const { telegramId, bootstrapped, bootstrapData } = useAppStore();
  const isTr = locale === 'tr';
  const [activeTab, setActiveTab] = useState<'queue' | 'metrics' | 'config' | 'ops'>('queue');

  const isAdmin = Number(telegramId || user?.id || 0) === ADMIN_TELEGRAM_ID;

  if (!isAdmin) {
    return (
      <div className="empty-state" style={{ height: '70vh' }}>
        <div className="empty-state-icon">🔒</div>
        <div className="empty-state-title" style={{ color: 'var(--color-danger)' }}>
          {isTr ? 'Erişim Engellendi' : 'Access Denied'}
        </div>
        <div className="empty-state-desc">
          {isTr
            ? 'Bu sayfa sadece admin kullanıcılara açıktır. Telegram ID\'niz doğrulanmadı.'
            : 'This page is only accessible to admin users. Your Telegram ID was not verified.'}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
          ID: {String(telegramId || user?.id || '—')} ≠ ADMIN
        </div>
      </div>
    );
  }

  const mockQueue = [
    { id: 1, kind: 'payout_request', status: 'requested', user_id: 42, amount: '0.00015 BTC', priority: 'high', age: '2h 14m', policy: 'threshold_review' },
    { id: 2, kind: 'token_buy', status: 'pending', user_id: 108, amount: '500 NXT', priority: 'medium', age: '45m', policy: 'auto_approve' },
    { id: 3, kind: 'kyc_manual_review', status: 'pending', user_id: 87, amount: '—', priority: 'critical', age: '4h 02m', policy: 'risk_threshold' },
    { id: 4, kind: 'payout_request', status: 'risk_review', user_id: 195, amount: '0.00032 BTC', priority: 'high', age: '1h 30m', policy: 'amount_review' },
  ];

  const mockMetrics = {
    total_users: 4892,
    dau: 312,
    wau: 1847,
    total_sc_distributed: 2450000,
    total_hc_distributed: 18200,
    total_payouts: 127,
    total_btc_paid: 0.0185,
    pending_queue: mockQueue.length,
    arena_sessions_today: 1256,
    bot_uptime: '99.7%',
  };

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Admin Header */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          🛡️ ADMIN PANEL — {user?.first_name ?? 'Admin'}
          <span className="neon-badge danger" style={{ marginLeft: 'auto', fontSize: 8 }}>
            ID: {ADMIN_TELEGRAM_ID}
          </span>
        </div>
        <div className="admin-panel-body">
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {isTr
              ? 'Onaylama, reddetme, konfigürasyon ve sistem yönetimi işlemlerini buradan yapabilirsiniz.'
              : 'Manage approvals, rejections, configurations and system operations here.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['queue', 'metrics', 'config', 'ops'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
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
            }}
          >
            {tab === 'queue' && '📋'}
            {tab === 'metrics' && '📊'}
            {tab === 'config' && '⚙️'}
            {tab === 'ops' && '🔧'}
            {' '}{tab}
          </button>
        ))}
      </div>

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div>
          <div className="section-header">
            <span className="section-title">📋 {isTr ? 'Onay Kuyruğu' : 'Approval Queue'}</span>
            <span className="neon-badge danger">{mockQueue.length} {isTr ? 'bekliyor' : 'pending'}</span>
          </div>

          {mockQueue.map((item) => (
            <div key={item.id} className="glass-card" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>#{item.id}</span>
                    <span className={`neon-badge ${item.priority === 'critical' ? 'danger' : item.priority === 'high' ? 'warning' : 'accent'}`} style={{ fontSize: 8 }}>
                      {item.priority.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {item.kind.replace(/_/g, ' ')} • User #{item.user_id}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {item.amount} • {item.age} • {item.policy}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="neon-btn success" style={{ padding: '4px 10px', fontSize: 10 }}>✅</button>
                  <button className="neon-btn danger" style={{ padding: '4px 10px', fontSize: 10 }}>❌</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div>
          <div className="section-header">
            <span className="section-title">📊 {isTr ? 'KPI Metrikleri' : 'KPI Metrics'}</span>
          </div>

          <div className="currency-grid" style={{ marginBottom: 12 }}>
            <MetricCard label={isTr ? 'Toplam Kullanıcı' : 'Total Users'} value={mockMetrics.total_users.toLocaleString()} color="var(--color-accent)" />
            <MetricCard label="DAU" value={mockMetrics.dau.toLocaleString()} color="var(--color-success)" />
            <MetricCard label="WAU" value={mockMetrics.wau.toLocaleString()} color="var(--color-warning)" />
            <MetricCard label={isTr ? 'Kuyruk' : 'Queue'} value={String(mockMetrics.pending_queue)} color="var(--color-danger)" />
          </div>

          <div className="glass-card" style={{ padding: '0 14px' }}>
            <StatRow label={isTr ? 'Dağıtılan SC' : 'SC Distributed'} value={mockMetrics.total_sc_distributed.toLocaleString()} />
            <StatRow label={isTr ? 'Dağıtılan HC' : 'HC Distributed'} value={mockMetrics.total_hc_distributed.toLocaleString()} />
            <StatRow label={isTr ? 'Toplam Ödeme' : 'Total Payouts'} value={String(mockMetrics.total_payouts)} />
            <StatRow label={isTr ? 'Ödenen BTC' : 'BTC Paid'} value={mockMetrics.total_btc_paid.toFixed(4)} />
            <StatRow label={isTr ? 'Arena Oturumları (Bugün)' : 'Arena Sessions (Today)'} value={mockMetrics.arena_sessions_today.toLocaleString()} />
            <StatRow label="Bot Uptime" value={mockMetrics.bot_uptime} isLast />
          </div>
        </div>
      )}

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div>
          <div className="section-header">
            <span className="section-title">⚙️ {isTr ? 'Runtime Konfigürasyon' : 'Runtime Config'}</span>
          </div>

          <div className="glass-card" style={{ padding: '0 14px' }}>
            <FlagRow label="ARENA_AUTH_ENABLED" value={true} />
            <FlagRow label="RAID_AUTH_ENABLED" value={true} />
            <FlagRow label="TOKEN_CURVE_ENABLED" value={true} />
            <FlagRow label="TOKEN_AUTO_APPROVE_ENABLED" value={true} />
            <FlagRow label="WALLET_AUTH_V1_ENABLED" value={true} />
            <FlagRow label="KYC_THRESHOLD_V1_ENABLED" value={true} />
            <FlagRow label="MONETIZATION_CORE_V1_ENABLED" value={true} />
            <FlagRow label="WEBAPP_V3_ENABLED" value={true} />
            <FlagRow label="WEBAPP_TS_BUNDLE_ENABLED" value={true} />
            <FlagRow label="PVP_WS_ENABLED" value={false} isLast />
          </div>
        </div>
      )}

      {/* Ops Tab */}
      {activeTab === 'ops' && (
        <div>
          <div className="section-header">
            <span className="section-title">🔧 {isTr ? 'Sistem Operasyonları' : 'System Operations'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="neon-btn" style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }}>
              🔄 {isTr ? 'Bot Yeniden Başlat' : 'Restart Bot'}
            </button>
            <button className="neon-btn warning" style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }}>
              🧊 {isTr ? 'Sistem Freeze Aç/Kapat' : 'Toggle System Freeze'}
            </button>
            <button className="neon-btn premium" style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }}>
              💰 {isTr ? 'Payout Gate Aç/Kapat' : 'Toggle Payout Gate'}
            </button>
            <button className="neon-btn danger" style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }}>
              🚨 {isTr ? 'Acil Durum Durdur' : 'Emergency Stop'}
            </button>
          </div>

          <div className="glass-card" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              {isTr ? 'Son Operasyonlar' : 'Recent Operations'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              • 2026-03-16 22:30 — Payout Gate opened<br />
              • 2026-03-16 20:15 — Bot restarted (auto)<br />
              • 2026-03-16 18:00 — Token price updated $0.0042<br />
              • 2026-03-16 14:30 — KYC review batch #47 processed
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="currency-card">
      <span className="currency-label">{label}</span>
      <span className="currency-value" style={{ color, fontSize: 18 }}>{value}</span>
    </div>
  );
}

function StatRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid rgba(42,42,62,0.2)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{value}</span>
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
