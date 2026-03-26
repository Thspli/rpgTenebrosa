'use client';

import { useEffect, useState } from 'react';

export interface PopupEvent {
  id: string;
  text: string;
  color: string;
  emoji?: string;
  x?: number;
  y?: number;
  big?: boolean;
}

interface FloatingPopupsProps {
  events: PopupEvent[];
}

export default function FloatingPopups({ events }: FloatingPopupsProps) {
  const [active, setActive] = useState<(PopupEvent & { dying: boolean })[]>([]);

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[events.length - 1];
    setActive(prev => [...prev.slice(-8), { ...latest, dying: false }]);

    const t1 = setTimeout(() => {
      setActive(prev => prev.map(e => e.id === latest.id ? { ...e, dying: true } : e));
    }, 1400);
    const t2 = setTimeout(() => {
      setActive(prev => prev.filter(e => e.id !== latest.id));
    }, 1800);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [events]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200 }}>
      {active.map((ev, i) => (
        <div
          key={ev.id}
          style={{
            position: 'absolute',
            top: ev.y ?? `${25 + (i % 6) * 9}%`,
            left: ev.x ?? '50%',
            transform: 'translateX(-50%)',
            fontFamily: '"Cinzel", serif',
            fontSize: ev.big ? 28 : 18,
            fontWeight: 700,
            color: ev.color,
            textShadow: `0 0 20px ${ev.color}, 0 2px 4px rgba(0,0,0,0.9)`,
            whiteSpace: 'nowrap',
            opacity: ev.dying ? 0 : 1,
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            animation: ev.dying ? 'none' : 'popupFloat 1.6s ease forwards',
            letterSpacing: '0.05em',
          }}
        >
          {ev.emoji && <span style={{ marginRight: 6 }}>{ev.emoji}</span>}
          {ev.text}
        </div>
      ))}
      <style>{`
        @keyframes popupFloat {
          0%   { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.8); }
          15%  { opacity: 1; transform: translateX(-50%) translateY(0px) scale(1.05); }
          40%  { opacity: 1; transform: translateX(-50%) translateY(-8px) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}