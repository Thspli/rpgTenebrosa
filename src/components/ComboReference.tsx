'use client';

// ═══════════════════════════════════════════════════════════
//  src/components/ComboReference.tsx
//  Tela de referência dos combos — abre ao clicar "?" no combat
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import type { GameState } from '@/engine/types';

interface ComboReferenceProps {
  gameState: GameState;
  myId: string;
}

const COMBO_DATA = [
  {
    id: 'elemental_chain',
    name: 'CADEIA ELEMENTAL',
    emoji: '⚡🔥❄️',
    color: '#e67e22',
    who: 'Elementalista + Mago',
    primer: '❄️ Aplicar Lentidão em inimigo',
    detonator: '🔥 Usar qualquer magia de dano',
    effect: 'Dano elemental ×1.8 (ignora DEF)',
    tip: 'Use Lança de Gelo → troque para o Mago!',
  },
  {
    id: 'shadow_execution',
    name: 'EXECUÇÃO DAS SOMBRAS',
    emoji: '🔮💀',
    color: '#8e44ad',
    who: 'Necromante + Assassino',
    primer: '🔮 Necromante usa Maldição Profunda',
    detonator: '🌙 Assassino ataca',
    effect: 'Dano ×3.0 (DEF=0). O mais poderoso!',
    tip: 'Combo base do Assassino. Sempre priorize inimigos malditos!',
  },
  {
    id: 'inspired_battle',
    name: 'BATALHA INSPIRADA',
    emoji: '🎵⚔️',
    color: '#d35400',
    who: 'Bardo + Guerreiro/Berserker',
    primer: '🎸 Bardo usa Melodia Inspiradora',
    detonator: '⚔️ Guerreiro ou Berserker ataca',
    effect: 'Golpe bônus automático ×1.5',
    tip: 'Funciona a cada turno enquanto estiver inspirado!',
  },
  {
    id: 'holy_shield',
    name: 'ESCUDO SAGRADO',
    emoji: '🗿🛡️',
    color: '#7f8c8d',
    who: 'Guardião + Paladino/Druida',
    primer: '🏰 Guardião usa Muralha',
    detonator: '💚 Paladino/Druida cura aliado',
    effect: '+40 HP bônus em TODOS os curados',
    tip: 'Muralha + Bênção Divina = cura o dobro!',
  },
  {
    id: 'venom_spirit',
    name: 'VENENO ESPIRITUAL',
    emoji: '☠️🌀',
    color: '#5f9ea0',
    who: 'Ladino/Assassino + Xamã',
    primer: '☠️ Envenenar inimigo',
    detonator: '🌀 Xamã usa Raiva Ancestral ou liberar cargas',
    effect: 'Veneno explode: turnsLeft × valor ×2.2',
    tip: 'Quanto mais turnos de veneno, mais a explosão dói!',
  },
  {
    id: 'soul_explosion',
    name: 'EXPLOSÃO DE ALMAS',
    emoji: '💀💥',
    color: '#9b2c9b',
    who: 'Necromante (solo)',
    primer: '💀 Acumular 3+ Almas (matando inimigos)',
    detonator: '🌑 Qualquer ataque do Necromante',
    effect: 'AoE em TODOS: ATK × almas ×0.4/stack',
    tip: 'Mate inimigos fracos primeiro para acumular almas!',
  },
  {
    id: 'beast_rage',
    name: 'FÚRIA BESTIAL',
    emoji: '🐾💢',
    color: '#a0522d',
    who: 'Animalista + Berserker',
    primer: '🐾 Animalista com 2+ animais invocados',
    detonator: '😡 Berserker usa Frenesi ou Ira Sanguinária',
    effect: 'Animais atacam em área junto com o Berserker!',
    tip: 'Mais animais = mais dano! Chame Lobo+Urso antes!',
  },
  {
    id: 'illusion_shadow',
    name: 'SOMBRA ILUSÓRIA',
    emoji: '👤🌑',
    color: '#da70d6',
    who: 'Ilusionista + Ladino/Assassino',
    primer: '👤 Ilusionista usa Clone Ilusório',
    detonator: '🗡️ Ladino ou Assassino ataca o MESMO alvo',
    effect: '3 hits simultâneos (DEF=0 em todos)',
    tip: 'Clone cria confusão — o inimigo não sabe onde atacar!',
  },
  {
    id: 'triple_kill_momentum',
    name: 'MOMENTUM TRIPLO',
    emoji: '✨✨✨',
    color: '#ffc832',
    who: 'Qualquer grupo',
    primer: '💀 2 kills no turno atual dos jogadores',
    detonator: '💀 Qualquer kill que seja a 3ª',
    effect: 'ATAQUE SINCRONIZADO GRÁTIS de todo o grupo!',
    tip: 'Combine com AoE para matar 3 de uma vez!',
  },
  {
    id: 'resurrection_fury',
    name: 'FÚRIA SAGRADA',
    emoji: '✝️🩸',
    color: '#e74c3c',
    who: 'Paladino/Druida + Berserker/Guerreiro',
    primer: '✝️ Paladino ou Druida ressuscita aliado',
    detonator: '⚔️ Berserker ou Guerreiro ataca no mesmo turno',
    effect: '×2.5 dano sagrado (DEF=0)',
    tip: 'Reviver um Berserker já desencadeia automaticamente!',
  },
];

export default function ComboReference({ gameState, myId }: ComboReferenceProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const myPlayer = gameState.players[myId];
  const aliveClasses = Object.values(gameState.players)
    .filter(p => p.isAlive)
    .map(p => p.classType);

  // Destacar combos que o grupo atual pode fazer
  function isGroupCombo(combo: typeof COMBO_DATA[0]): boolean {
    const required = combo.who.split('+').map(s => s.trim().toLowerCase());
    return required.every(req =>
      aliveClasses.some(cls =>
        req.includes(cls) ||
        req.includes('qualquer')
      )
    );
  }

  const grouped = {
    available: COMBO_DATA.filter(c => isGroupCombo(c)),
    other: COMBO_DATA.filter(c => !isGroupCombo(c)),
  };

  return (
    <>
      {/* Botão ? */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 120,
          right: 16,
          width: 36,
          height: 36,
          background: 'rgba(255,200,50,0.12)',
          border: '2px solid rgba(255,200,50,0.4)',
          color: '#ffc832',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 11,
          cursor: 'pointer',
          boxShadow: '3px 3px 0 rgba(0,0,0,0.6)',
          zIndex: 300,
          transition: 'all 0.1s ease',
        }}
        title="Tabela de Combos"
      >
        ?
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{
            background: '#0e0e1c',
            border: '3px solid #3a3a70',
            maxWidth: 680,
            width: '100%',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '8px 8px 0 rgba(0,0,0,0.8)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 18px',
              borderBottom: '3px solid #2a2a50',
              background: '#0a0a18',
            }}>
              <div>
                <div style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 11,
                  color: '#ffc832',
                  letterSpacing: '0.06em',
                  textShadow: '2px 2px 0 #553300',
                }}>
                  ⚡ COMBOS & REAÇÕES
                </div>
                <div style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: 16,
                  color: 'rgba(120,120,180,0.6)',
                  marginTop: 3,
                }}>
                  Aplique efeitos e deixe aliados detonar combos!
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,68,68,0.1)',
                  border: '2px solid rgba(255,68,68,0.4)',
                  color: '#ff4444',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0 rgba(0,0,0,0.6)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ overflowY: 'auto', padding: '12px 18px', flex: 1 }}>
              {/* Combos do grupo */}
              {grouped.available.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 7,
                    color: '#44ff88',
                    letterSpacing: '0.1em',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <span style={{ width: 8, height: 8, background: '#44ff88', display: 'inline-block' }} />
                    DISPONÍVEIS COM SEU GRUPO
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {grouped.available.map(combo => (
                      <ComboRow key={combo.id} combo={combo} available />
                    ))}
                  </div>
                </div>
              )}

              {/* Outros combos */}
              {grouped.other.length > 0 && (
                <div>
                  <div style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 7,
                    color: 'rgba(100,100,160,0.5)',
                    letterSpacing: '0.1em',
                    marginBottom: 8,
                    marginTop: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <span style={{ width: 8, height: 8, background: 'rgba(100,100,160,0.3)', display: 'inline-block' }} />
                    OUTROS COMBOS (requer mais classes)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {grouped.other.map(combo => (
                      <ComboRow key={combo.id} combo={combo} available={false} />
                    ))}
                  </div>
                </div>
              )}

              {/* Streak info */}
              <div style={{
                marginTop: 16,
                padding: '10px 14px',
                background: 'rgba(255,200,50,0.06)',
                border: '2px solid rgba(255,200,50,0.2)',
              }}>
                <div style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 7,
                  color: '#ffc832',
                  marginBottom: 6,
                }}>
                  ⚡ SISTEMA DE STREAK
                </div>
                <div style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: 16,
                  color: 'rgba(140,140,200,0.7)',
                  lineHeight: 1.5,
                }}>
                  Cada combo que você detona acumula STREAK. Com streak alto, todos os combos subsequentes causam +15% de dano por stack! Combo encadeados são devastadores. Ao ficar um turno sem combos, o streak cai.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ComboRow({ combo, available }: { combo: typeof COMBO_DATA[0]; available: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: available ? `${combo.color}10` : 'rgba(20,20,40,0.6)',
        border: `2px solid ${available ? combo.color + '55' : '#2a2a50'}`,
        padding: '8px 12px',
        cursor: 'pointer',
        transition: 'all 0.1s ease',
        boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{combo.emoji.slice(0, 4)}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 8,
            color: available ? combo.color : 'rgba(100,100,160,0.5)',
            letterSpacing: '0.04em',
          }}>
            {combo.name}
          </div>
          <div style={{
            fontFamily: "'VT323', monospace",
            fontSize: 15,
            color: 'rgba(120,120,180,0.6)',
            marginTop: 1,
          }}>
            {combo.who}
          </div>
        </div>
        <span style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          color: 'rgba(80,80,140,0.5)',
        }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: `1px solid ${combo.color}33`,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}>
          <DetailRow label="PRIMER" value={combo.primer} color={combo.color} />
          <DetailRow label="DETONADOR" value={combo.detonator} color={combo.color} />
          <DetailRow label="EFEITO" value={combo.effect} color="#ffc832" />
          <div style={{
            marginTop: 4,
            padding: '5px 8px',
            background: 'rgba(255,200,50,0.06)',
            border: '1px solid rgba(255,200,50,0.2)',
          }}>
            <span style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 6,
              color: '#ffc832',
              marginRight: 6,
            }}>💡 DICA:</span>
            <span style={{
              fontFamily: "'VT323', monospace",
              fontSize: 15,
              color: 'rgba(200,200,150,0.7)',
            }}>
              {combo.tip}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 6,
        color: 'rgba(100,100,160,0.5)',
        width: 64,
        flexShrink: 0,
        paddingTop: 2,
        letterSpacing: '0.04em',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'VT323', monospace",
        fontSize: 17,
        color: `${color}cc`,
        lineHeight: 1.3,
      }}>
        {value}
      </span>
    </div>
  );
}