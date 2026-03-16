'use client';

import { useTelegram } from '@/lib/telegram';
import { useBootstrap } from '@/hooks/useBootstrap';
import { useAppStore } from '@/store/useAppStore';
import { apiFetch, endpoints } from '@/lib/api';
import { useState, useCallback } from 'react';

/**
 * Blueprint Section 3.2: Missions — daily task pool
 * "One clear action per message" — show mission list, claim ready ones
 */
export default function MissionsPage() {
  const { locale } = useTelegram();
  const { isLoading } = useBootstrap();
  const session = useAppStore((s) => s.session);
  const bootstrapData = useAppStore((s) => s.bootstrapData);
  const setBalances = useAppStore((s) => s.setBalances);
  const balances = useAppStore((s) => s.balances);

  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<{ key: string; status: string } | null>(null);

  const missions = bootstrapData?.missions?.list ?? [];
  const readyCount = bootstrapData?.missions?.ready ?? 0;

  const claimMission = useCallback(
    async (missionKey: string) => {
      if (!session || claiming) return;
      setClaiming(missionKey);
      setClaimResult(null);
      try {
        const requestId = `claim:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
        const data = await apiFetch<{ success: boolean; data?: any; error?: string }>(
          endpoints.claimMission,
          {
            method: 'POST',
            body: {
              uid: session.uid,
              ts: session.ts,
              sig: session.sig,
              mission_key: missionKey,
              request_id: requestId,
            },
          },
        );
        if (data.data?.snapshot?.balances) {
          setBalances({
            sc: data.data.snapshot.balances.SC ?? 0,
            hc: data.data.snapshot.balances.HC ?? 0,
            rc: data.data.snapshot.balances.RC ?? 0,
            payout_available: balances.payout_available,
          });
        }
        setClaimResult({ key: missionKey, status: 'claimed' });
      } catch (err: any) {
        setClaimResult({ key: missionKey, status: err?.code ?? 'error' });
      } finally {
        setClaiming(null);
      }
    },
    [session, claiming, setBalances, balances.payout_available],
  );

  const tr = locale === 'tr';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>
        ⚔️ {tr ? 'Görevler' : 'Missions'}
      </h1>

      {readyCount > 0 && (
        <div
          style={{
            background: 'rgba(0,229,255,0.08)',
            border: '1px solid rgba(0,229,255,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 13,
            color: '#00e5ff',
          }}
        >
          🎯 {readyCount} {tr ? 'görev ödül almaya hazır!' : 'missions ready to claim!'}
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-secondary)' }}>
          ⏳ {tr ? 'Yükleniyor...' : 'Loading...'}
        </div>
      )}

      {!isLoading && missions.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-secondary)' }}>
          {tr ? 'Henüz aktif görev yok.' : 'No active missions yet.'}
        </div>
      )}

      {missions.map((mission: any) => {
        const isReady = mission.completed && !mission.claimed;
        const isClaimed = mission.claimed;
        const isClaiming = claiming === mission.key;
        const wasJustClaimed =
          claimResult !== null && claimResult.key === mission.key && claimResult.status === 'claimed';

        return (
          <div
            key={mission.key}
            style={{
              background: 'var(--color-surface)',
              border: `1px solid ${isReady ? 'rgba(0,229,255,0.4)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              opacity: isClaimed ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {mission.title || mission.key}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {mission.description || (tr ? 'Görevi tamamla' : 'Complete the mission')}
                </div>
                {mission.reward && (
                  <div style={{ fontSize: 11, color: '#ffd740', marginTop: 4 }}>
                    🏆 SC:{mission.reward.sc ?? 0} HC:{mission.reward.hc ?? 0} RC:{mission.reward.rc ?? 0}
                  </div>
                )}
              </div>
              <div>
                {isClaimed || wasJustClaimed ? (
                  <span style={{ fontSize: 12, color: '#69f0ae' }}>✅</span>
                ) : isReady ? (
                  <button
                    onClick={() => claimMission(mission.key)}
                    disabled={isClaiming}
                    style={{
                      background: '#00e5ff',
                      color: '#000',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: isClaiming ? 'wait' : 'pointer',
                      opacity: isClaiming ? 0.6 : 1,
                    }}
                  >
                    {isClaiming ? '...' : tr ? 'Al' : 'Claim'}
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {mission.progress ?? 0}/{mission.target ?? 1}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
