// ═══════════════════════════════════════════════════════════
//  REALM OF SHADOWS — Combat Loop v2
//  Clean turn management. No more spaghetti.
// ═══════════════════════════════════════════════════════════

import { CombatState, Player, Monster, StatusEffect, LogEntry, Unit } from './types';
import {
  rollDice, calcDamage, tickEffects, getEffectiveDef, getCursedAtkReduction,
  isStunned, isInvisible, addEffect, makeLog, applyXp, BALANCE,
} from './utils';
import { checkSynergies, checkMomentumSynergy } from './synergies';
import { CLASS_SKILLS, canUseSkill, spendMp } from './skills';
import { nanoid } from 'nanoid';
import {
  checkAndRegisterPrimer,
  checkAndFireDetonator,
  registerKill,
  registerRevive,
  tickCombosOnTurn,
  initComboState,
  COMBO_META,
} from './comboEngine';

// ─── Turn Order ───────────────────────────────────────────
// Players act in their order. After all players, monsters act.
// Summons act at end of monster phase.

export function getNextActivePlayer(state: CombatState): string | null {
  for (const pid of state.playerOrder) {
    const p = state.players[pid];
    if (p?.isAlive && !state.actionsThisTurn[pid]) return pid;
  }
  return null;
}

export function allPlayersActed(state: CombatState): boolean {
  return state.playerOrder
    .filter(pid => state.players[pid]?.isAlive)
    .every(pid => state.actionsThisTurn[pid]);
}

// ─── Player Action Entry Point ────────────────────────────

export type PlayerActionPayload =
  | { type: 'attack'; targetId: string }
  | { type: 'skill'; skillIndex: number; targetId?: string }
  | { type: 'use_item'; itemId: string }
  | { type: 'transform' };

export function processPlayerAction(
  state: CombatState,
  playerId: string,
  action: PlayerActionPayload
): CombatState {
  // Guards
  if (state.activePlayerId !== playerId) return state;
  if (state.actionsThisTurn[playerId]) return state;
  const player = state.players[playerId];
  if (!player?.isAlive) return state;

  let newState = { ...state };
  let usedSkillTag: string | undefined;
  let primaryTargets: Monster[] = [];

  // ── Basic Attack ──────────────────────────────────────
  if (action.type === 'attack') {
    const target = newState.monsters.find(m => m.id === action.targetId && m.hp > 0 && !m.isSummon);
    if (!target) return state;
    primaryTargets = [target];

    const roll = rollDice();
    const crit = roll === BALANCE.CRIT_ROLL;
    const dmg = calcDamage({
      attackerAtk: player.attack,
      targetDef: isStunned(target) ? 0 : getEffectiveDef(target),
      roll,
      damageMultiplier: crit ? BALANCE.CRIT_MULTIPLIER : 1,
    });

    const newMonsters = newState.monsters.map(m =>
      m.id === target.id ? { ...m, hp: Math.max(0, m.hp - dmg), isAlive: m.hp - dmg > 0 } : m
    );

    newState = {
      ...newState,
      monsters: newMonsters,
      log: [...newState.log, makeLog(newState.turn,
        `${player.name} ataca ${target.emoji}${target.name}! [🎲${roll}] ${dmg} dano${crit ? ' 💥CRÍTICO!' : ''}`,
        'player_action'
      )],
      groupMomentum: Math.min(BALANCE.MOMENTUM_MAX,
        newState.groupMomentum + (crit ? BALANCE.MOMENTUM_PER_CRIT : 0)
      ),
    };

    // Check for monster death
    if (newMonsters.find(m => m.id === target.id)!.hp <= 0) {
      newState = handleMonsterDeath(newState, target);
    }
  }

  // ── Skill ─────────────────────────────────────────────
  else if (action.type === 'skill') {
    const skills = CLASS_SKILLS[player.classType];
    if (!skills) return state;
    const skill = skills[action.skillIndex];
    if (!skill) return state;

    const validation = canUseSkill(player, skill);
    if (!validation.ok) {
      return {
        ...state,
        log: [...state.log, makeLog(state.turn, `❌ ${player.name}: ${validation.reason}`, 'system')],
      };
    }

    // Resolve targets
    const targetMonster = action.targetId
      ? newState.monsters.find(m => m.id === action.targetId && m.hp > 0 && !m.isSummon)
      : undefined;
    const targetPlayer = action.targetId ? newState.players[action.targetId] : undefined;
    const target = targetMonster ?? targetPlayer;

    if (targetMonster) primaryTargets = [targetMonster];

    // Execute skill
    const updatedPlayer = spendMp(player, skill.mpCost);
    newState = { ...newState, players: { ...newState.players, [playerId]: updatedPlayer } };

    const result = skill.execute({
      state: newState,
      caster: updatedPlayer,
      target,
      targets: targetMonster ? [targetMonster] : undefined,
      roll: rollDice(),
    });

    // Apply skill result patches
    newState = mergeSkillResult(newState, result, playerId);
    usedSkillTag = skill.synergyTag;

    // Combo system: check for primers and detonators
    const comboExt = {
      activeCombos: newState.activeCombos,
      killsThisTurn: newState.killsThisTurn,
      reviveHappenedThisTurn: newState.reviveHappenedThisTurn,
      comboStreak: newState.comboStreak,
    };
    const comboResult = checkAndFireDetonator(newState, comboExt, updatedPlayer, skill.id, targetMonster);
    if (comboResult.result.triggered) {
      newState = {
        ...newState,
        activeCombos: comboResult.newExt.activeCombos,
        killsThisTurn: comboResult.newExt.killsThisTurn,
        reviveHappenedThisTurn: comboResult.newExt.reviveHappenedThisTurn,
        comboStreak: comboResult.newExt.comboStreak,
      };
      // Apply combo result patches
      newState = mergeSkillResult(newState, comboResult.result, playerId);
      // Add combo banner event if combo was triggered
      const comboMeta = COMBO_META[comboResult.result.comboType!];
      if (comboMeta) {
        newState = {
          ...newState,
          comboEvents: [...(newState.comboEvents || []), {
            id: nanoid(),
            comboName: comboMeta.name,
            comboEmoji: comboMeta.emoji,
            color: comboMeta.color,
            bonusDamage: comboResult.result.bonusDamage,
          }]
        };
      }
    } else {
      // No combo detonated, check if this skill registers a primer
      const affectedMonsterIds = targetMonster ? [targetMonster.id] : [];
      const newComboExt = checkAndRegisterPrimer(newState, comboExt, updatedPlayer, skill.id, affectedMonsterIds);
      newState = {
        ...newState,
        activeCombos: newComboExt.activeCombos,
        killsThisTurn: newComboExt.killsThisTurn,
        reviveHappenedThisTurn: newComboExt.reviveHappenedThisTurn,
        comboStreak: newComboExt.comboStreak,
      };
    }

    // ULT cutscene trigger
    if (result.triggerUltCutscene) {
      newState = { ...newState, pendingUlt: result.triggerUltCutscene };
    }

    // Momentum from ult
    if (skill.isUlt) {
      newState = { ...newState, groupMomentum: Math.min(BALANCE.MOMENTUM_MAX, newState.groupMomentum + BALANCE.MOMENTUM_PER_ULT) };
    }

    // Check monster deaths from skill
    newState.monsters.forEach(m => {
      if (m.hp <= 0 && m.isAlive) {
        newState = handleMonsterDeath(newState, m);
      }
    });
  }

  // ── Item ──────────────────────────────────────────────
  else if (action.type === 'use_item') {
    newState = processItemUse(newState, playerId, action.itemId);
  }

  // ── Mark action as done ───────────────────────────────
  newState = {
    ...newState,
    actionsThisTurn: { ...newState.actionsThisTurn, [playerId]: true },
  };

  // ── Synergy Check ─────────────────────────────────────
  const currentPlayer = newState.players[playerId];
  if (currentPlayer) {
    const { newState: afterSynergy } = checkSynergies(newState, currentPlayer, usedSkillTag, primaryTargets);
    newState = afterSynergy;
  }

  // ── Momentum Synergy Attack ───────────────────────────
  if (newState.groupMomentum >= BALANCE.MOMENTUM_MAX) {
    newState = { ...newState, synergyReady: true };
    const afterMomentum = checkMomentumSynergy(newState);
    if (afterMomentum) newState = afterMomentum;
  }

  // ── Advance Turn ──────────────────────────────────────
  newState = advanceTurn(newState);

  return newState;
}

// ─── Turn Advancement ─────────────────────────────────────

function advanceTurn(state: CombatState): CombatState {
  const next = getNextActivePlayer(state);
  if (next) {
    return {
      ...state,
      activePlayerId: next,
      log: [...state.log, makeLog(state.turn, `🎯 Vez de ${state.players[next].name} agir!`, 'system')],
    };
  }

  // All players acted → monster phase
  return processMonsterPhase(state);
}

// ─── Monster Phase ────────────────────────────────────────

function processMonsterPhase(state: CombatState): CombatState {
  let newState = { ...state, log: [...state.log, makeLog(state.turn, `👹 Fase dos Monstros!`, 'system')] };

  // 1. Enrage check
  newState = { ...newState, monsters: newState.monsters.map(m => checkEnrage(m, newState)) };

  // 2. Boss ULT cooldown
  newState = processBossUlts(newState);

  // 3. Monster regen
  newState = {
    ...newState,
    monsters: newState.monsters.map(m => {
      if (m.hp <= 0 || m.isSummon || !m.regenPerTurn) return m;
      const newHp = Math.min(m.maxHp, m.hp + m.regenPerTurn);
      return { ...m, hp: newHp };
    }),
  };

  // 4. Monster attacks
  const aliveEnemies = newState.monsters.filter(m => m.hp > 0 && !m.isSummon);
  for (const monster of aliveEnemies) {
    newState = processMonsterAttack(newState, monster);
    if (Object.values(newState.players).every(p => !p.isAlive)) break; // early exit on wipe
  }

  // 5. Summon actions
  newState = processSummonPhase(newState);

  // 6. Tick effects on all units
  newState = tickAllEffects(newState);

  // 7. MP regen for players
  newState = regenMp(newState);

  // 8. Momentum decay
  newState = {
    ...newState,
    groupMomentum: Math.max(0, newState.groupMomentum - BALANCE.MOMENTUM_DECAY_PER_TURN),
  };

  // 9. Combo system: tick combos on turn end
  const comboExt = {
    activeCombos: newState.activeCombos,
    killsThisTurn: newState.killsThisTurn,
    reviveHappenedThisTurn: newState.reviveHappenedThisTurn,
    comboStreak: newState.comboStreak,
  };
  const tickedComboExt = tickCombosOnTurn(comboExt);

  // 10. Next turn setup
  newState = {
    ...newState,
    turn: newState.turn + 1,
    actionsThisTurn: {},
    activeCombos: tickedComboExt.activeCombos,
    killsThisTurn: tickedComboExt.killsThisTurn,
    reviveHappenedThisTurn: tickedComboExt.reviveHappenedThisTurn,
    comboStreak: tickedComboExt.comboStreak,
  };

  // 10. Set next active player
  const first = newState.playerOrder.find(pid => newState.players[pid]?.isAlive);
  newState = {
    ...newState,
    activePlayerId: first ?? null,
    log: first ? [...newState.log, makeLog(newState.turn, `🎯 Vez de ${newState.players[first].name} agir!`, 'system')] : newState.log,
  };

  return newState;
}

// ─── Monster Attack Logic ─────────────────────────────────

function processMonsterAttack(state: CombatState, monster: Monster): CombatState {
  if (isStunned(monster)) {
    return { ...state, log: [...state.log, makeLog(state.turn, `😵 ${monster.name} está atordoado!`, 'monster_action')] };
  }

  const alivePlayers = Object.values(state.players).filter(p => p.isAlive);
  if (alivePlayers.length === 0) return state;

  const attackCount = monster.isBoss ? (monster.multiAttack ?? 1) : 1;
  const pierceFactor = monster.armorPierce ?? 0;

  let newState = state;

  for (let i = 0; i < attackCount; i++) {
    const currentAlivePlayers = Object.values(newState.players).filter(p => p.isAlive);
    if (currentAlivePlayers.length === 0) break;

    // AoE splash chance (boss only)
    if (monster.isBoss && Math.random() < (monster.splashChance ?? 0)) {
      newState = processSplashAttack(newState, monster);
      continue;
    }

    // Pick target — taunt first, then random
    const tauntTarget = currentAlivePlayers.find(p => (p as any).tauntActive > 0);
    const target = tauntTarget ?? currentAlivePlayers[Math.floor(Math.random() * currentAlivePlayers.length)];
    newState = processSingleMonsterHit(newState, monster, target, pierceFactor, attackCount > 1 ? `(${i + 1}/${attackCount})` : '');
  }

  return newState;
}

function processSingleMonsterHit(
  state: CombatState,
  monster: Monster,
  target: Player,
  pierceFactor: number,
  label: string
): CombatState {
  let newState = state;

  // Clone absorb
  if (target.effects.some(e => e.type === 'cloned' && e.turnsLeft > 0)) {
    const reflectDmg = Math.floor(monster.attack * 0.8);
    newState = damageMonster(newState, monster.id, reflectDmg);
    const newTarget = {
      ...target,
      effects: target.effects.map(e => e.type === 'cloned' ? { ...e, turnsLeft: e.turnsLeft - 1 } : e).filter(e => e.turnsLeft > 0),
    };
    return {
      ...newState,
      players: { ...newState.players, [target.id]: newTarget },
      log: [...newState.log, makeLog(state.turn, `👤 Clone de ${target.name} absorve o golpe e reflete ${reflectDmg} dano!`, 'player_action')],
    };
  }

  // Dodge / invisible
  if (isInvisible(target)) {
    const newEffects = target.effects.map(e =>
      e.type === 'invisible' ? { ...e, value: e.value - 1, turnsLeft: e.value - 1 <= 0 ? 0 : e.turnsLeft } : e
    ).filter(e => e.turnsLeft > 0);
    return {
      ...newState,
      players: { ...newState.players, [target.id]: { ...target, effects: newEffects } },
      log: [...newState.log, makeLog(state.turn, `💨 ${target.name} ESQUIVA de ${monster.name}!`, 'monster_action')],
    };
  }

  // Invulnerability (guardian ult equivalent — now tracked as 'shielded' with high value)
  const shield = target.effects.find(e => e.type === 'shielded');
  const monAtk = Math.max(1, monster.attack - getCursedAtkReduction(monster));
  const effectiveDef = Math.floor(getEffectiveDef(target) * (1 - pierceFactor));
  const roll = rollDice();
  let dmg = calcDamage({ attackerAtk: monAtk, targetDef: effectiveDef, roll });

  // Wall effect (group-wide dmg reduction) — checked via fortified effect
  const fortified = target.effects.find(e => e.type === 'fortified');
  if (fortified && fortified.value > 100) { // value > 100 signals wall (80% reduction)
    dmg = Math.max(1, Math.floor(dmg * 0.2));
  }

  // Shield absorb
  if (shield && shield.value > 0) {
    const absorbed = Math.min(shield.value, dmg);
    dmg = dmg - absorbed;
    // Update shield
  }

  // Counter-reflect
  const counter = target.effects.find(e => e.type === 'marked' && e.sourceId === target.id); // repurposed for counter
  // (will refine with dedicated counter effect in next iteration)

  const newHp = Math.max(0, target.hp - dmg);
  const died = newHp <= 0;
  const newTarget: Player = { ...target, hp: newHp, isAlive: !died };

  newState = {
    ...newState,
    players: { ...newState.players, [target.id]: newTarget },
    log: [...newState.log, makeLog(state.turn,
      `${monster.emoji}${monster.name} ataca ${target.name}${label} [🎲${roll}] ${dmg} dano`,
      'monster_action'
    )],
  };

  if (died) {
    newState = {
      ...newState,
      log: [...newState.log, makeLog(state.turn, `💀 ${target.name} foi derrotado!`, 'death')],
    };
  }

  return newState;
}

function processSplashAttack(state: CombatState, monster: Monster): CombatState {
  let newState = { ...state, log: [...state.log, makeLog(state.turn, `💢 ${monster.name} ATAQUE EM ÁREA!`, 'monster_action')] };
  const monAtk = Math.max(1, monster.attack - getCursedAtkReduction(monster));
  const roll = rollDice();

  Object.values(newState.players).forEach(p => {
    if (!p.isAlive) return;
    let dmg = calcDamage({ attackerAtk: monAtk, targetDef: getEffectiveDef(p), roll });
    if (p.effects.some(e => e.type === 'fortified' && e.value > 100)) dmg = Math.max(1, Math.floor(dmg * 0.2));
    const newHp = Math.max(0, p.hp - dmg);
    newState = {
      ...newState,
      players: { ...newState.players, [p.id]: { ...p, hp: newHp, isAlive: newHp > 0 } },
      log: [...newState.log, makeLog(state.turn, `  💥 ${p.name}: ${dmg} dano`, 'monster_action')],
    };
    if (newHp <= 0) {
      newState = { ...newState, log: [...newState.log, makeLog(state.turn, `💀 ${p.name} foi derrotado!`, 'death')] };
    }
  });

  return newState;
}

// ─── Summon Phase ─────────────────────────────────────────

function processSummonPhase(state: CombatState): CombatState {
  let newState = state;
  const aliveSummons = newState.monsters.filter(m => m.isSummon && m.hp > 0);

  for (const summon of aliveSummons) {
    if (!summon.summonAbility) continue;
    const ability = summon.summonAbility;

    switch (ability.type) {
      case 'heal_lowest': {
        const alivePlayers = Object.values(newState.players).filter(p => p.isAlive);
        if (alivePlayers.length === 0) break;
        const target = alivePlayers.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
        const healed = Math.min(target.maxHp - target.hp, ability.value);
        newState = {
          ...newState,
          players: { ...newState.players, [target.id]: { ...target, hp: target.hp + healed } },
          log: [...newState.log, makeLog(newState.turn, `${summon.emoji} ${summon.name} cura ${target.name}! +${healed} HP`, 'player_action')],
        };
        break;
      }
      case 'buff_group': {
        const buff: StatusEffect = { type: 'empowered', turnsLeft: 2, value: ability.value, sourceId: summon.id };
        const newPlayers = { ...newState.players };
        Object.values(newPlayers).forEach(p => {
          if (p.isAlive) newPlayers[p.id] = addEffect(p, buff) as Player;
        });
        newState = {
          ...newState,
          players: newPlayers,
          log: [...newState.log, makeLog(newState.turn, `${summon.emoji} ${summon.name} buffa o grupo! +${ability.value} ATK por 2t`, 'player_action')],
        };
        break;
      }
      case 'attack':
      case 'aoe_attack': {
        const enemies = newState.monsters.filter(m => m.hp > 0 && !m.isSummon);
        if (enemies.length === 0) break;
        const attackTargets = ability.type === 'aoe_attack' ? enemies : [enemies[Math.floor(Math.random() * enemies.length)]];
        const attackCount = ability.attackCount ?? 1;
        let newMonsters = [...newState.monsters];

        for (let i = 0; i < attackCount; i++) {
          const currentEnemies = newMonsters.filter(m => m.hp > 0 && !m.isSummon);
          if (currentEnemies.length === 0) break;
          const attackTarget = attackTargets[0] ?? currentEnemies[0];
          const def = Math.floor(attackTarget.defense * (1 - (ability.armorPierce ?? 0)));
          const roll = rollDice();
          const dmg = calcDamage({ attackerAtk: summon.attack, targetDef: def, roll });
          const tIdx = newMonsters.findIndex(m => m.id === attackTarget.id);
          if (tIdx !== -1) {
            newMonsters[tIdx] = { ...newMonsters[tIdx], hp: Math.max(0, newMonsters[tIdx].hp - dmg) };
            newState = { ...newState, log: [...newState.log, makeLog(newState.turn, `${summon.emoji} ${summon.name} ataca ${attackTarget.name}! ${dmg} dano`, 'player_action')] };
            // Poison on hit
            if (ability.poisonOnHit && newMonsters[tIdx].hp > 0) {
              const poison: StatusEffect = { type: 'poisoned', turnsLeft: 3, value: ability.poisonOnHit, sourceId: summon.id };
              newMonsters[tIdx] = addEffect(newMonsters[tIdx], poison) as Monster;
            }
            if (newMonsters[tIdx].hp <= 0) {
              newState = handleMonsterDeath({ ...newState, monsters: newMonsters }, newMonsters[tIdx]);
              newMonsters = newState.monsters;
            }
          }
        }
        newState = { ...newState, monsters: newMonsters };
        break;
      }
    }
  }

  // Tick summon durations
  newState = {
    ...newState,
    monsters: newState.monsters.map(m => {
      if (!m.isSummon || m.hp <= 0) return m;
      if (m.summonDuration === undefined) return m;
      const dur = m.summonDuration - 1;
      if (dur <= 0) {
        newState = { ...newState, log: [...newState.log, makeLog(newState.turn, `💨 ${m.emoji}${m.name} retorna.`, 'system')] };
        // Decrement owner summon count
        if (m.summonOwnerId && newState.players[m.summonOwnerId]) {
          const owner = newState.players[m.summonOwnerId];
          newState = { ...newState, players: { ...newState.players, [owner.id]: { ...owner, summonCount: Math.max(0, owner.summonCount - 1) } } };
        }
        return { ...m, hp: 0, isAlive: false };
      }
      return { ...m, summonDuration: dur };
    }),
  };

  return newState;
}

// ─── Effect Ticking ───────────────────────────────────────

function tickAllEffects(state: CombatState): CombatState {
  let newState = state;

  // Tick monster effects
  const newMonsters = newState.monsters.map(m => {
    if (m.hp <= 0) return m;
    const { unit, tickDamage, tickHeal } = tickEffects(m);
    if (tickDamage > 0) {
      newState = { ...newState, log: [...newState.log, makeLog(newState.turn, `☠️ ${m.name} recebe ${tickDamage} de efeito!`, 'system')] };
    }
    if (unit.hp <= 0 && m.hp > 0) {
      // Died from tick
      setTimeout(() => { newState = handleMonsterDeath(newState, m); }, 0); // handle after map
    }
    return unit as Monster;
  });
  newState = { ...newState, monsters: newMonsters };

  // Handle any tick-killed monsters
  newState.monsters.forEach(m => {
    if (m.hp <= 0 && !newState.monsters.find(x => x.id === m.id && x.isAlive === false)) {
      // Already handled
    }
  });

  // Tick player effects
  const newPlayers = { ...newState.players };
  Object.entries(newPlayers).forEach(([pid, p]) => {
    if (!p.isAlive) return;
    const { unit, tickDamage, tickHeal } = tickEffects(p);
    newPlayers[pid] = unit as Player;
    if (tickDamage > 0) newState = { ...newState, log: [...newState.log, makeLog(newState.turn, `☠️ ${p.name} recebe ${tickDamage} de efeito contínuo!`, 'system')] };
    if (tickHeal > 0) newState = { ...newState, log: [...newState.log, makeLog(newState.turn, `♻️ ${p.name} regenera ${tickHeal} HP!`, 'system')] };
    if (unit.hp <= 0 && p.hp > 0) {
      newState = { ...newState, log: [...newState.log, makeLog(newState.turn, `💀 ${p.name} foi derrotado por efeito!`, 'death')] };
    }
    // Decrement taunt
    if ((newPlayers[pid] as any).tauntActive > 0) (newPlayers[pid] as any).tauntActive--;
  });
  newState = { ...newState, players: newPlayers };

  return newState;
}

// ─── MP Regen ─────────────────────────────────────────────

function regenMp(state: CombatState): CombatState {
  const newPlayers = { ...state.players };
  Object.entries(newPlayers).forEach(([pid, p]) => {
    if (!p.isAlive) return;
    const regen = Math.max(2, Math.floor(p.maxMp * BALANCE.MP_REGEN_PCT));
    newPlayers[pid] = { ...p, mp: Math.min(p.maxMp, p.mp + regen) };
  });
  return { ...state, players: newPlayers };
}

// ─── Monster Death ────────────────────────────────────────

export function handleMonsterDeath(state: CombatState, monster: Monster): CombatState {
  if (monster.isSummon) {
    let newState = { ...state, log: [...state.log, makeLog(state.turn, `💨 ${monster.emoji}${monster.name} foi derrotado.`, 'system')] };
    if (monster.summonOwnerId && newState.players[monster.summonOwnerId]) {
      const owner = newState.players[monster.summonOwnerId];
      newState = { ...newState, players: { ...newState.players, [owner.id]: { ...owner, summonCount: Math.max(0, owner.summonCount - 1) } } };
    }
    return newState;
  }

  let newState = { ...state, log: [...state.log, makeLog(state.turn, `💀 ${monster.emoji}${monster.name} foi derrotado!`, 'system')] };

  // Distribute XP and coins
  const alive = Object.values(newState.players).filter(p => p.isAlive);
  const xpEach = Math.ceil(monster.xpReward / Math.max(1, alive.length));
  const coinsEach = Math.ceil(monster.coinReward / Math.max(1, alive.length));
  const newPlayers = { ...newState.players };

  alive.forEach(p => {
    const { player: leveled, leveled: didLevel, newLevel } = applyXp(p, xpEach);
    newPlayers[p.id] = { ...leveled, coins: leveled.coins + coinsEach };
    if (didLevel) {
      newState = { ...newState, log: [...newState.log, makeLog(newState.turn, `🎉 ${p.name} → Nível ${newLevel}!`, 'level_up')] };
    }
  });

  // Necromancer soul gain
  Object.values(newPlayers).forEach(p => {
    if (p.isAlive && p.classType === 'necromancer') {
      const souls = Math.min(5, p.soulCount + 1);
      newPlayers[p.id] = { ...p, soulCount: souls };
      newState = { ...newState, log: [...newState.log, makeLog(newState.turn, `💀 ${p.name} absorve a alma [${souls}/5]`, 'system')] };
    }
  });

  // Momentum from kill
  const newMomentum = Math.min(BALANCE.MOMENTUM_MAX, newState.groupMomentum + BALANCE.MOMENTUM_PER_KILL);

  // Combo system: register kill
  const comboExt = {
    activeCombos: newState.activeCombos,
    killsThisTurn: newState.killsThisTurn,
    reviveHappenedThisTurn: newState.reviveHappenedThisTurn,
    comboStreak: newState.comboStreak,
  };
  const killResult = registerKill(newState, comboExt);

  // Handle triple kill combo if triggered
  if (killResult.tripleKillResult) {
    newState = mergeSkillResult(newState, killResult.tripleKillResult, ''); // empty string for group action
  }

  return {
    ...newState,
    players: newPlayers,
    groupMomentum: newMomentum,
    activeCombos: killResult.newExt.activeCombos,
    killsThisTurn: killResult.newExt.killsThisTurn,
    reviveHappenedThisTurn: killResult.newExt.reviveHappenedThisTurn,
    comboStreak: killResult.newExt.comboStreak,
  };
}

// ─── Boss Mechanics ───────────────────────────────────────

function checkEnrage(monster: Monster, state: CombatState): Monster {
  if (!monster.isBoss || !monster.enrageThreshold || monster.effects.some(e => e.type === 'enraged')) return monster;
  if (monster.hp / monster.maxHp <= monster.enrageThreshold) {
    const enraged: StatusEffect = { type: 'enraged', turnsLeft: 999, value: monster.enrageAtkBonus ?? 0, sourceId: 'boss' };
    const newMonster = addEffect({ ...monster, attack: monster.attack + (monster.enrageAtkBonus ?? 0) }, enraged) as Monster;
    // Log is added in the phase function
    return newMonster;
  }
  return monster;
}

function processBossUlts(state: CombatState): CombatState {
  let newState = state;
  newState = {
    ...newState,
    monsters: newState.monsters.map(m => {
      if (!m.isBoss || m.isSummon || m.hp <= 0 || !m.bossUlt) return m;
      const turnsLeft = (m.ultTurnsLeft ?? 1) - 1;
      if (turnsLeft <= 0) {
        // Fire boss ult
        newState = executeBossUlt(newState, m, m.bossUlt!);
        return { ...m, ultTurnsLeft: m.ultCooldown ?? 4 };
      }
      return { ...m, ultTurnsLeft: turnsLeft };
    }),
  };
  return newState;
}

function executeBossUlt(state: CombatState, monster: Monster, ult: any): CombatState {
  let newState = {
    ...state,
    pendingUlt: {
      playerId: monster.id, playerName: monster.name, classType: 'warrior' as any,
      ultName: ult.name, ultLines: ult.lines,
      ultColor: ult.color, ultBg: ult.bg, ultEmoji: ult.emoji,
      isBossUlt: true, bossName: monster.name,
    },
    log: [...state.log, makeLog(state.turn, `🌟 ${monster.name} usa ULTIMATE: ${ult.name}!`, 'level_up')],
  };

  if (ult.aoeDamage) {
    Object.values(newState.players).forEach(p => {
      if (!p.isAlive) return;
      const dmg = ult.aoeDamage;
      const newHp = Math.max(0, p.hp - dmg);
      newState = {
        ...newState,
        players: { ...newState.players, [p.id]: { ...p, hp: newHp, isAlive: newHp > 0 } },
        log: [...newState.log, makeLog(newState.turn, `💥 ${p.name}: ${dmg} dano!`, 'monster_action')],
      };
    });
  }

  return newState;
}

// ─── Helpers ──────────────────────────────────────────────

function damageMonster(state: CombatState, monsterId: string, dmg: number): CombatState {
  return {
    ...state,
    monsters: state.monsters.map(m => m.id === monsterId ? { ...m, hp: Math.max(0, m.hp - dmg), isAlive: m.hp - dmg > 0 } : m),
  };
}

function mergeSkillResult(state: CombatState, result: any, casterId: string): CombatState {
  return {
    ...state,
    ...(result.statePatches ?? {}),
    log: [...state.log, ...result.logEntries],
  };
}

function processItemUse(state: CombatState, playerId: string, itemId: string): CombatState {
  const player = state.players[playerId];
  const itemIdx = player.inventory.findIndex(i => i.id === itemId && i.consumable && (i.quantity ?? 0) > 0);
  if (itemIdx === -1) return state;

  const item = player.inventory[itemIdx];
  let newPlayer = { ...player };

  if (item.consumeHeal) {
    const healed = Math.min(player.maxHp - player.hp, item.consumeHeal);
    newPlayer.hp = player.hp + healed;
  }
  if (item.consumeMpHeal) {
    newPlayer.mp = Math.min(player.maxMp, player.mp + item.consumeMpHeal);
  }

  const newInv = [...player.inventory];
  const newQty = (item.quantity ?? 1) - 1;
  if (newQty <= 0) newInv.splice(itemIdx, 1);
  else newInv[itemIdx] = { ...item, quantity: newQty };

  return {
    ...state,
    players: { ...state.players, [playerId]: { ...newPlayer, inventory: newInv } },
    log: [...state.log, makeLog(state.turn, `${player.name} usa ${item.emoji} ${item.name}!`, 'player_action')],
  };
}