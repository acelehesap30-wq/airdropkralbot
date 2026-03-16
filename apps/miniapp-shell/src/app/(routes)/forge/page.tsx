'use client';

import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';

const LOOT_BOXES = [
  { id: 'lb1', name_tr: 'Neon Kutu', name_en: 'Neon Box', icon: '📦', rarity: 'common', cost: 100, currency: 'SC', color: 'var(--color-accent)', items: ['5-50 SC', '1-5 HC', 'XP Boost'], chance: '60% SC • 30% HC • 10% Rare' },
  { id: 'lb2', name_tr: 'Arena Kasası', name_en: 'Arena Chest', icon: '🏺', rarity: 'rare', cost: 300, currency: 'SC', color: '#e040fb', items: ['50-200 SC', '5-20 HC', 'Profile Frame'], chance: '45% SC • 35% HC • 20% Cosmetic' },
  { id: 'lb3', name_tr: 'Nexus Hazinesi', name_en: 'Nexus Treasure', icon: '💎', rarity: 'epic', cost: 10, currency: 'HC', color: 'var(--color-premium)', items: ['200-1000 SC', '10-50 HC', '0.00001 BTC'], chance: '40% SC • 40% HC • 15% BTC • 5% Legendary' },
  { id: 'lb4', name_tr: 'Overlord Yumurtası', name_en: 'Overlord Egg', icon: '🥚', rarity: 'legendary', cost: 50, currency: 'HC', color: '#ff4466', items: ['1000+ SC', '50+ HC', '0.0001 BTC', 'Exclusive Badge'], chance: '30% HC • 30% SC • 25% BTC • 15% Legendary Item' },
];

const FORGE_RECIPES = [
  { id: 'r1', icon: '⚡', name_tr: 'SC → HC Dönüşümü', name_en: 'SC → HC Convert', input: '500 SC', output: '5 HC', desc_tr: 'Soft Currency\'ni Hard Currency\'e dönüştür', desc_en: 'Convert Soft Currency to Hard Currency' },
  { id: 'r2', icon: '🔥', name_tr: 'HC → RC Rafine', name_en: 'HC → RC Refine', input: '10 HC', output: '1 RC', desc_tr: 'Hard Currency\'den Rare Currency üret', desc_en: 'Refine Hard Currency to Rare Currency' },
  { id: 'r3', icon: '💫', name_tr: 'NXT Token Mint', name_en: 'NXT Token Mint', input: '100 HC', output: '10 NXT', desc_tr: 'Nexus Token mint et — blockchain\'e yazılır', desc_en: 'Mint Nexus Token — recorded on blockchain' },
];

export default function ForgePage() {
  const { locale } = useTelegram();
  const { balances } = useAppStore();
  const isTr = locale === 'tr';
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">🔮 {isTr ? 'Forge Atölyesi' : 'Forge Workshop'}</h1>
        <p className="hero-desc">
          {isTr
            ? 'Loot kutuları aç, kaynakları dönüştür, token mint et. Her kutu sürpriz ödüller içerir.'
            : 'Open loot boxes, convert resources, mint tokens. Every box contains surprise rewards.'}
        </p>
      </div>

      {/* Loot Boxes */}
      <div>
        <div className="section-header">
          <span className="section-title">🎰 {isTr ? 'Loot Kutuları' : 'Loot Boxes'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {LOOT_BOXES.map((box) => (
            <div
              key={box.id}
              className="glass-card"
              onClick={() => setSelectedBox(selectedBox === box.id ? null : box.id)}
              style={{
                padding: 14,
                cursor: 'pointer',
                borderColor: selectedBox === box.id ? box.color : undefined,
                boxShadow: selectedBox === box.id ? `0 0 20px ${box.color}33` : undefined,
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 36 }} className={selectedBox === box.id ? 'animate-float' : ''}>
                  {box.icon}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>
                  {isTr ? box.name_tr : box.name_en}
                </div>
                <span className="neon-badge" style={{
                  background: `${box.color}15`, color: box.color,
                  border: `1px solid ${box.color}33`, fontSize: 8, marginTop: 4,
                }}>
                  {box.rarity.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: box.color, fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                {box.cost} {box.currency}
              </div>

              {selectedBox === box.id && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    {isTr ? 'Olası ödüller:' : 'Possible rewards:'}
                  </div>
                  {box.items.map((item, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--color-text-secondary)', paddingLeft: 8 }}>• {item}</div>
                  ))}
                  <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 6 }}>{box.chance}</div>
                  <button className="neon-btn" style={{ width: '100%', marginTop: 10, fontSize: 12 }}>
                    🎲 {isTr ? 'Kutuyu Aç' : 'Open Box'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Forge Recipes */}
      <div style={{ marginTop: 4 }}>
        <div className="section-header">
          <span className="section-title">🔧 {isTr ? 'Dönüşüm Tarifleri' : 'Conversion Recipes'}</span>
        </div>

        {FORGE_RECIPES.map((recipe) => (
          <div key={recipe.id} className="glass-card" style={{ padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="action-icon">{recipe.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{isTr ? recipe.name_tr : recipe.name_en}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {isTr ? recipe.desc_tr : recipe.desc_en}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-danger)' }}>
                    -{recipe.input}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-success)' }}>
                    +{recipe.output}
                  </span>
                </div>
              </div>
              <button className="neon-btn" style={{ padding: '6px 14px', fontSize: 11 }}>
                {isTr ? 'Dönüştür' : 'Convert'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
