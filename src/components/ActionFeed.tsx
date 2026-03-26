'use client';

import { useEffect, useRef, useState } from 'react';
import { CombatLogEntry } from '@/lib/types';

interface ActionFeedProps {
  log: CombatLogEntry[];
}

interface FeedEntry extends CombatLogEntry {
  visible: boolean;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  player_action:  { icon: '⚔️', color: '#a8d8ea', bg: 'rgba(168,216,234,0.08)', border: 'rgba(168,216,234,0.25)' },
  monster_action: { icon: '👹', color: '#f4a261', bg: 'rgba(244,162,97,0.08)',  border: 'rgba(244,162,97,0.25)'  },
  system:         { icon: '📜', color: '#9090b0', bg: 'rgba(144,144,176,0.06)', border: 'rgba(144,144,176,0.15)' },
  level_up:       { icon: '✨', color: '#f0c040', bg: 'rgba(240,192,64,0.1)',   border: 'rgba(240,192,64,0.4)'   },
  death:          { icon: '💀', color: '#e74c3c', bg: 'rgba(231,76,60,0.1)',    border: 'rgba(231,76,60,0.35)'   },
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
      const next = [...prev, ...added].slice(-20);
      return next;
    });

    // Animate in
    newOnes.forEach((_, i) => {
      setTimeout(() => {
        setEntries(prev => {
          const idx = prev.findIndex(e => e.id === newOnes[i].id);
          if (idx === -1) return prev;
          const copy = [...prev];
          copy[idx] = { ...copy[idx], visible: true };
          return copy;
        });
      }, i * 60);
    });
  }, [log]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div style={{
      position: 'fixed',
      right: 16,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 280,
      maxHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      pointerEvents: 'none',
      zIndex: 100,
      overflow: 'hidden',
    }}>
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {entries.slice(-12).map((entry, i) => {
          const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.system;
          const isNew = i >= entries.slice(-12).length - 3;
          return (
            <div
              key={entry.id}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 8,
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 7,
                opacity: entry.visible ? (isNew ? 1 : 0.55) : 0,
                transform: entry.visible ? 'translateX(0)' : 'translateX(30px)',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'auto',
              }}
            >
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
              <span style={{
                fontFamily: '"Crimson Text", serif',
                fontSize: 13,
                color: cfg.color,
                lineHeight: 1.35,
                flex: 1,
              }}>
                {entry.message}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}