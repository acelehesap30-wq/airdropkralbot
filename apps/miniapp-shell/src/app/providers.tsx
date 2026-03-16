'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useState, type ReactNode } from 'react';
import { TelegramProvider } from '@/lib/telegram';

// Blueprint: TON is the only primary wallet chain
const TON_MANIFEST_URL =
  process.env.NEXT_PUBLIC_TON_MANIFEST_URL ??
  'https://webapp.k99-exchange.xyz/tonconnect-manifest.json';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <TonConnectUIProvider manifestUrl={TON_MANIFEST_URL}>
      <QueryClientProvider client={queryClient}>
        <TelegramProvider>{children}</TelegramProvider>
      </QueryClientProvider>
    </TonConnectUIProvider>
  );
}
