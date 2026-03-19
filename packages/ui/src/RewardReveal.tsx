'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

type Tier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface RewardRevealProps {
  tier: Tier;
  reward: string;
  onComplete?: () => void;
}

const TIER_CONFIG: Record<Tier, { glow: string; border: string; label: string }> = {
  common:    { glow: 'rgba(136,136,160,0.3)', border: 'rgba(136,136,160,0.5)', label: 'Common' },
  uncommon:  { glow: 'rgba(0,255,136,0.35)',  border: 'rgba(0,255,136,0.5)',  label: 'Uncommon' },
  rare:      { glow: 'rgba(0,212,255,0.4)',   border: 'rgba(0,212,255,0.6)',  label: 'Rare' },
  epic:      { glow: 'rgba(224,64,251,0.4)',   border: 'rgba(224,64,251,0.6)',  label: 'Epic' },
  legendary: { glow: 'rgba(255,215,0,0.5)',    border: 'rgba(255,215,0,0.7)',   label: 'Legendary' },
};

/**
 * Animated reward reveal with rarity-dependent visual effects.
 * Uses the `reward-reveal` CSS animation from globals.css and
 * a glow color / intensity that scales with tier.
 */
export function RewardReveal({ tier, reward, onComplete }: RewardRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onComplete) return;
    const handler = () => onComplete();
    el.addEventListener('animationend', handler, { once: true });
    return () => el.removeEventListener('animationend', handler);
  }, [onComplete]);

  const config = TIER_CONFIG[tier];

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    background: 'var(--color-surface-glass)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid ${config.border}`,
    borderRadius: 'var(--radius-lg)',
    boxShadow: `0 0 30px ${config.glow}, 0 0 60px ${config.glow}`,
    textAlign: 'center',
  };

  const tierLabelStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: config.border,
  };

  const rewardTextStyle: CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  };

  return (
    <div ref={ref} className="reward-reveal" style={containerStyle}>
      <span style={tierLabelStyle}>{config.label}</span>
      <span style={rewardTextStyle}>{reward}</span>
    </div>
  );
}
