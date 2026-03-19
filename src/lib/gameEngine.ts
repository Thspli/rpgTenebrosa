import { GameState, Player, Monster, MonsterEffect, CombatLogEntry, MapId, ClassType, DEFAULT_BUFFS } from './types';
import { MAPS, SHOP_ITEMS, createPlayer, rollDice, calculateDamage, levelUp, CLASSES, SKILLS } from './gameData';
import { nanoid } from 'nanoid';

declare global {
  // eslint-disable-next-line no-var
  var gameRooms: Map<string, GameState>;
}
if (!global.gameRooms) global.gameRooms = new Map();

export function getOrCreateRoom(roomId: string): GameState {
  if (!global.gameRooms.has(roomId)) {
    const state: GameState = {
      roomId, phase: 'lobby',
      players: {}, playerOrder: [],
      currentPlayerIndex: 0, activePlayerId: null,
      currentMap: 1, currentMonsters: [],
      turn: 0, turnPhase: 'player_turns',
      combatLog: [], groupCoins: 0,
      unlockedMaps: [1],
      unlockedClasses: ['warrior','mage','rogue','necromancer','paladin','ranger','assassin','elementalist','berserker','guardian','druid','bard'],
      actionsThisTurn: {}, shopItems: SHOP_ITEMS,
      bossDefeated: false, waveNumber: 0,
      shopCountdown: 5, shopReady: {},
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

function log(state: GameState, message: string, type: CombatLogEntry['type']): void {
  state.combatLog.push({ id: nanoid(), turn: state.turn, message, type, timestamp: Date.now() });
  if (state.combatLog.length > 100) state.combatLog = state.combatLog.slice(-100);
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getEffectiveDef(p: Player, mapDebuff: number): number {
  const base = Math.floor(p.defense * (1 - mapDebuff));
  const temp = p.buffs.tempBonusTurns > 0 ? p.buffs.tempDefBonus : 0;
  return Math.max(0, base + temp);
}

function addMonsterEffect(monster: Monster, effect: MonsterEffect): Monster {
  const filtered = (monster.effects ?? []).filter(e => e.type !== effect.type);
  return { ...monster, effects: [...filtered, effect] };
}

// ─── room / lobby ─────────────────────────────────────────────────────────────

export function joinRoom(state: GameState, playerId: string, name: string): GameState {
  if (Object.keys(state.players).length >= 6) return state;
  if (state.players[playerId]) return state;
  const p = createPlayer(playerId, name, 'warrior');
  p.isReady = false;
  state.players[playerId] = p;
  if (!state.playerOrder.includes(playerId)) state.playerOrder.push(playerId);
  log(state, `⚔️ ${name} entrou na sala!`, 'system');
  if (Object.keys(state.players).length >= 1) state.phase = 'class_selection';
  return { ...state };
}

export function selectClass(state: GameState, playerId: string, classType: ClassType): GameState {
  if (!state.players[playerId] || !state.unlockedClasses.includes(classType)) return state;
  const old = state.players[playerId];
  // Build fresh player
  const p = createPlayer(playerId, old.name, classType);
  p.isReady = false;
  p.coins = old.coins;
  // Re-apply permanent equipment
  const perms = old.inventory.filter(i => i.permanent);
  perms.forEach(item => {
    p.attack   += item.attackBonus;
    p.defense  += item.defenseBonus;
    p.maxHp    += (item.hpBonus ?? 0);
    p.hp       += (item.hpBonus ?? 0);
    p.maxMp    += (item.mpBonus ?? 0);
    p.mp       += (item.mpBonus ?? 0);
    p.inventory.push({ ...item });
  });
  // Keep consumables too
  old.inventory.filter(i => !i.permanent && i.consumable).forEach(item => {
    p.inventory.push({ ...item });
  });
  state.players[playerId] = p;
  log(state, `${old.name} escolheu ${CLASSES[classType].emoji} ${CLASSES[classType].name}!`, 'system');
  return { ...state };
}

export function setPlayerReady(state: GameState, playerId: string): GameState {
  if (!state.players[playerId]) return state;
  state.players[playerId] = { ...state.players[playerId], isReady: true };
  log(state, `✅ ${state.players[playerId].name} está pronto!`, 'system');
  const allReady = Object.values(state.players).every(p => p.isReady);
  if (allReady && Object.keys(state.players).length >= 1) {
    state.phase = 'map_selection';
    log(state, '🗺️ Todos prontos! Escolham o mapa.', 'system');
  }
  return { ...state };
}

export function selectMap(state: GameState, _playerId: string, mapId: MapId): GameState {
  if (!state.unlockedMaps.includes(mapId)) return state;
  state.currentMap = mapId;
  state.phase = 'shopping';
  state.bossDefeated = false;
  state.waveNumber = 0;
  const mapDef = MAPS.find(m => m.id === mapId)!;
  log(state, `🗺️ Mapa: ${mapDef.theme} ${mapDef.name}`, 'system');
  log(state, `🛒 Loja aberta! Comprem equipamentos.`, 'system');
  // Starting coins
  Object.keys(state.players).forEach(pid => {
    if (state.players[pid].coins < 50) state.players[pid] = { ...state.players[pid], coins: 50 };
  });
  return { ...state };
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

  state.players[playerId] = {
    ...player,
    coins:   player.coins   - item.price,
    attack:  player.attack  + item.attackBonus,
    defense: player.defense + item.defenseBonus,
    maxHp:   player.maxHp   + (item.hpBonus ?? 0),
    hp:      player.hp      + (item.hpBonus ?? 0),
    maxMp:   player.maxMp   + (item.mpBonus ?? 0),
    mp:      player.mp      + (item.mpBonus ?? 0),
    inventory: newInv,
  };
  log(state, `🛒 ${player.name} comprou ${item.emoji} ${item.name}!`, 'system');
  return { ...state };
}

// ─── combat start / resume ────────────────────────────────────────────────────

function spawnWave(state: GameState): void {
  const mapDef = MAPS.find(m => m.id === state.currentMap)!;
  const pool = [...mapDef.monsters].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2));
  state.currentMonsters = pool.map(m => ({ ...m, id: nanoid(), effects: [] }));
  state.waveNumber += 1;
  log(state, `🌊 Onda ${state.waveNumber}! ${state.currentMonsters.map(m => m.emoji + m.name).join(', ')}`, 'system');
}

function resetPlayerCombatBuffs(p: Player): Player {
  return { ...p, buffs: { ...DEFAULT_BUFFS }, statusEffects: [] };
}

export function startCombat(state: GameState): GameState {
  // Full reset of combat state
  Object.keys(state.players).forEach(pid => {
    state.players[pid] = {
      ...resetPlayerCombatBuffs(state.players[pid]),
      hp: state.players[pid].maxHp,
      mp: state.players[pid].maxMp,
      isAlive: true,
    };
  });
  state.phase = 'combat';
  state.turn = 1;
  state.turnPhase = 'player_turns';
  state.actionsThisTurn = {};
  state.shopReady = {};
  state.currentPlayerIndex = 0;
  state.bossDefeated = false;
  state.waveNumber = 0;
  state.shopCountdown = 5;
  spawnWave(state);
  const first = state.playerOrder.find(pid => state.players[pid]?.isAlive);
  state.activePlayerId = first ?? null;
  const mapDef = MAPS.find(m => m.id === state.currentMap)!;
  log(state, `⚔️ COMBATE INICIADO! ${mapDef.theme} ${mapDef.name}`, 'system');
  if (first) log(state, `🎯 Vez de ${state.players[first].name} agir!`, 'system');
  return { ...state };
}

export function toggleShopReady(state: GameState, playerId: string): GameState {
  if (!state.players[playerId]) return state;
  if (state.phase !== 'shopping' && state.phase !== 'victory_shopping') return state;
  state.shopReady[playerId] = !state.shopReady[playerId];
  const name = state.players[playerId].name;
  log(state, state.shopReady[playerId] ? `✅ ${name} pronto!` : `❌ ${name} cancelou.`, 'system');
  const alive = Object.values(state.players).filter(p => p.isAlive);
  if (alive.length > 0 && alive.every(p => state.shopReady[p.id])) {
    state.shopReady = {};
    log(state, `⚔️ Todos prontos! Continuando...`, 'system');
    return state.phase === 'victory_shopping' ? proceedToNextMap(state) : continueCombat(state);
  }
  return { ...state };
}

export function continueCombat(state: GameState): GameState {
  if (state.turn === 0) return startCombat(state);
  if (state.currentMonsters.filter(m => m.hp > 0).length === 0) spawnWave(state);
  state.phase = 'combat';
  state.turnPhase = 'player_turns';
  state.actionsThisTurn = {};
  state.shopReady = {};
  state.shopCountdown = 5;
  const first = state.playerOrder.find(pid => state.players[pid]?.isAlive);
  state.activePlayerId = first ?? null;
  log(state, `⚔️ Combate retomado! Turno ${state.turn}`, 'system');
  if (first) log(state, `🎯 Vez de ${state.players[first].name} agir!`, 'system');
  return { ...state };
}

// ─── player action ────────────────────────────────────────────────────────────

export function processPlayerAction(
  state: GameState, playerId: string,
  action: { type: string; targetId?: string; skillIndex?: number; itemId?: string }
): GameState {
  if (state.phase !== 'combat' || state.turnPhase !== 'player_turns') return state;
  if (state.actionsThisTurn[playerId]) return state;
  if (state.activePlayerId !== playerId) {
    log(state, `⏳ Aguarde sua vez!`, 'system');
    return state;
  }
  const player = state.players[playerId];
  if (!player?.isAlive) return state;

  const mapDef = MAPS.find(m => m.id === state.currentMap)!;
  const manaMult = mapDef.manaCostMultiplier;
  let p = { ...player, buffs: { ...player.buffs } };

  // ── POTION ──
  if (action.type === 'use_potion') {
    const idx = p.inventory.findIndex(i => i.id === action.itemId && i.consumable && (i.quantity ?? 0) > 0);
    if (idx === -1) return state;
    const item = p.inventory[idx];
    if (item.consumeHeal) {
      const h = Math.min(p.maxHp - p.hp, item.consumeHeal);
      p.hp = Math.min(p.maxHp, p.hp + item.consumeHeal);
      log(state, `${p.name} usa ${item.emoji} ${item.name}! +${h} HP.`, 'player_action');
    }
    if (item.consumeMpHeal) {
      const m = Math.min(p.maxMp - p.mp, item.consumeMpHeal);
      p.mp = Math.min(p.maxMp, p.mp + item.consumeMpHeal);
      log(state, `${p.name} usa ${item.emoji} ${item.name}! +${m} MP.`, 'player_action');
    }
    const newQ = (item.quantity ?? 1) - 1;
    const newInv = [...p.inventory];
    if (newQ <= 0) newInv.splice(idx, 1);
    else newInv[idx] = { ...item, quantity: newQ };
    p.inventory = newInv;
    state.players[playerId] = p;
    state.actionsThisTurn[playerId] = true;
    afterAction(state);
    return { ...state };
  }

  // ── BASIC ATTACK ──
  if (action.type === 'attack') {
    const mIdx = state.currentMonsters.findIndex(m => m.id === action.targetId && m.hp > 0);
    if (mIdx === -1) return state;
    const target = state.currentMonsters[mIdx];

    const dice = rollDice();
    let dmgBonus = groupNecroBuff(state);
    if (p.buffs.tempBonusTurns > 0) dmgBonus += p.buffs.tempAtkBonus;
    // Aim bonus — one-shot
    if (p.buffs.aimBonus > 0) {
      dmgBonus += p.buffs.aimBonus;
      log(state, `🦅 Olho de Águia! +${p.buffs.aimBonus} dano bônus.`, 'system');
      p.buffs.aimBonus = 0;
    }

    let tDef = applyMonsterCurse(target);
    if (isMonsterStunned(target)) { tDef = 0; log(state, `😵 ${target.name} atordoado! DEF ignorada.`, 'system'); }
    const markMult = getMarkMult(target);

    const rawDmg = calculateDamage(p.attack + dmgBonus, tDef, dice);
    const finalDmg = Math.round(rawDmg * markMult);
    state.currentMonsters[mIdx] = { ...target, hp: Math.max(0, target.hp - finalDmg) };
    log(state, `${p.name} ${CLASSES[p.classType].emoji} ataca ${target.emoji}${target.name}! [🎲${dice}] Dano: ${finalDmg}${markMult > 1 ? ` (×${markMult.toFixed(1)} Marca)` : ''}`, 'player_action');
    if (state.currentMonsters[mIdx].hp <= 0) onMonsterDeath(state, target);

    state.players[playerId] = p;
    state.actionsThisTurn[playerId] = true;
    afterAction(state);
    return { ...state };
  }

  // ── SKILL ──
  if (action.type === 'skill') {
    const skills = SKILLS[p.classType];
    const sIdx = action.skillIndex ?? 0;
    const skill = skills[sIdx];
    if (!skill) return state;

    const mpCost = Math.ceil(skill.mpCost * manaMult);
    if (p.mp < mpCost) {
      log(state, `❌ ${p.name}: MP insuficiente! (${p.mp}/${mpCost})`, 'system');
      return state;
    }
    p.mp -= mpCost;

    const aliveMonsters = state.currentMonsters.filter(m => m.hp > 0);
    let necroBuff = groupNecroBuff(state);
    let atkBonus = (p.buffs.tempBonusTurns > 0 ? p.buffs.tempAtkBonus : 0) + necroBuff;

    // ── DAMAGE ──
    if (skill.damage !== undefined) {
      if (skill.aoe) {
        const dice = rollDice();
        state.currentMonsters = state.currentMonsters.map(m => {
          if (m.hp <= 0) return m;
          let def = applyMonsterCurse(m);
          if (skill.effect === 'pierce') def = 0;
          else if (skill.effect === 'ignore_half_def') def = Math.floor(def * 0.5);
          else def = Math.floor(def * 0.5);
          const dmg = calculateDamage(p.attack + skill.damage! + atkBonus, def, dice);
          const newHp = Math.max(0, m.hp - dmg);
          log(state, `💥 ${skill.emoji} ${skill.name} → ${m.emoji}${m.name}: ${dmg} dano`, 'player_action');
          // Apply poison on aoe+poison
          let newM = { ...m, hp: newHp };
          if (skill.effect === 'poison' && skill.poisonDmg) {
            newM = addMonsterEffect(newM, { type: 'poisoned', damage: skill.poisonDmg, turnsLeft: skill.poisonTurns ?? 3 });
          }
          // Dissonância: 40% stun chance
          if (skill.effect === 'stun' && Math.random() < 0.4) {
            newM = addMonsterEffect(newM, { type: 'stunned', turnsLeft: skill.stunTurns ?? 1 });
            log(state, `😵 ${m.name} atordoado!`, 'system');
          }
          if (newHp <= 0) onMonsterDeath(state, m);
          return newM;
        });
      } else {
        const mIdx = state.currentMonsters.findIndex(m => m.id === action.targetId && m.hp > 0);
        if (mIdx !== -1) {
          const target = state.currentMonsters[mIdx];
          const dice = rollDice();
          let def = applyMonsterCurse(target);
          if (skill.effect === 'pierce') def = 0;
          else if (skill.effect === 'ignore_half_def') def = Math.floor(def * 0.5);
          if (isMonsterStunned(target)) { def = 0; log(state, `😵 ${target.name} atordoado! DEF ignorada.`, 'system'); }
          const markMult = getMarkMult(target);

          let totalAtk = p.attack + skill.damage + atkBonus;
          let execMult = 1;
          if (skill.effect === 'execute' && target.hp < target.maxHp * 0.5) {
            execMult = 3;
            def = 0;
            log(state, `💀 EXECUÇÃO! HP < 50% → 3x dano!`, 'system');
          }
          if (skill.effect === 'rage_scale') {
            const missingPct = 1 - p.hp / p.maxHp;
            execMult = 1 + missingPct * 2; // up to 3x at 0 hp
            log(state, `🩸 Ira Sanguinária! Fator: ×${execMult.toFixed(1)}`, 'system');
          }

          const rawDmg = calculateDamage(totalAtk, def, dice);
          const finalDmg = Math.round(rawDmg * execMult * markMult);
          let newM = { ...target, hp: Math.max(0, target.hp - finalDmg) };

          // Attach poison if skill has it
          if (skill.effect === 'poison' && skill.poisonDmg) {
            newM = addMonsterEffect(newM, { type: 'poisoned', damage: skill.poisonDmg, turnsLeft: skill.poisonTurns ?? 3 });
            log(state, `☠️ ${target.name} envenenado! (${skill.poisonDmg} dano/turno por ${skill.poisonTurns}t)`, 'system');
          }
          // Stun + damage (ex: Golpe de Escudo)
          if (skill.effect === 'stun' && skill.stunTurns) {
            newM = addMonsterEffect(newM, { type: 'stunned', turnsLeft: skill.stunTurns });
            log(state, `😵 ${target.name} atordoado por ${skill.stunTurns} turno(s)!`, 'system');
          }

          state.currentMonsters[mIdx] = newM;
          log(state, `${p.name} usa ${skill.emoji} ${skill.name} em ${target.emoji}${target.name}! Dano: ${finalDmg}`, 'player_action');
          if (newM.hp <= 0) onMonsterDeath(state, target);
        }
      }
    }

    // ── HEAL ──
    if (skill.heal !== undefined) {
      if (skill.effect === 'aoe_heal') {
        Object.keys(state.players).forEach(pid => {
          const tp = state.players[pid];
          if (!tp.isAlive) return;
          const h = Math.min(tp.maxHp - tp.hp, skill.heal!);
          state.players[pid] = { ...tp, hp: tp.hp + h };
          log(state, `💚 ${tp.name} recupera ${h} HP!`, 'player_action');
        });
        log(state, `${p.name} usa ${skill.emoji} ${skill.name}! Cura ${skill.heal}HP para todos.`, 'player_action');
      } else if (action.targetId && state.players[action.targetId]) {
        // Targeted ally heal
        const tp = state.players[action.targetId];
        const h = Math.min(tp.maxHp - tp.hp, skill.heal);
        state.players[action.targetId] = { ...tp, hp: tp.hp + h };
        log(state, `${p.name} usa ${skill.emoji} ${skill.name} em ${tp.name}! +${h} HP.`, 'player_action');
      } else {
        // Self heal (e.g. Drenar Vida)
        const h = Math.min(p.maxHp - p.hp, skill.heal);
        p.hp = Math.min(p.maxHp, p.hp + skill.heal);
        log(state, `${p.name} usa ${skill.emoji} ${skill.name}! +${h} HP.`, 'player_action');
      }
    }

    // ── PURE EFFECTS ──
    const eff = skill.effect;

    if (eff === 'poison' && !skill.damage && action.targetId) {
      const mIdx = state.currentMonsters.findIndex(m => m.id === action.targetId && m.hp > 0);
      if (mIdx !== -1) {
        state.currentMonsters[mIdx] = addMonsterEffect(state.currentMonsters[mIdx],
          { type: 'poisoned', damage: skill.poisonDmg ?? 8, turnsLeft: skill.poisonTurns ?? 4 });
        log(state, `${p.name} usa ${skill.emoji} ${skill.name}! ${state.currentMonsters[mIdx].name} envenenado (${skill.poisonDmg}/t por ${skill.poisonTurns}t)!`, 'player_action');
      }
    }

    if (eff === 'stun' && !skill.damage && action.targetId) {
      const mIdx = state.currentMonsters.findIndex(m => m.id === action.targetId && m.hp > 0);
      if (mIdx !== -1) {
        state.currentMonsters[mIdx] = addMonsterEffect(state.currentMonsters[mIdx],
          { type: 'stunned', turnsLeft: skill.stunTurns ?? 2 });
        log(state, `${p.name} usa ${skill.emoji} ${skill.name}! ${state.currentMonsters[mIdx].name} atordoado por ${skill.stunTurns ?? 2} turnos!`, 'player_action');
      }
    }

    if (eff === 'slow' && action.targetId && !skill.aoe) {
      const mIdx = state.currentMonsters.findIndex(m => m.id === action.targetId && m.hp > 0);
      if (mIdx !== -1) {
        state.currentMonsters[mIdx] = addMonsterEffect(state.currentMonsters[mIdx], { type: 'slowed', turnsLeft: 2 });
        log(state, `❄️ ${state.currentMonsters[mIdx].name} está lento por 2 turnos!`, 'system');
      }
    }
    if (eff === 'slow' && skill.aoe) {
      state.currentMonsters = state.currentMonsters.map(m => {
        if (m.hp <= 0) return m;
        return addMonsterEffect(m, { type: 'slowed', turnsLeft: 2 });
      });
      log(state, `❄️ Todos os inimigos ficaram lentos por 2 turnos!`, 'system');
    }

    if (eff === 'curse' && action.targetId) {
      const mIdx = state.currentMonsters.findIndex(m => m.id === action.targetId && m.hp > 0);
      if (mIdx !== -1) {
        state.currentMonsters[mIdx] = addMonsterEffect(state.currentMonsters[mIdx],
          { type: 'cursed', defReduction: skill.curseDef ?? 4, atkReduction: skill.curseAtk ?? 3, turnsLeft: skill.curseTurns ?? 4 });
        log(state, `🔮 ${p.name} amaldiçoa ${state.currentMonsters[mIdx].name}! -${skill.curseDef}DEF -${skill.curseAtk}ATK por ${skill.curseTurns}t`, 'player_action');
      }
    }

    if (eff === 'mark' && action.targetId) {
      const mIdx = state.currentMonsters.findIndex(m => m.id === action.targetId && m.hp > 0);
      if (mIdx !== -1) {
        state.currentMonsters[mIdx] = addMonsterEffect(state.currentMonsters[mIdx],
          { type: 'marked', damageMultiplier: skill.markMult ?? 1.5, turnsLeft: skill.markTurns ?? 3 });
        log(state, `🎯 ${p.name} marca ${state.currentMonsters[mIdx].name}! ×${skill.markMult} dano por ${skill.markTurns}t`, 'player_action');
      }
    }

    if (eff === 'defense_up') {
      const val = skill.defBonus ?? 8;
      const turns = skill.defBonusTurns ?? 2;
      // skill.selfOnly → apply to caster; otherwise caster too
      p.buffs.tempDefBonus = (p.buffs.tempDefBonus ?? 0) + val;
      p.buffs.tempBonusTurns = Math.max(p.buffs.tempBonusTurns ?? 0, turns);
      log(state, `🛡️ ${p.name} ativa ${skill.emoji} ${skill.name}! +${val} DEF por ${turns} turnos`, 'player_action');
    }

    if (eff === 'group_atk_up') {
      const val = skill.atkGroupBonus ?? 4;
      const turns = skill.atkGroupTurns ?? 3;
      Object.keys(state.players).forEach(pid => {
        const tp = state.players[pid];
        if (!tp.isAlive) return;
        state.players[pid] = {
          ...tp,
          buffs: {
            ...tp.buffs,
            tempAtkBonus: tp.buffs.tempAtkBonus + val,
            tempBonusTurns: Math.max(tp.buffs.tempBonusTurns, turns),
          }
        };
      });
      log(state, `📣 ${p.name} usa ${skill.emoji} ${skill.name}! TODOS +${val} ATK por ${turns}t`, 'player_action');
    }

    if (eff === 'necro_buff') {
      const dmg = skill.necroAtkBonus ?? 8;
      const turns = skill.necroBonusTurns ?? 5;
      Object.keys(state.players).forEach(pid => {
        const tp = state.players[pid];
        if (!tp.isAlive) return;
        state.players[pid] = {
          ...tp,
          buffs: { ...tp.buffs, necroBonusDmg: dmg, necroBonusTurnsLeft: turns },
        };
      });
      log(state, `💀 ${p.name} invoca Morto-Vivo! TODOS +${dmg} dano por ${turns}t`, 'player_action');
    }

    if (eff === 'balada') {
      const atkVal = skill.baladaAtk ?? 7;
      const defVal = skill.baladaDef ?? 7;
      const healVal = skill.baladaHeal ?? 30;
      Object.keys(state.players).forEach(pid => {
        const tp = state.players[pid];
        if (!tp.isAlive) return;
        const h = Math.min(tp.maxHp - tp.hp, healVal);
        state.players[pid] = {
          ...tp,
          hp: tp.hp + h,
          buffs: {
            ...tp.buffs,
            tempAtkBonus: tp.buffs.tempAtkBonus + atkVal,
            tempDefBonus: tp.buffs.tempDefBonus + defVal,
            tempBonusTurns: Math.max(tp.buffs.tempBonusTurns, 3),
          }
        };
        log(state, `🎺 ${tp.name}: +${atkVal}ATK +${defVal}DEF +${h}HP (Balada)`, 'player_action');
      });
      log(state, `🎵 ${p.name} toca a Balada Épica! Todo o grupo ficou mais forte!`, 'player_action');
    }

    if (eff === 'aim') {
      p.buffs.aimBonus += skill.aimBonus ?? 18;
      log(state, `🦅 ${p.name} mira com precisão! Próximo ataque +${skill.aimBonus} dano`, 'player_action');
    }

    if (eff === 'regen' && action.targetId) {
      const tpid = action.targetId;
      const tp = state.players[tpid];
      if (tp) {
        state.players[tpid] = {
          ...tp,
          buffs: {
            ...tp.buffs,
            regenHpPerTurn: tp.buffs.regenHpPerTurn + (skill.regenHp ?? 15),
            regenTurnsLeft: Math.max(tp.buffs.regenTurnsLeft, skill.regenTurns ?? 4),
          }
        };
        log(state, `♻️ ${p.name} regenera ${tp.name}! +${skill.regenHp}HP/turno por ${skill.regenTurns}t`, 'player_action');
      }
    }

    if (eff === 'wall') {
      // Apply wall to ALL alive players
      Object.keys(state.players).forEach(pid => {
        const tp = state.players[pid];
        if (!tp.isAlive) return;
        state.players[pid] = { ...tp, buffs: { ...tp.buffs, wallTurnsLeft: Math.max(tp.buffs.wallTurnsLeft, skill.wallTurns ?? 2) } };
      });
      log(state, `🏰 ${p.name} ergue a MURALHA! Todo o grupo recebe apenas 20% do dano por ${skill.wallTurns ?? 2} turnos!`, 'player_action');
    }

    if (eff === 'counter') {
      p.buffs.counterReflect = skill.counterPct ?? 0.6;
      log(state, `🔄 ${p.name} prepara Contra-Ataque! Refletirá ${Math.round((skill.counterPct ?? 0.6) * 100)}% do próximo dano`, 'player_action');
    }

    if (eff === 'berserk') {
      p.buffs.tempAtkBonus += skill.berserkAtkBonus ?? 8;
      p.buffs.tempDefBonus -= (skill.berserkDefPenalty ?? 3);
      p.buffs.tempBonusTurns = Math.max(p.buffs.tempBonusTurns, skill.berserkTurns ?? 3);
      p.buffs.berserkTurnsLeft = skill.berserkTurns ?? 3;
      log(state, `😡 ${p.name} entra em FRENESI! +${skill.berserkAtkBonus}ATK -${skill.berserkDefPenalty}DEF por ${skill.berserkTurns}t`, 'player_action');
    }

    if (eff === 'dodge') {
      p.buffs.dodgeTurnsLeft = 2;
      log(state, `💨 ${p.name} usa ${skill.emoji} ${skill.name}! Esquivará dos próximos 2 ataques`, 'player_action');
    }

    if (eff === 'taunt') {
      log(state, `${skill.emoji} ${p.name} usa ${skill.name}! Inimigos focam nele por 2 turnos`, 'player_action');
      // Mark player as taunt target for monster phase
      (p as any).tauntTurns = 2;
    }

    if (eff === 'revive' && action.targetId) {
      const tp = state.players[action.targetId];
      if (tp && !tp.isAlive) {
        const revHp = Math.floor(tp.maxHp * (skill.reviveHpPct ?? 0.4));
        state.players[action.targetId] = { ...tp, isAlive: true, hp: revHp };
        log(state, `✝️ ${p.name} ressuscita ${tp.name}! Volta com ${revHp}HP!`, 'player_action');
      } else {
        log(state, `❌ ${tp?.name} já está vivo!`, 'system');
      }
    }

    state.players[playerId] = p;
    state.actionsThisTurn[playerId] = true;
    afterAction(state);
    return { ...state };
  }

  return state;
}

// ─── monster phase ────────────────────────────────────────────────────────────

function processMonsterTurns(state: GameState): void {
  state.turnPhase = 'monster_turns';
  log(state, `👹 Fase dos Monstros!`, 'system');

  const mapDef = MAPS.find(m => m.id === state.currentMap)!;
  const aliveMonsters = state.currentMonsters.filter(m => m.hp > 0);
  const alivePlayers = () => Object.values(state.players).filter(p => p.isAlive);

  aliveMonsters.forEach(monster => {
    if (alivePlayers().length === 0) return;

    // Stunned → skip turn
    if (isMonsterStunned(monster)) {
      log(state, `😵 ${monster.emoji}${monster.name} está atordoado e perde o turno!`, 'monster_action');
      return;
    }

    // Pick target — prefer taunt
    let targets = alivePlayers();
    const tauntTarget = targets.find(p => (p as any).tauntTurns > 0);
    const target = tauntTarget ?? targets[Math.floor(Math.random() * targets.length)];
    const tp = state.players[target.id];

    // Dodge check
    if (tp.buffs.dodgeTurnsLeft > 0) {
      log(state, `💨 ${target.name} ESQUIVA do ataque de ${monster.emoji}${monster.name}!`, 'monster_action');
      return;
    }

    const dice = rollDice();
    const effectiveDef = getEffectiveDef(tp, mapDef.defenseDebuff);
    const cursedAtk = monster.effects?.find(e => e.type === 'cursed');
    const monAtk = Math.max(1, monster.attack - (cursedAtk?.atkReduction ?? 0));
    const slowed = monster.effects?.some(e => e.type === 'slowed');
    let damage = Math.max(1, calculateDamage(monAtk, effectiveDef, dice));
    if (slowed) { damage = Math.max(1, Math.floor(damage * 0.7)); }

    // Wall reduces damage by 80%
    if (tp.buffs.wallTurnsLeft > 0) {
      damage = Math.max(1, Math.floor(damage * 0.2));
    }

    // Counter-reflect
    if (tp.buffs.counterReflect > 0) {
      const reflect = Math.max(1, Math.floor(damage * tp.buffs.counterReflect));
      const mIdx = state.currentMonsters.findIndex(m => m.id === monster.id);
      if (mIdx !== -1) {
        state.currentMonsters[mIdx] = { ...state.currentMonsters[mIdx], hp: Math.max(0, state.currentMonsters[mIdx].hp - reflect) };
        log(state, `🔄 ${target.name} CONTRA-ATACA! ${monster.emoji}${monster.name} recebe ${reflect} dano refletido!`, 'player_action');
        if (state.currentMonsters[mIdx].hp <= 0) onMonsterDeath(state, monster);
      }
      state.players[target.id] = { ...tp, buffs: { ...tp.buffs, counterReflect: 0 } };
    }

    state.players[target.id] = {
      ...state.players[target.id],
      hp: Math.max(0, state.players[target.id].hp - damage),
    };

    const notes: string[] = [];
    if (slowed) notes.push('(Lento -30%)');
    if (tp.buffs.wallTurnsLeft > 0) notes.push('(🏰 Muralha -80%)');
    if (mapDef.defenseDebuff > 0) notes.push(`(DEF-${mapDef.defenseDebuff * 100}%)`);
    log(state, `${monster.emoji}${monster.name} ataca ${target.name}! [🎲${dice}] Dano: ${damage} ${notes.join(' ')}`, 'monster_action');

    if (state.players[target.id].hp <= 0) {
      state.players[target.id] = { ...state.players[target.id], isAlive: false };
      log(state, `💀 ${target.name} foi derrotado!`, 'death');
    }
  });

  // ── tick monster effects ──
  state.currentMonsters = state.currentMonsters.map(monster => {
    if (monster.hp <= 0) return monster;
    let hp = monster.hp;
    const newEffects: MonsterEffect[] = [];
    for (const e of monster.effects ?? []) {
      if (e.type === 'poisoned' && e.damage) {
        hp = Math.max(0, hp - e.damage);
        log(state, `☠️ ${monster.emoji}${monster.name} recebe ${e.damage} de veneno! (${e.turnsLeft - 1}t restantes)`, 'system');
        if (hp <= 0) onMonsterDeath(state, monster);
      }
      if (e.turnsLeft - 1 > 0) newEffects.push({ ...e, turnsLeft: e.turnsLeft - 1 });
    }
    return { ...monster, hp, effects: newEffects };
  });

  // ── tick player buffs ──
  Object.keys(state.players).forEach(pid => {
    let p = state.players[pid];
    if (!p.isAlive) return;
    const b = { ...p.buffs };

    // Regen
    if (b.regenTurnsLeft > 0) {
      const h = Math.min(p.maxHp - p.hp, b.regenHpPerTurn);
      p = { ...p, hp: p.hp + h };
      b.regenTurnsLeft--;
      if (b.regenTurnsLeft <= 0) b.regenHpPerTurn = 0;
      if (h > 0) log(state, `♻️ ${p.name} regenera ${h}HP! (${b.regenTurnsLeft}t)`, 'system');
    }

    // Temp ATK/DEF buff
    if (b.tempBonusTurns > 0) {
      b.tempBonusTurns--;
      if (b.tempBonusTurns <= 0) {
        if (b.tempAtkBonus !== 0 || b.tempDefBonus !== 0)
          log(state, `⏱️ Buff temporário de ${p.name} expirou.`, 'system');
        b.tempAtkBonus = 0; b.tempDefBonus = 0;
      }
    }

    // Necro buff
    if (b.necroBonusTurnsLeft > 0) {
      b.necroBonusTurnsLeft--;
      if (b.necroBonusTurnsLeft <= 0) b.necroBonusDmg = 0;
    }

    // Wall
    if (b.wallTurnsLeft > 0) {
      b.wallTurnsLeft--;
      if (b.wallTurnsLeft <= 0) log(state, `🏰 Muralha do grupo desmoronou!`, 'system');
    }

    // Dodge
    if (b.dodgeTurnsLeft > 0) {
      b.dodgeTurnsLeft--;
      if (b.dodgeTurnsLeft <= 0) log(state, `💨 Esquiva de ${p.name} expirou.`, 'system');
    }

    // Taunt
    if ((p as any).tauntTurns > 0) {
      (p as any).tauntTurns--;
    }

    state.players[pid] = { ...p, buffs: b };
  });

  // ── MP regen ──
  Object.keys(state.players).forEach(pid => {
    const p = state.players[pid];
    if (!p.isAlive) return;
    const mpRegen = Math.max(2, Math.floor(p.maxMp * 0.08));
    state.players[pid] = { ...p, mp: Math.min(p.maxMp, p.mp + mpRegen) };
  });
  log(state, `💎 Regen de Mana +8% para todos.`, 'system');

  // ── advance turn ──
  state.turn++;
  state.shopCountdown--;
  state.turnPhase = 'player_turns';
  state.actionsThisTurn = {};

  checkBattleEnd(state);
  if (state.phase === 'victory_shopping' || state.phase === 'defeat') return;

  if (state.shopCountdown <= 0) {
    state.phase = 'shopping';
    state.shopReady = {};
    Object.keys(state.players).forEach(pid => {
      state.players[pid] = { ...state.players[pid], coins: state.players[pid].coins + 30 };
    });
    log(state, `🛒 Pausa para loja! +30 moedas para cada jogador.`, 'system');
    return;
  }

  const first = state.playerOrder.find(pid => state.players[pid]?.isAlive);
  state.activePlayerId = first ?? null;
  log(state, `🎲 Turno ${state.turn} — Fase dos Jogadores`, 'system');
  if (first) log(state, `🎯 Vez de ${state.players[first].name} agir!`, 'system');
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function afterAction(state: GameState): void {
  checkBattleEnd(state);
  if (state.phase === 'victory_shopping' || state.phase === 'defeat' || state.phase === 'shopping') return;
  advanceToNextPlayer(state);
}

function advanceToNextPlayer(state: GameState): void {
  const alive = state.playerOrder.filter(pid => state.players[pid]?.isAlive);
  if (alive.length === 0) return;
  const pending = alive.filter(pid => !state.actionsThisTurn[pid]);
  if (pending.length > 0) {
    state.activePlayerId = pending[0];
    log(state, `🎯 Vez de ${state.players[pending[0]].name} agir!`, 'system');
  } else {
    state.activePlayerId = null;
    processMonsterTurns(state);
  }
}

function checkBattleEnd(state: GameState): void {
  const aliveMonsters = state.currentMonsters.filter(m => m.hp > 0);
  const alivePlayers = Object.values(state.players).filter(p => p.isAlive);

  if (alivePlayers.length === 0) {
    state.phase = 'defeat';
    log(state, `💀 DERROTA! Todos os jogadores foram derrotados...`, 'system');
    return;
  }

  if (aliveMonsters.length === 0) {
    const mapDef = MAPS.find(m => m.id === state.currentMap)!;
    const hadBoss = state.currentMonsters.some(m => m.isBoss);

    if (hadBoss && !state.bossDefeated) {
      state.bossDefeated = true;
      const nextMapId = (state.currentMap + 1) as MapId;
      if (nextMapId <= 7 && !state.unlockedMaps.includes(nextMapId)) {
        state.unlockedMaps.push(nextMapId);
        const nm = MAPS.find(m => m.id === nextMapId);
        log(state, `🗺️ ${nm?.theme} ${nm?.name} desbloqueado!`, 'level_up');
      }
      // Boss XP + coins bonus + full heal
      Object.keys(state.players).forEach(pid => {
        const p = state.players[pid];
        let updated = { ...p, xp: p.xp + mapDef.boss.xpReward, coins: p.coins + 100 };
        for (let i = 0; i < 5; i++) {
          const r = levelUp(updated);
          if (!r.didLevelUp) break;
          log(state, `🎉 ${updated.name} → Nível ${r.player.level}!`, 'level_up');
          updated = r.player;
        }
        state.players[pid] = { ...updated, hp: updated.maxHp, mp: updated.maxMp, isAlive: true };
      });
      log(state, `💰 +100 moedas e XP de bônus por matar o Boss!`, 'level_up');
      log(state, `💚 HP e MP restaurados!`, 'level_up');
      log(state, `🏆 VITÓRIA! ${mapDef.theme} ${mapDef.name} conquistado!`, 'system');
      state.phase = 'victory_shopping';

    } else if (!hadBoss) {
      log(state, `💥 Onda limpa! O BOSS aparece!`, 'system');
      state.currentMonsters = [{ ...mapDef.boss, id: nanoid(), hp: mapDef.boss.maxHp, effects: [] }];
      state.actionsThisTurn = {};
      const first = state.playerOrder.find(pid => state.players[pid]?.isAlive);
      state.activePlayerId = first ?? null;
      if (first) log(state, `🎯 Vez de ${state.players[first].name} agir!`, 'system');
    }
  }
}

function onMonsterDeath(state: GameState, monster: Monster): void {
  log(state, `💀 ${monster.emoji}${monster.name} foi derrotado!`, 'system');
  distributeRewards(state, monster);
}

function distributeRewards(state: GameState, monster: Monster): void {
  const alive = Object.values(state.players).filter(p => p.isAlive);
  const xpEach = Math.ceil(monster.xpReward / alive.length);
  const coinsEach = Math.ceil(monster.coinReward / alive.length);
  state.groupCoins += monster.coinReward;
  alive.forEach(p => {
    let up = { ...p, xp: p.xp + xpEach, coins: p.coins + coinsEach };
    const r = levelUp(up);
    if (r.didLevelUp) {
      log(state, `🎉 ${p.name} → Nível ${r.player.level}!`, 'level_up');
    }
    state.players[p.id] = r.player;
  });
  log(state, `💰 +${monster.coinReward} moedas · +${xpEach}XP cada`, 'system');
}

function groupNecroBuff(state: GameState): number {
  const best = Object.values(state.players)
    .filter(p => p.isAlive && p.buffs.necroBonusTurnsLeft > 0)
    .map(p => p.buffs.necroBonusDmg)
    .reduce((a, b) => Math.max(a, b), 0);
  return best;
}

function isMonsterStunned(m: Monster): boolean {
  return (m.effects ?? []).some(e => e.type === 'stunned' && e.turnsLeft > 0);
}

function applyMonsterCurse(m: Monster): number {
  const curse = (m.effects ?? []).find(e => e.type === 'cursed');
  return Math.max(0, m.defense - (curse?.defReduction ?? 0));
}

function getMarkMult(m: Monster): number {
  const mark = (m.effects ?? []).find(e => e.type === 'marked');
  return mark?.damageMultiplier ?? 1;
}

// ─── next map / reset ─────────────────────────────────────────────────────────

export function proceedToNextMap(state: GameState): GameState {
  const nextId = (state.currentMap + 1) as MapId;
  if (nextId > 7) {
    log(state, `🌟 PARABÉNS! Todos os mapas conquistados! O reino está salvo!`, 'level_up');
    state.phase = 'defeat';
    return { ...state };
  }
  Object.keys(state.players).forEach(pid => {
    const p = state.players[pid];
    state.players[pid] = {
      ...resetPlayerCombatBuffs(p),
      hp: p.maxHp, mp: p.maxMp, isAlive: true,
    };
  });
  state.currentMap = nextId;
  state.phase = 'map_selection';
  state.bossDefeated = false;
  state.waveNumber = 0;
  state.currentMonsters = [];
  state.actionsThisTurn = {};
  state.activePlayerId = null;
  const nm = MAPS.find(m => m.id === nextId)!;
  log(state, `🗺️ Avançando para ${nm.theme} ${nm.name}!`, 'system');
  log(state, `💚 HP e MP restaurados ao máximo!`, 'system');
  return { ...state };
}

export function resetRoom(roomId: string): void {
  global.gameRooms.delete(roomId);
}