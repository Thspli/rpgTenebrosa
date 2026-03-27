'use client';

import { useEffect, useRef, useState } from 'react';
import { CombatLogEntry } from '@/lib/types';

interface ActionFeedProps {
  log: CombatLogEntry[];
}

interface Toast {
  id: string;
  message: string;
  type: CombatLogEntry['type'];
  dying: boolean;
}

const TYPE_CONFIG: Record<string, {
  icon: string;
  color: string;
  border: string;
  bg: string;
  glow: string;
}> = {
  player_action: {
    icon: '⚔️',
    color: '#88aaff',
    border: '#2244aa',
    bg: 'linear-gradient(135deg, rgba(20,30,100,0.92), rgba(10,16,60,0.88))',
    glow: '0 0 18px rgba(68,100,255,0.35)',
  },
  monster_action: {
    icon: '👹',
    color: '#ff8855',
    border: '#aa3300',
    bg: 'linear-gradient(135deg, rgba(100,24,8,0.92), rgba(60,12,4,0.88))',
    glow: '0 0 18px rgba(255,80,20,0.35)',
  },
  system: {
    icon: '📜',
    color: '#8888bb',
    border: '#333366',
    bg: 'rgba(16,16,36,0.88)',
    glow: 'none',
  },
  level_up: {
    icon: '⬆',
    color: '#ffcc00',
    border: '#cc8800',
    bg: 'linear-gradient(135deg, rgba(100,65,0,0.92), rgba(60,36,0,0.88))',
    glow: '0 0 22px rgba(255,200,0,0.5)',
  },
  death: {
    icon: '💀',
    color: '#ff4444',
    border: '#880000',
    bg: 'linear-gradient(135deg, rgba(100,0,0,0.92), rgba(60,0,0,0.88))',
    glow: '0 0 22px rgba(255,0,0,0.4)',
  },
};

// Which log types should show as toasts (skip spammy system messages)
const SHOW_TYPES = new Set(['player_action', 'monster_action', 'level_up', 'death']);

// Filter out very short/boring system lines, only show impactful ones
function shouldShow(entry: CombatLogEntry): boolean {
  if (SHOW_TYPES.has(entry.type)) return true;
  // Show important system messages
  if (entry.type === 'system') {
    const msg = entry.message;
    return (
      msg.includes('ESQUIVA') ||
      msg.includes('CRÍTICO') ||
      msg.includes('EXECUÇÃO') ||
      msg.includes('CONTRA-ATACA') ||
      msg.includes('ENRAIVECEU') ||
      msg.includes('MURALHA') ||
      msg.includes('atordoado') ||
      msg.includes('envenenado') ||
      msg.includes('ressuscita') ||
      msg.includes('Transformação') ||
      msg.includes('TRANSFORMAÇÃO')
    );
  }
  return false;
}

export default function ActionFeed({ log }: ActionFeedProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevLenRef = useRef(0);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (log.length <= prevLenRef.current) return;
    const newEntries = log.slice(prevLenRef.current).filter(shouldShow);
    prevLenRef.current = log.length;

    if (newEntries.length === 0) return;

    // Add toasts staggered
    newEntries.forEach((entry, i) => {
      const toastId = entry.id;
      setTimeout(() => {
        setToasts(prev => {
          // max 4 visible at once — remove oldest if needed
          const trimmed = prev.length >= 4 ? prev.slice(1) : prev;
          return [...trimmed, { id: toastId, message: entry.message, type: entry.type, dying: false }];
        });

        // Start fade-out after 2.8s
        const fadeTimer = setTimeout(() => {
          setToasts(prev => prev.map(t => t.id === toastId ? { ...t, dying: true } : t));
          // Remove after fade
          const removeTimer = setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId));
            timerRefs.current.delete(toastId);
          }, 400);
          timerRefs.current.set(toastId + '_rm', removeTimer);
        }, 2800);

        timerRefs.current.set(toastId, fadeTimer);
      }, i * 120);
    });
  }, [log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach(t => clearTimeout(t));
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 68,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      zIndex: 400,
      pointerEvents: 'none',
      width: 'min(520px, 90vw)',
    }}>
      {toasts.map((toast, idx) => {
        const cfg = TYPE_CONFIG[toast.type] ?? TYPE_CONFIG.system;
        const isNewest = idx === toasts.length - 1;
        const age = idx / Math.max(toasts.length - 1, 1); // 0 = oldest, 1 = newest

        return (
          <div
            key={toast.id}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 14px 7px 10px',
              background: cfg.bg,
              border: `2px solid ${cfg.border}`,
              boxShadow: isNewest ? cfg.glow : 'none',
              opacity: toast.dying ? 0 : (0.35 + age * 0.65),
              transform: toast.dying
                ? 'translateY(-10px) scale(0.95)'
                : isNewest
                  ? 'scale(1)'
                  : `scale(${0.97 - (toasts.length - 1 - idx) * 0.01})`,
              transition: toast.dying
                ? 'opacity 0.38s ease, transform 0.38s ease'
                : 'opacity 0.18s ease, transform 0.18s ease',
              animation: !toast.dying ? 'toastSlideIn 0.22s ease' : 'none',
              backdropFilter: 'blur(4px)',
            }}
          >
            {/* Left accent bar */}
            <div style={{
              width: 3,
              alignSelf: 'stretch',
              background: cfg.color,
              flexShrink: 0,
              opacity: isNewest ? 1 : 0.4,
            }} />

            {/* Icon */}
            <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>
              {cfg.icon}
            </span>

            {/* Message */}
            <span style={{
              fontFamily: "'VT323', monospace",
              fontSize: 18,
              color: cfg.color,
              lineHeight: 1.25,
              flex: 1,
              wordBreak: 'break-word',
              opacity: isNewest ? 1 : 0.75,
            }}>
              {toast.message}
            </span>

            {/* Turn badge — only newest */}
            {isNewest && (
              <span style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 6,
                color: 'rgba(100,100,160,0.6)',
                flexShrink: 0,
                letterSpacing: '0.06em',
              }}>
                T{log.find(e => e.id === toast.id)?.turn ?? ''}
              </span>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}