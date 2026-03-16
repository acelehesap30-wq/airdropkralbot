'use client';

import { useTelegram } from '@/lib/telegram';
import { useBootstrap } from '@/hooks/useBootstrap';
import { useAppStore } from '@/store/useAppStore';
import { apiFetch, endpoints } from '@/lib/api';
import { useState, useCallback } from 'react';

/**
 * Blueprint Section 3.3: Forge — craft / upgrade items
 * Shows available forge recipes, lets user craft with SC/HC cost
 */
export default function ForgePage() {
  const { locale } = useTelegram();
  const { isLoading } = useBootstrap();
  const session = useAppStore((s) => s.session);
  const bootstrapData = useAppStore((s) => s.bootstrapData);
  const balances = useAppStore((s) => s.balances);
  const setBalances = useAppStore((s) => s.setBalances);

  const [forging, setForging] = useState<string | null>(null);
  const [forgeResult, setForgeResult] = useState<{ key: string; status: string } | null>(null);

  const recipes = bootstrapData?.forge?.recipes ?? [];
  const tr = locale === 'tr';

  const startForge = useCallback(
    async (recipeKey: string) => {
      if (!session || forging) return;
      setForging(recipeKey);
      setForgeResult(null);
      try {
        const requestId = `forge:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
        const data = await apiFetch<{ success: boolean; data?: any; error?: string }>(
          endpoints.actionsComplete,
          {
            method: 'POST',
            body: {
              uid: session.uid,
              ts: session.ts,
              sig: session.sig,
              action: 'forge',
              recipe_key: recipeKey,
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
        setForgeResult({ key: recipeKey, status: 'success' });
      } catch (err: any) {
        setForgeResult({ key: recipeKey, status: err?.code ?? 'error' });
      } finally {
        setForging(null);
      }
    },
    [session, forging, setBalances, balances.payout_available],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>
        🔨 {tr ? 'Dövme Atölyesi' : 'Forge'}
      </h1>

      {/* Balance bar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          fontSize: 13,
        }}
      >
        <span>🪙 SC: {balances.sc.toLocaleString()}</span>
        <span>💎 HC: {balances.hc.toLocaleString()}</span>
        <span>🔴 RC: {balances.rc.toLocaleString()}</span>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-secondary)' }}>
          ⏳ {tr ? 'Yükleniyor...' : 'Loading...'}
        </div>
      )}

      {!isLoading && recipes.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-secondary)' }}>
          {tr ? 'Henüz tarif yok. Seviye atladıkça yeni tarifler açılır.' : 'No recipes yet. Level up to unlock new recipes.'}
        </div>
      )}

      {recipes.map((recipe: any) => {
        const canAfford =
          (recipe.cost_sc ?? 0) <= balances.sc && (recipe.cost_hc ?? 0) <= balances.hc;
        const isForging = forging === recipe.key;
        const justForged =
          forgeResult !== null && forgeResult.key === recipe.key && forgeResult.status === 'success';

        return (
          <div
            key={recipe.key}
            style={{
              background: 'var(--color-surface)',
              border: `1px solid ${canAfford ? 'rgba(255,215,64,0.4)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {recipe.title || recipe.key}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {recipe.description || (tr ? 'Malzeme birleştir' : 'Combine materials')}
                </div>
                <div style={{ fontSize: 11, color: '#ffd740', marginTop: 4 }}>
                  💰 {recipe.cost_sc ?? 0} SC {recipe.cost_hc ? `+ ${recipe.cost_hc} HC` : ''}
                </div>
              </div>
              <div>
                {justForged ? (
                  <span style={{ fontSize: 12, color: '#69f0ae' }}>✅</span>
                ) : (
                  <button
                    onClick={() => startForge(recipe.key)}
                    disabled={isForging || !canAfford}
                    style={{
                      background: canAfford ? '#ffd740' : '#555',
                      color: '#000',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: isForging || !canAfford ? 'not-allowed' : 'pointer',
                      opacity: isForging ? 0.6 : 1,
                    }}
                  >
                    {isForging ? '...' : tr ? 'Üret' : 'Craft'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
