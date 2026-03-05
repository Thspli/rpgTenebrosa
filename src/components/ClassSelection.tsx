'use client';

import { GameState, ClassType } from '@/lib/types';
import { CLASSES, SKILLS } from '@/lib/gameData';
import styles from './ClassSelection.module.css';

interface Props {
  gameState: GameState;
  myId: string;
  onSelectClass: (classType: ClassType) => void;
  onReady: () => void;
}

export default function ClassSelection({ gameState, myId, onSelectClass, onReady }: Props) {
  const myPlayer = gameState.players[myId];
  const selectedClass = myPlayer?.classType;
  const isReady = myPlayer?.isReady;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>⚔ Escolha sua Classe</h2>
        <p className={styles.subtitle}>Cada classe possui habilidades únicas e atributos distintos</p>
      </div>

      <div className={styles.grid}>
        {(Object.entries(CLASSES) as [ClassType, typeof CLASSES[ClassType]][]).map(([key, cls]) => {
          const isUnlocked = gameState.unlockedClasses.includes(key);
          const isSelected = selectedClass === key;
          const skills = SKILLS[key];

          return (
            <div
              key={key}
              className={`${styles.card} ${isSelected ? styles.selected : ''} ${!isUnlocked ? styles.locked : ''}`}
              onClick={() => isUnlocked && !isReady && onSelectClass(key)}
              style={{ '--cls-color': cls.color } as React.CSSProperties}
            >
              {!isUnlocked && (
                <div className={styles.lockOverlay}>
                  <span className={styles.lockIcon}>🔒</span>
                  <span>Derrote o boss do Mapa {cls.unlockMap} para desbloquear</span>
                </div>
              )}

              <div className={styles.cardHeader}>
                <span className={styles.emoji}>{cls.emoji}</span>
                <div>
                  <h3 className={styles.className}>{cls.name}</h3>
                  <p className={styles.classDesc}>{cls.description}</p>
                </div>
              </div>

              <div className={styles.stats}>
                <StatBar label="HP" value={cls.baseStats.hp} max={120} color="var(--hp-color)" />
                <StatBar label="MP" value={cls.baseStats.mp} max={120} color="var(--mp-color)" />
                <StatBar label="ATK" value={cls.baseStats.attack} max={15} color="var(--accent-red-bright)" />
                <StatBar label="DEF" value={cls.baseStats.defense} max={10} color="var(--accent-blue-bright)" />
              </div>

              <div className={styles.skillList}>
                {skills.slice(0, 3).map((sk, i) => (
                  <div key={i} className={styles.skill}>
                    <span>{sk.emoji}</span>
                    <span className={styles.skillName}>{sk.name}</span>
                    {sk.mpCost > 0 && <span className={styles.mpCost}>{sk.mpCost}MP</span>}
                  </div>
                ))}
                <div className={styles.skill + ' ' + styles.specialSkill}>
                  <span>⭐</span>
                  <span className={styles.skillName}>{skills[3]?.name}</span>
                  <span className={styles.mpCost}>{skills[3]?.mpCost}MP</span>
                </div>
              </div>

              {isSelected && <div className={styles.selectedBadge}>✓ Selecionado</div>}
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={styles.playerStatus}>
          {Object.values(gameState.players).map(p => (
            <div key={p.id} className={styles.playerChip}>
              <span>{CLASSES[p.classType]?.emoji || '?'}</span>
              <span>{p.name}</span>
              {p.id === myId && <span className={styles.you}>(você)</span>}
              {p.isReady
                ? <span className={styles.readyDot} title="Pronto" />
                : <span className={styles.notReadyDot} title="Não pronto" />}
            </div>
          ))}
        </div>

        <button
          className={styles.readyBtn}
          onClick={onReady}
          disabled={isReady || !selectedClass || selectedClass === 'warrior' && !myPlayer}
        >
          {isReady ? '✓ Pronto!' : 'Confirmar Classe'}
        </button>
      </div>
    </div>
  );
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <div className={styles.statTrack}>
        <div className={styles.statFill} style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}