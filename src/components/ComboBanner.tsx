'use client';

// ═══════════════════════════════════════════════════════════
//  src/components/ComboBanner.tsx
//  Banner dramático quando um combo é detonado
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

interface ComboBannerEvent {
  id: string;
  comboName: string;
  comboEmoji: string;
  color: string;
  bonusDamage?: number;
  streakBonus?: number;
}

interface ComboBannerProps {
  events: ComboBannerEvent[];
}

export default function ComboBanner({ events }: ComboBannerProps) {
  const [active, setActive] = useState<(ComboBannerEvent & { dying: boolean; phase: 'enter' | 'hold' | 'exit' })[]>([]);

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[events.length - 1];

    setActive(prev => [...prev.slice(-2), { ...latest, dying: false, phase: 'enter' as const }]);

    const t1 = setTimeout(() => {
      setActive(prev => prev.map(e => e.id === latest.id ? { ...e, phase: 'hold' as const } : e));
    }, 300);

    const t2 = setTimeout(() => {
      setActive(prev => prev.map(e => e.id === latest.id ? { ...e, phase: 'exit' as const, dying: true } : e));
    }, 2200);

    const t3 = setTimeout(() => {
      setActive(prev => prev.filter(e => e.id !== latest.id));
    }, 2700);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [events]);

  if (active.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 800,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
    }}>
      {active.map((evt) => (
        <div
          key={evt.id}
          style={{
            textAlign: 'center',
            opacity: evt.dying ? 0 : 1,
            transform: evt.dying
              ? 'scale(0.8) translateY(-20px)'
              : evt.phase === 'enter'
                ? 'scale(0.5) translateY(20px)'
                : 'scale(1) translateY(0)',
            transition: evt.dying
              ? 'opacity 0.4s ease, transform 0.4s ease'
              : evt.phase === 'enter'
                ? 'opacity 0.25s ease, transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)'
                : 'none',
          }}
        >
          {/* Emoji */}
          <div style={{
            fontSize: 48,
            filter: `drop-shadow(0 0 20px ${evt.color})`,
            marginBottom: 8,
            lineHeight: 1,
          }}>
            {evt.comboEmoji}
          </div>

          {/* COMBO! label */}
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 10,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 6,
            textShadow: '2px 2px 0 rgba(0,0,0,0.8)',
          }}>
            ✦ COMBO ✦
          </div>

          {/* Nome do combo */}
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 16,
            color: evt.color,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textShadow: `3px 3px 0 rgba(0,0,0,0.8), 0 0 30px ${evt.color}`,
            lineHeight: 1.3,
            padding: '8px 24px',
            background: 'rgba(0,0,0,0.85)',
            border: `3px solid ${evt.color}`,
            boxShadow: `4px 4px 0 rgba(0,0,0,0.8), 0 0 24px ${evt.color}44`,
            maxWidth: 400,
            wordBreak: 'break-word',
          }}>
            {evt.comboName}
          </div>

          {/* Bônus de dano */}
          {evt.bonusDamage && evt.bonusDamage > 0 && (
            <div style={{
              marginTop: 8,
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 22,
              color: '#ffcc00',
              textShadow: '3px 3px 0 #553300',
            }}>
              +{evt.bonusDamage} 💥
            </div>
          )}

          {/* Streak */}
          {evt.streakBonus && evt.streakBonus > 1 && (
            <div style={{
              marginTop: 4,
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 8,
              color: '#ff8800',
              textShadow: '1px 1px 0 rgba(0,0,0,0.8)',
            }}>
              ×{evt.streakBonus.toFixed(1)} STREAK BONUS!
            </div>
          )}
        </div>
      ))}

      {/* Scanlines overlay */}
      <style>{`
        @keyframes comboShockwave {
          0% { transform: scale(0.5); opacity: 0; }
          40% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.98); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}