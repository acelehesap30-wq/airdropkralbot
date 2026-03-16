/**
 * Blueprint Section 3: Bootstrap flow
 * Fetches /v2/bootstrap on app mount, populates Zustand store
 * Handles locale, balances, wallet session, runtime flags
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiFetch, endpoints } from '@/lib/api';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';
import { BootstrapResponseSchema, type BootstrapResponse } from '@airdropkralbot/contracts';

async function fetchBootstrap(initData: string): Promise<BootstrapResponse> {
  const raw = await apiFetch<BootstrapResponse>(endpoints.bootstrap, {
    method: 'POST',
    body: {
      init_data: initData,
      surface: 'miniapp',
      ts: new Date().toISOString(),
    },
  });

  // Blueprint: validate with Zod contract
  return BootstrapResponseSchema.parse(raw);
}

export function useBootstrap() {
  const { initData, isReady, locale: tgLocale } = useTelegram();
  const { setBootstrap, setLocale, setSession, setBootstrapData, bootstrapped } = useAppStore();

  const query = useQuery({
    queryKey: ['bootstrap', initData],
    queryFn: () => fetchBootstrap(initData),
    enabled: isReady && !!initData,
    staleTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });

  useEffect(() => {
    if (query.data && !bootstrapped) {
      setBootstrap(query.data);
      setBootstrapData(query.data);

      // Store session if present
      if (query.data.session) {
        setSession(query.data.session);
      }

      // Blueprint: locale precedence — stored override > Telegram > profile > region > TR
      const serverLocale = query.data.user?.locale;
      if (serverLocale === 'en' || serverLocale === 'tr') {
        setLocale(serverLocale);
      } else {
        setLocale(tgLocale);
      }
    }
  }, [query.data, bootstrapped, setBootstrap, setLocale, tgLocale]);

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
