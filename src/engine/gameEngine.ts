// ═══════════════════════════════════════════════════════════
//  src/engine/gameEngine.ts — Game Engine v2 (CORRIGIDO)
//  Correções:
//  1. Loja intermediária a cada SHOP_INTERVAL turnos funciona
//  2. shopCountdown atualizado corretamente
//  3. Derrota verificada corretamente
//  4. proceedToNextMap exportado corretamente
// ═══════════════════════════════════════════════════════════

import { nanoid } from 'nanoid';
import {
  GameState, Player, Monster, Item, ClassType, MapId,
  LogEntry, UltCutsceneData, StatusEffect,
} from './types';
import { CLASSES, MAPS, SHOP_ITEMS, TRANSFORM_ITEM, createAnimalSummon, createNecroShadow, BALANCE } from './data';
import { CLASS_SKILLS, canUseSkill, spendMp } from './skills';
import { processPlayerAction as combatAction, handleMonsterDeath, getNextActivePlayer } from './combat';
import { xpToNextLevel, makeLog, applyXp } from './utils';

const SHOP_INTERVAL = 3; // abre loja a cada 3 turnos

declare global { var gameRooms: Map<string, GameState>; }
if (!global.gameRooms) global.gameRooms = new Map();

export function getOrCreateRoom(roomId: string): GameState {
  if (!global.gameRooms.has(roomId)) {
    global.gameRooms.set(roomId, createInitialState(roomId));
  }
  return global.gameRooms.get(roomId)!;
}

export function getRoom(roomId: string): GameState | undefined {
  return global.gameRooms.get(roomId);
}

export function saveRoom(state: GameState): void {
  global.gameRooms.set(state.roomId, state);
}

export function resetRoom(roomId: string): void {
  global.gameRooms.delete(roomId);
}

function createInitialState(roomId: string): GameState {
  return {
    roomId,
    phase: 'lobby',
    players: {},
    playerOrder: [],
    currentMap: 1,
    monsters: [],
    turn: 0,
    combatLog: [],
    groupCoins: 0,
    unlockedMaps: [1],
    actionsThisTurn: {},
    activePlayerId: null,
    bossDefeated: false,
    waveNumber: 0,
    shopCountdown: SHOP_INTERVAL,
    shopReady: {},
    groupMomentum: 0,
    synergyReady: false,
    activeUlt: null,
  };
}

function createPlayer(id: string, name: string, classType: ClassType): Player {
  const cls = CLASSES[classType];
  return {
    id, name, classType, emoji: cls.emoji,
    level: 1, xp: 0, xpToNextLevel: 100,
    hp: cls.baseStats.hp, maxHp: cls.baseStats.hp,
    mp: cls.baseStats.mp, maxMp: cls.baseStats.mp,
    attack: cls.baseStats.attack, defense: cls.baseStats.defense,
    baseAttack: cls.baseStats.attack, baseDefense: cls.baseStats.defense,
    effects: [], isAlive: true,
    inventory: [], coins: 50,
    isReady: false,
    transformed: false, transformTurnsLeft: 0, transformUsedThisCombat: false,
    soulCount: 0, summonCount: 0, spiritStacks: 0,
    momentumContribution: 0,
  };
}

export function joinRoom(state: GameState, playerId: string, name: string): GameState {
  if (Object.keys(state.players).length >= 6) return state;
  if (state.players[playerId]) return state;
  const player = createPlayer(playerId, name, 'warrior');
  return {
    ...state,
    players: { ...state.players, [playerId]: player },
    playerOrder: [...state.playerOrder, playerId],
    phase: 'class_selection',
    combatLog: [...state.combatLog, makeLog(0, `⚔️ ${name} entrou na sala!`, 'system')],
  };
}

export function selectClass(state: GameState, playerId: string, classType: ClassType): GameState {
  if (!state.players[playerId]) return state;
  if (!Object.keys(CLASSES).includes(classType)) return state;

  const takenBy = Object.values(state.players).find(p => p.id !== playerId && p.classType === classType);
  if (takenBy) {
    return {
      ...state,
      combatLog: [...state.combatLog, makeLog(0, `❌ ${CLASSES[classType].name} já foi escolhida por ${takenBy.name}!`, 'system')],
    };
  }

  const old = state.players[playerId];
  const newPlayer = createPlayer(playerId, old.name, classType);
  newPlayer.coins = old.coins;
  newPlayer.level = old.level;
  newPlayer.xp = old.xp;
  newPlayer.xpToNextLevel = old.xpToNextLevel;
  newPlayer.isReady = false;

  const permItems = old.inventory.filter(i => i.permanent);
  permItems.forEach(item => {
    newPlayer.attack += item.attackBonus;
    newPlayer.defense += item.defenseBonus;
    newPlayer.maxHp += item.hpBonus ?? 0;
    newPlayer.hp = newPlayer.maxHp;
    newPlayer.maxMp += item.mpBonus ?? 0;
    newPlayer.mp = newPlayer.maxMp;
  });
  newPlayer.inventory = [
    ...permItems,
    ...old.inventory.filter(i => !i.permanent && i.consumable),
  ];

  return {
    ...state,
    players: { ...state.players, [playerId]: newPlayer },
    combatLog: [...state.combatLog, makeLog(0, `${old.name} escolheu ${CLASSES[classType].emoji} ${CLASSES[classType].name}!`, 'system')],
  };
}

export function setPlayerReady(state: GameState, playerId: string): GameState {
  if (!state.players[playerId]) return state;
  const player = { ...state.players[playerId], isReady: true };
  const newState = {
    ...state,
    players: { ...state.players, [playerId]: player },
    combatLog: [...state.combatLog, makeLog(0, `✅ ${player.name} está pronto!`, 'system')],
  };
  const allReady = Object.values(newState.players).every(p => p.isReady);
  if (allReady && Object.keys(newState.players).length >= 1) {
    return { ...newState, phase: 'map_selection', combatLog: [...newState.combatLog, makeLog(0, '🗺️ Escolham o mapa!', 'system')] };
  }
  return newState;
}

export function selectMap(state: GameState, _playerId: string, mapId: MapId): GameState {
  if (!state.unlockedMaps.includes(mapId)) return state;
  const mapDef = MAPS.find(m => m.id === mapId)!;
  return {
    ...state,
    currentMap: mapId,
    phase: 'shopping',
    bossDefeated: false,
    waveNumber: 0,
    combatLog: [...state.combatLog, makeLog(0, `🗺️ ${mapDef.theme} ${mapDef.name} selecionado!`, 'system'), makeLog(0, `🛒 Loja aberta!`, 'system')],
  };
}

export function buyItem(state: GameState, playerId: string, itemId: string): GameState {
  const player = state.players[playerId];
  if (!player) return state;
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item || player.coins < item.price) return state;
  if (item.permanent && player.inventory.some(i => i.id === itemId)) return state;

  const newInv = [...player.inventory];
  if (item.consumable) {
    const idx = newInv.findIndex(i => i.id === itemId);
    if (idx >= 0) newInv[idx] = { ...newInv[idx], quantity: (newInv[idx].quantity ?? 0) + (item.quantity ?? 1) };
    else newInv.push({ ...item });
  } else {
    newInv.push({ ...item });
  }

  const updatedPlayer: Player = {
    ...player,
    coins: player.coins - item.price,
    attack: player.attack + item.attackBonus,
    defense: player.defense + item.defenseBonus,
    maxHp: player.maxHp + (item.hpBonus ?? 0),
    hp: player.hp + (item.hpBonus ?? 0),
    maxMp: player.maxMp + (item.mpBonus ?? 0),
    mp: player.mp + (item.mpBonus ?? 0),
    inventory: newInv,
  };

  return {
    ...state,
    players: { ...state.players, [playerId]: updatedPlayer },
    combatLog: [...state.combatLog, makeLog(state.turn, `🛒 ${player.name} comprou ${item.emoji} ${item.name}!`, 'system')],
  };
}

export function toggleShopReady(state: GameState, playerId: string): GameState {
  if (!state.players[playerId]) return state;
  if (state.phase !== 'shopping' && state.phase !== 'victory_shopping') return state;

  const isNowReady = !state.shopReady[playerId];
  const newReady = { ...state.shopReady, [playerId]: isNowReady };
  const newState = {
    ...state,
    shopReady: newReady,
    combatLog: [...state.combatLog, makeLog(state.turn, isNowReady ? `✅ ${state.players[playerId].name} pronto!` : `❌ ${state.players[playerId].name} cancelou.`, 'system')],
  };

  const alivePlayers = Object.values(newState.players).filter(p => p.isAlive);
  const allReady = alivePlayers.length > 0 && alivePlayers.every(p => newReady[p.id]);

  if (allReady) {
    if (newState.phase === 'victory_shopping') return proceedToNextMap(newState);
    // Mid-combat shop: retoma combate sem resetar HP
    return resumeCombat({ ...newState, shopReady: {} });
  }
  return newState;
}

// ─── Combat Start (início de mapa — full reset) ──────────

export function startCombat(state: GameState): GameState {
  const resetPlayers: Record<string, Player> = {};
  Object.entries(state.players).forEach(([id, p]) => {
    resetPlayers[id] = {
      ...p,
      hp: p.maxHp, mp: p.maxMp, isAlive: true,
      effects: [],
      transformed: false, transformTurnsLeft: 0, transformUsedThisCombat: false,
      soulCount: 0, summonCount: 0, spiritStacks: 0,
    };
    delete (resetPlayers[id] as any).tauntActive;
  });

  const newState: GameState = {
    ...state,
    phase: 'combat',
    players: resetPlayers,
    turn: 1,
    actionsThisTurn: {},
    shopReady: {},
    bossDefeated: false,
    waveNumber: 0,
    shopCountdown: SHOP_INTERVAL,
    activeUlt: null,
    monsters: [],
    groupMomentum: 0,
    synergyReady: false,
  };

  return spawnWave(newState);
}

// ─── Resume Combat (retoma após loja intermediária) ───────

function resumeCombat(state: GameState): GameState {
  const newState: GameState = {
    ...state,
    phase: 'combat',
    actionsThisTurn: {},
    shopReady: {},
    shopCountdown: SHOP_INTERVAL,
    combatLog: [...state.combatLog, makeLog(state.turn, `⚔️ Combate retomado! Próxima pausa em ${SHOP_INTERVAL} turnos.`, 'system')],
  };

  const first = newState.playerOrder.find(pid => newState.players[pid]?.isAlive);
  return {
    ...newState,
    activePlayerId: first ?? null,
    combatLog: first
      ? [...newState.combatLog, makeLog(newState.turn, `🎯 Vez de ${newState.players[first].name} agir!`, 'system')]
      : newState.combatLog,
  };
}

// ─── Wave / Boss Spawning ─────────────────────────────────

function spawnWave(state: GameState): GameState {
  const mapDef = MAPS.find(m => m.id === state.currentMap)!;
  const existingSummons = state.monsters.filter(m => m.isSummon && m.isAlive);

  const pool = [...mapDef.monsters].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2));
  const freshMonsters: Monster[] = pool.map(m => ({ ...m, id: nanoid(), effects: [], isAlive: true }));
  const waveNum = state.waveNumber + 1;

  const newState: GameState = {
    ...state,
    monsters: [...freshMonsters, ...existingSummons],
    waveNumber: waveNum,
    actionsThisTurn: {},
    combatLog: [...state.combatLog, makeLog(state.turn, `🌊 Onda ${waveNum}! ${freshMonsters.map(m => m.emoji + m.name).join(', ')}`, 'system')],
  };

  const first = newState.playerOrder.find(pid => newState.players[pid]?.isAlive);
  return {
    ...newState,
    activePlayerId: first ?? null,
    combatLog: first
      ? [...newState.combatLog, makeLog(newState.turn, `🎯 Vez de ${newState.players[first].name} agir!`, 'system')]
      : newState.combatLog,
  };
}

function spawnBoss(state: GameState): GameState {
  const mapDef = MAPS.find(m => m.id === state.currentMap)!;
  const existingSummons = state.monsters.filter(m => m.isSummon && m.isAlive);
  const boss: Monster = {
    ...mapDef.boss,
    id: nanoid(),
    hp: mapDef.boss.maxHp,
    effects: [],
    isAlive: true,
    ultTurnsLeft: mapDef.boss.ultCooldown ?? 4,
  };

  const newState: GameState = {
    ...state,
    monsters: [boss, ...existingSummons],
    actionsThisTurn: {},
    combatLog: [
      ...state.combatLog,
      makeLog(state.turn, `💥 Onda limpa! O BOSS aparece!`, 'system'),
      makeLog(state.turn, `⚠️ ${boss.name} — ${boss.multiAttack && boss.multiAttack > 1 ? `${boss.multiAttack}x ataques por turno` : ''}${boss.bossUlt ? ' + ULTIMATE' : ''}`, 'level_up'),
    ],
  };

  const first = newState.playerOrder.find(pid => newState.players[pid]?.isAlive);
  return {
    ...newState,
    activePlayerId: first ?? null,
    combatLog: first
      ? [...newState.combatLog, makeLog(newState.turn, `🎯 Vez de ${newState.players[first].name} agir!`, 'system')]
      : newState.combatLog,
  };
}

// ─── Player Action ────────────────────────────────────────

export function processAction(
  state: GameState,
  playerId: string,
  action: { type: string; targetId?: string; skillIndex?: number; itemId?: string }
): GameState {
  if (state.phase !== 'combat') return state;
  if (state.activePlayerId !== playerId) return state;
  if (state.actionsThisTurn[playerId]) return state;
  if (!state.players[playerId]?.isAlive) return state;

  const combatState = gameToCombat(state);
  const updatedCombat = combatAction(combatState, playerId, action as any);
  let newState = combatToGame(state, updatedCombat);

  if ((updatedCombat as any).pendingUlt) {
    newState = { ...newState, activeUlt: (updatedCombat as any).pendingUlt };
  }

  newState = checkBattleResult(newState);

  return newState;
}

// ─── Transform ────────────────────────────────────────────

export function useTransform(state: GameState, playerId: string): GameState {
  if (state.phase !== 'combat') return state;
  if (state.activePlayerId !== playerId) return state;
  if (state.actionsThisTurn[playerId]) return state;

  const player = state.players[playerId];
  if (!player?.isAlive) return state;
  if (!player.inventory.some(i => i.isTransformItem)) return addLog(state, `❌ ${player.name}: sem Essência do Deus Antigo!`, 'system');
  if (player.transformUsedThisCombat) return addLog(state, `❌ ${player.name}: transformação já usada neste combate!`, 'system');
  if (player.transformed) return addLog(state, `❌ ${player.name}: já transformado!`, 'system');

  const atkBonus = Math.floor(player.attack * 1.2);
  const defBonus = Math.floor(player.defense * 1.0);
  const hpBonus = 80;

  const transformed: Player = {
    ...player,
    attack: player.attack + atkBonus,
    defense: player.defense + defBonus,
    maxHp: player.maxHp + hpBonus,
    hp: Math.min(player.hp + hpBonus, player.maxHp + hpBonus),
    transformed: true,
    transformTurnsLeft: 6,
    transformUsedThisCombat: true,
  };

  const ultData: UltCutsceneData = {
    playerId,
    playerName: player.name,
    classType: player.classType,
    ultName: `TRANSFORMAÇÃO: ${CLASSES[player.classType].name.toUpperCase()}`,
    ultLines: ['Absorvendo a Essência do Deus Antigo...', 'O poder transcende os limites...', 'TRANSFORMAÇÃO!'],
    ultColor: CLASSES[player.classType].color,
    ultBg: `radial-gradient(ellipse, #1a1a30 0%, #050508 70%)`,
    ultEmoji: CLASSES[player.classType].emoji,
    isTransform: true,
  };

  let newState = {
    ...state,
    players: { ...state.players, [playerId]: transformed },
    activeUlt: ultData,
    actionsThisTurn: { ...state.actionsThisTurn, [playerId]: true },
    combatLog: [...state.combatLog, makeLog(state.turn, `🌟 ${player.name} se TRANSFORMA! +${atkBonus} ATK, +${defBonus} DEF, +${hpBonus} HP por 6 turnos!`, 'level_up')],
  };

  return advanceAfterAction(newState, playerId);
}

// ─── Battle Result Check ──────────────────────────────────

function checkBattleResult(state: GameState): GameState {
  const alivePlayers = Object.values(state.players).filter(p => p.isAlive);
  const aliveEnemies = state.monsters.filter(m => m.hp > 0 && !m.isSummon);

  if (alivePlayers.length === 0) {
    return { ...state, phase: 'defeat', combatLog: [...state.combatLog, makeLog(state.turn, `💀 DERROTA! O grupo foi aniquilado.`, 'system')] };
  }

  if (aliveEnemies.length === 0) {
    const hadBoss = state.monsters.some(m => m.isBoss && !m.isSummon);
    if (!hadBoss) return spawnBoss(state);
    return handleVictory(state);
  }

  // ── Verificar loja intermediária ────────────────────────
  // Conta ações deste turno — se todos os jogadores agiram E os monstros também (turn incrementou)
  // O turno incrementa em processMonsterPhase, então checamos aqui após cada ação
  const shopCountdown = state.shopCountdown;
  if (shopCountdown <= 0 && !state.bossDefeated && state.phase === 'combat') {
    return openMidCombatShop(state);
  }

  return state;
}

function openMidCombatShop(state: GameState): GameState {
  return {
    ...state,
    phase: 'shopping',
    shopReady: {},
    combatLog: [
      ...state.combatLog,
      makeLog(state.turn, `🛒 Pausa de combate! Loja aberta por 3 turnos!`, 'system'),
      makeLog(state.turn, `⚠️ Após todos confirmarem, o combate retoma.`, 'system'),
    ],
  };
}

function handleVictory(state: GameState): GameState {
  const mapDef = MAPS.find(m => m.id === state.currentMap)!;
  const nextMapId = (state.currentMap + 1) as MapId;
  let newState = { ...state };

  if (nextMapId <= 12 && !newState.unlockedMaps.includes(nextMapId)) {
    newState = { ...newState, unlockedMaps: [...newState.unlockedMaps, nextMapId] };
    const next = MAPS.find(m => m.id === nextMapId);
    if (next) newState = addLog(newState, `🗺️ ${next.theme} ${next.name} desbloqueado!`, 'level_up');
  }

  // Mapa 7 dropa transform item
  if (state.currentMap === 7) {
    const newPlayers = { ...newState.players };
    Object.keys(newPlayers).forEach(pid => {
      if (!newPlayers[pid].inventory.some(i => i.isTransformItem)) {
        newPlayers[pid] = { ...newPlayers[pid], inventory: [...newPlayers[pid].inventory, { ...TRANSFORM_ITEM }] };
      }
    });
    newState = { ...newState, players: newPlayers };
    newState = addLog(newState, `✨ Essência do Deus Antigo obtida!`, 'level_up');
  }

  const newPlayers = { ...newState.players };
  Object.keys(newPlayers).forEach(pid => {
    let p = { ...newPlayers[pid], hp: newPlayers[pid].maxHp, mp: newPlayers[pid].maxMp, isAlive: true };
    const { player: leveled, leveled: didLevel, newLevel } = applyXp(p, mapDef.boss.xpReward);
    p = { ...leveled, coins: leveled.coins + 100 };
    if (didLevel) newState = addLog(newState, `🎉 ${p.name} → Nível ${newLevel}!`, 'level_up');
    newPlayers[pid] = p;
  });

  const cleanMonsters = newState.monsters.filter(m => !m.isSummon);
  const summonResetPlayers = { ...newPlayers };
  Object.keys(summonResetPlayers).forEach(pid => {
    summonResetPlayers[pid] = { ...summonResetPlayers[pid], summonCount: 0 };
  });

  newState = addLog({ ...newState, players: summonResetPlayers, monsters: cleanMonsters, bossDefeated: true },
    `🏆 VITÓRIA! ${mapDef.theme} ${mapDef.name} conquistado! +100 moedas`, 'system');

  return { ...newState, phase: 'victory_shopping', shopReady: {} };
}

export function proceedToNextMap(state: GameState): GameState {
  const nextId = (state.currentMap + 1) as MapId;
  if (nextId > 12) {
    return addLog({ ...state, phase: 'defeat' }, `🌟 PARABÉNS! Você derrotou o DEUS DO VAZIO!`, 'level_up');
  }
  const resetPlayers = { ...state.players };
  Object.keys(resetPlayers).forEach(pid => {
    const p = resetPlayers[pid];
    resetPlayers[pid] = { ...p, hp: p.maxHp, mp: p.maxMp, isAlive: true, effects: [], soulCount: 0, summonCount: 0, spiritStacks: 0 };
  });
  const nm = MAPS.find(m => m.id === nextId)!;
  return {
    ...state,
    currentMap: nextId,
    phase: 'map_selection',
    players: resetPlayers,
    monsters: [],
    actionsThisTurn: {},
    activePlayerId: null,
    activeUlt: null,
    bossDefeated: false,
    waveNumber: 0,
    shopCountdown: SHOP_INTERVAL,
    combatLog: [...state.combatLog, makeLog(0, `🗺️ Avançando para ${nm.theme} ${nm.name}!`, 'system')],
  };
}

export function clearUlt(state: GameState): GameState {
  return { ...state, activeUlt: null };
}

export function handleDisconnect(state: GameState, playerId: string): GameState {
  if (!state.players[playerId]) return state;
  const name = state.players[playerId].name;
  const newPlayers = { ...state.players };
  delete newPlayers[playerId];
  const newOrder = state.playerOrder.filter(id => id !== playerId);
  const newActions = { ...state.actionsThisTurn };
  delete newActions[playerId];

  let newState: GameState = {
    ...state,
    players: newPlayers,
    playerOrder: newOrder,
    actionsThisTurn: newActions,
    phase: Object.keys(newPlayers).length === 0 ? 'lobby' : state.phase,
    combatLog: [...state.combatLog, makeLog(state.turn, `${name} saiu da sala.`, 'system')],
  };

  if (state.activePlayerId === playerId) {
    const next = newOrder.find(pid => newPlayers[pid]?.isAlive && !newActions[pid]);
    newState = { ...newState, activePlayerId: next ?? null };
  }

  return newState;
}

// ─── CombatState Bridge ───────────────────────────────────

function gameToCombat(state: GameState): any {
  return {
    players: state.players,
    playerOrder: state.playerOrder,
    activePlayerId: state.activePlayerId,
    monsters: state.monsters,
    turn: state.turn,
    actionsThisTurn: state.actionsThisTurn,
    log: state.combatLog,
    groupMomentum: state.groupMomentum,
    momentumThreshold: BALANCE.MOMENTUM_MAX,
    synergyReady: state.synergyReady,
    pendingUlt: null,
  };
}

function combatToGame(original: GameState, combatState: any): GameState {
  // Calcula shopCountdown com base no turno atual vs anterior
  const prevTurn = original.turn;
  const newTurn = combatState.turn;
  let shopCountdown = original.shopCountdown;

  if (newTurn > prevTurn) {
    // Um turno completo passou (monstros agiram)
    shopCountdown = Math.max(0, shopCountdown - (newTurn - prevTurn));
  }

  return {
    ...original,
    players: combatState.players,
    monsters: combatState.monsters,
    turn: newTurn,
    actionsThisTurn: combatState.actionsThisTurn,
    combatLog: combatState.log,
    activePlayerId: combatState.activePlayerId,
    groupMomentum: combatState.groupMomentum,
    synergyReady: combatState.synergyReady,
    shopCountdown,
  };
}

function advanceAfterAction(state: GameState, playerId: string): GameState {
  const nextPid = state.playerOrder.find(pid => state.players[pid]?.isAlive && !state.actionsThisTurn[pid] && pid !== playerId);
  if (nextPid) {
    return {
      ...state,
      activePlayerId: nextPid,
      combatLog: [...state.combatLog, makeLog(state.turn, `🎯 Vez de ${state.players[nextPid].name} agir!`, 'system')],
    };
  }
  return { ...state, activePlayerId: null };
}

function addLog(state: GameState, message: string, type: LogEntry['type']): GameState {
  return { ...state, combatLog: [...state.combatLog, makeLog(state.turn, message, type)] };
}