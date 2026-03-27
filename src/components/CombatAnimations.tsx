'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CombatLogEntry } from '@/lib/types';

/* ════════════════════════════════════════════════════
   FLOATING DAMAGE NUMBERS — Pixel JRPG Style
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
  damage: {
    color: '#ff4444', outline: '#880000',
    size: 22, prefix: '-', suffix: '',
    font: "'Press Start 2P', monospace",
    shadow: '2px 2px 0 #880000, -1px -1px 0 #880000',
  },
  crit: {
    color: '#ffcc00', outline: '#885500',
    size: 28, prefix: '-', suffix: '!!',
    font: "'Press Start 2P', monospace",
    shadow: '3px 3px 0 #885500, -1px -1px 0 #885500, 0 0 20px rgba(255,200,0,0.8)',
  },
  heal: {
    color: '#44ff88', outline: '#006630',
    size: 20, prefix: '+', suffix: 'HP',
    font: "'Press Start 2P', monospace",
    shadow: '2px 2px 0 #006630, -1px -1px 0 #006630',
  },
  mp: {
    color: '#4488ff', outline: '#001188',
    size: 18, prefix: '+', suffix: 'MP',
    font: "'Press Start 2P', monospace",
    shadow: '2px 2px 0 #001188, -1px -1px 0 #001188',
  },
  miss: {
    color: '#888888', outline: '#333',
    size: 16, prefix: '', suffix: '',
    font: "'Press Start 2P', monospace",
    shadow: '2px 2px 0 #333',
  },
  status: {
    color: '#ffc832', outline: '#885500',
    size: 14, prefix: '', suffix: '',
    font: "'Press Start 2P', monospace",
    shadow: '2px 2px 0 #885500',
  },
};

function extractDamageFromMessage(msg: string): { value: string; type: DmgNumber['type'] } | null {
  const critMatch = msg.match(/Dano:\s*(\d+).*?(Execução|execução|EXECUÇÃO|Crítico|crítico|3x|5x)/i) ||
                    msg.match(/(Execução|EXECUÇÃO|execução).*?(\d+)\s*dano/i);
  if (critMatch) return { value: critMatch[1] ?? critMatch[2], type: 'crit' };

  const dmgMatch = msg.match(/Dano:\s*(\d+)/i) ||
                   msg.match(/(\d+)\s*dano/i) ||
                   msg.match(/→[^:]+:\s*(\d+)\s*dano/i);
  if (dmgMatch) return { value: dmgMatch[1], type: 'damage' };

  const healMatch = msg.match(/\+(\d+)\s*HP/i);
  if (healMatch) return { value: healMatch[1], type: 'heal' };

  const mpMatch = msg.match(/\+(\d+)\s*MP/i);
  if (mpMatch) return { value: mpMatch[1], type: 'mp' };

  const statusMatch = msg.match(/(ESQUIVA|ATORDOADO|ENVENENADO|MALDIÇÃO|CONTRA-ATACA)/i);
  if (statusMatch) return { value: statusMatch[1], type: 'status' };

  return null;
}

function getRandomPosition() {
  return {
    x: 8 + Math.random() * 55,
    y: 12 + Math.random() * 45,
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
    setNumbers(prev => [...prev.slice(-14), ...newNums]);

    newNums.forEach((n, i) => {
      setTimeout(() => {
        setNumbers(prev => prev.map(p => p.id === n.id ? { ...p, dying: true } : p));
        setTimeout(() => setNumbers(prev => prev.filter(p => p.id !== n.id)), 500);
      }, 900 + i * 100);
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
              fontFamily: cfg.font,
              fontSize: cfg.size,
              fontWeight: 900,
              color: cfg.color,
              textShadow: cfg.shadow,
              whiteSpace: 'nowrap',
              letterSpacing: '0.04em',
              imageRendering: 'pixelated' as any,
              opacity: n.dying ? 0 : 1,
              transform: n.dying
                ? `translateY(-50px) scale(0.7)`
                : undefined,
              transition: n.dying ? 'all 0.45s ease' : undefined,
              animation: n.dying
                ? 'none'
                : `${isCrit ? 'critPop' : n.type === 'heal' || n.type === 'mp' ? 'healPop' : 'dmgPop'} 1.2s ease forwards`,
              zIndex: 500,
              userSelect: 'none',
            }}
          >
            {/* Crit label */}
            {isCrit && (
              <div style={{
                fontSize: 8,
                letterSpacing: '0.1em',
                marginBottom: 2,
                textAlign: 'center',
                color: '#ff8800',
                textShadow: '1px 1px 0 #553300',
                animation: 'glitch 0.3s ease',
              }}>
                CRÍTICO!
              </div>
            )}
            {cfg.prefix}{n.value}{cfg.suffix}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   STATUS POPUP BANNERS — Pixel JRPG dialog style
   ════════════════════════════════════════════════════ */

interface StatusBanner {
  id: string;
  text: string;
  icon: string;
  color: string;
  outlineColor: string;
  dying: boolean;
}

const STATUS_PATTERNS: Array<{
  pattern: RegExp;
  icon: string;
  color: string;
  outlineColor: string;
  label: (m: RegExpMatchArray) => string;
}> = [
  { pattern: /EXECUÇÃO|execução/i, icon: '💀', color: '#ff4400', outlineColor: '#550000', label: () => 'EXECUÇÃO!' },
  { pattern: /CRÍTICO|crítico/i, icon: '⚡', color: '#ffcc00', outlineColor: '#664400', label: () => 'CRÍTICO!' },
  { pattern: /ESQUIVA/i, icon: '💨', color: '#44ffdd', outlineColor: '#005544', label: m => 'ESQUIVA!' },
  { pattern: /CONTRA-ATACA/i, icon: '🔄', color: '#ff8800', outlineColor: '#552200', label: () => 'COUNTER!' },
  { pattern: /ENRAIVECEU/i, icon: '🔴', color: '#ff2200', outlineColor: '#660000', label: () => 'FÚRIA!' },
  { pattern: /invulnerável/i, icon: '🛡️', color: '#aabbcc', outlineColor: '#334455', label: () => 'INVULN!' },
  { pattern: /LEVANTOU|ressuscita/i, icon: '✝️', color: '#ffcc00', outlineColor: '#664400', label: () => 'REVIVE!' },
  { pattern: /Nível (\d+)/i, icon: '⬆', color: '#ffcc00', outlineColor: '#664400', label: m => `LV UP! → ${m[1]}` },
  { pattern: /MURALHA/i, icon: '🏰', color: '#ccddee', outlineColor: '#334455', label: () => 'MURALHA!' },
  { pattern: /TRANSFORMAÇÃO/i, icon: '🌟', color: '#ffcc00', outlineColor: '#664400', label: () => 'TRANSFORM!' },
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
              outlineColor: sp.outlineColor,
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
        setTimeout(() => setBanners(prev => prev.filter(p => p.id !== b.id)), 400);
      }, 1800 + i * 200);
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
      gap: 5,
      zIndex: 600,
      pointerEvents: 'none',
    }}>
      {banners.map((b) => (
        <div
          key={b.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            background: '#080814',
            border: `3px solid ${b.color}`,
            boxShadow: `4px 4px 0 ${b.outlineColor}, 0 0 20px ${b.color}44`,
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 11,
            fontWeight: 900,
            color: b.color,
            letterSpacing: '0.08em',
            textShadow: `2px 2px 0 ${b.outlineColor}`,
            imageRendering: 'pixelated' as any,
            opacity: b.dying ? 0 : 1,
            transform: b.dying ? 'scale(0.8) translateY(-6px)' : 'scale(1) translateY(0)',
            transition: 'all 0.35s steps(4, end)',
            animation: b.dying ? 'none' : 'slideInUp 0.2s steps(4, end)',
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
   COMBAT EVENT HOOK
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