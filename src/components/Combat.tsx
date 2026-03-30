'use client';

// ═══════════════════════════════════════════════════════════
//  src/components/Combat.tsx
//  Migrado: usa @/engine/types, @/engine/data, @/engine/skills
//  Buffs lidos via getPlayerBuffs() de @/lib/index
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, Monster, Player } from '@/engine/types';
import { CLASSES, MAPS } from '@/engine/data';
import { CLASS_SKILLS } from '@/engine/skills';
import { getPlayerBuffs } from '@/lib/index';
import styles from './Combat.module.css';
import UltCutscene from './UltCutscene';
import ActionFeed from './ActionFeed';
import { FloatingDamageNumbers, StatusBanners } from './CombatAnimations';

import { TRANSFORMS } from '@/engine/transformData';

interface Props {
  gameState: GameState;
  myId: string;
  onAction: (action: { type: string; targetId?: string; skillIndex?: number; itemId?: string }) => void;
  onReset: () => void;
  onClearUlt: () => void;
  onTransform: () => void;
}

type TargetMode = 'enemy' | 'ally';

export default function Combat({ gameState, myId, onAction, onReset, onClearUlt, onTransform }: Props) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedSkillIdx, setSelectedSkillIdx] = useState<number | null>(null);
  const [targetMode, setTargetMode] = useState<TargetMode>('enemy');
  const [showingUlt, setShowingUlt] = useState(false);
  const [flashMap, setFlashMap] = useState<Record<string, 'hit' | 'heal' | null>>({});
  const logScrollRef = useRef<HTMLDivElement>(null);
  const prevLogLen = useRef(0);

  const myPlayer   = gameState.players[myId];
  // engine usa .monsters (não .currentMonsters)
  const monsters   = gameState.monsters ?? [];
  const mapDef     = MAPS.find(m => m.id === gameState.currentMap);
  const isMyTurn   = gameState.activePlayerId === myId;
  const canAct     = !!(myPlayer?.isAlive && isMyTurn && gameState.phase === 'combat');
  const aliveM     = monsters.filter(m => m.hp > 0 && !m.isSummon);
  const enemyMonsters  = monsters.filter(m => !m.isSummon);
  const alliedSummons  = monsters.filter(m => m.isSummon && m.hp > 0);
  const activePl   = gameState.activePlayerId ? gameState.players[gameState.activePlayerId] : null;

  // Buffs via helper de compatibilidade
  const myBuffs = myPlayer ? getPlayerBuffs(myPlayer) : null;

  const myPotions  = myPlayer?.inventory.filter(i => i.consumable && (i.quantity ?? 0) > 0) ?? [];
  const isTransformed  = (myBuffs?.transformTurnsLeft ?? 0) > 0;
  const transform      = myPlayer ? TRANSFORMS[myPlayer.classType] : null;
  const hasTransformItem = myPlayer?.inventory.some(i => i.isTransformItem) ?? false;
  const canTransform   = hasTransformItem && !myBuffs?.transformUsedThisCombat && !isTransformed;
  const currentSkills  = isTransformed && transform
    ? transform.skillOverrides
    : (myPlayer ? CLASS_SKILLS[myPlayer.classType] ?? [] : []);
  const selectedSkill  = selectedSkillIdx !== null ? currentSkills[selectedSkillIdx] : null;

  // No engine novo, skills têm .target ao invés de .targetAlly
  const needsAllyTarget  = !!(selectedSkill && ('target' in selectedSkill
    ? selectedSkill.target === 'ally' || selectedSkill.target === 'ally_aoe'
    : (selectedSkill as any).targetAlly));
  const needsEnemyTarget = !!(selectedSkill && !needsAllyTarget &&
    ('target' in selectedSkill
      ? selectedSkill.target === 'enemy'
      : !!(selectedSkill as any).damage));

  // Auto-scroll log
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [gameState.combatLog.length]);

  // Flash ao acertar monstros
  useEffect(() => {
    if (gameState.combatLog.length <= prevLogLen.current) return;
    const newEntries = gameState.combatLog.slice(prevLogLen.current);
    prevLogLen.current = gameState.combatLog.length;

    const newFlashes: Record<string, 'hit' | 'heal'> = {};
    for (const entry of newEntries) {
      if ((entry.type === 'player_action' || entry.type === 'system') && entry.message.match(/Dano:|dano/i)) {
        for (const m of monsters) {
          if (entry.message.includes(m.name)) newFlashes[m.id] = 'hit';
        }
      }
    }

    if (Object.keys(newFlashes).length > 0) {
      setFlashMap(prev => ({ ...prev, ...newFlashes }));
      setTimeout(() => {
        setFlashMap(prev => {
          const next = { ...prev };
          Object.keys(newFlashes).forEach(k => { next[k] = null; });
          return next;
        });
      }, 450);
    }
  }, [gameState.combatLog.length]);

  useEffect(() => {
    if (gameState.activeUlt && !showingUlt) setShowingUlt(true);
  }, [gameState.activeUlt]);

  const handleUltComplete = useCallback(() => {
    setShowingUlt(false);
    onClearUlt();
  }, [onClearUlt]);

  function pickSkill(i: number) {
    if (selectedSkillIdx === i) { setSelectedSkillIdx(null); setSelectedTarget(null); return; }
    const sk = currentSkills[i];
    const ally = 'target' in sk
      ? sk.target === 'ally' || sk.target === 'ally_aoe'
      : !!(sk as any).targetAlly;
    setSelectedSkillIdx(i);
    setSelectedTarget(null);
    setTargetMode(ally ? 'ally' : 'enemy');
  }

  function doAttack() {
    if (!canAct || !selectedTarget) return;
    onAction({ type: 'attack', targetId: selectedTarget });
    setSelectedTarget(null);
  }

  function doSkill() {
    if (!canAct || selectedSkillIdx === null) return;
    const needsAny = needsAllyTarget || needsEnemyTarget;
    if (needsAny && !selectedTarget) return;
    onAction({ type: 'skill', skillIndex: selectedSkillIdx, targetId: selectedTarget ?? undefined });
    setSelectedSkillIdx(null);
    setSelectedTarget(null);
    setTargetMode('enemy');
  }

  if (showingUlt && gameState.activeUlt) {
    return <UltCutscene ult={gameState.activeUlt} onComplete={handleUltComplete} />;
  }

  if (gameState.phase === 'defeat') {
    return (
      <div className={styles.endScreen}>
        <div className={styles.endCard}>
          <span className={styles.endIcon}>💀</span>
          <h2 className={styles.endTitle}>DERROTA</h2>
          <p className={styles.endSubtitle}>O grupo foi aniquilado pelas forças das trevas...</p>
          <div className={styles.endLog}>
            {gameState.combatLog.slice(-8).map(e => (
              <div key={e.id} className={`${styles.logLine} ${styles['log_' + e.type]}`}>{e.message}</div>
            ))}
          </div>
          <button className={styles.resetBtn} onClick={onReset}>🔄 Nova Partida</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <FloatingDamageNumbers log={gameState.combatLog} />
      <StatusBanners log={gameState.combatLog} />
      <ActionFeed log={gameState.combatLog} />

      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.mapBadge}>{mapDef?.theme} {mapDef?.name}</span>
          <span className={styles.metaBadge}>Turno {gameState.turn}</span>
          <span className={styles.metaBadge}>Onda {gameState.waveNumber}</span>
        </div>
        <div className={styles.headerRight}>
          {activePl && (
            <span className={styles.activeTurnBadge}>
              ⚡ {activePl.name} {CLASSES[activePl.classType].emoji}
            </span>
          )}
          {/* REMOVIDO: Badge da loja foi removido pois loja intermediária foi desabilitada */}
          {/* <span className={styles.shopBadge}>🛒 {gameState.shopCountdown}t</span> */}
          <span className={styles.coinsBadge}>💰 {gameState.groupCoins}</span>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className={styles.mainArea}>

        {/* BATTLEFIELD */}
        <div className={styles.battlefield}>
          <div className={styles.sectionLabel}>
            Inimigos
            {canAct && targetMode === 'enemy' && (
              <span style={{ color: 'rgba(220,60,40,0.8)', fontSize: 9, letterSpacing: '0.1em', fontFamily: 'Cinzel, serif' }}>
                SELECIONE UM ALVO
              </span>
            )}
          </div>

          <div className={styles.monsterGrid}>
            {enemyMonsters.map(monster => (
              <MonsterCard
                key={monster.id}
                monster={monster}
                isSelected={selectedTarget === monster.id}
                canSelect={canAct && targetMode === 'enemy' && monster.hp > 0}
                flashType={flashMap[monster.id] ?? null}
                onClick={() => {
                  if (canAct && targetMode === 'enemy' && monster.hp > 0)
                    setSelectedTarget(prev => prev === monster.id ? null : monster.id);
                }}
              />
            ))}
          </div>

          {alliedSummons.length > 0 && (
            <>
              <div className={styles.sectionLabel}>Aliados Invocados</div>
              <div className={styles.summonsSection}>
                {alliedSummons.map(s => {
                  const color = s.isNecroShadow ? '#8e44ad' : '#a0522d';
                  const bg    = s.isNecroShadow ? 'rgba(142,68,173,0.08)' : 'rgba(160,82,45,0.08)';
                  const border= s.isNecroShadow ? 'rgba(142,68,173,0.4)' : 'rgba(160,82,45,0.35)';
                  const role  = (s as any).animalRole ?? (s.isNecroShadow ? 'sombra' : 'aliado');
                  const roleEmoji: Record<string, string> = { damage:'⚔️', tank:'🛡️', healer:'💚', buffer:'✨', debuffer:'☠️', sombra:'👻', aliado:'🤝' };
                  return (
                    <div key={s.id} className={styles.summonCard} style={{ background: bg, borderColor: border, color }}>
                      <span className={styles.summonEmoji}>{s.emoji}</span>
                      <span className={styles.summonName}>{s.name}</span>
                      <span className={styles.summonRole}>{roleEmoji[role]} {role}</span>
                      <div className={styles.summonHpBar}>
                        <div className={styles.summonHpFill} style={{ width: `${(s.hp/s.maxHp)*100}%`, background: color }} />
                      </div>
                      <span className={styles.summonInfo}>{s.hp}/{s.maxHp} · {s.summonDuration}t · ⚔{s.attack}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ACTION PANEL */}
        {myPlayer && myBuffs && (
          <div className={styles.actionPanel}>
            {/* My Status */}
            <div className={[
              styles.myStatus,
              isMyTurn ? styles.myStatusActive : '',
              isTransformed ? styles.myStatusTransformed : '',
            ].join(' ')}>
              <div className={styles.myNameRow}>
                <span className={styles.myEmoji}>
                  {isTransformed && transform ? transform.emoji : CLASSES[myPlayer.classType].emoji}
                </span>
                <span className={styles.myName}>{myPlayer.name}</span>
                <span className={styles.myLevel}>Nv.{myPlayer.level}</span>
                {!myPlayer.isAlive && <span className={styles.deadBadge}>💀 Morto</span>}
                {isMyTurn && myPlayer.isAlive && <span className={styles.yourTurnBadge}>⚡ SUA VEZ</span>}
                {!isMyTurn && myPlayer.isAlive && activePl && (
                  <span className={styles.waitingBadge}>⌛ {activePl.name}</span>
                )}
                {isTransformed && (
                  <span className={styles.transformedBadge}>🌟 {myBuffs.transformTurnsLeft}t</span>
                )}
              </div>

              <StatBar value={myPlayer.hp} max={myPlayer.maxHp} color="var(--hp-color)" label="HP" />
              <StatBar value={myPlayer.mp} max={myPlayer.maxMp} color="var(--mp-color)" label="MP" />
              <div className={styles.xpRow}>
                <div className={styles.xpFill} style={{ width: `${(myPlayer.xp / myPlayer.xpToNextLevel) * 100}%` }} />
              </div>
              <div className={styles.xpText}>{myPlayer.xp}/{myPlayer.xpToNextLevel} XP</div>
              <BuffChips player={myPlayer} buffs={myBuffs} />
            </div>

            {canAct ? (
              <div className={styles.actions}>
                {/* Target hints */}
                {needsAllyTarget && !selectedTarget && (
                  <div className={`${styles.targetHint} ${styles.targetHintAlly}`}>
                    💚 Selecione um aliado abaixo
                  </div>
                )}
                {needsEnemyTarget && !selectedTarget && selectedSkillIdx !== null && (
                  <div className={`${styles.targetHint} ${styles.targetHintEnemy}`}>
                    🎯 Selecione um inimigo à esquerda
                  </div>
                )}
                {selectedTarget && (
                  <div className={`${styles.targetHint} ${targetMode === 'ally' ? styles.targetHintAlly : styles.targetHintEnemy}`}>
                    {targetMode === 'enemy'
                      ? `🎯 Alvo: ${aliveM.find(m => m.id === selectedTarget)?.name ?? '?'}`
                      : `💚 Aliado: ${gameState.players[selectedTarget]?.name ?? '?'}`}
                  </div>
                )}

                {/* Transform */}
                {hasTransformItem && (
                  <button
                    className={[
                      styles.skillBtn,
                      styles.transformBtn,
                      canTransform ? styles.transformReady : '',
                      isTransformed ? styles.transformActive : '',
                      myBuffs.transformUsedThisCombat && !isTransformed ? styles.transformUsed : '',
                    ].join(' ')}
                    onClick={() => canTransform && onTransform()}
                    disabled={!canTransform}
                  >
                    <span style={{ fontSize: 15 }}>🌟</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{
                        fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.1em',
                        color: isTransformed ? 'var(--accent-gold-bright)' : myBuffs.transformUsedThisCombat ? 'var(--text-dim)' : 'var(--accent-gold-bright)',
                      }}>
                        {isTransformed
                          ? `✨ ${transform?.name} (${myBuffs.transformTurnsLeft}t)`
                          : myBuffs.transformUsedThisCombat
                            ? '🌟 Essência Esgotada'
                            : `🌟 TRANSFORMAR: ${transform?.name}`}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'Cinzel, serif' }}>
                        {isTransformed ? 'Skills divinas ativas'
                          : myBuffs.transformUsedThisCombat ? '1 uso por combate'
                          : `6t · ATK×${transform?.atkMultiplier} DEF×${transform?.defMultiplier}`}
                      </div>
                    </div>
                    {!myBuffs.transformUsedThisCombat && !isTransformed && (
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: 'var(--accent-gold-bright)', background: 'rgba(212,160,23,0.15)', padding: '2px 5px', border: '1px solid rgba(212,160,23,0.3)' }}>1×</span>
                    )}
                  </button>
                )}

                {/* Attack button */}
                <button className={styles.attackBtn} onClick={doAttack}
                  disabled={!selectedTarget || !aliveM.find(m => m.id === selectedTarget)}>
                  {isTransformed ? `${transform?.emoji} ` : '⚔️ '}
                  Atacar {selectedTarget && aliveM.find(m => m.id === selectedTarget)
                    ? aliveM.find(m => m.id === selectedTarget)!.name
                    : '(selecione inimigo)'}
                </button>

                {/* Potions */}
                {myPotions.length > 0 && (
                  <div className={styles.potionRow}>
                    {myPotions.map(pot => (
                      <button key={pot.id} className={styles.potionBtn}
                        onClick={() => onAction({ type: 'use_item', itemId: pot.id })}
                        title={pot.description}>
                        {pot.emoji} {pot.name}
                        <span className={styles.potionQty}>x{pot.quantity}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Skills */}
                <div className={styles.skillGrid}>
                  {currentSkills.map((skill, i) => {
                    const canUse = myPlayer.mp >= skill.mpCost;
                    const isAlly = 'target' in skill
                      ? skill.target === 'ally' || skill.target === 'ally_aoe'
                      : !!(skill as any).targetAlly;
                    const isUlt    = ('isUlt' in skill && skill.isUlt) || (skill as any).effect === 'ult';
                    const ultLevel = (skill as any).ultLevel ?? 3;
                    const ultLocked = isUlt && myPlayer.level < ultLevel;
                    const ultReady  = isUlt && !ultLocked && canUse;
                    const isTransformSkill = isTransformed;

                    return (
                      <button key={i}
                        className={[
                          styles.skillBtn,
                          i >= 3 ? styles.specialBtn : '',
                          selectedSkillIdx === i ? styles.skillSelected : '',
                          isAlly ? styles.allySkillBtn : '',
                          isUlt ? styles.ultBtn : '',
                          isUlt && ultReady ? styles.ultReady : '',
                          isUlt && ultLocked ? styles.ultLocked : '',
                          isTransformSkill ? styles.transformSkillBtn : '',
                        ].join(' ')}
                        onClick={() => !ultLocked && pickSkill(i)}
                        disabled={ultLocked || !canUse}
                        title={ultLocked ? `Nível ${ultLevel} necessário` : skill.description}>
                        <span className={styles.skillEmoji}>{skill.emoji}</span>
                        <span className={styles.skillName}>
                          {isUlt ? (ultLocked ? `🔒 ${skill.name}` : `⚡ ${skill.name}`) : skill.name}
                        </span>
                        {isAlly && <span className={styles.allyTag}>aliado</span>}
                        {skill.mpCost > 0 && (
                          <span className={styles.skillMp} style={
                            (isUlt || isTransformSkill)
                              ? { color: 'var(--accent-gold-bright)', background: 'rgba(212,160,23,0.12)', borderColor: 'rgba(212,160,23,0.25)' }
                              : {}
                          }>
                            {skill.mpCost}MP
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedSkillIdx !== null && (
                  <button
                    className={
                      ('isUlt' in currentSkills[selectedSkillIdx] && currentSkills[selectedSkillIdx].isUlt) || isTransformed
                        ? styles.useUltBtn
                        : styles.useSkillBtn
                    }
                    onClick={doSkill}
                    disabled={(needsAllyTarget || needsEnemyTarget) && !selectedTarget}
                    style={isTransformed && transform ? {
                      background: `linear-gradient(135deg, ${transform.ultColor}55, ${transform.ultColor}99)`,
                      color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                    } : {}}
                  >
                    {isTransformed ? `${transform?.emoji} Usar: ` : ('isUlt' in currentSkills[selectedSkillIdx] && currentSkills[selectedSkillIdx].isUlt) ? '🌟 ATIVAR: ' : '✨ Usar: '}
                    {currentSkills[selectedSkillIdx]?.name}
                    {(needsAllyTarget || needsEnemyTarget) && !selectedTarget ? ' (selecione alvo)' : ''}
                  </button>
                )}
              </div>
            ) : (
              myPlayer.isAlive && !isMyTurn && activePl && (
                <div className={styles.waitingPanel}>
                  ⌛ Aguardando <strong style={{ color: 'var(--text-primary)' }}>{activePl.name}</strong> {CLASSES[activePl.classType].emoji} agir...
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* PLAYERS ROW */}
      <div className={styles.playersRow}>
        {gameState.playerOrder.map(pid => {
          const p = gameState.players[pid];
          if (!p) return null;
          const pBuffs = getPlayerBuffs(p);
          const isActive = gameState.activePlayerId === pid;
          const pTransformed = pBuffs.transformTurnsLeft > 0;
          const pTransform = TRANSFORMS[p.classType];
          const allySelectable = canAct && targetMode === 'ally' && needsAllyTarget;
          const allySelected = selectedTarget === pid && targetMode === 'ally';

          return (
            <div key={pid}
              className={[
                styles.playerMini,
                !p.isAlive ? styles.deadPlayer : '',
                isActive ? styles.activePlayer : '',
                allySelected ? styles.allySelectedPlayer : '',
                allySelectable ? styles.allySelectable : '',
                pTransformed ? styles.transformedPlayer : '',
              ].join(' ')}
              onClick={() => allySelectable && setSelectedTarget(prev => prev === pid ? null : pid)}
            >
              <div className={styles.miniHeader}>
                <span>{pTransformed && pTransform ? pTransform.emoji : CLASSES[p.classType].emoji}</span>
                <span className={styles.miniName}>{p.name}</span>
                {pid === myId && <span className={styles.youTag}>você</span>}
                <span className={styles.levelTag}>Nv.{p.level}</span>
                {isActive && p.isAlive && <span className={styles.activeDot} />}
                {!p.isAlive && <span style={{ fontSize: 11 }}>💀</span>}
              </div>
              <SmallBar value={p.hp} max={p.maxHp} color="var(--hp-color)" />
              <SmallBar value={p.mp} max={p.maxMp} color="var(--mp-color)" />
              <div className={styles.miniBuffs}>
                {pTransformed && <span className={styles.miniBuff} title="Transformado">🌟</span>}
                {pBuffs.wallTurnsLeft > 0      && <span className={styles.miniBuff} title="Muralha">🏰</span>}
                {pBuffs.dodgeTurnsLeft > 0     && <span className={styles.miniBuff} title="Esquiva">💨</span>}
                {pBuffs.regenTurnsLeft > 0     && <span className={styles.miniBuff} title="Regen">♻️</span>}
                {pBuffs.tempBonusTurns > 0     && <span className={styles.miniBuff} title="Buffado">✨</span>}
                {pBuffs.counterReflect > 0     && <span className={styles.miniBuff} title="Contra-Ataque">🔄</span>}
                {pBuffs.cloneTurnsLeft > 0     && <span className={styles.miniBuff} title="Clone">👤</span>}
                {p.soulCount > 0 && (
                  <span className={styles.miniBuff} title={`${p.soulCount} almas`} style={{ color: '#8e44ad', fontSize: 9, fontFamily: 'Cinzel, serif' }}>
                    💀{p.soulCount}
                  </span>
                )}
                {p.summonCount > 0 && (
                  <span className={styles.miniBuff} style={{ fontSize: 9, fontFamily: 'Cinzel, serif', color: '#a0522d' }}>
                    🐾{p.summonCount}
                  </span>
                )}
                {p.spiritStacks > 0 && (
                  <span className={styles.miniBuff} style={{ fontSize: 9, fontFamily: 'Cinzel, serif', color: '#5f9ea0' }}>
                    🌀{p.spiritStacks}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* COMBAT LOG */}
      <div className={styles.logPanel}>
        <div className={styles.logTitle}>
          Registro de Combate
          <span style={{ color: 'rgba(180,150,80,0.4)', fontFamily: 'Cinzel, serif', fontSize: 8, letterSpacing: '0.08em' }}>
            {gameState.combatLog.length} entradas
          </span>
        </div>
        <div className={styles.logScroll} ref={logScrollRef}>
          {gameState.combatLog.slice(-40).map(e => (
            <div key={e.id} className={`${styles.logLine} ${styles['log_' + e.type]}`}>
              <span className={styles.logTurn}>[T{e.turn}]</span> {e.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ SUB-COMPONENTS ════════════════════════════════════════

function MonsterCard({ monster, isSelected, canSelect, onClick, flashType }: {
  monster: Monster;
  isSelected: boolean;
  canSelect: boolean;
  onClick: () => void;
  flashType: 'hit' | 'heal' | null;
}) {
  const hp  = (monster.hp / monster.maxHp) * 100;
  const eff = monster.effects ?? [];
  // engine usa StatusEffect[] com .type string
  const poisoned = eff.some(e => e.type === 'poisoned');
  const stunned  = eff.some(e => e.type === 'stunned');
  const cursed   = eff.some(e => e.type === 'cursed');
  const marked   = eff.some(e => e.type === 'marked');
  const slowed   = eff.some(e => e.type === 'slowed');
  const isDead   = monster.hp <= 0;

  return (
    <div
      className={[
        styles.monsterCard,
        isSelected ? styles.monsterSelected : '',
        isDead ? styles.monsterDead : '',
        monster.isBoss ? styles.bossCard : '',
        canSelect && !isDead ? styles.monsterHoverable : styles.monsterNoTarget,
        flashType === 'hit'  ? styles.monsterHit  : '',
        flashType === 'heal' ? styles.monsterHeal : '',
      ].join(' ')}
      onClick={isDead ? undefined : onClick}
    >
      {monster.isBoss && <div className={styles.bossBadge}>BOSS</div>}
      <span className={styles.monsterEmoji}>{monster.emoji}</span>
      <div className={styles.monsterName}>{monster.name}</div>
      <div className={styles.monsterLv}>Nv.{monster.level}</div>
      <div className={styles.monsterHpBar}>
        <div className={styles.monsterHpFill} style={{
          width: `${hp}%`,
          background: hp > 60 ? '#27ae60' : hp > 30 ? '#e67e22' : '#c0392b',
          boxShadow: hp <= 30 ? '0 0 6px rgba(192,57,43,0.6)' : 'none',
        }} />
      </div>
      <div className={styles.monsterHpText}>{monster.hp}/{monster.maxHp}</div>
      <div className={styles.monsterStats}>⚔{monster.attack} 🛡{monster.defense}</div>
      {(poisoned || stunned || cursed || marked || slowed) && (
        <div className={styles.monsterEffects}>
          {poisoned && <span className={styles.effectIcon}>☠️</span>}
          {stunned  && <span className={styles.effectIcon}>😵</span>}
          {cursed   && <span className={styles.effectIcon}>🔮</span>}
          {marked   && <span className={styles.effectIcon}>🎯</span>}
          {slowed   && <span className={styles.effectIcon}>❄️</span>}
        </div>
      )}
    </div>
  );
}

function BuffChips({ player, buffs }: { player: Player; buffs: ReturnType<typeof getPlayerBuffs> }) {
  const chips: { label: string; color: string; bg: string }[] = [];
  if (buffs.tempBonusTurns > 0) {
    if (buffs.tempAtkBonus > 0) chips.push({ label: `⚔️+${buffs.tempAtkBonus}(${buffs.tempBonusTurns}t)`, color: '#f0c040', bg: 'rgba(212,160,23,.1)' });
    if (buffs.tempDefBonus > 0) chips.push({ label: `🛡️+${buffs.tempDefBonus}(${buffs.tempBonusTurns}t)`, color: '#3498db', bg: 'rgba(52,152,219,.1)' });
  }
  if (buffs.regenTurnsLeft > 0) chips.push({ label: `♻️+${buffs.regenHpPerTurn}HP(${buffs.regenTurnsLeft}t)`, color: '#2ecc71', bg: 'rgba(39,174,96,.1)' });
  if (buffs.wallTurnsLeft > 0)  chips.push({ label: `🏰Muralha(${buffs.wallTurnsLeft}t)`, color: '#bdc3c7', bg: 'rgba(127,140,141,.15)' });
  if (buffs.dodgeTurnsLeft > 0) chips.push({ label: `💨Esquiva(${buffs.dodgeTurnsLeft}t)`, color: '#1abc9c', bg: 'rgba(26,188,156,.1)' });
  if (buffs.counterReflect > 0) chips.push({ label: `🔄Contra${Math.round(buffs.counterReflect * 100)}%`, color: '#e67e22', bg: 'rgba(230,126,34,.1)' });
  if (player.classType === 'necromancer') chips.push({ label: `💀${player.soulCount ?? 0}/5alma`, color: '#8e44ad', bg: 'rgba(142,68,173,.15)' });
  if (player.classType === 'animalist')   chips.push({ label: `🐾${player.summonCount ?? 0}/3`, color: '#a0522d', bg: 'rgba(160,82,45,.15)' });
  if (player.classType === 'shaman')      chips.push({ label: `🌀${player.spiritStacks ?? 0}/5`, color: '#5f9ea0', bg: 'rgba(95,158,160,.15)' });
  if (buffs.cloneTurnsLeft > 0)          chips.push({ label: `👤Clone(${buffs.cloneTurnsLeft}t)`, color: '#da70d6', bg: 'rgba(218,112,214,.15)' });
  if (chips.length === 0) return null;
  return (
    <div className={styles.buffRow}>
      {chips.map((c, i) => (
        <span key={i} className={styles.buffChip} style={{ color: c.color, background: c.bg, borderColor: `${c.color}33` }}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

function StatBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${Math.max(0, (value / max) * 100)}%`, background: color }} />
      </div>
      <span className={styles.barText}>{value}/{max}</span>
    </div>
  );
}

function SmallBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className={styles.smallBar}>
      <div className={styles.smallBarFill} style={{ width: `${Math.max(0, (value / max) * 100)}%`, background: color }} />
    </div>
  );
}