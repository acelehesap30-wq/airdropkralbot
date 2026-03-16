'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/shell/BottomNav';
import { TopBar } from '@/components/shell/TopBar';
import { SceneHost } from '@/components/scene/SceneHost';
import { useBackButton } from '@/hooks/useBackButton';
import type { ReactNode } from 'react';

/**
 * Blueprint Section 7: Mini App shell layout
 * - TopBar: status + wallet indicator
 * - SceneHost: Babylon.js 3D district (lazy loaded)
 * - Content: route-specific panels
 * - BottomNav: fast travel anchors
 */
export default function RoutesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useBackButton(pathname);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        paddingTop: 'var(--safe-area-top)',
        paddingBottom: 'var(--safe-area-bottom)',
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
        {/* Blueprint: 3D scene behind content panels */}
        <SceneHost />
        <div
          className="scroll-area"
          style={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            padding: '12px 16px',
          }}
        >
          {children}
        </div>
      </main>
      <BottomNav currentPath={pathname} />
    </div>
  );
}
