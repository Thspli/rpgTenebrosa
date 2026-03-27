'use client';

import { useEffect, useRef, useState } from 'react';
import { CombatLogEntry } from '@/lib/types';

interface ActionFeedProps {
  log: CombatLogEntry[];
}

interface FeedEntry extends CombatLogEntry {
  visible: boolean;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string; glow: string }> = {
  player_action:  {
    icon: '⚔️',
    color: '#a8d8ea',
    bg: 'linear-gradient(135deg, rgba(168,216,234,0.06), rgba(52,152,219,0.04))',
    border: 'rgba(168,216,234,0.2)',
    glow: 'none',
  },
  monster_action: {
    icon: '👹',
    color: '#f4a261',
    bg: 'linear-gradient(135deg, rgba(244,162,97,0.07), rgba(192,57,43,0.04))',
    border: 'rgba(244,162,97,0.22)',
    glow: 'none',
  },
  system: {
    icon: '📜',
    color: '#6a6a8a',
    bg: 'rgba(30,30,60,0.4)',
    border: 'rgba(80,80,120,0.15)',
    glow: 'none',
  },
  level_up: {
    icon: '✨',
    color: '#f0c040',
    bg: 'linear-gradient(135deg, rgba(240,192,64,0.1), rgba(212,160,23,0.06))',
    border: 'rgba(240,192,64,0.45)',
    glow: '0 0 12px rgba(240,192,64,0.3)',
  },
  death: {
    icon: '💀',
    color: '#e74c3c',
    bg: 'linear-gradient(135deg, rgba(231,76,60,0.1), rgba(139,0,0,0.08))',
    border: 'rgba(231,76,60,0.4)',
    glow: '0 0 12px rgba(231,76,60,0.3)',
  },
};

export default function ActionFeed({ log }: ActionFeedProps) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const prevLenRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (log.length === prevLenRef.current) return;
    const newOnes = log.slice(prevLenRef.current);
    prevLenRef.current = log.length;

    setEntries(prev => {
      const added = newOnes.map(e => ({ ...e, visible: false }));
      return [...prev, ...added].slice(-20);
    });

    newOnes.forEach((_, i) => {
      setTimeout(() => {
        setEntries(prev => {
          const idx = prev.findIndex(e => e.id === newOnes[i].id);
          if (idx === -1) return prev;
          const copy = [...prev];
          copy[idx] = { ...copy[idx], visible: true };
          return copy;
        });
      }, i * 70);
    });
  }, [log]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries]);

  const visible = entries.slice(-14);

  return (
    <div style={{
      position: 'fixed',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 270,
      maxHeight: '58vh',
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'none',
      zIndex: 100,
    }}>
      {/* Header */}
      <div style={{
        fontFamily: "'Cinzel', serif",
        fontSize: 9,
        letterSpacing: '0.22em',
        color: 'rgba(160,160,200,0.5)',
        textTransform: 'uppercase',
        padding: '0 2px 6px',
        borderBottom: '1px solid rgba(80,80,130,0.2)',
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(212,160,23,0.6)', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
        Registro de Ações
      </div>

      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {visible.map((entry, i) => {
          const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.system;
          const age = i / visible.length; // 0 = oldest, 1 = newest
          const opacity = 0.28 + age * 0.72;

          return (
            <div
              key={entry.id}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 5,
                padding: '5px 9px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 7,
                opacity: entry.visible ? opacity : 0,
                transform: entry.visible ? 'translateX(0)' : 'translateX(32px)',
                transition: 'all 0.3s cubic-bezier(0.175,0.885,0.32,1)',
                backdropFilter: 'blur(6px)',
                boxShadow: cfg.glow,
                pointerEvents: 'auto',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Shimmer for latest entries */}
              {i === visible.length - 1 && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(90deg, transparent, ${cfg.color}10, transparent)`,
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease forwards',
                  pointerEvents: 'none',
                }} />
              )}
              <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontFamily: "'IM Fell English', serif",
                  fontSize: 12,
                  color: cfg.color,
                  lineHeight: 1.4,
                  display: 'block',
                }}>
                  {entry.message}
                </span>
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 8,
                  color: 'rgba(120,120,160,0.5)',
                  letterSpacing: '0.1em',
                }}>
                  T{entry.turn}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}