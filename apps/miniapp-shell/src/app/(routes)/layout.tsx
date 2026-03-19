'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/shell/BottomNav';
import { TopBar } from '@/components/shell/TopBar';
import { useBackButton } from '@/hooks/useBackButton';
import { useMainButton } from '@/hooks/useMainButton';

/**
 * Blueprint Section 7: Mini App shell layout
 * Premium neon arena theme with TopBar, Content, BottomNav
 */
export default function RoutesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useBackButton(pathname);
  useMainButton(pathname);

  return (
    <div
      className="noise-overlay"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        paddingTop: 'var(--safe-area-top)',
        paddingBottom: 'var(--safe-area-bottom)',
        background: 'var(--color-bg-gradient)',
      }}
    >
      <TopBar />
      <main
        style={{
          flex: 1,
          position: 'relative',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <div
          className="scroll-area"
          style={{
            position: 'relative',
            zIndex: 1,
            minHeight: '100%',
            padding: '14px 16px 20px',
          }}
        >
          {children}
        </div>
      </main>
      <BottomNav currentPath={pathname} />
    </div>
  );
}

