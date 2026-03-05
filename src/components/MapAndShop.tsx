'use client';

import { GameState, MapId } from '@/lib/types';
import { MAPS, SHOP_ITEMS, CLASSES } from '@/lib/gameData';
import styles from './MapAndShop.module.css';

interface Props {
  gameState: GameState;
  myId: string;
  onSelectMap: (mapId: MapId) => void;
  onBuyItem: (itemId: string) => void;
  onStartCombat: () => void;
}

export default function MapAndShop({ gameState, myId, onSelectMap, onBuyItem, onStartCombat }: Props) {
  const myPlayer = gameState.players[myId];
  const phase = gameState.phase;

  return (
    <div className={styles.container}>
      {phase === 'map_selection' && (
        <div className={styles.mapSection}>
          <h2 className={styles.sectionTitle}>🗺 Escolha o Mapa</h2>
          <p className={styles.hint}>Qualquer jogador pode escolher o destino da aventura</p>

          <div className={styles.mapGrid}>
            {MAPS.map(map => {
              const isUnlocked = gameState.unlockedMaps.includes(map.id);
              return (
                <div
                  key={map.id}
                  className={`${styles.mapCard} ${!isUnlocked ? styles.locked : ''}`}
                  onClick={() => isUnlocked && onSelectMap(map.id)}
                  style={{ '--map-bg': map.bgColor } as React.CSSProperties}
                >
                  {!isUnlocked && <div className={styles.lockOverlay}><span>🔒</span><span>Bloqueado</span></div>}

                  <div className={styles.mapTheme}>{map.theme}</div>
                  <h3 className={styles.mapName}>{map.name}</h3>
                  <span className={`${styles.diffBadge} ${styles['diff_' + map.difficulty.replace('é', 'e').replace('á', 'a').replace('â', 'a').toLowerCase()]}`}>
                    {map.difficulty}
                  </span>
                  <p className={styles.mapDesc}>{map.description}</p>

                  <div className={styles.mapEffects}>
                    {map.defenseDebuff > 0 && (
                      <div className={styles.effect + ' ' + styles.debuff}>
                        🛡️ -20% Defesa
                      </div>
                    )}
                    {map.manaCostMultiplier > 1 && (
                      <div className={styles.effect + ' ' + styles.debuff}>
                        💎 Mana x{map.manaCostMultiplier}
                      </div>
                    )}
                    {map.defenseDebuff === 0 && map.manaCostMultiplier === 1 && (
                      <div className={styles.effect + ' ' + styles.neutral}>
                        ✅ Sem penalidades
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'shopping' && (
        <div className={styles.shopSection}>
          <div className={styles.shopHeader}>
            <div>
              <h2 className={styles.sectionTitle}>🛒 Loja do Aventureiro</h2>
              <p className={styles.hint}>
                Mapa selecionado: {MAPS.find(m => m.id === gameState.currentMap)?.name} |
                Moedas do grupo: <span className={styles.coins}>💰 {gameState.groupCoins}</span>
              </p>
            </div>

            <button className={styles.startBtn} onClick={onStartCombat}>
              ⚔️ Iniciar Combate!
            </button>
          </div>

          <div className={styles.shopLayout}>
            <div className={styles.shopItems}>
              <h3 className={styles.shopSubtitle}>Equipamentos Disponíveis</h3>
              <div className={styles.itemGrid}>
                {SHOP_ITEMS.map(item => {
                  const alreadyOwned = myPlayer?.inventory.some(i => i.id === item.id);
                  const canAfford = (myPlayer?.coins ?? 0) >= item.price;

                  return (
                    <div
                      key={item.id}
                      className={`${styles.itemCard} ${alreadyOwned ? styles.owned : ''} ${!canAfford && !alreadyOwned ? styles.cantAfford : ''}`}
                    >
                      <div className={styles.itemEmoji}>{item.emoji}</div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemName}>{item.name}</div>
                        <div className={styles.itemDesc}>{item.description}</div>
                      </div>
                      <div className={styles.itemActions}>
                        <div className={styles.itemPrice}>💰 {item.price}</div>
                        {alreadyOwned ? (
                          <span className={styles.ownedBadge}>Comprado</span>
                        ) : (
                          <button
                            className={styles.buyBtn}
                            onClick={() => onBuyItem(item.id)}
                            disabled={!canAfford}
                          >
                            Comprar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.playerStats}>
              <h3 className={styles.shopSubtitle}>Seus Stats</h3>
              {myPlayer && (
                <div className={styles.statCard}>
                  <div className={styles.playerHeader}>
                    <span className={styles.playerEmoji}>{CLASSES[myPlayer.classType].emoji}</span>
                    <div>
                      <div className={styles.playerName}>{myPlayer.name}</div>
                      <div className={styles.playerClass}>{CLASSES[myPlayer.classType].name} Nv.{myPlayer.level}</div>
                    </div>
                    <div className={styles.playerCoins}>💰 {myPlayer.coins}</div>
                  </div>

                  <div className={styles.statGrid}>
                    <div className={styles.statItem}>
                      <span className={styles.statIcon}>❤️</span>
                      <span className={styles.statVal}>{myPlayer.maxHp} HP</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statIcon}>💎</span>
                      <span className={styles.statVal}>{myPlayer.maxMp} MP</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statIcon}>⚔️</span>
                      <span className={styles.statVal}>{myPlayer.attack} ATK</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statIcon}>🛡️</span>
                      <span className={styles.statVal}>{myPlayer.defense} DEF</span>
                    </div>
                  </div>

                  {myPlayer.inventory.length > 0 && (
                    <div className={styles.inventory}>
                      <div className={styles.invTitle}>Inventário:</div>
                      <div className={styles.invItems}>
                        {myPlayer.inventory.map(i => (
                          <span key={i.id} className={styles.invItem} title={i.description}>
                            {i.emoji} {i.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.allPlayers}>
                <h3 className={styles.shopSubtitle}>Grupo</h3>
                {Object.values(gameState.players).map(p => (
                  <div key={p.id} className={styles.memberRow}>
                    <span>{CLASSES[p.classType].emoji}</span>
                    <span className={styles.memberName}>{p.name}</span>
                    <span className={styles.memberClass}>{CLASSES[p.classType].name}</span>
                    {p.id === myId && <span className={styles.you}>você</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}