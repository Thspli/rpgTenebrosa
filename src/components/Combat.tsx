'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameState, Monster, MonsterEffect } from '@/lib/types';
import { CLASSES, SKILLS, MAPS } from '@/lib/gameData';
import styles from './Combat.module.css';
import UltCutscene from './UltCutscene';

interface Props {
  gameState: GameState;
  myId: string;
  onAction: (action: { type: string; targetId?: string; skillIndex?: number; itemId?: string }) => void;
  onReset: () => void;
  onClearUlt: () => void;
}

type TargetMode = 'enemy' | 'ally';

export default function Combat({ gameState, myId, onAction, onReset, onClearUlt }: Props) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedSkillIdx, setSelectedSkillIdx] = useState<number | null>(null);
  const [targetMode, setTargetMode] = useState<TargetMode>('enemy');
  const [showingUlt, setShowingUlt] = useState(false);

  const myPlayer  = gameState.players[myId];
  const mapDef    = MAPS.find(m => m.id === gameState.currentMap);
  const isMyTurn  = gameState.activePlayerId === myId;
  const canAct    = !!(myPlayer?.isAlive && isMyTurn && gameState.phase === 'combat');
  const aliveM    = gameState.currentMonsters.filter(m => m.hp > 0);
  const activePl  = gameState.activePlayerId ? gameState.players[gameState.activePlayerId] : null;
  const myPotions = myPlayer?.inventory.filter(i => i.consumable && (i.quantity ?? 0) > 0) ?? [];

  const selectedSkill = selectedSkillIdx !== null && myPlayer
    ? SKILLS[myPlayer.classType][selectedSkillIdx] : null;

  const needsAllyTarget  = !!(selectedSkill?.targetAlly);
  const needsEnemyTarget = !!(
    selectedSkill &&
    !selectedSkill.selfOnly &&
    !selectedSkill.aoe &&
    (selectedSkill.damage !== undefined ||
     selectedSkill.effect === 'poison' ||
     selectedSkill.effect === 'stun'   ||
     selectedSkill.effect === 'curse'  ||
     selectedSkill.effect === 'mark'   ||
     selectedSkill.effect === 'slow')
  );

  // Show cutscene when ult arrives
  useEffect(() => {
    if (gameState.activeUlt && !showingUlt) {
      setShowingUlt(true);
    }
  }, [gameState.activeUlt]);

  const handleUltComplete = useCallback(() => {
    setShowingUlt(false);
    onClearUlt();
  }, [onClearUlt]);

  function pickSkill(i: number) {
    if (selectedSkillIdx === i) { setSelectedSkillIdx(null); setSelectedTarget(null); return; }
    const sk = SKILLS[myPlayer!.classType][i];
    const ally = !!(sk.targetAlly);
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

  // ── ULT Cutscene overlay ──
  if (showingUlt && gameState.activeUlt) {
    return <UltCutscene ult={gameState.activeUlt} onComplete={handleUltComplete} />;
  }

  // ── Defeat screen ──────────────────────────────────────────────────────────
  if (gameState.phase === 'defeat') {
    return (
      <div className={styles.endScreen}>
        <div className={styles.endCard}>
          <div className={styles.endIcon}>💀</div>
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

  // ── Main combat UI ─────────────────────────────────────────────────────────
  return (
    <div className={styles.layout} style={{ '--map-bg': mapDef?.bgColor } as React.CSSProperties}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.mapName}>{mapDef?.theme} {mapDef?.name}</span>
          <span className={styles.turn}>Turno {gameState.turn}</span>
          <span className={styles.wave}>Onda {gameState.waveNumber}</span>
        </div>
        <div className={styles.headerRight}>
          {activePl && (
            <span className={styles.activeTurnBadge}>🎯 Vez de: {activePl.name} {CLASSES[activePl.classType].emoji}</span>
          )}
          {(mapDef?.defenseDebuff ?? 0) > 0 && (
            <span className={styles.debuffBadge}>🛡️ -{(mapDef!.defenseDebuff * 100).toFixed(0)}% DEF</span>
          )}
          {(mapDef?.manaCostMultiplier ?? 1) > 1 && (
            <span className={styles.debuffBadge}>💎 MANA x{mapDef!.manaCostMultiplier}</span>
          )}
          <span className={styles.shopCountdown}>🛒 Loja em: {gameState.shopCountdown}t</span>
          <span className={styles.coins}>💰 {gameState.groupCoins}</span>
        </div>
      </div>

      {/* Main area */}
      <div className={styles.mainArea}>

        {/* Monsters */}
        <div className={styles.monstersSection}>
          <h3 className={styles.sectionLabel}>
            ⚔ Inimigos
            {canAct && targetMode === 'enemy' && (
              <span style={{ fontSize: 11, color: 'var(--accent-red-bright)', marginLeft: 8, fontFamily: 'var(--font-ui)' }}>
                ← clique para selecionar alvo
              </span>
            )}
          </h3>
          <div className={styles.monsterGrid}>
            {gameState.currentMonsters.map(monster => (
              <MonsterCard
                key={monster.id}
                monster={monster}
                isSelected={selectedTarget === monster.id}
                canSelect={canAct && targetMode === 'enemy' && monster.hp > 0}
                onClick={() => {
                  if (canAct && targetMode === 'enemy' && monster.hp > 0)
                    setSelectedTarget(prev => prev === monster.id ? null : monster.id);
                }}
              />
            ))}
          </div>
        </div>

        {/* Action panel */}
        {myPlayer && (
          <div className={styles.actionPanel}>

            {/* My status card */}
            <div className={`${styles.myStatus} ${isMyTurn ? styles.myStatusActive : ''}`}>
              <div className={styles.myNameRow}>
                <span className={styles.myEmoji}>{CLASSES[myPlayer.classType].emoji}</span>
                <span className={styles.myName}>{myPlayer.name}</span>
                <span className={styles.myLevel}>Nv.{myPlayer.level}</span>
                {!myPlayer.isAlive && <span className={styles.deadBadge}>💀 Derrotado</span>}
                {isMyTurn && myPlayer.isAlive  && <span className={styles.yourTurnBadge}>⚡ SUA VEZ!</span>}
                {!isMyTurn && myPlayer.isAlive && activePl && (
                  <span className={styles.waitingBadge}>⌛ Vez de {activePl.name}</span>
                )}
              </div>
              <StatBar value={myPlayer.hp} max={myPlayer.maxHp} color="var(--hp-color)" label="HP" />
              <StatBar value={myPlayer.mp} max={myPlayer.maxMp} color="var(--mp-color)" label="MP" />
              <div className={styles.xpBar}>
                <div className={styles.xpFill} style={{ width: `${(myPlayer.xp / myPlayer.xpToNextLevel) * 100}%` }} />
              </div>
              <div className={styles.xpText}>{myPlayer.xp}/{myPlayer.xpToNextLevel} XP</div>
              <BuffBar player={myPlayer} />
            </div>

            {canAct && (
              <div className={styles.actions}>

                {needsAllyTarget && !selectedTarget && (
                  <div style={{ fontSize: 12, color: 'var(--accent-green-bright)', padding: '5px 10px',
                    background: 'rgba(39,174,96,0.1)', borderRadius: 6, border: '1px solid rgba(39,174,96,0.3)' }}>
                    💚 Selecione um aliado na barra abaixo
                  </div>
                )}
                {needsEnemyTarget && !selectedTarget && selectedSkillIdx !== null && (
                  <div style={{ fontSize: 12, color: 'var(--accent-red-bright)', padding: '5px 10px',
                    background: 'rgba(231,76,60,0.1)', borderRadius: 6, border: '1px solid rgba(231,76,60,0.3)' }}>
                    🎯 Selecione um inimigo acima
                  </div>
                )}
                {selectedTarget && (
                  <div className={`${styles.targetInfo} ${targetMode === 'ally' ? styles.targetInfoAlly : ''}`}>
                    {targetMode === 'enemy'
                      ? `🎯 Alvo: ${aliveM.find(m => m.id === selectedTarget)?.name ?? '?'}`
                      : `💚 Aliado: ${gameState.players[selectedTarget]?.name ?? '?'}`}
                  </div>
                )}

                <button
                  className={styles.attackBtn}
                  onClick={doAttack}
                  disabled={!selectedTarget || !aliveM.find(m => m.id === selectedTarget)}
                >
                  ⚔️ Atacar {selectedTarget && aliveM.find(m => m.id === selectedTarget)
                    ? aliveM.find(m => m.id === selectedTarget)!.name : '(selecione inimigo)'}
                </button>

                {myPotions.length > 0 && (
                  <div className={styles.potionRow}>
                    {myPotions.map(pot => (
                      <button key={pot.id} className={styles.potionBtn}
                        onClick={() => onAction({ type: 'use_potion', itemId: pot.id })}
                        title={pot.description}>
                        {pot.emoji} {pot.name}
                        <span className={styles.potionQty}>x{pot.quantity}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Skills — regular + ult */}
                <div className={styles.skillGrid}>
                  {SKILLS[myPlayer.classType].map((skill, i) => {
                    const cost = Math.ceil(skill.mpCost * (mapDef?.manaCostMultiplier ?? 1));
                    const canUse = myPlayer.mp >= cost;
                    const isAlly = !!skill.targetAlly;
                    const isUlt = skill.effect === 'ult';
                    const ultLocked = isUlt && myPlayer.level < (skill.ultLevel ?? 3);
                    const ultUnlocked = isUlt && !ultLocked;

                    if (isUlt) {
                      return (
                        <button
                          key={i}
                          className={[
                            styles.skillBtn,
                            styles.ultBtn,
                            ultLocked ? styles.ultLocked : '',
                            selectedSkillIdx === i ? styles.skillSelected : '',
                            ultUnlocked && canUse ? styles.ultReady : '',
                          ].join(' ')}
                          onClick={() => !ultLocked && pickSkill(i)}
                          disabled={ultLocked || !canUse}
                          title={
                            ultLocked
                              ? `🔒 Desbloqueia no Nível ${skill.ultLevel}`
                              : skill.description
                          }
                        >
                          <span className={styles.skillEmoji}>{skill.emoji}</span>
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: 12,
                              color: ultLocked ? 'var(--text-dim)' : (ultUnlocked ? skill.ultColor ?? 'var(--accent-gold-bright)' : 'inherit'),
                              letterSpacing: '0.08em',
                              marginBottom: 1,
                            }}>
                              {ultLocked ? `🔒 ${skill.name}` : `⚡ ${skill.name}`}
                            </div>
                            {ultLocked && (
                              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-ui)' }}>
                                Nível {skill.ultLevel} necessário
                              </div>
                            )}
                          </div>
                          {!ultLocked && cost > 0 && (
                            <span className={styles.skillMp} style={{
                              background: 'rgba(212,160,23,0.15)',
                              color: 'var(--accent-gold-bright)',
                              border: '1px solid rgba(212,160,23,0.4)',
                            }}>
                              {cost}MP
                            </span>
                          )}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={i}
                        className={[
                          styles.skillBtn,
                          i >= 3 ? styles.specialBtn : '',
                          selectedSkillIdx === i ? styles.skillSelected : '',
                          isAlly ? styles.allySkillBtn : '',
                        ].join(' ')}
                        onClick={() => pickSkill(i)}
                        disabled={!canUse}
                        title={skill.description + (cost > 0 ? ` — ${cost} MP` : '')}
                      >
                        <span className={styles.skillEmoji}>{skill.emoji}</span>
                        <span className={styles.skillName}>{skill.name}</span>
                        {isAlly && (
                          <span style={{ fontSize: 10, color: 'var(--accent-green-bright)',
                            background: 'rgba(39,174,96,0.15)', padding: '1px 4px', borderRadius: 3 }}>
                            aliado
                          </span>
                        )}
                        {cost > 0 && <span className={styles.skillMp}>{cost}MP</span>}
                      </button>
                    );
                  })}
                </div>

                {selectedSkillIdx !== null && (
                  <button
                    className={selectedSkill?.effect === 'ult' ? styles.useUltBtn : styles.useSkillBtn}
                    onClick={doSkill}
                    disabled={(needsAllyTarget || needsEnemyTarget) && !selectedTarget}
                  >
                    {selectedSkill?.effect === 'ult' ? '🌟 ATIVAR ULTIMATE: ' : '✨ Usar: '}
                    {selectedSkill?.name}
                    {(needsAllyTarget || needsEnemyTarget) && !selectedTarget ? ' (selecione alvo)' : ''}
                  </button>
                )}
              </div>
            )}

            {!canAct && myPlayer.isAlive && !isMyTurn && activePl && (
              <div className={styles.waitingPanel}>
                <p>⌛ Aguardando <strong>{activePl.name}</strong> agir...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Players row */}
      <div className={styles.playersRow}>
        {gameState.playerOrder.map(pid => {
          const p = gameState.players[pid];
          if (!p) return null;
          const isActive    = gameState.activePlayerId === pid;
          const allySelectable = canAct && targetMode === 'ally' && needsAllyTarget;
          const allySelected   = selectedTarget === pid && targetMode === 'ally';
          return (
            <div
              key={pid}
              className={[
                styles.playerMini,
                !p.isAlive ? styles.deadPlayer : '',
                isActive ? styles.activePlayer : '',
                allySelected ? styles.allySelectedPlayer : '',
                allySelectable ? styles.allySelectable : '',
              ].join(' ')}
              onClick={() => allySelectable && setSelectedTarget(prev => prev === pid ? null : pid)}
            >
              <div className={styles.miniHeader}>
                <span>{CLASSES[p.classType].emoji}</span>
                <span className={styles.miniName}>{p.name}</span>
                {pid === myId && <span className={styles.youTag}>você</span>}
                <span style={{
                  fontFamily: 'var(--font-ui)', fontSize: 9,
                  color: 'var(--accent-gold)', background: 'rgba(212,160,23,0.1)',
                  padding: '1px 4px', borderRadius: 3,
                }}>
                  Nv.{p.level}
                </span>
                {isActive && p.isAlive && <span className={styles.activeDot} />}
                {!p.isAlive && <span>💀</span>}
                {p.buffs.wallTurnsLeft > 0         && <span title="Muralha">🏰</span>}
                {p.buffs.dodgeTurnsLeft > 0         && <span title="Esquiva">💨</span>}
                {p.buffs.regenTurnsLeft > 0         && <span title="Regenerando">♻️</span>}
                {p.buffs.tempBonusTurns > 0         && <span title="Buff ATK/DEF">✨</span>}
                {p.buffs.necroBonusTurnsLeft > 0    && <span title="Buff Necromante">💀</span>}
                {p.buffs.counterReflect > 0         && <span title="Contra-Ataque">🔄</span>}
              </div>
              <SmallBar value={p.hp} max={p.maxHp} color="var(--hp-color)" />
              <SmallBar value={p.mp} max={p.maxMp} color="var(--mp-color)" />
            </div>
          );
        })}
      </div>

      {/* Combat Log */}
      <div className={styles.logPanel}>
        <div className={styles.logTitle}>📜 Log de Combate</div>
        <div className={styles.logScroll}>
          {gameState.combatLog.slice().reverse().slice(0, 25).map(e => (
            <div key={e.id} className={`${styles.logLine} ${styles['log_' + e.type]}`}>
              <span className={styles.logTurn}>[T{e.turn}]</span> {e.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonsterCard({ monster, isSelected, canSelect, onClick }: {
  monster: Monster; isSelected: boolean; canSelect: boolean; onClick: () => void;
}) {
  const hp = (monster.hp / monster.maxHp) * 100;
  const eff = monster.effects ?? [];
  const poisoned = eff.some((e: MonsterEffect) => e.type === 'poisoned');
  const stunned  = eff.some((e: MonsterEffect) => e.type === 'stunned');
  const cursed   = eff.some((e: MonsterEffect) => e.type === 'cursed');
  const marked   = eff.some((e: MonsterEffect) => e.type === 'marked');
  const slowed   = eff.some((e: MonsterEffect) => e.type === 'slowed');
  const isDead   = monster.hp <= 0;

  return (
    <div
      className={[
        styles.monsterCard,
        isSelected ? styles.monsterSelected : '',
        isDead      ? styles.monsterDead    : '',
        monster.isBoss ? styles.bossCard   : '',
        canSelect && !isDead ? styles.monsterHoverable : '',
      ].join(' ')}
      onClick={isDead ? undefined : onClick}
    >
      {monster.isBoss && <div className={styles.bossBadge}>BOSS</div>}
      <div className={styles.monsterEmoji}>{monster.emoji}</div>
      <div className={styles.monsterName}>{monster.name}</div>
      <div className={styles.monsterLv}>Nv.{monster.level}</div>
      <div className={styles.monsterHpTrack}>
        <div className={styles.monsterHpFill} style={{
          width: `${hp}%`,
          background: hp > 50 ? 'var(--accent-green)' : hp > 25 ? '#f39c12' : 'var(--accent-red)',
        }} />
      </div>
      <div className={styles.monsterHpText}>{monster.hp}/{monster.maxHp}</div>
      <div className={styles.monsterStats}>⚔{monster.attack} 🛡{monster.defense}</div>
      {(poisoned || stunned || cursed || marked || slowed) && (
        <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' }}>
          {poisoned && <span title={`Envenenado (${eff.find(e=>e.type==='poisoned')?.turnsLeft}t)`}>☠️</span>}
          {stunned  && <span title={`Atordoado (${eff.find(e=>e.type==='stunned')?.turnsLeft}t)`}>😵</span>}
          {cursed   && <span title={`Amaldiçoado (${eff.find(e=>e.type==='cursed')?.turnsLeft}t)`}>🔮</span>}
          {marked   && <span title={`Marcado ×${eff.find(e=>e.type==='marked')?.damageMultiplier?.toFixed(1)} (${eff.find(e=>e.type==='marked')?.turnsLeft}t)`}>🎯</span>}
          {slowed   && <span title={`Lento (${eff.find(e=>e.type==='slowed')?.turnsLeft}t)`}>❄️</span>}
        </div>
      )}
    </div>
  );
}

function BuffBar({ player }: { player: GameState['players'][string] }) {
  const b = player.buffs;
  const chips: { label: string; color: string; bg: string }[] = [];

  if (b.tempBonusTurns > 0) {
    if (b.tempAtkBonus > 0)  chips.push({ label: `⚔️+${b.tempAtkBonus}atk (${b.tempBonusTurns}t)`, color: '#f0c040', bg: 'rgba(212,160,23,.15)' });
    if (b.tempDefBonus > 0)  chips.push({ label: `🛡️+${b.tempDefBonus}def (${b.tempBonusTurns}t)`, color: '#3498db', bg: 'rgba(52,152,219,.15)' });
    if (b.tempDefBonus < 0)  chips.push({ label: `🛡️${b.tempDefBonus}def (${b.tempBonusTurns}t)`, color: '#e74c3c', bg: 'rgba(231,76,60,.15)' });
  }
  if (b.regenTurnsLeft > 0)     chips.push({ label: `♻️+${b.regenHpPerTurn}hp/t (${b.regenTurnsLeft}t)`, color: '#2ecc71', bg: 'rgba(39,174,96,.15)' });
  if (b.wallTurnsLeft > 0)      chips.push({ label: `🏰 Muralha (${b.wallTurnsLeft}t)`,             color: '#bdc3c7', bg: 'rgba(127,140,141,.2)' });
  if (b.dodgeTurnsLeft > 0)     chips.push({ label: `💨 Esquiva (${b.dodgeTurnsLeft}t)`,             color: '#1abc9c', bg: 'rgba(26,188,156,.15)' });
  if (b.necroBonusTurnsLeft > 0)chips.push({ label: `💀+${b.necroBonusDmg}dmg (${b.necroBonusTurnsLeft}t)`, color: '#9b59b6', bg: 'rgba(142,68,173,.15)' });
  if (b.aimBonus > 0)           chips.push({ label: `🦅 Mira+${b.aimBonus}`,                        color: '#3498db', bg: 'rgba(52,152,219,.15)' });
  if (b.counterReflect > 0)     chips.push({ label: `🔄 Contra-atk ${Math.round(b.counterReflect*100)}%`, color: '#e67e22', bg: 'rgba(230,126,34,.15)' });

  if (chips.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {chips.map((c, i) => (
        <span key={i} style={{
          fontSize: 11, padding: '2px 6px', borderRadius: 4,
          color: c.color, background: c.bg, border: `1px solid ${c.color}55`,
          fontFamily: 'var(--font-ui)',
        }}>{c.label}</span>
      ))}
    </div>
  );
}

function StatBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <div className={styles.statBarRow}>
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
    <div className={styles.smallBarTrack}>
      <div className={styles.smallBarFill} style={{ width: `${Math.max(0, (value / max) * 100)}%`, background: color }} />
    </div>
  );
}