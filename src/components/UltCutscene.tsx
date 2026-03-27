'use client';

// ═══════════════════════════════════════════════════════════
//  src/components/UltCutscene.tsx
//  Migrado: usa @/engine/types e @/engine/data
// ═══════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import type { UltCutsceneData } from '@/engine/types';
import { CLASSES } from '@/engine/data';

interface UltCutsceneProps {
  ult: UltCutsceneData;
  onComplete: () => void;
}

export default function UltCutscene({ ult, onComplete }: UltCutsceneProps) {
  const [phase, setPhase] = useState<'intro' | 'lines' | 'name' | 'flash' | 'done'>('intro');
  const [lineIndex, setLineIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);

  const skip = useCallback(() => {
    if (skipped) return;
    setSkipped(true);
    setVisible(false);
    setTimeout(onComplete, 250);
  }, [skipped, onComplete]);

  const isBossUlt = !!(ult as any).isBossUlt;

  useEffect(() => {
    setVisible(true);
    const t1 = setTimeout(() => setPhase('lines'), 400);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (skipped) return;
    if (phase !== 'lines') return;
    if (lineIndex < ult.ultLines.length - 1) {
      const t = setTimeout(() => setLineIndex(i => i + 1), 1000);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setPhase('name'), 1000);
      return () => clearTimeout(t);
    }
  }, [phase, lineIndex, ult.ultLines.length, skipped]);

  useEffect(() => {
    if (phase === 'name') {
      setGlitchActive(true);
      const t = setTimeout(() => setGlitchActive(false), 600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (skipped) return;
    if (phase !== 'name') return;
    const t = setTimeout(() => setPhase('flash'), 1200);
    return () => clearTimeout(t);
  }, [phase, skipped]);

  useEffect(() => {
    if (skipped) return;
    if (phase !== 'flash') return;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 350);
    }, 700);
    return () => clearTimeout(t);
  }, [phase, onComplete, skipped]);

  const cls = !isBossUlt ? CLASSES[ult.classType] : null;
  const bossName = (ult as any).bossName ?? ult.playerName;

  const particles = Array.from({ length: isBossUlt ? 24 : 16 });

  return (
    <div
      onClick={skip}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: ult.ultBg,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s steps(4, end)',
        overflow: 'hidden',
        flexDirection: 'column',
        gap: 0,
        cursor: 'pointer',
        imageRendering: 'pixelated',
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {/* Pixel scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Pixel grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Particles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3 }}>
        {particles.map((_, i) => {
          const size = 4 + (i % 3) * 4;
          const x = 5 + (i * 37) % 90;
          const y = 5 + (i * 53) % 90;
          return (
            <div key={i} style={{
              position: 'absolute', top: `${y}%`, left: `${x}%`,
              width: size, height: size, background: ult.ultColor,
              opacity: (phase === 'lines' || phase === 'name') ? 0.6 + (i % 4) * 0.1 : 0,
              transition: `opacity ${0.2 + (i % 3) * 0.15}s steps(2, end)`,
              imageRendering: 'pixelated',
            }} />
          );
        })}
        {[1, 2, 3].map(i => (
          <div key={`ring-${i}`} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: i * 160, height: i * 160,
            marginLeft: -i * 80, marginTop: -i * 80,
            border: `4px solid ${ult.ultColor}`,
            opacity: phase === 'name' || phase === 'flash' ? (isBossUlt ? 0.5 : 0.3) : 0,
            transform: phase === 'flash' ? `scale(${1.5 + i * 0.3})` : 'scale(1)',
            transition: `all ${0.4 + i * 0.1}s steps(4, end)`,
            imageRendering: 'pixelated',
          }} />
        ))}
      </div>

      {/* Skip hint */}
      <div style={{
        position: 'absolute', bottom: 24, right: 28,
        fontFamily: "'Press Start 2P', monospace", fontSize: 8,
        color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em',
        zIndex: 10, pointerEvents: 'none',
        animation: 'pixelBlink 1.2s step-end infinite',
      }}>
        [CLICK] SKIP ▶
      </div>

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(0,0,0,0.7)',
        borderBottom: `3px solid ${ult.ultColor}44`,
        opacity: phase === 'intro' ? 0 : 1,
        transform: phase === 'intro' ? 'translateY(-14px)' : 'translateY(0)',
        transition: 'all 0.3s steps(4, end)',
        zIndex: 5,
        boxShadow: `0 4px 0 rgba(0,0,0,0.6)`,
      }}>
        <span style={{ fontSize: isBossUlt ? 36 : 28, filter: `drop-shadow(2px 2px 0 ${ult.ultColor}66)` }}>
          {ult.ultEmoji}
        </span>
        <div>
          {isBossUlt ? (
            <>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#ff4444', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3, textShadow: '2px 2px 0 #660000' }}>
                ⚠ BOSS ULTIMATE ⚠
              </div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13, color: '#fff', letterSpacing: '0.06em', textShadow: '2px 2px 0 rgba(0,0,0,0.8)' }}>
                {bossName}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: ult.ultColor, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
                {cls?.name} — ULTIMATE
              </div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: '#fff', letterSpacing: '0.06em', textShadow: '2px 2px 0 rgba(0,0,0,0.8)' }}>
                {ult.playerName}
              </div>
            </>
          )}
        </div>
        <div style={{
          marginLeft: 'auto', fontFamily: "'Press Start 2P', monospace",
          fontSize: 8, color: ult.ultColor, letterSpacing: '0.12em', opacity: 0.7,
        }}>
          {isBossUlt ? '[ DANGER ]' : '[ LIMIT BREAK ]'}
        </div>
      </div>

      {/* Center content */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 28, padding: '0 40px', textAlign: 'center',
        position: 'relative', zIndex: 4, marginTop: 40,
      }}>
        <div style={{
          fontSize: phase === 'name' || phase === 'flash' ? (isBossUlt ? 110 : 96) : (isBossUlt ? 80 : 68),
          filter: `drop-shadow(4px 4px 0 ${ult.ultColor}88) drop-shadow(0 0 ${isBossUlt ? 40 : 30}px ${ult.ultColor})`,
          transition: 'all 0.4s steps(4, end)',
          opacity: phase === 'intro' ? 0 : 1,
          transform: phase === 'flash' ? 'scale(1.3)' : phase === 'name' ? 'scale(1.1)' : 'scale(1)',
          imageRendering: 'pixelated',
          animation: glitchActive ? 'pixelGlitch 0.4s steps(3, end)' : 'none',
        }}>
          {ult.ultEmoji}
        </div>

        <div style={{ minHeight: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          {phase === 'lines' && ult.ultLines.map((line, i) => (
            <div key={i} style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: `clamp(${isBossUlt ? 11 : 9}px, 1.8vw, ${isBossUlt ? 16 : 14}px)`,
              color: i === lineIndex ? (isBossUlt ? '#ff8888' : '#ffffff') : 'rgba(255,255,255,0.25)',
              letterSpacing: '0.06em',
              opacity: i <= lineIndex ? 1 : 0,
              transform: i <= lineIndex ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 0.25s steps(3, end)',
              textShadow: i === lineIndex ? `2px 2px 0 ${ult.ultColor}88` : 'none',
              padding: '2px 0',
              borderBottom: i === lineIndex ? `2px solid ${ult.ultColor}44` : 'none',
            }}>
              {i === lineIndex && <span style={{ marginRight: 8, animation: 'pixelBlink 0.5s step-end infinite', color: ult.ultColor }}>▶</span>}
              {line}
            </div>
          ))}
        </div>

        {(phase === 'name' || phase === 'flash') && (
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: `clamp(${isBossUlt ? 18 : 15}px, 4vw, ${isBossUlt ? 42 : 36}px)`,
            fontWeight: 900,
            color: ult.ultColor,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textShadow: `4px 4px 0 rgba(0,0,0,0.8), 0 0 30px ${ult.ultColor}`,
            animation: phase === 'flash' ? 'none' : 'ultPixelPulse 0.4s steps(3, end) infinite alternate',
            opacity: phase === 'flash' ? 0 : 1,
            transition: 'opacity 0.3s steps(3, end)',
            lineHeight: 1.2,
          }}>
            {isBossUlt && (
              <div style={{ fontSize: '55%', marginBottom: 6, color: '#ff4444', textShadow: '2px 2px 0 #660000' }}>⚠ WARNING ⚠</div>
            )}
            {ult.ultName}
          </div>
        )}

        {phase === 'flash' && (
          <div style={{
            position: 'fixed', inset: 0,
            background: ult.ultColor,
            animation: 'pixelFlash 0.6s steps(4, end) forwards',
            pointerEvents: 'none', zIndex: 8,
          }} />
        )}
      </div>

      {/* Bottom accent bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: isBossUlt ? 6 : 4,
        background: `repeating-linear-gradient(90deg, ${ult.ultColor} 0px, ${ult.ultColor} 8px, transparent 8px, transparent 16px)`,
        opacity: phase !== 'intro' ? 1 : 0,
        transition: 'opacity 0.3s steps(2, end)',
        zIndex: 5,
      }} />

      <style>{`
        @keyframes pixelBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes pixelFlash { 0%{opacity:0} 20%{opacity:0.9} 50%{opacity:0.6} 100%{opacity:0} }
        @keyframes ultPixelPulse { from{letter-spacing:0.08em} to{letter-spacing:0.14em} }
        @keyframes pixelGlitch {
          0%  {transform:scale(1) translate(0,0);filter:hue-rotate(0deg)}
          25% {transform:scale(1.05) translate(-4px,2px);filter:hue-rotate(90deg) saturate(2)}
          50% {transform:scale(0.98) translate(4px,-2px);filter:hue-rotate(-90deg) saturate(2)}
          75% {transform:scale(1.02) translate(-2px,-2px);filter:hue-rotate(45deg)}
          100%{transform:scale(1) translate(0,0);filter:hue-rotate(0deg)}
        }
      `}</style>
    </div>
  );
}