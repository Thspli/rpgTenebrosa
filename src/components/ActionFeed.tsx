'use client';

import { useEffect, useRef, useState } from 'react';
import { CombatLogEntry } from '@/lib/types';

interface ActionFeedProps {
  log: CombatLogEntry[];
}

interface FeedEntry extends CombatLogEntry {
  visible: boolean;
}

const TYPE_CONFIG: Record<string, {
  icon: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  labelColor: string;
  label: string;
}> = {
  player_action: {
    icon: '⚔️',
    color: '#6699ff',
    bg: 'linear-gradient(135deg, rgba(30,40,100,0.7), rgba(20,30,80,0.5))',
    border: '#2244aa',
    glow: 'none',
    labelColor: '#4466cc',
    label: 'ACTION',
  },
  monster_action: {
    icon: '👹',
    color: '#ff7744',
    bg: 'linear-gradient(135deg, rgba(100,30,10,0.7), rgba(80,20,5,0.5))',
    border: '#aa3300',
    glow: 'none',
    labelColor: '#882200',
    label: 'ENEMY',
  },
  system: {
    icon: '📜',
    color: '#6666aa',
    bg: 'rgba(20,20,40,0.6)',
    border: '#333366',
    glow: 'none',
    labelColor: '#444466',
    label: 'SYS',
  },
  level_up: {
    icon: '⬆',
    color: '#ffcc00',
    bg: 'linear-gradient(135deg, rgba(100,70,0,0.7), rgba(60,40,0,0.5))',
    border: '#cc8800',
    glow: '3px 3px 0 #553300, 0 0 12px rgba(255,200,0,0.4)',
    labelColor: '#aa7700',
    label: 'LEVEL',
  },
  death: {
    icon: '💀',
    color: '#ff4444',
    bg: 'linear-gradient(135deg, rgba(100,0,0,0.7), rgba(60,0,0,0.5))',
    border: '#880000',
    glow: '3px 3px 0 #440000, 0 0 12px rgba(255,0,0,0.3)',
    labelColor: '#660000',
    label: 'DEFEAT',
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
      return [...prev, ...added].slice(-18);
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
      }, i * 60);
    });
  }, [log]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries]);

  const visible = entries.slice(-12);

  return (
    <div style={{
      position: 'fixed',
      right: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 260,
      maxHeight: '54vh',
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'none',
      zIndex: 100,
      imageRendering: 'pixelated',
    }}>
      {/* Header — pixel style */}
      <div style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 7,
        letterSpacing: '0.12em',
        color: 'rgba(100,100,180,0.55)',
        textTransform: 'uppercase',
        padding: '0 2px 5px',
        borderBottom: '2px solid #1e1e42',
        marginBottom: 5,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        textShadow: '1px 1px 0 rgba(0,0,0,0.8)',
      }}>
        {/* Pixel blinking dot */}
        <span style={{
          width: 6, height: 6,
          background: '#ffcc00',
          boxShadow: '0 0 6px rgba(255,200,0,0.6)',
          display: 'inline-block',
          animation: 'pixelBlink 1s step-end infinite',
          imageRendering: 'pixelated',
        }} />
        BATTLE LOG
      </div>

      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {visible.map((entry, i) => {
          const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.system;
          const age = i / visible.length;
          const opacity = 0.22 + age * 0.78;
          const isNewest = i === visible.length - 1;

          return (
            <div
              key={entry.id}
              style={{
                background: cfg.bg,
                border: `2px solid ${cfg.border}`,
                padding: '4px 7px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 5,
                opacity: entry.visible ? opacity : 0,
                transform: entry.visible
                  ? 'translateX(0)'
                  : 'translateX(28px)',
                transition: 'all 0.25s steps(6, end)',
                boxShadow: isNewest ? cfg.glow : 'none',
                pointerEvents: 'auto',
                position: 'relative',
                overflow: 'hidden',
                imageRendering: 'pixelated',
              }}
            >
              {/* Newest entry highlight */}
              {isNewest && (
                <div style={{
                  position: 'absolute',
                  left: 0, top: 0, bottom: 0,
                  width: 3,
                  background: cfg.color,
                  animation: 'pixelBlink 0.5s step-end 3',
                }} />
              )}

              {/* Icon + label column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontSize: 10 }}>{cfg.icon}</span>
                <span style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 4,
                  color: cfg.labelColor,
                  letterSpacing: '0.06em',
                  textShadow: '1px 1px 0 rgba(0,0,0,0.8)',
                }}>
                  {cfg.label}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Turn indicator */}
                <div style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 5,
                  color: 'rgba(80,80,140,0.5)',
                  letterSpacing: '0.06em',
                  marginBottom: 1,
                }}>
                  T{entry.turn}
                </div>
                {/* Message */}
                <span style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: 15,
                  color: cfg.color,
                  lineHeight: 1.3,
                  display: 'block',
                  wordBreak: 'break-word',
                }}>
                  {entry.message}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pixelBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}