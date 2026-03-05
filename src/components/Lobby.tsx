'use client';

import { useState } from 'react';
import { GameState } from '@/lib/types';
import styles from './Lobby.module.css';

interface Props {
  gameState: GameState;
  myId: string;
  onJoin: (name: string) => void;
}

export default function Lobby({ gameState, myId, onJoin }: Props) {
  const [name, setName] = useState('');
  const isInRoom = !!gameState.players[myId];
  const playerCount = Object.keys(gameState.players).length;

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.runes}>⚔ ✦ ⚔ ✦ ⚔</div>
        <h1 className={styles.title}>REALM OF SHADOWS</h1>
        <p className={styles.subtitle}>RPG Multiplayer em Turnos</p>
        <div className={styles.runes}>✦ ◆ ✦ ◆ ✦</div>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>⚔ Sala de Espera</h2>
          <p className={styles.playerCount}>{playerCount}/4 jogadores</p>

          <div className={styles.playerList}>
            {Object.values(gameState.players).map(p => (
              <div key={p.id} className={styles.playerRow}>
                <span className={styles.playerDot} />
                <span className={styles.playerName}>{p.name}</span>
                {p.id === myId && <span className={styles.youBadge}>Você</span>}
                {p.isReady && <span className={styles.readyBadge}>✓ Pronto</span>}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 1 - playerCount) }).map((_, i) => (
              <div key={i} className={styles.playerRowEmpty}>
                <span className={styles.playerDotEmpty} />
                <span className={styles.playerNameEmpty}>Aguardando jogador...</span>
              </div>
            ))}
          </div>

          {!isInRoom ? (
            <div className={styles.joinForm}>
              <input
                className={styles.input}
                type="text"
                placeholder="Seu nome de guerreiro..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && onJoin(name.trim())}
                maxLength={20}
              />
              <button
                className={styles.joinBtn}
                onClick={() => name.trim() && onJoin(name.trim())}
                disabled={!name.trim()}
              >
                Entrar na Batalha
              </button>
            </div>
          ) : (
            <p className={styles.waiting}>⌛ Aguardando todos escolherem sua classe...</p>
          )}
        </div>

        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>📜 Como Jogar</h3>
          <ul className={styles.infoList}>
            <li>1-4 jogadores se unem e escolhem suas classes</li>
            <li>Explore 3 mapas com dificuldade crescente</li>
            <li>Combate em turnos: ataque, use habilidades ou itens</li>
            <li>Derrote o boss para desbloquear novas classes e mapas</li>
            <li>⚠️ Progresso é perdido se o servidor reiniciar</li>
          </ul>
        </div>
      </div>
    </div>
  );
}