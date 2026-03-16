'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';

/* ═══════════════════════════════════════
   Blueprint: Forge — Loot Box & Crafting
   Features: box opening animation, rarity rolls,
   pity system, conversion recipes, fusion mechanic
   ═══════════════════════════════════════ */

type BoxTier = 'bronze' | 'silver' | 'gold' | 'diamond';
type LootRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface LootItem {
  id: string;
  name_tr: string;
  name_en: string;
  rarity: LootRarity;
  icon: string;
  type: 'currency' | 'boost' | 'cosmetic' | 'fragment';
  amount?: number;
}

interface RecipeItem {
  id: string;
  name_tr: string;
  name_en: string;
  icon: string;
  inputs: { type: string; amount: number }[];
  output: { type: string; amount: number; icon: string };
  duration_sec: number;
  unlocked: boolean;
}

const BOX_CONFIG: Record<BoxTier, { label: string; icon: string; cost: number; currency: string; color: string; glow: string; loot_table: { rarity: LootRarity; weight: number }[] }> = {
  bronze: {
    label: 'Bronz', icon: '🥉', cost: 50, currency: 'SC', color: '#cd7f32',
    glow: '0 0 12px #cd7f3266',
    loot_table: [
      { rarity: 'common', weight: 60 }, { rarity: 'uncommon', weight: 25 }, { rarity: 'rare', weight: 12 }, { rarity: 'epic', weight: 2.5 }, { rarity: 'legendary', weight: 0.5 },
    ],
  },
  silver: {
    label: 'Gümüş', icon: '🥈', cost: 150, currency: 'SC', color: '#c0c0c0',
    glow: '0 0 14px #c0c0c066',
    loot_table: [
      { rarity: 'common', weight: 35 }, { rarity: 'uncommon', weight: 35 }, { rarity: 'rare', weight: 20 }, { rarity: 'epic', weight: 8 }, { rarity: 'legendary', weight: 2 },
    ],
  },
  gold: {
    label: 'Altın', icon: '🥇', cost: 5, currency: 'HC', color: '#ffd700',
    glow: '0 0 18px #ffd70088',
    loot_table: [
      { rarity: 'common', weight: 10 }, { rarity: 'uncommon', weight: 25 }, { rarity: 'rare', weight: 35 }, { rarity: 'epic', weight: 22 }, { rarity: 'legendary', weight: 8 },
    ],
  },
  diamond: {
    label: 'Elmas', icon: '💎', cost: 1, currency: 'RC', color: '#e040fb',
    glow: '0 0 24px #e040fbaa',
    loot_table: [
      { rarity: 'common', weight: 0 }, { rarity: 'uncommon', weight: 5 }, { rarity: 'rare', weight: 25 }, { rarity: 'epic', weight: 40 }, { rarity: 'legendary', weight: 30 },
    ],
  },
};

const RARITY_STYLE: Record<LootRarity, { color: string; bg: string; label: string }> = {
  common:    { color: '#aab0c0', bg: '#aab0c010', label: 'Common' },
  uncommon:  { color: '#00ff88', bg: '#00ff8810', label: 'Uncommon' },
  rare:      { color: '#00d2ff', bg: '#00d2ff15', label: 'Rare' },
  epic:      { color: '#e040fb', bg: '#e040fb15', label: 'Epic' },
  legendary: { color: '#ffd700', bg: '#ffd70018', label: 'Legendary' },
};

const POSSIBLE_LOOT: Record<LootRarity, LootItem[]> = {
  common: [
    { id: 'l1', name_tr: 'SC Paketi', name_en: 'SC Pack', rarity: 'common', icon: '💰', type: 'currency', amount: 30 },
    { id: 'l2', name_tr: 'XP Jeli', name_en: 'XP Gel', rarity: 'common', icon: '✨', type: 'boost', amount: 1 },
  ],
  uncommon: [
    { id: 'l3', name_tr: 'SC Büyük Paket', name_en: 'SC Big Pack', rarity: 'uncommon', icon: '💰', type: 'currency', amount: 80 },
    { id: 'l4', name_tr: 'HC Parçacığı', name_en: 'HC Fragment', rarity: 'uncommon', icon: '💎', type: 'fragment', amount: 1 },
    { id: 'l5', name_tr: 'Hız Tomu', name_en: 'Speed Tome', rarity: 'uncommon', icon: '⚡', type: 'boost', amount: 1 },
  ],
  rare: [
    { id: 'l6', name_tr: 'HC Kristali', name_en: 'HC Crystal', rarity: 'rare', icon: '💎', type: 'currency', amount: 3 },
    { id: 'l7', name_tr: 'Neon Avatar Çerçevesi', name_en: 'Neon Avatar Frame', rarity: 'rare', icon: '🌟', type: 'cosmetic' },
    { id: 'l8', name_tr: 'Combo Shield', name_en: 'Combo Shield', rarity: 'rare', icon: '🛡️', type: 'boost', amount: 1 },
  ],
  epic: [
    { id: 'l9', name_tr: 'HC Mega Kristal', name_en: 'HC Mega Crystal', rarity: 'epic', icon: '💎', type: 'currency', amount: 8 },
    { id: 'l10', name_tr: 'Streak Kalkanı', name_en: 'Streak Shield', rarity: 'epic', icon: '🔮', type: 'boost', amount: 1 },
    { id: 'l11', name_tr: 'Hologram Badge', name_en: 'Hologram Badge', rarity: 'epic', icon: '🏅', type: 'cosmetic' },
  ],
  legendary: [
    { id: 'l12', name_tr: 'RC Çekirdeği', name_en: 'RC Core', rarity: 'legendary', icon: '🌀', type: 'currency', amount: 1 },
    { id: 'l13', name_tr: 'NXT Token Parçası', name_en: 'NXT Token Fragment', rarity: 'legendary', icon: '🪙', type: 'fragment', amount: 1 },
    { id: 'l14', name_tr: 'Nexus Crown', name_en: 'Nexus Crown', rarity: 'legendary', icon: '👑', type: 'cosmetic' },
  ],
};

const RECIPES: RecipeItem[] = [
  { id: 'r1', name_tr: 'SC → HC Dönüşüm', name_en: 'SC → HC Convert', icon: '🔄', inputs: [{ type: 'SC', amount: 500 }], output: { type: 'HC', amount: 3, icon: '💎' }, duration_sec: 60, unlocked: true },
  { id: 'r2', name_tr: 'HC → RC Sentez', name_en: 'HC → RC Synthesis', icon: '⚗️', inputs: [{ type: 'HC', amount: 25 }], output: { type: 'RC', amount: 1, icon: '🌀' }, duration_sec: 120, unlocked: true },
  { id: 'r3', name_tr: 'Fragment Birleştirme', name_en: 'Fragment Fusion', icon: '🔥', inputs: [{ type: 'Fragment', amount: 5 }], output: { type: 'NXT', amount: 1, icon: '🪙' }, duration_sec: 300, unlocked: true },
  { id: 'r4', name_tr: 'Elmas Parçacık Üretimi', name_en: 'Diamond Particle Forge', icon: '💫', inputs: [{ type: 'SC', amount: 1000 }, { type: 'HC', amount: 10 }], output: { type: 'RC', amount: 2, icon: '🌀' }, duration_sec: 600, unlocked: false },
];

function rollLoot(tier: BoxTier, pity: number): LootItem {
  const cfg = BOX_CONFIG[tier];
  const table = cfg.loot_table;
  
  // Pity system: after N opens without legendary, force epic+
  let roll = Math.random() * 100;
  if (pity >= 10) roll = Math.min(roll, 3); // Force legendary range
  else if (pity >= 7) roll = Math.min(roll, 10); // Force epic+ range

  let cumulative = 0;
  let selectedRarity: LootRarity = 'common';
  for (const entry of table) {
    cumulative += entry.weight;
    if (roll <= cumulative) { selectedRarity = entry.rarity; break; }
  }

  const pool = POSSIBLE_LOOT[selectedRarity];
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function ForgePage() {
  const { locale } = useTelegram();
  const { balances, kingdomTier } = useAppStore();
  const isTr = locale === 'tr';

  const [pityCounter, setPityCounter] = useState(0);
  const [lastLoot, setLastLoot] = useState<LootItem | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [openHistory, setOpenHistory] = useState<LootItem[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null);
  const [recipeTimer, setRecipeTimer] = useState(0);

  // Recipe timer
  useEffect(() => {
    if (activeRecipe && recipeTimer > 0) {
      const t = setTimeout(() => setRecipeTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
    if (activeRecipe && recipeTimer === 0) setActiveRecipe(null);
  }, [activeRecipe, recipeTimer]);

  const openBox = useCallback((tier: BoxTier) => {
    setIsOpening(true);
    setLastLoot(null);
    setTimeout(() => {
      const loot = rollLoot(tier, pityCounter);
      setLastLoot(loot);
      setIsOpening(false);
      setOpenHistory(prev => [loot, ...prev].slice(0, 20));
      setPityCounter(loot.rarity === 'legendary' ? 0 : p => p + 1);
    }, 1200);
  }, [pityCounter]);

  const startRecipe = useCallback((recipe: RecipeItem) => {
    setActiveRecipe(recipe.id);
    setRecipeTimer(recipe.duration_sec);
  }, []);

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">🔥 {isTr ? 'Forge Atölyesi' : 'Forge Workshop'}</h1>
        <p className="hero-desc">
          {isTr ? 'Loot kutuları aç, kaynakları dönüştür, pity sisteminden yararlan.' : 'Open loot boxes, convert resources, leverage pity system.'}
        </p>
      </div>

      {/* Forge Stats */}
      <div className="glass-card" style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
          <div><div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Pity</div><div style={{ fontSize: 14, fontWeight: 700, color: pityCounter >= 7 ? 'var(--color-premium)' : 'var(--color-text-secondary)' }}>{pityCounter}/10 {pityCounter >= 7 ? '🔥' : ''}</div></div>
          <div><div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>SC</div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-sc)' }}>{balances.sc}</div></div>
          <div><div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>HC</div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-hc)' }}>{balances.hc}</div></div>
          <div><div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>RC</div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-premium)' }}>{balances.rc}</div></div>
        </div>
      </div>

      {/* Loot Result */}
      {(isOpening || lastLoot) && (
        <div className="glass-card" style={{
          padding: 20, textAlign: 'center',
          borderColor: lastLoot ? `${RARITY_STYLE[lastLoot.rarity].color}44` : 'rgba(0,210,255,0.3)',
          boxShadow: lastLoot ? `0 0 20px ${RARITY_STYLE[lastLoot.rarity].color}33` : 'none',
        }}>
          {isOpening ? (
            <>
              <div style={{ fontSize: 48, animation: 'pulse-glow 0.5s infinite' }}>📦</div>
              <div style={{ fontSize: 14, color: 'var(--color-accent)', marginTop: 8 }}>
                {isTr ? 'Kutu açılıyor...' : 'Opening box...'}
              </div>
            </>
          ) : lastLoot && (
            <>
              <div style={{ fontSize: 48, marginBottom: 6 }}>{lastLoot.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: RARITY_STYLE[lastLoot.rarity].color }}>
                {isTr ? lastLoot.name_tr : lastLoot.name_en}
              </div>
              <span className="neon-badge" style={{
                marginTop: 6, display: 'inline-block',
                background: RARITY_STYLE[lastLoot.rarity].bg,
                color: RARITY_STYLE[lastLoot.rarity].color,
                border: `1px solid ${RARITY_STYLE[lastLoot.rarity].color}33`,
              }}>
                ★ {RARITY_STYLE[lastLoot.rarity].label}
              </span>
              {lastLoot.amount !== undefined && (
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-success)', marginTop: 8 }}>
                  +{lastLoot.amount} {lastLoot.type === 'currency' ? lastLoot.name_en.split(' ')[0] : 'x'}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Loot Boxes */}
      <div>
        <div className="section-header">
          <span className="section-title">📦 {isTr ? 'Loot Kutuları' : 'Loot Boxes'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {(Object.entries(BOX_CONFIG) as [BoxTier, typeof BOX_CONFIG['bronze']][]).map(([tier, cfg]) => (
            <button key={tier} className="glass-card" onClick={() => !isOpening && openBox(tier)}
              style={{ padding: 14, cursor: isOpening ? 'wait' : 'pointer', textAlign: 'center', border: `1px solid ${cfg.color}33`, boxShadow: cfg.glow, background: 'var(--color-surface)' }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>{cfg.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{cfg.label}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>{cfg.cost} {cfg.currency}</div>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Legendary: {cfg.loot_table.find(l => l.rarity === 'legendary')?.weight}%
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversion Recipes */}
      <div>
        <div className="section-header">
          <span className="section-title">⚗️ {isTr ? 'Dönüşüm Tarifleri' : 'Conversion Recipes'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RECIPES.map(recipe => (
            <div key={recipe.id} className="glass-card" style={{ padding: 12, opacity: recipe.unlocked ? 1 : 0.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {recipe.icon} {isTr ? recipe.name_tr : recipe.name_en}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {recipe.inputs.map(i => `${i.amount} ${i.type}`).join(' + ')} → {recipe.output.icon} {recipe.output.amount} {recipe.output.type}
                  </div>
                </div>
                {recipe.unlocked && activeRecipe !== recipe.id ? (
                  <button className="neon-btn" onClick={() => startRecipe(recipe)} style={{ padding: '4px 10px', fontSize: 10 }}>
                    ▶ {isTr ? 'Başlat' : 'Start'}
                  </button>
                ) : activeRecipe === recipe.id ? (
                  <span className="neon-badge accent" style={{ fontFamily: 'var(--font-mono)' }}>
                    ⏱ {Math.floor(recipeTimer / 60)}:{String(recipeTimer % 60).padStart(2, '0')}
                  </span>
                ) : (
                  <span className="neon-badge" style={{ fontSize: 9 }}>🔒 T{3}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open History */}
      {openHistory.length > 0 && (
        <div>
          <div className="section-header">
            <span className="section-title">📜 {isTr ? 'Açma Geçmişi' : 'Open History'}</span>
            <span className="section-badge">{openHistory.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {openHistory.map((item, i) => (
              <div key={i} className="neon-badge" style={{
                background: RARITY_STYLE[item.rarity].bg,
                color: RARITY_STYLE[item.rarity].color,
                border: `1px solid ${RARITY_STYLE[item.rarity].color}33`,
                fontSize: 11,
              }}>
                {item.icon}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
