'use client';

/**
 * Blueprint: District transition overlay.
 * Brief fade-through-black transition when switching 3D districts.
 * 300ms fade out -> 200ms hold (black, shows district name) -> 300ms fade in.
 * Pure CSS animation, no extra dependencies.
 */

import { useEffect, useRef } from 'react';
import type { DistrictKey } from './districts';
import { DISTRICT_NAMES } from '@airdropkralbot/scene';
import { useAppStore } from '../../store/useAppStore';

interface DistrictTransitionProps {
  fromDistrict: DistrictKey | null;
  toDistrict: DistrictKey;
  onComplete: () => void;
}

const TOTAL_DURATION_MS = 800; // 300 + 200 + 300

export function DistrictTransition({ fromDistrict, toDistrict, onComplete }: DistrictTransitionProps) {
  const locale = useAppStore((s) => s.locale);
  const callbackFired = useRef(false);

  const entry = DISTRICT_NAMES[toDistrict];
  const label = entry ? `${entry.icon} ${entry[locale] ?? entry.en}` : toDistrict;

  useEffect(() => {
    callbackFired.current = false;
    const timer = setTimeout(() => {
      if (!callbackFired.current) {
        callbackFired.current = true;
        onComplete();
      }
    }, TOTAL_DURATION_MS);

    return () => clearTimeout(timer);
  }, [toDistrict, onComplete]);

  return (
    <>
      <style>{`
        @keyframes district-transition-fade {
          0%   { opacity: 0; }
          37.5%  { opacity: 1; }  /* 300ms — fully black */
          62.5%  { opacity: 1; }  /* hold until 500ms */
          100% { opacity: 0; }    /* fade in 300ms */
        }
        .district-transition-overlay {
          animation: district-transition-fade ${TOTAL_DURATION_MS}ms ease-in-out forwards;
        }
      `}</style>
      <div
        className="district-transition-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a1a',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            color: '#00d2ff',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 1,
            textShadow: '0 0 12px rgba(0,210,255,0.4)',
            opacity: 1,
          }}
        >
          {label}
        </span>
      </div>
    </>
  );
}

export default DistrictTransition;
