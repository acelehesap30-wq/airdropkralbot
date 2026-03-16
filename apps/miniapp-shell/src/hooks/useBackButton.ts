'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/lib/telegram';

/**
 * Blueprint: BackButton drawer -> route -> exit behavior
 * - On hub: hide back button
 * - On other routes: show back button, navigate to hub
 */
export function useBackButton(pathname: string) {
  const { webApp } = useTelegram();
  const router = useRouter();

  useEffect(() => {
    if (!webApp) return;

    const isHub = pathname === '/hub' || pathname === '/';

    if (isHub) {
      webApp.BackButton.hide();
    } else {
      webApp.BackButton.show();
    }

    const handleBack = () => {
      router.push('/hub');
    };

    webApp.BackButton.onClick(handleBack);
    return () => {
      webApp.BackButton.offClick(handleBack);
    };
  }, [webApp, pathname, router]);
}
