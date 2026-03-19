import { GameState, Player, Monster, CombatLogEntry, MapId, ClassType, StatusEffect } from './types';
import { MAPS, SHOP_ITEMS, createPlayer, rollDice, calculateDamage, levelUp, CLASSES, SKILLS } from './gameData';
import { nanoid } from 'nanoid';

declare global {
  // eslint-disable-next-line no-var
  var gameRooms: Map<string, GameState>;
}

if (!global.gameRooms) {
  global.gameRooms = new Map();
}

export function getOrCreateRoom(roomId: string): GameState {
  if (!global.gameRooms.has(roomId)) {
    const state: GameState = {
      roomId,
      phase: 'lobby',
      players: {},
      playerOrder: [],
      currentPlayerIndex: 0,
      activePlayerId: null,
      currentMap: 1,
      currentMonsters: [],
      turn: 0,
      turnPhase: 'player_turns',
      combatLog: [],
      groupCoins: 0,
      unlockedMaps: [1],
      unlockedClasses: ['warrior','mage','rogue','necromancer','paladin','ranger','assassin','elementalist','berserker','guardian','druid','bard'],
      actionsThisTurn: {},
      shopItems: SHOP_ITEMS,
      bossDefeated: false,
      waveNumber: 0,
      shopCountdown: 3,
      shopReady: {},
    };
    global.gameRooms.set(roomId, state);
  }
  return global.gameRooms.get(roomId)!;
}

export function getRoom(roomId: string): GameState | undefined {
  return global.gameRooms.get(roomId);
}

export function saveRoom(state: GameState): void {
  global.gameRooms.set(state.roomId, state);
}

function addLog(state: GameState, message: string, type: CombatLogEntry['type']): void {
  state.combatLog.push({
    id: nanoid(),
    turn: state.turn,
    message,
    type,
    timestamp: Date.now(),
  });
  if (state.combatLog.length > 80) {
    state.combatLog = state.combatLog.slice(-80);
  }
}

// Advance to the next alive player's turn
function advanceToNextPlayer(state: GameState): void {
  const alivePlayers = state.playerOrder.filter(pid => state.players[pid]?.isAlive);
  if (alivePlayers.length === 0) return;

  // Find next player who hasn't acted
  const pending = alivePlayers.filter(pid => !state.actionsThisTurn[pid]);
  if (pending.length > 0) {
    state.activePlayerId = pending[0];
    addLog(state, `🎯 Vez de ${state.players[pending[0]].name} agir!`, 'system');
  } else {
    // All alive players acted — run monster turns
    state.activePlayerId = null;
    processMonsterTurns(state);
  }
}

export function joinRoom(state: GameState, playerId: string, name: string): GameState {
  if (Object.keys(state.players).length >= 6) return state;
  if (state.players[playerId]) return state;

  // Create player with default warrior class so stats are never zero
  const newPlayer = createPlayer(playerId, name, 'warrior');
  newPlayer.isReady = false;

  state.players[playerId] = newPlayer;
  if (!state.playerOrder.includes(playerId)) {
    state.playerOrder.push(playerId);
  }

  addLog(state, `⚔️ ${name} entrou na sala!`, 'system');

  if (Object.keys(state.players).length >= 1) {
    state.phase = 'class_selection';
  }

  return { ...state };
}

export function selectClass(state: GameState, playerId: string, classType: ClassType): GameState {
  if (!state.players[playerId]) return state;
  if (!state.unlockedClasses.includes(classType)) return state;

  const name = state.players[playerId].name;
  const player = createPlayer(playerId, name, classType);
  player.isReady = false;
  state.players[playerId] = player;
  addLog(state, `${name} escolheu ${CLASSES[classType].emoji} ${CLASSES[classType].name}!`, 'system');

  return { ...state };
}

export function setPlayerReady(state: GameState, playerId: string): GameState {
  if (!state.players[playerId]) return state;
  state.players[playerId] = { ...state.players[playerId], isReady: true };
  addLog(state, `✅ ${state.players[playerId].name} está pronto!`, 'system');

  const allReady = Object.values(state.players).every(p => p.isReady);
  const playerCount = Object.keys(state.players).length;

  if (allReady && playerCount >= 1) {
    state.phase = 'map_selection';
    addLog(state, '🗺️ Todos prontos! Escolham o mapa.', 'system');
  }

  return { ...state };
}

export function selectMap(state: GameState, playerId: string, mapId: MapId): GameState {
  if (!state.unlockedMaps.includes(mapId)) return state;

  state.currentMap = mapId;
  state.phase = 'shopping';
  state.bossDefeated = false;
  state.waveNumber = 0;

  const mapDef = MAPS.find(m => m.id === mapId)!;
  addLog(state, `🗺️ Mapa selecionado: ${mapDef.theme} ${mapDef.name}`, 'system');
  addLog(state, `🛒 Loja aberta! Comprem equipamentos antes da batalha.`, 'system');

  Object.keys(state.players).forEach(pid => {
    state.players[pid] = { ...state.players[pid], coins: state.players[pid].coins > 0 ? state.players[pid].coins : 50 };
  });

  return { ...state };
}

export function buyItem(state: GameState, playerId: string, itemId: string): GameState {
  const player = state.players[playerId];
  if (!player) return state;

  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return state;
  if (player.coins < item.price) return state;

  // For consumables, allow re-buying (adds quantity); for equipment, block duplicate
  if (!item.consumable && player.inventory.some(i => i.id === itemId)) return state;

  let newInventory = [...player.inventory];
  if (item.consumable) {
    const existing = newInventory.findIndex(i => i.id === itemId);
    if (existing >= 0) {
      // Stack — add quantity
      newInventory[existing] = { ...newInventory[existing], quantity: (newInventory[existing].quantity ?? 0) + (item.quantity ?? 1) };
    } else {
      newInventory.push({ ...item });
    }
  } else {
    newInventory.push({ ...item });
  }

  state.players[playerId] = {
    ...player,
    coins: player.coins - item.price,
    attack: player.attack + item.attackBonus,
    defense: player.defense + item.defenseBonus,
    maxHp: player.maxHp + (item.hpBonus ?? 0),
    hp: player.hp + (item.hpBonus ?? 0),
    maxMp: player.maxMp + (item.mpBonus ?? 0),
    mp: player.mp + (item.mpBonus ?? 0),
    inventory: newInventory,
  };

  addLog(state, `🛒 ${player.name} comprou ${item.emoji} ${item.name}!`, 'system');
  return { ...state };
}

export function startCombat(state: GameState): GameState {
  const mapDef = MAPS.find(m => m.id === state.currentMap)!;

  // Spawn monsters — random selection from pool
  const monstersToSpawn = [...mapDef.monsters]
    .sort(() => Math.random() - 0.5)
    .slice(0, 2 + Math.floor(Math.random() * 2));

  state.currentMonsters = monstersToSpawn.map(m => ({ ...m, id: nanoid() }));
  state.phase = 'combat';
  state.turn = 1;
  state.turnPhase = 'player_turns';
  state.actionsThisTurn = {};
  state.shopReady = {};
  state.currentPlayerIndex = 0;
  state.bossDefeated = false;
  state.waveNumber = 1;
  state.shopCountdown = 3;

  // Restore all players to full HP/MP when starting fresh combat
  Object.keys(state.players).forEach(pid => {
    state.players[pid] = {
      ...state.players[pid],
      hp: state.players[pid].maxHp,
      mp: state.players[pid].maxMp,
      isAlive: true,
    };
  });

  // Set first alive player as active
  const firstAlive = state.playerOrder.find(pid => state.players[pid]?.isAlive);
  state.activePlayerId = firstAlive ?? null;

  addLog(state, `⚔️ COMBATE INICIADO! Mapa: ${mapDef.name}`, 'system');
  addLog(state, `👹 Inimigos aparecem: ${state.currentMonsters.map(m => m.emoji + m.name).join(', ')}`, 'system');
  addLog(state, `🎲 Turno ${state.turn} — Vez de ${firstAlive ? state.players[firstAlive].name : '?'} agir!`, 'system');

  return { ...state };
}

export function toggleShopReady(state: GameState, playerId: string): GameState {
  if (!state.players[playerId]) return state;
  if (state.phase !== 'shopping' && state.phase !== 'victory_shopping') return state;

  const isReady = !state.shopReady[playerId];
  state.shopReady[playerId] = isReady;

  const playerName = state.players[playerId].name;
  addLog(state, isReady
    ? `✅ ${playerName} está pronto para continuar!`
    : `❌ ${playerName} cancelou o pronto.`,
    'system'
  );

  // Check if ALL alive players are ready
  const alivePlayers = Object.values(state.players).filter(p => p.isAlive);
  const allReady = alivePlayers.length > 0 && alivePlayers.every(p => state.shopReady[p.id]);

  if (allReady) {
    addLog(state, `⚔️ Todos prontos! Continuando...`, 'system');
    state.shopReady = {};
    if (state.phase === 'victory_shopping') {
      return proceedToNextMap(state);
    } else {
      return continueCombat(state);
    }
  }

  return { ...state };
}

export function continueCombat(state: GameState): GameState {
  // First time (turn=0) — delegate to startCombat for full init
  if (state.turn === 0) {
    return startCombat(state);
  }

  // Called after a mid-combat shop break
  const mapDef = MAPS.find(m => m.id === state.currentMap)!;

  // Spawn a new wave if no monsters remain
  if (state.currentMonsters.filter(m => m.hp > 0).length === 0) {
    const monstersToSpawn = [...mapDef.monsters]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 2));
    state.currentMonsters = monstersToSpawn.map(m => ({ ...m, id: nanoid() }));
    state.waveNumber += 1;
    addLog(state, `🌊 Onda ${state.waveNumber}! Novos inimigos aparecem!`, 'system');
  }

  state.phase = 'combat';
  state.turnPhase = 'player_turns';
  state.actionsThisTurn = {};
  state.shopReady = {};
  state.shopCountdown = 3;

  const firstAlive = state.playerOrder.find(pid => state.players[pid]?.isAlive);
  state.activePlayerId = firstAlive ?? null;

  addLog(state, `⚔️ Combate retomado! Turno ${state.turn}`, 'system');
  if (firstAlive) addLog(state, `🎯 Vez de ${state.players[firstAlive].name} agir!`, 'system');

  return { ...state };
}

export function processPlayerAction(
  state: GameState,
  playerId: string,
  action: { type: string; targetId?: string; skillIndex?: number; itemId?: string }
): GameState {
  if (state.phase !== 'combat') return state;
  if (state.turnPhase !== 'player_turns') return state;
  if (state.actionsThisTurn[playerId]) return state;

  // Only the active player can act
  if (state.activePlayerId !== playerId) {
    addLog(state, `⏳ Aguarde sua vez!`, 'system');
    return state;
  }

  const player = state.players[playerId];
  if (!player || !player.isAlive) return state;

  const mapDef = MAPS.find(m => m.id === state.currentMap)!;
  const manaMult = mapDef.manaCostMultiplier;

  let updatedPlayer = { ...player };

  // --- USE POTION ---
  if (action.type === 'use_potion') {
    const itemIdx = updatedPlayer.inventory.findIndex(i => i.id === action.itemId && i.consumable && (i.quantity ?? 0) > 0);
    if (itemIdx === -1) return state;
    const item = updatedPlayer.inventory[itemIdx];

    if (item.consumeHeal) {
      updatedPlayer.hp = Math.min(updatedPlayer.maxHp, updatedPlayer.hp + item.consumeHeal);
      addLog(state, `${player.name} usa ${item.emoji} ${item.name}! +${item.consumeHeal} HP.`, 'player_action');
    }
    if (item.consumeMpHeal) {
      updatedPlayer.mp = Math.min(updatedPlayer.maxMp, updatedPlayer.mp + item.consumeMpHeal);
      addLog(state, `${player.name} usa ${item.emoji} ${item.name}! +${item.consumeMpHeal} MP.`, 'player_action');
    }

    // Decrease quantity
    const newQty = (item.quantity ?? 1) - 1;
    const newInventory = [...updatedPlayer.inventory];
    if (newQty <= 0) {
      newInventory.splice(itemIdx, 1);
    } else {
      newInventory[itemIdx] = { ...item, quantity: newQty };
    }
    updatedPlayer.inventory = newInventory;
    state.players[playerId] = updatedPlayer;
    state.actionsThisTurn[playerId] = true;

    checkBattleEnd(state);
    const phaseAfterCheck = (state as GameState).phase;
    if (phaseAfterCheck === 'victory_shopping' || phaseAfterCheck === 'defeat' || phaseAfterCheck === 'shopping') {
      return { ...state };
    }
    advanceToNextPlayer(state);
    return { ...state };
  }

  if (action.type === 'attack') {
    const target = state.currentMonsters.find(m => m.id === action.targetId && m.hp > 0);
    if (!target) return state;

    const dice = rollDice();
    let bonus = 0;
    // Apply necro buff from any necromancer in the group
    const activeNecroBuff = Object.values(state.players).find(
      p => p.isAlive && p.necromancerBuff && p.necromancerBuff.turnsLeft > 0
    );
    if (activeNecroBuff?.necromancerBuff) {
      bonus += activeNecroBuff.necromancerBuff.damage;
    }

    const damage = calculateDamage(player.attack, target.defense, dice, bonus);
    const monsterIdx = state.currentMonsters.findIndex(m => m.id === action.targetId);
    state.currentMonsters[monsterIdx] = { ...target, hp: Math.max(0, target.hp - damage) };

    addLog(state, `${player.name} ${CLASSES[player.classType].emoji} ataca ${target.emoji}${target.name}! [🎲${dice}] Dano: ${damage}`, 'player_action');

    if (state.currentMonsters[monsterIdx].hp <= 0) {
      addLog(state, `💀 ${target.emoji}${target.name} foi derrotado!`, 'system');
      distributeRewards(state, target);
    }

  } else if (action.type === 'skill') {
    const skills = SKILLS[player.classType];
    const skillIdx = action.skillIndex ?? 3;
    const skill = skills[skillIdx];
    if (!skill) return state;

    const mpCost = Math.ceil(skill.mpCost * manaMult);
    if (updatedPlayer.mp < mpCost) {
      addLog(state, `❌ ${player.name} não tem Mana suficiente! (${updatedPlayer.mp}/${mpCost} MP necessário)`, 'system');
      return state;
    }

    updatedPlayer.mp -= mpCost;

    // Damage skills
    if (skill.damage !== undefined) {
      const isAoE = !!skill.aoe;

      if (isAoE) {
        const dice = rollDice();
        state.currentMonsters = state.currentMonsters.map(m => {
          if (m.hp <= 0) return m;
          const dmg = calculateDamage(player.attack + skill.damage!, Math.floor(m.defense * 0.5), dice);
          const newHp = Math.max(0, m.hp - dmg);
          addLog(state, `💥 ${skill.emoji} ${skill.name} atinge ${m.emoji}${m.name} por ${dmg} de dano!`, 'player_action');
          if (newHp <= 0) {
            addLog(state, `💀 ${m.emoji}${m.name} foi derrotado!`, 'system');
            distributeRewards(state, m);
          }
          return { ...m, hp: newHp };
        });
      } else {
        const target = state.currentMonsters.find(m => m.id === action.targetId && m.hp > 0);
        if (target) {
          const dice = rollDice();
          const damage = calculateDamage(player.attack + skill.damage, Math.floor(target.defense * 0.5), dice);
          const monsterIdx = state.currentMonsters.findIndex(m => m.id === action.targetId);
          state.currentMonsters[monsterIdx] = { ...target, hp: Math.max(0, target.hp - damage) };
          addLog(state, `${player.name} usa ${skill.emoji} ${skill.name} em ${target.emoji}${target.name}! Dano: ${damage}`, 'player_action');
          if (state.currentMonsters[monsterIdx].hp <= 0) {
            addLog(state, `💀 ${target.emoji}${target.name} foi derrotado!`, 'system');
            distributeRewards(state, target);
          }
        }
      }
    }

    // Heal skills
    if (skill.heal !== undefined) {
      const isAoeHeal = skill.effect === 'aoe_heal' || (skillIdx === 3 && (player.classType === 'paladin' || player.classType === 'druid'));
      if (isAoeHeal) {
        Object.keys(state.players).forEach(pid => {
          if (state.players[pid].isAlive) {
            state.players[pid] = { ...state.players[pid], hp: Math.min(state.players[pid].maxHp, state.players[pid].hp + skill.heal!) };
          }
        });
        addLog(state, `${player.name} usa ${skill.emoji} ${skill.name}! Cura ${skill.heal}HP para todos!`, 'player_action');
      } else if (action.targetId && state.players[action.targetId]) {
        const targetPlayer = state.players[action.targetId];
        state.players[action.targetId] = { ...targetPlayer, hp: Math.min(targetPlayer.maxHp, targetPlayer.hp + skill.heal) };
        addLog(state, `${player.name} usa ${skill.emoji} ${skill.name} em ${targetPlayer.name}! +${skill.heal}HP.`, 'player_action');
      } else {
        // Self heal
        updatedPlayer.hp = Math.min(updatedPlayer.maxHp, updatedPlayer.hp + skill.heal);
        addLog(state, `${player.name} usa ${skill.emoji} ${skill.name}! +${skill.heal}HP.`, 'player_action');
      }
    }

    // Special effects
    if (skill.effect === 'balada') {
      Object.keys(state.players).forEach(pid => {
        if (state.players[pid].isAlive) {
          state.players[pid] = {
            ...state.players[pid],
            attack: state.players[pid].attack + 5,
            defense: state.players[pid].defense + 5,
            hp: Math.min(state.players[pid].maxHp, state.players[pid].hp + 20),
          };
        }
      });
      addLog(state, `${player.name} toca ${skill.emoji} ${skill.name}! +5 ATK/DEF e +20HP para todos!`, 'player_action');
    }

    if (skill.effect === 'revive' && action.targetId && state.players[action.targetId]) {
      const target = state.players[action.targetId];
      if (!target.isAlive) {
        const reviveHp = Math.floor(target.maxHp * 0.3);
        state.players[action.targetId] = { ...target, isAlive: true, hp: reviveHp };
        addLog(state, `${player.name} usa ${skill.emoji} ${skill.name}! ${target.name} reviveu com ${reviveHp}HP!`, 'player_action');
      }
    }

    if (skill.effect === 'poison' && action.targetId) {
      const targetMonster = state.currentMonsters.find(m => m.id === action.targetId && m.hp > 0);
      if (targetMonster) {
        const effect: StatusEffect = { type: 'poisoned', value: 5, turnsLeft: 3 };
        const existing = targetMonster.statusEffects || [];
        existing.push(effect);
        state.currentMonsters[state.currentMonsters.findIndex(m => m.id === action.targetId)] = { ...targetMonster, statusEffects: existing };
        addLog(state, `${player.name} envenena ${targetMonster.emoji}${targetMonster.name}! Dano de veneno por 3 turnos.`, 'player_action');
      }
    }
  }

  state.players[playerId] = updatedPlayer;
  state.actionsThisTurn[playerId] = true;

  // Check battle end before advancing turn
  checkBattleEnd(state);
  const phaseAfterCheck = (state as GameState).phase;
  if (phaseAfterCheck === 'victory_shopping' || phaseAfterCheck === 'defeat' || phaseAfterCheck === 'shopping') {
    return { ...state };
  }

  // Advance to next player
  advanceToNextPlayer(state);

  return { ...state };
}

function distributeRewards(state: GameState, monster: Monster): void {
  const alivePlayers = Object.values(state.players).filter(p => p.isAlive);
  const xpEach = Math.ceil(monster.xpReward / alivePlayers.length);
  const coinsEach = Math.ceil(monster.coinReward / alivePlayers.length);

  state.groupCoins += monster.coinReward;

  alivePlayers.forEach(p => {
    let updatedPlayer = {
      ...p,
      xp: p.xp + xpEach,
      coins: p.coins + coinsEach,
    };
    const result = levelUp(updatedPlayer);
    if (result.didLevelUp) {
      addLog(state, `🎉 ${p.name} subiu para o nível ${result.player.level}! HP e Dano aumentaram!`, 'level_up');
    }
    state.players[p.id] = result.player;
  });

  addLog(state, `💰 +${monster.coinReward} moedas (+${coinsEach} cada)! +${xpEach} XP cada.`, 'system');
}

function processMonsterTurns(state: GameState): void {
  state.turnPhase = 'monster_turns';
  addLog(state, `👹 Fase dos Monstros!`, 'system');

  const aliveMonsters = state.currentMonsters.filter(m => m.hp > 0);
  const alivePlayers = Object.values(state.players).filter(p => p.isAlive);

  aliveMonsters.forEach(monster => {
    if (alivePlayers.length === 0) return;

    const attackCount = monster.isBoss ? 2 + Math.floor(Math.random() * 2) : 1; // Bosses attack 2-3 times
    for (let i = 0; i < attackCount; i++) {
      if (alivePlayers.length === 0) break;
      const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      const dice = rollDice();
      const mapDef = MAPS.find(m => m.id === state.currentMap)!;
      const effectiveDef = Math.floor(target.defense * (1 - mapDef.defenseDebuff));
      const damage = calculateDamage(monster.attack, effectiveDef, dice);

      state.players[target.id] = {
        ...state.players[target.id],
        hp: Math.max(0, state.players[target.id].hp - damage),
      };

      const debuffNote = mapDef.defenseDebuff > 0 ? ` (Defesa -${mapDef.defenseDebuff * 100}%)` : '';
      addLog(state, `${monster.emoji}${monster.name} ataca ${target.name}! [🎲${dice}] Dano: ${damage}${debuffNote}`, 'monster_action');

      if (state.players[target.id].hp <= 0) {
        state.players[target.id] = { ...state.players[target.id], isAlive: false };
        addLog(state, `💀 ${target.name} foi derrotado!`, 'death');
      }
    }
  });

  // Apply status effects to monsters
  state.currentMonsters = state.currentMonsters.map(monster => {
    if (monster.hp <= 0) return monster;
    const effects = monster.statusEffects || [];
    let newHp = monster.hp;
    const newEffects = effects.filter(effect => {
      if (effect.type === 'poisoned') {
        newHp -= effect.value;
        addLog(state, `${monster.emoji}${monster.name} sofre ${effect.value} dano de veneno!`, 'monster_action');
      }
      effect.turnsLeft -= 1;
      return effect.turnsLeft > 0;
    });
    return { ...monster, hp: Math.max(0, newHp), statusEffects: newEffects.length > 0 ? newEffects : undefined };
  });

  // Tick necromancer buffs
  Object.keys(state.players).forEach(pid => {
    const p = state.players[pid];
    if (p.necromancerBuff && p.necromancerBuff.turnsLeft > 0) {
      const newTurns = p.necromancerBuff.turnsLeft - 1;
      state.players[pid] = {
        ...p,
        necromancerBuff: newTurns > 0 ? { ...p.necromancerBuff, turnsLeft: newTurns } : undefined,
      };
    }
  });

  // MP regeneration: +10% max MP per turn for all alive players
  Object.keys(state.players).forEach(pid => {
    const p = state.players[pid];
    if (p.isAlive) {
      const mpRegen = Math.max(1, Math.floor(p.maxMp * 0.10));
      const newMp = Math.min(p.maxMp, p.mp + mpRegen);
      if (newMp > p.mp) {
        state.players[pid] = { ...state.players[pid], mp: newMp };
      }
    }
  });
  addLog(state, `💎 Regeneração de Mana! +10% MP para todos.`, 'system');

  // Advance turn counter
  state.turn += 1;
  state.shopCountdown -= 1;
  state.turnPhase = 'player_turns';
  state.actionsThisTurn = {};

  // Check battle end FIRST (victory/defeat takes priority over shop break)
  checkBattleEnd(state);
  if (state.phase === 'victory_shopping' || state.phase === 'defeat') return;

  // Shop break every 3 turns (mid-combat)
  if (state.shopCountdown <= 0) {
    state.phase = 'shopping';
    state.shopReady = {};
    addLog(state, `🛒 Pausa para loja! Comprem equipamentos antes do próximo turno.`, 'system');
    Object.keys(state.players).forEach(pid => {
      state.players[pid] = { ...state.players[pid], coins: state.players[pid].coins + 20 };
    });
    addLog(state, `💰 +20 moedas para cada jogador!`, 'system');
    return;
  }

  // Set next active player
  const firstAlive = state.playerOrder.find(pid => state.players[pid]?.isAlive);
  state.activePlayerId = firstAlive ?? null;
  addLog(state, `🎲 Turno ${state.turn} — Fase dos Jogadores`, 'system');
  if (firstAlive) addLog(state, `🎯 Vez de ${state.players[firstAlive].name} agir!`, 'system');
}

function checkBattleEnd(state: GameState): void {
  const aliveMonsters = state.currentMonsters.filter(m => m.hp > 0);
  const alivePlayers = Object.values(state.players).filter(p => p.isAlive);

  if (alivePlayers.length === 0) {
    state.phase = 'defeat';
    addLog(state, `💀 DERROTA! Todos os jogadores foram derrotados...`, 'system');
    return;
  }

  if (aliveMonsters.length === 0) {
    const mapDef = MAPS.find(m => m.id === state.currentMap)!;
    const hadBoss = state.currentMonsters.some(m => m.isBoss);

    if (hadBoss && !state.bossDefeated) {
      state.bossDefeated = true;

      // Unlock next map
      const nextMapId = (state.currentMap + 1) as MapId;
      if (nextMapId <= 7 && !state.unlockedMaps.includes(nextMapId)) {
        state.unlockedMaps.push(nextMapId);
        const nextMap = MAPS.find(m => m.id === nextMapId);
        addLog(state, `🗺️ Mapa ${nextMap?.theme} ${nextMap?.name} desbloqueado!`, 'level_up');
      }

      // Unlock classes — paladin after map 1, ranger after map 2
      if (state.currentMap === 1 && !state.unlockedClasses.includes('paladin')) {
        state.unlockedClasses.push('paladin');
        addLog(state, `🛡️ Classe PALADINO desbloqueada!`, 'level_up');
      }
      if (state.currentMap === 2 && !state.unlockedClasses.includes('ranger')) {
        state.unlockedClasses.push('ranger');
        addLog(state, `🏹 Classe ARQUEIRO desbloqueada!`, 'level_up');
      }

      // Big XP bonus for boss kill — trigger level ups
      const bossXpBonus = mapDef.boss.xpReward;
      Object.keys(state.players).forEach(pid => {
        const p = state.players[pid];
        let updated = { ...p, xp: p.xp + bossXpBonus, coins: p.coins + 80 };
        let tries = 0;
        while (updated.xp >= updated.xpToNextLevel && tries < 5) {
          const result = levelUp(updated);
          if (result.didLevelUp) {
            addLog(state, `🎉 ${updated.name} subiu para Nível ${result.player.level}!`, 'level_up');
            updated = result.player;
          }
          tries++;
        }
        // Full heal after victory
        updated = { ...updated, hp: updated.maxHp, mp: updated.maxMp, isAlive: true };
        state.players[pid] = updated;
      });

      addLog(state, `💰 +80 moedas e XP de bônus por derrotar o Boss!`, 'level_up');
      addLog(state, `💚 HP e MP restaurados ao máximo!`, 'level_up');
      addLog(state, `🏆 VITÓRIA! ${mapDef.theme} ${mapDef.name} conquistado! Vá à loja e prepare-se para o próximo mapa.`, 'system');

      // Go to victory shopping instead of a dead-end screen
      state.phase = 'victory_shopping';

    } else if (!hadBoss) {
      // Regular wave — spawn boss
      addLog(state, `💥 Onda limpa! O BOSS aparece!`, 'system');
      state.currentMonsters = [{ ...mapDef.boss, id: nanoid(), hp: mapDef.boss.maxHp }];
      state.actionsThisTurn = {};
      const firstAlive = state.playerOrder.find(pid => state.players[pid]?.isAlive);
      state.activePlayerId = firstAlive ?? null;
      if (firstAlive) addLog(state, `🎯 Vez de ${state.players[firstAlive].name} agir!`, 'system');
    }
  }
}

// Called when players click "Próximo Mapa" after victory shopping
export function proceedToNextMap(state: GameState): GameState {
  const nextMapId = (state.currentMap + 1) as MapId;

  if (nextMapId > 7) {
    // All maps cleared — show final victory
    addLog(state, `🌟 PARABÉNS! Você conquistou todos os mapas! O reino está salvo!`, 'level_up');
    state.phase = 'defeat'; // reuse defeat screen with custom message — or keep as shopping
    return { ...state };
  }

  // Full heal entering next map
  Object.keys(state.players).forEach(pid => {
    const p = state.players[pid];
    state.players[pid] = { ...p, hp: p.maxHp, mp: p.maxMp, isAlive: true };
  });

  state.currentMap = nextMapId;
  state.phase = 'map_selection';
  state.bossDefeated = false;
  state.waveNumber = 0;
  state.currentMonsters = [];
  state.actionsThisTurn = {};
  state.activePlayerId = null;

  const nextMap = MAPS.find(m => m.id === nextMapId)!;
  addLog(state, `🗺️ Avançando para ${nextMap.theme} ${nextMap.name}!`, 'system');
  addLog(state, `💚 HP e MP restaurados ao máximo!`, 'system');

  return { ...state };
}

export function resetRoom(roomId: string): void {
  global.gameRooms.delete(roomId);
}