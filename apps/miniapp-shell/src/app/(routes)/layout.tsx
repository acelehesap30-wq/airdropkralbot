'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BottomNav } from '@/components/shell/BottomNav';
import { TopBar } from '@/components/shell/TopBar';
import { SceneHost } from '@/components/scene/SceneHost';
import { useBackButton } from '@/hooks/useBackButton';
import type { ReactNode } from 'react';

/**
 * Blueprint Section 7: Mini App shell layout
 * Premium neon arena theme with 3D background, TopBar, Content, BottomNav
 */
export default function RoutesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useBackButton(pathname);

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
          overflow: 'hidden',
        }}
      >
        {/* 3D scene behind content panels */}
        <SceneHost />
        <div
          className="scroll-area"
          style={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
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
