'use client';

// ═══════════════════════════════════════════════════════════
//  src/components/ComboHUD.tsx
//  Exibe combos disponíveis e streak atual acima do painel de ações
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import type { Player, Monster } from '@/engine/types';

interface ActiveComboDisplay {
  id: string;
  type: string;
  name: string;
  emoji: string;
  color: string;
  turnsLeft: number;
  canDetonate: boolean;
  description: string;
}

interface ComboHUDProps {
  activeCombos: ActiveComboDisplay[];
  comboStreak: number;
  killsThisTurn: number;
  reviveHappenedThisTurn: boolean;
  myPlayer: Player;
  selectedTarget?: Monster | null;
  className?: string;
}

export default function ComboHUD({
  activeCombos,
  comboStreak,
  killsThisTurn,
  reviveHappenedThisTurn,
  myPlayer,
  selectedTarget,
  className = '',
}: ComboHUDProps) {
  const [newComboIds, setNewComboIds] = useState<Set<string>>(new Set());
  const [prevIds, setPrevIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(activeCombos.map(c => c.id));
    const justAdded = new Set([...currentIds].filter(id => !prevIds.has(id)));
    if (justAdded.size > 0) {
      setNewComboIds(justAdded);
      setTimeout(() => setNewComboIds(new Set()), 2000);
    }
    setPrevIds(currentIds);
  }, [activeCombos.map(c => c.id).join(',')]);

  if (activeCombos.length === 0 && comboStreak === 0 && killsThisTurn === 0) return null;

  return (
    <div className={className} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      {/* Streak e kills counter */}
      {(comboStreak > 0 || killsThisTurn > 0) && (
        <div style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
        }}>
          {comboStreak > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              background: 'rgba(255,200,50,0.1)',
              border: '2px solid rgba(255,200,50,0.5)',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 7,
              color: '#ffc832',
              animation: comboStreak >= 3 ? 'comboPulse 1s ease-in-out infinite' : 'none',
              boxShadow: comboStreak >= 3 ? '0 0 12px rgba(255,200,50,0.4)' : 'none',
            }}>
              ⚡ STREAK ×{comboStreak}
              {comboStreak >= 3 && <span style={{ color: '#ff8800' }}>🔥</span>}
            </div>
          )}
          {killsThisTurn > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 9px',
              background: 'rgba(255,68,68,0.1)',
              border: '2px solid rgba(255,68,68,0.4)',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 7,
              color: '#ff4444',
            }}>
              💀 {killsThisTurn} kill{killsThisTurn > 1 ? 's' : ''}
              {killsThisTurn >= 2 && (
                <span style={{ color: '#ffc832', marginLeft: 4 }}>→ +1 = TRIPLO!</span>
              )}
            </div>
          )}
          {reviveHappenedThisTurn && (
            <div style={{
              padding: '3px 9px',
              background: 'rgba(231,76,60,0.1)',
              border: '2px solid rgba(231,76,60,0.5)',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 7,
              color: '#e74c3c',
            }}>
              ✝️ RESSURREIÇÃO ATIVA
            </div>
          )}
        </div>
      )}

      {/* Combos ativos */}
      {activeCombos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 6,
            color: 'rgba(180,180,100,0.6)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}>
            ⚡ Combos Disponíveis
          </div>
          {activeCombos.map(combo => (
            <ComboCard
              key={combo.id}
              combo={combo}
              isNew={newComboIds.has(combo.id)}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes comboPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(255,200,50,0.3); }
          50% { box-shadow: 0 0 18px rgba(255,200,50,0.7); }
        }
        @keyframes comboAppear {
          0% { opacity: 0; transform: translateX(12px) scale(0.9); }
          60% { opacity: 1; transform: translateX(-2px) scale(1.02); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes comboPing {
          0%, 100% { box-shadow: none; }
          50% { box-shadow: 0 0 16px var(--combo-color, #ffc832); }
        }
      `}</style>
    </div>
  );
}

function ComboCard({ combo, isNew }: { combo: ActiveComboDisplay; isNew: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '5px 8px',
      background: `${combo.color}18`,
      border: `2px solid ${combo.color}${combo.canDetonate ? 'cc' : '44'}`,
      boxShadow: combo.canDetonate ? `0 0 8px ${combo.color}44` : 'none',
      animation: isNew ? 'comboAppear 0.4s ease' : combo.canDetonate ? 'comboPing 2s ease-in-out infinite' : 'none',
      '--combo-color': combo.color,
    } as React.CSSProperties}>
      {/* Emoji grande */}
      <span style={{ fontSize: 14, flexShrink: 0 }}>{combo.emoji.split('').slice(0, 2).join('')}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Nome do combo */}
        <div style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 7,
          color: combo.canDetonate ? combo.color : `${combo.color}88`,
          letterSpacing: '0.04em',
          marginBottom: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {combo.canDetonate ? '▶ ' : ''}{combo.name}
        </div>
        {/* Descrição curta */}
        <div style={{
          fontFamily: "'VT323', monospace",
          fontSize: 13,
          color: `${combo.color}66`,
          lineHeight: 1.2,
        }}>
          {combo.description}
        </div>
      </div>

      {/* Timer */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          color: combo.turnsLeft <= 1 ? '#ff4444' : `${combo.color}99`,
        }}>
          {combo.turnsLeft}t
        </div>
        {combo.canDetonate && (
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 5,
            color: combo.color,
            background: `${combo.color}22`,
            padding: '1px 4px',
            border: `1px solid ${combo.color}66`,
            whiteSpace: 'nowrap',
            animation: 'comboPulse 1s ease-in-out infinite',
          }}>
            PRONTO!
          </div>
        )}
      </div>
    </div>
  );
}