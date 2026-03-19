'use client';

import { useState } from 'react';
import { GameState, Monster } from '@/lib/types';
import { CLASSES, SKILLS, MAPS } from '@/lib/gameData';
import styles from './Combat.module.css';

interface Props {
  gameState: GameState;
  myId: string;
  onAction: (action: { type: string; targetId?: string; skillIndex?: number }) => void;
  onReset: () => void;
}

export default function Combat({ gameState, myId, onAction, onReset }: Props) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedSkillIndex, setSelectedSkillIndex] = useState<number | null>(null);

  const myPlayer = gameState.players[myId];
  const mapDef = MAPS.find(m => m.id === gameState.currentMap);
  const isMyTurn = gameState.activePlayerId === myId;
  const canAct = myPlayer?.isAlive && isMyTurn && gameState.phase === 'combat';
  const aliveMonsters = gameState.currentMonsters.filter(m => m.hp > 0);
  const activePlayer = gameState.activePlayerId ? gameState.players[gameState.activePlayerId] : null;

  function handleAttack() {
    if (!canAct || !selectedTarget) return;
    onAction({ type: 'attack', targetId: selectedTarget });
    setSelectedTarget(null);
  }

  function handleSkill() {
    if (!canAct || selectedSkillIndex === null) return;
    const skill = SKILLS[myPlayer!.classType][selectedSkillIndex];
    const needsTarget = skill.damage !== undefined && selectedSkillIndex !== 3;
    if (needsTarget && !selectedTarget) return;
    onAction({ type: 'skill', skillIndex: selectedSkillIndex, targetId: selectedTarget ?? undefined });
    setSelectedTarget(null);
    setSelectedSkillIndex(null);
  }

  if (gameState.phase === 'victory' || gameState.phase === 'defeat') {
    return (
      <div className={styles.endScreen}>
        <div className={styles.endCard}>
          <div className={styles.endIcon}>{gameState.phase === 'victory' ? '🏆' : '💀'}</div>
          <h2 className={styles.endTitle}>{gameState.phase === 'victory' ? 'VITÓRIA!' : 'DERROTA'}</h2>
          <p className={styles.endSubtitle}>
            {gameState.phase === 'victory'
              ? `O grupo conquistou ${mapDef?.name}! Novas recompensas foram desbloqueadas.`
              : 'O grupo foi aniquilado pelas forças das trevas...'}
          </p>
          <div className={styles.endLog}>
            {gameState.combatLog.slice(-8).map(entry => (
              <div key={entry.id} className={`${styles.logLine} ${styles['log_' + entry.type]}`}>
                {entry.message}
              </div>
            ))}
          </div>
          <button className={styles.resetBtn} onClick={onReset}>
            🔄 Nova Partida
          </button>
        </div>
      </div>
    );
  }

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
          {/* Active player indicator */}
          {activePlayer && (
            <span className={styles.activeTurnBadge}>
              🎯 Vez de: {activePlayer.name} {CLASSES[activePlayer.classType].emoji}
            </span>
          )}
          {mapDef?.defenseDebuff! > 0 && (
            <span className={styles.debuffBadge}>🛡️ -{mapDef!.defenseDebuff * 100}% DEF</span>
          )}
          {mapDef?.manaCostMultiplier! > 1 && (
            <span className={styles.debuffBadge}>💎 MANA x{mapDef!.manaCostMultiplier}</span>
          )}
          <span className={styles.shopCountdown}>🛒 Loja em: {gameState.shopCountdown} turno{gameState.shopCountdown !== 1 ? 's' : ''}</span>
          <span className={styles.coins}>💰 {gameState.groupCoins}</span>
        </div>
      </div>

      {/* Main area */}
      <div className={styles.mainArea}>
        {/* Monsters */}
        <div className={styles.monstersSection}>
          <h3 className={styles.sectionLabel}>⚔ Inimigos</h3>
          <div className={styles.monsterGrid}>
            {gameState.currentMonsters.map(monster => (
              <MonsterCard
                key={monster.id}
                monster={monster}
                isSelected={selectedTarget === monster.id}
                onClick={() => monster.hp > 0 && setSelectedTarget(selectedTarget === monster.id ? null : monster.id)}
                isDead={monster.hp <= 0}
              />
            ))}
          </div>
        </div>

        {/* Action Panel */}
        {myPlayer && (
          <div className={styles.actionPanel}>
            <div className={`${styles.myStatus} ${isMyTurn ? styles.myStatusActive : ''}`}>
              <div className={styles.myNameRow}>
                <span className={styles.myEmoji}>{CLASSES[myPlayer.classType].emoji}</span>
                <span className={styles.myName}>{myPlayer.name}</span>
                <span className={styles.myLevel}>Nv.{myPlayer.level}</span>
                {!myPlayer.isAlive && <span className={styles.deadBadge}>💀 Derrotado</span>}
                {isMyTurn && myPlayer.isAlive && <span className={styles.yourTurnBadge}>⚡ SUA VEZ!</span>}
                {!isMyTurn && myPlayer.isAlive && activePlayer && (
                  <span className={styles.waitingBadge}>⌛ Vez de {activePlayer.name}</span>
                )}
              </div>
              <StatBar value={myPlayer.hp} max={myPlayer.maxHp} color="var(--hp-color)" label="HP" />
              <StatBar value={myPlayer.mp} max={myPlayer.maxMp} color="var(--mp-color)" label="MP" />
              <div className={styles.xpBar}>
                <div className={styles.xpFill} style={{ width: `${(myPlayer.xp / myPlayer.xpToNextLevel) * 100}%` }} />
              </div>
              <div className={styles.xpText}>{myPlayer.xp}/{myPlayer.xpToNextLevel} XP</div>
            </div>

            {canAct && (
              <div className={styles.actions}>
                {selectedTarget && (
                  <div className={styles.targetInfo}>
                    🎯 Alvo: {aliveMonsters.find(m => m.id === selectedTarget)?.name ??
                      gameState.players[selectedTarget]?.name}
                  </div>
                )}

                <button
                  className={styles.attackBtn}
                  onClick={handleAttack}
                  disabled={!selectedTarget || !aliveMonsters.find(m => m.id === selectedTarget)}
                >
                  ⚔️ Atacar
                </button>

                <div className={styles.skillGrid}>
                  {SKILLS[myPlayer.classType].map((skill, i) => {
                    const mpCost = Math.ceil(skill.mpCost * (mapDef?.manaCostMultiplier ?? 1));
                    const canUse = myPlayer.mp >= mpCost;
                    return (
                      <button
                        key={i}
                        className={`${styles.skillBtn} ${i === 3 ? styles.specialBtn : ''} ${selectedSkillIndex === i ? styles.skillSelected : ''}`}
                        onClick={() => setSelectedSkillIndex(selectedSkillIndex === i ? null : i)}
                        disabled={!canUse}
                        title={`${skill.description} (${mpCost} MP)`}
                      >
                        <span className={styles.skillEmoji}>{skill.emoji}</span>
                        <span className={styles.skillName}>{skill.name}</span>
                        <span className={styles.skillMp}>{mpCost}MP</span>
                      </button>
                    );
                  })}
                </div>

                {selectedSkillIndex !== null && (
                  <button
                    className={styles.useSkillBtn}
                    onClick={handleSkill}
                  >
                    ✨ Usar: {SKILLS[myPlayer.classType][selectedSkillIndex]?.name}
                  </button>
                )}
              </div>
            )}

            {!canAct && myPlayer.isAlive && !isMyTurn && activePlayer && (
              <div className={styles.waitingPanel}>
                <p>⌛ Aguardando <strong>{activePlayer.name}</strong> agir...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* All players row */}
      <div className={styles.playersRow}>
        {gameState.playerOrder.map(pid => {
          const p = gameState.players[pid];
          if (!p) return null;
          const isActive = gameState.activePlayerId === pid;
          return (
            <div
              key={pid}
              className={`${styles.playerMini} ${!p.isAlive ? styles.deadPlayer : ''} ${isActive ? styles.activePlayer : ''}`}
            >
              <div className={styles.miniHeader}>
                <span>{CLASSES[p.classType].emoji}</span>
                <span className={styles.miniName}>{p.name}</span>
                {pid === myId && <span className={styles.youTag}>você</span>}
                {isActive && p.isAlive && <span className={styles.activeDot} title="Vez dele" />}
                {!p.isAlive && <span>💀</span>}
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
          {gameState.combatLog.slice().reverse().slice(0, 20).map(entry => (
            <div key={entry.id} className={`${styles.logLine} ${styles['log_' + entry.type]}`}>
              <span className={styles.logTurn}>[T{entry.turn}]</span> {entry.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonsterCard({ monster, isSelected, onClick, isDead }: {
  monster: Monster; isSelected: boolean; onClick: () => void; isDead: boolean;
}) {
  const hpPct = (monster.hp / monster.maxHp) * 100;
  return (
    <div
      className={`${styles.monsterCard} ${isSelected ? styles.monsterSelected : ''} ${isDead ? styles.monsterDead : ''} ${monster.isBoss ? styles.bossCard : ''}`}
      onClick={isDead ? undefined : onClick}
    >
      {monster.isBoss && <div className={styles.bossBadge}>BOSS</div>}
      <div className={styles.monsterEmoji}>{monster.emoji}</div>
      <div className={styles.monsterName}>{monster.name}</div>
      <div className={styles.monsterLv}>Nv.{monster.level}</div>
      <div className={styles.monsterHpTrack}>
        <div
          className={styles.monsterHpFill}
          style={{
            width: `${hpPct}%`,
            background: hpPct > 50 ? 'var(--accent-green)' : hpPct > 25 ? '#f39c12' : 'var(--accent-red)',
          }}
        />
      </div>
      <div className={styles.monsterHpText}>{monster.hp}/{monster.maxHp}</div>
      <div className={styles.monsterStats}>⚔{monster.attack} 🛡{monster.defense}</div>
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