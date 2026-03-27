'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CombatLogEntry } from '@/lib/types';

/* ════════════════════════════════════════════════════
   FLOATING DAMAGE NUMBERS
   ════════════════════════════════════════════════════ */

interface DmgNumber {
  id: string;
  value: string;
  type: 'damage' | 'crit' | 'heal' | 'mp' | 'miss' | 'status';
  x: number;
  y: number;
  dying: boolean;
}

const DMG_CONFIGS = {
  damage: { color: '#ff4444', shadow: '#8b0000', size: 22, prefix: '-', suffix: '' },
  crit:   { color: '#ff8800', shadow: '#ff4400', size: 30, prefix: '-', suffix: '!!' },
  heal:   { color: '#2ecc71', shadow: '#1a7a44', size: 20, prefix: '+', suffix: 'HP' },
  mp:     { color: '#3498db', shadow: '#1a4f80', size: 18, prefix: '+', suffix: 'MP' },
  miss:   { color: '#888888', shadow: '#333',    size: 16, prefix: '',  suffix: '' },
  status: { color: '#f0c040', shadow: '#8b6900', size: 16, prefix: '',  suffix: '' },
};

function extractDamageFromMessage(msg: string): { value: string; type: DmgNumber['type'] } | null {
  // Damage patterns
  const critMatch = msg.match(/Dano:\s*(\d+).*?(Execução|execução|EXECUÇÃO|Crítico|crítico|3x|5x)/i) ||
                    msg.match(/(Execução|EXECUÇÃO|execução).*?(\d+)\s*dano/i);
  if (critMatch) return { value: critMatch[1] ?? critMatch[2], type: 'crit' };

  const dmgMatch = msg.match(/Dano:\s*(\d+)/i) ||
                   msg.match(/(\d+)\s*dano/i) ||
                   msg.match(/→[^:]+:\s*(\d+)\s*dano/i);
  if (dmgMatch) return { value: dmgMatch[1], type: 'damage' };

  // Heal patterns
  const healMatch = msg.match(/\+(\d+)\s*HP/i);
  if (healMatch) return { value: healMatch[1], type: 'heal' };

  const mpMatch = msg.match(/\+(\d+)\s*MP/i);
  if (mpMatch) return { value: mpMatch[1], type: 'mp' };

  // Status
  const statusMatch = msg.match(/(ESQUIVA|ATORDOADO|ENVENENADO|MALDIÇÃO|CONTRA-ATACA)/i);
  if (statusMatch) return { value: statusMatch[1], type: 'status' };

  return null;
}

function getRandomPosition() {
  return {
    x: 30 + Math.random() * 40,
    y: 20 + Math.random() * 40,
  };
}

export function FloatingDamageNumbers({ log }: { log: CombatLogEntry[] }) {
  const [numbers, setNumbers] = useState<DmgNumber[]>([]);
  const prevLen = useRef(0);
  const idCounter = useRef(0);

  useEffect(() => {
    if (log.length <= prevLen.current) return;
    const newEntries = log.slice(prevLen.current);
    prevLen.current = log.length;

    const newNums: DmgNumber[] = [];
    for (const entry of newEntries) {
      const extracted = extractDamageFromMessage(entry.message);
      if (!extracted) continue;
      const pos = getRandomPosition();
      newNums.push({
        id: `dmg-${++idCounter.current}`,
        value: extracted.value,
        type: extracted.type,
        x: pos.x,
        y: pos.y,
        dying: false,
      });
    }

    if (newNums.length === 0) return;

    setNumbers(prev => [...prev.slice(-12), ...newNums]);

    newNums.forEach((n, i) => {
      setTimeout(() => {
        setNumbers(prev => prev.map(p => p.id === n.id ? { ...p, dying: true } : p));
        setTimeout(() => {
          setNumbers(prev => prev.filter(p => p.id !== n.id));
        }, 600);
      }, 800 + i * 120);
    });
  }, [log]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 500 }}>
      {numbers.map(n => {
        const cfg = DMG_CONFIGS[n.type];
        const isCrit = n.type === 'crit';
        return (
          <div
            key={n.id}
            style={{
              position: 'absolute',
              left: `${n.x}%`,
              top: `${n.y}%`,
              fontFamily: "'Cinzel', serif",
              fontSize: cfg.size,
              fontWeight: 900,
              color: cfg.color,
              textShadow: `0 0 12px ${cfg.shadow}, 0 2px 4px rgba(0,0,0,0.9), 1px 1px 0 ${cfg.shadow}`,
              whiteSpace: 'nowrap',
              letterSpacing: isCrit ? '0.1em' : '0.03em',
              opacity: n.dying ? 0 : 1,
              transform: n.dying ? `translateY(-60px) scale(0.8)` : undefined,
              transition: n.dying ? 'all 0.5s ease' : undefined,
              animation: n.dying ? 'none' : `${isCrit ? 'critPop' : n.type === 'heal' || n.type === 'mp' ? 'healPop' : 'dmgPop'} 1.1s ease forwards`,
              zIndex: 500,
            }}
          >
            {isCrit && <span style={{ fontSize: cfg.size * 0.55, display: 'block', textAlign: 'center', marginBottom: -4 }}>CRÍTICO</span>}
            {cfg.prefix}{n.value}{cfg.suffix}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   STATUS POPUP BANNERS  (top-center)
   ════════════════════════════════════════════════════ */

interface StatusBanner {
  id: string;
  text: string;
  icon: string;
  color: string;
  dying: boolean;
}

const STATUS_PATTERNS: Array<{ pattern: RegExp; icon: string; color: string; label: (m: RegExpMatchArray) => string }> = [
  { pattern: /EXECUÇÃO|execução/i,    icon: '💀', color: '#ff4400', label: () => 'EXECUÇÃO!' },
  { pattern: /CRÍTICO|crítico/i,      icon: '⚡', color: '#ff8800', label: () => 'CRÍTICO!' },
  { pattern: /ESQUIVA/i,              icon: '💨', color: '#1abc9c', label: m => `ESQUIVA! ${m[0]}` },
  { pattern: /CONTRA-ATACA/i,         icon: '🔄', color: '#e67e22', label: () => 'CONTRA-ATAQUE!' },
  { pattern: /ENRAIVECEU/i,           icon: '🔴', color: '#ff0000', label: m => 'FÚRIA!' },
  { pattern: /invulnerável/i,         icon: '🛡️', color: '#aabbcc', label: () => 'INVULNERÁVEL!' },
  { pattern: /LEVANTOU|ressuscita/i,  icon: '✝️', color: '#f0c040', label: () => 'RESSURREIÇÃO!' },
  { pattern: /Nível (\d+)/i,          icon: '🎉', color: '#f0c040', label: m => `NÍVEL ${m[1]}!` },
  { pattern: /MURALHA/i,              icon: '🏰', color: '#bdc3c7', label: () => 'MURALHA!' },
  { pattern: /TRANSFORMAÇÃO/i,        icon: '🌟', color: '#f0c040', label: () => 'TRANSFORMAÇÃO!' },
  { pattern: /ULTIMATE|ULTIMATE/i,    icon: '⚡', color: '#f0c040', label: () => 'ULTIMATE!' },
];

export function StatusBanners({ log }: { log: CombatLogEntry[] }) {
  const [banners, setBanners] = useState<StatusBanner[]>([]);
  const prevLen = useRef(0);
  const idCounter = useRef(0);

  useEffect(() => {
    if (log.length <= prevLen.current) return;
    const newEntries = log.slice(prevLen.current);
    prevLen.current = log.length;

    const newBanners: StatusBanner[] = [];
    for (const entry of newEntries) {
      if (entry.type === 'system' || entry.type === 'player_action' || entry.type === 'level_up' || entry.type === 'death') {
        for (const sp of STATUS_PATTERNS) {
          const m = entry.message.match(sp.pattern);
          if (m) {
            newBanners.push({
              id: `banner-${++idCounter.current}`,
              text: sp.label(m),
              icon: sp.icon,
              color: sp.color,
              dying: false,
            });
            break;
          }
        }
      }
    }

    if (newBanners.length === 0) return;
    setBanners(prev => [...prev.slice(-3), ...newBanners]);

    newBanners.forEach((b, i) => {
      setTimeout(() => {
        setBanners(prev => prev.map(p => p.id === b.id ? { ...p, dying: true } : p));
        setTimeout(() => setBanners(prev => prev.filter(p => p.id !== b.id)), 500);
      }, 1600 + i * 200);
    });
  }, [log]);

  return (
    <div style={{
      position: 'fixed',
      top: 70,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      zIndex: 600,
      pointerEvents: 'none',
    }}>
      {banners.map((b, i) => (
        <div
          key={b.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 18px',
            background: `linear-gradient(135deg, rgba(0,0,0,0.9), rgba(10,8,25,0.95))`,
            border: `1px solid ${b.color}66`,
            borderRadius: 6,
            boxShadow: `0 0 20px ${b.color}44, 0 4px 20px rgba(0,0,0,0.8)`,
            fontFamily: "'Cinzel', serif",
            fontSize: 13,
            fontWeight: 700,
            color: b.color,
            letterSpacing: '0.15em',
            textShadow: `0 0 16px ${b.color}`,
            opacity: b.dying ? 0 : 1,
            transform: b.dying ? 'translateY(-10px) scale(0.9)' : 'translateY(0) scale(1)',
            transition: 'all 0.4s ease',
            animation: b.dying ? 'none' : 'slideInUp 0.3s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ fontSize: 16 }}>{b.icon}</span>
          {b.text}
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   COMBAT EVENT HOOK  (card flash/shake triggers)
   ════════════════════════════════════════════════════ */

export type CombatEventType = 'hit' | 'crit' | 'heal' | 'death' | 'ult' | 'buff';

export interface CombatEvent {
  entityId: string;
  type: CombatEventType;
  ts: number;
}

export function useCombatEvents(log: CombatLogEntry[]) {
  const [events, setEvents] = useState<CombatEvent[]>([]);
  const prevLen = useRef(0);

  useEffect(() => {
    if (log.length <= prevLen.current) return;
    const newEntries = log.slice(prevLen.current);
    prevLen.current = log.length;

    const newEvts: CombatEvent[] = [];
    for (const e of newEntries) {
      if (e.type === 'death') {
        const nameMatch = e.message.match(/💀 (.+?) foi/);
        if (nameMatch) newEvts.push({ entityId: nameMatch[1], type: 'death', ts: Date.now() });
      }
      if (e.message.match(/EXECUÇÃO|CRÍTICO/i)) {
        newEvts.push({ entityId: 'any', type: 'crit', ts: Date.now() });
      }
      if (e.message.match(/TRANSFORMAÇÃO|ULTIMATE/i)) {
        newEvts.push({ entityId: 'any', type: 'ult', ts: Date.now() });
      }
    }

    if (newEvts.length > 0) setEvents(prev => [...prev.slice(-6), ...newEvts]);
  }, [log]);

  const getEntityEvent = useCallback((entityId: string): CombatEventType | null => {
    const now = Date.now();
    const recent = events.find(e => (e.entityId === entityId || e.entityId === 'any') && now - e.ts < 600);
    return recent?.type ?? null;
  }, [events]);

  return { events, getEntityEvent };
}