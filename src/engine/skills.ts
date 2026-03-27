// ═══════════════════════════════════════════════════════════
//  REALM OF SHADOWS — Skill System v2
//  Each skill is a pure function. No more if/else hell.
// ═══════════════════════════════════════════════════════════

import { Skill, SkillContext, SkillResult, Player, Monster, Unit, StatusEffect, ClassType } from './types';
import {
  rollDice, calcDamage, addEffect, getEffectiveDef, getCursedDefReduction,
  getMarkMultiplier, isStunned, makeLog, emptyResult, BALANCE, isCrit
} from './utils';
import { nanoid } from 'nanoid';

// ─── Skill Builder Helpers ────────────────────────────────
// These create the common patterns so each skill stays short

function dealDamage(
  ctx: SkillContext,
  target: Unit,
  opts: {
    bonus?: number;
    defMult?: number;
    extraMult?: number;
    label?: string;
    skipMark?: boolean;
  } = {}
): { damage: number; isCrit: boolean } {
  const { caster, roll } = ctx;
  const def = Math.max(0, getEffectiveDef(target) - getCursedDefReduction(target));
  const stunBonus = isStunned(target) ? 0 : 0; // stunned enemies already have def treated as 0
  const effectiveDef = isStunned(target) ? 0 : def;
  const markMult = opts.skipMark ? 1 : getMarkMultiplier(target);
  const critMult = isCrit(roll) ? BALANCE.CRIT_MULTIPLIER : 1;

  const damage = calcDamage({
    attackerAtk: caster.attack + (opts.bonus ?? 0),
    targetDef: effectiveDef,
    roll,
    defMult: opts.defMult ?? BALANCE.DEF_MULT_NORMAL,
    damageMultiplier: markMult * critMult * (opts.extraMult ?? 1),
  });

  return { damage, isCrit: isCrit(roll) };
}

function applyDamageToMonsters(
  ctx: SkillContext,
  monsters: Monster[],
  damagePerTarget: number,
  result: SkillResult
): Monster[] {
  return monsters.map(m => {
    if (m.hp <= 0 || m.isSummon) return m;
    const newHp = Math.max(0, m.hp - damagePerTarget);
    result.damages.push({ unitId: m.id, amount: damagePerTarget });
    return { ...m, hp: newHp, isAlive: newHp > 0 };
  });
}

function healUnit(target: Player, amount: number, result: SkillResult): Player {
  const healed = Math.min(target.maxHp - target.hp, amount);
  result.heals.push({ unitId: target.id, amount: healed });
  return { ...target, hp: target.hp + healed };
}

function applyEffect(target: Unit, effect: StatusEffect, result: SkillResult): Unit {
  result.effectsApplied.push({ unitId: target.id, effect });
  return addEffect(target, effect);
}

// ─── WARRIOR SKILLS ───────────────────────────────────────
export const WARRIOR_SKILLS: Skill[] = [
  {
    id: 'warrior_heavy_strike',
    name: 'Golpe Pesado', emoji: '⚔️', mpCost: 0,
    description: '+8 dano bônus. Simples e confiável.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 8 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn,
        `${ctx.caster.emoji || '⚔️'}${ctx.caster.name} usa Golpe Pesado em ${target.name}! ${crit ? '💥CRÍTICO! ' : ''}${damage} dano`,
        'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'warrior_provoke',
    name: 'Provocar', emoji: '😤', mpCost: 10,
    description: 'Aplica Taunt: inimigos priorizam atacar você por 2 turnos.',
    target: 'none', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const taunted: StatusEffect = { type: 'marked', turnsLeft: 2, value: 1, sourceId: ctx.caster.id };
      // Taunt is on the caster — monsters check for taunted players
      const newCaster: Player = { ...ctx.caster, effects: [...ctx.caster.effects, { type: 'empowered', turnsLeft: 2, value: 0, sourceId: ctx.caster.id }] };
      // We signal taunt via a special effect on caster
      (newCaster as any).tauntActive = 2;
      result.logEntries.push(makeLog(ctx.state.turn, `${ctx.caster.name} PROVOCA os inimigos! Todos focam nele por 2 turnos! 😤`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'warrior_battle_cry',
    name: 'Grito de Guerra', emoji: '📣', mpCost: 20,
    description: '+6 ATK para todos do grupo por 3 turnos.',
    target: 'ally_aoe', category: 'buff', synergyTag: 'war_cry',
    execute(ctx) {
      const result = emptyResult();
      const buff: StatusEffect = { type: 'empowered', turnsLeft: 3, value: 6, sourceId: ctx.caster.id };
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (p.isAlive) {
          newPlayers[p.id] = addEffect(p, buff) as Player;
          result.effectsApplied.push({ unitId: p.id, effect: buff });
        }
      });
      result.logEntries.push(makeLog(ctx.state.turn, `📣 ${ctx.caster.name} usa Grito de Guerra! TODOS +6 ATK por 3 turnos!`, 'player_action'));
      result.statePatches = { players: newPlayers };
      return result;
    },
  },
  {
    id: 'warrior_whirlwind',
    name: 'Investida', emoji: '🌪️', mpCost: 20,
    description: 'Ataca TODOS os inimigos (+10 dano bônus cada).',
    target: 'enemy_aoe', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage, isCrit: crit } = dealDamage(ctx, enemy, { bonus: 10, defMult: BALANCE.DEF_MULT_AOE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: crit });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `🌪️ ${enemy.name}: ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `${ctx.caster.name} usa Investida em TODOS!`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'warrior_shield_block',
    name: 'Bloquear', emoji: '🛡️', mpCost: 15,
    description: '+12 DEF por 2 turnos.',
    target: 'self', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const buff: StatusEffect = { type: 'fortified', turnsLeft: 2, value: 12, sourceId: ctx.caster.id };
      const newCaster = addEffect(ctx.caster, buff) as Player;
      result.effectsApplied.push({ unitId: ctx.caster.id, effect: buff });
      result.logEntries.push(makeLog(ctx.state.turn, `🛡️ ${ctx.caster.name} se fortalece! +12 DEF por 2 turnos.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'warrior_fury',
    name: 'Fúria de Batalha', emoji: '💢', mpCost: 30,
    description: '+20 dano, ignora 85% da DEF do alvo.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 20, defMult: BALANCE.DEF_MULT_PIERCE });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `💢 ${ctx.caster.name} usa Fúria de Batalha! ${damage} dano (ignora DEF)${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'warrior_ult',
    name: 'COLOSSO DA GUERRA', emoji: '🌋', mpCost: 80,
    description: '🔥 ULT: Explosão em TODOS os inimigos. Dano massivo + atordoa 1 turno. (Nv.3)',
    target: 'enemy_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'warrior',
      ultName: 'COLOSSO DA GUERRA',
      ultLines: ['O guerreiro transcende seus limites...', 'A terra treme sob seus pés...', 'COLOSSO DA GUERRA!'],
      ultColor: '#e74c3c', ultBg: 'radial-gradient(ellipse, #3d0000 0%, #0a0000 70%)',
      ultEmoji: '🌋',
    },
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 40, defMult: BALANCE.DEF_MULT_PIERCE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: true });
        const stun: StatusEffect = { type: 'stunned', turnsLeft: 1, value: 0, sourceId: ctx.caster.id };
        result.effectsApplied.push({ unitId: enemy.id, effect: stun });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) {
          newMonsters[idx] = addEffect({ ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) }, stun) as Monster;
        }
        result.logEntries.push(makeLog(ctx.state.turn, `🌋 ${enemy.name}: ${damage} dano + ATORDOADO!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌋 COLOSSO DA GUERRA! ${ctx.caster.name} destrói tudo!`, 'level_up'));
      result.statePatches = { monsters: newMonsters, groupMomentum: Math.min(BALANCE.MOMENTUM_MAX, ctx.state.groupMomentum + BALANCE.MOMENTUM_PER_ULT) };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── ASSASSIN SKILLS (rebalanced) ─────────────────────────
// Old version: Execute was straight up 3x damage ignoring all DEF — often did more than ULT
// New version: Execute is strong (2.2x) but capped, ULT is now significantly stronger
export const ASSASSIN_SKILLS: Skill[] = [
  {
    id: 'assassin_stealth_strike',
    name: 'Ataque Furtivo', emoji: '🌙', mpCost: 0,
    description: '+7 dano. Aplica 1 stack de Sangramento (5 dano/turno por 3t).',
    target: 'enemy', category: 'attack', synergyTag: 'shadow',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 7 });
      const bleed: StatusEffect = { type: 'bleeding', turnsLeft: 3, value: 5, sourceId: ctx.caster.id, stacks: 1 };
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.effectsApplied.push({ unitId: target.id, effect: bleed });
      const newMonsters = ctx.state.monsters.map(m =>
        m.id === target.id ? addEffect({ ...m, hp: Math.max(0, m.hp - damage) }, bleed) as Monster : m
      );
      result.logEntries.push(makeLog(ctx.state.turn, `🌙 ${ctx.caster.name} golpe furtivo em ${target.name}! ${damage} dano + Sangramento${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'assassin_mark',
    name: 'Marca da Morte', emoji: '🎯', mpCost: 15,
    description: 'Marca o alvo: recebe +60% dano de TODOS por 3 turnos.',
    target: 'enemy', category: 'buff', synergyTag: 'mark',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const mark: StatusEffect = { type: 'marked', turnsLeft: 3, value: 1.6, sourceId: ctx.caster.id };
      result.effectsApplied.push({ unitId: target.id, effect: mark });
      const newMonsters = ctx.state.monsters.map(m => m.id === target.id ? addEffect(m, mark) as Monster : m);
      result.logEntries.push(makeLog(ctx.state.turn, `🎯 ${ctx.caster.name} marca ${target.name}! +60% dano recebido por 3 turnos.`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'assassin_smoke',
    name: 'Névoa das Sombras', emoji: '🌫️', mpCost: 18,
    description: 'Esquiva dos próximos 2 ataques.',
    target: 'self', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const dodge: StatusEffect = { type: 'invisible', turnsLeft: 2, value: 2, sourceId: ctx.caster.id };
      const newCaster = addEffect(ctx.caster, dodge) as Player;
      result.effectsApplied.push({ unitId: ctx.caster.id, effect: dodge });
      result.logEntries.push(makeLog(ctx.state.turn, `🌫️ ${ctx.caster.name} some nas sombras! Esquiva por 2 ataques.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'assassin_execute',
    name: 'Execução', emoji: '💀', mpCost: 35,
    description: 'Se o alvo está abaixo de 40% HP: 2.2x dano + ignora 75% DEF. Caso contrário, dano normal +15.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const isExecute = target.hp < target.maxHp * BALANCE.EXECUTE_THRESHOLD;

      let damage: number;
      let crit: boolean;

      if (isExecute) {
        const res = dealDamage(ctx, target, {
          bonus: 15,
          defMult: BALANCE.EXECUTE_DEF_MULT,
          extraMult: BALANCE.EXECUTE_MULTIPLIER,
        });
        damage = res.damage;
        crit = res.isCrit;
        result.logEntries.push(makeLog(ctx.state.turn, `💀 EXECUÇÃO! ${target.name} abaixo de 40% HP → ${damage} dano (×${BALANCE.EXECUTE_MULTIPLIER})${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      } else {
        const res = dealDamage(ctx, target, { bonus: 15 });
        damage = res.damage;
        crit = res.isCrit;
        result.logEntries.push(makeLog(ctx.state.turn, `💀 ${ctx.caster.name} tenta Execução em ${target.name} (HP alto): ${damage} dano.`, 'player_action'));
      }

      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'assassin_double',
    name: 'Golpe Duplo', emoji: '⚡', mpCost: 22,
    description: 'Dois golpes rápidos (+12 cada). Cada um pode aplicar Sangramento.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      let currentHp = target.hp;
      let totalDmg = 0;
      let newMonsterState = { ...target };

      for (let i = 0; i < 2; i++) {
        const localRoll = rollDice();
        const dmg = calcDamage({
          attackerAtk: ctx.caster.attack + 12,
          targetDef: getEffectiveDef(newMonsterState),
          roll: localRoll,
          damageMultiplier: getMarkMultiplier(newMonsterState),
        });
        currentHp = Math.max(0, currentHp - dmg);
        totalDmg += dmg;
        result.damages.push({ unitId: target.id, amount: dmg, isCrit: isCrit(localRoll) });
        if (Math.random() < 0.4) {
          const bleed: StatusEffect = { type: 'bleeding', turnsLeft: 2, value: 4, sourceId: ctx.caster.id, stacks: 1 };
          newMonsterState = addEffect(newMonsterState, bleed) as Monster;
          result.effectsApplied.push({ unitId: target.id, effect: bleed });
        }
      }

      newMonsterState = { ...newMonsterState, hp: currentHp, isAlive: currentHp > 0 };
      result.logEntries.push(makeLog(ctx.state.turn, `⚡ ${ctx.caster.name} Golpe Duplo em ${target.name}! ${totalDmg} dano total (2 hits)`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newMonsterState : m) };
      return result;
    },
  },
  {
    id: 'assassin_deathly_poison',
    name: 'Veneno Mortal', emoji: '☠️', mpCost: 30,
    description: '+12 dano + Sangramento (3 stacks, 8/t) + Veneno (15/t por 4t).',
    target: 'enemy', category: 'attack', synergyTag: 'shadow',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage } = dealDamage(ctx, target, { bonus: 12 });
      const poison: StatusEffect = { type: 'poisoned', turnsLeft: 4, value: 15, sourceId: ctx.caster.id };
      const bleed: StatusEffect = { type: 'bleeding', turnsLeft: 3, value: 8, sourceId: ctx.caster.id, stacks: 3 };
      result.damages.push({ unitId: target.id, amount: damage });
      result.effectsApplied.push({ unitId: target.id, effect: poison }, { unitId: target.id, effect: bleed });
      let newM = addEffect({ ...target, hp: Math.max(0, target.hp - damage) }, poison) as Monster;
      newM = addEffect(newM, bleed) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `☠️ ${ctx.caster.name} usa Veneno Mortal! ${damage} dano + Veneno 15/t + 3x Sangramento!`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      return result;
    },
  },
  {
    id: 'assassin_ult',
    name: 'SOMBRA ABSOLUTA', emoji: '🌑', mpCost: 80,
    description: '🌑 ULT: Golpe catastrófico em 1 alvo. 3x dano + aplica todos os debuffs. Muito mais forte que Execução. (Nv.3)',
    target: 'enemy', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'assassin',
      ultName: 'SOMBRA ABSOLUTA',
      ultLines: ['O assassino some da existência...', 'Torna-se pura escuridão...', 'SOMBRA ABSOLUTA!'],
      ultColor: '#2c3e50', ultBg: 'radial-gradient(ellipse, #0a0a0f 0%, #000002 70%)',
      ultEmoji: '🌑',
    },
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      // ULT is always significantly stronger than Execute
      const { damage } = dealDamage(ctx, target, {
        bonus: 30,
        defMult: 0, // true 0 DEF — this is the ULT privilege
        extraMult: 3.0,
      });
      const poison: StatusEffect = { type: 'poisoned', turnsLeft: 5, value: 20, sourceId: ctx.caster.id };
      const bleed: StatusEffect = { type: 'bleeding', turnsLeft: 4, value: 10, sourceId: ctx.caster.id, stacks: 5 };
      const mark: StatusEffect = { type: 'marked_death', turnsLeft: 3, value: 1, sourceId: ctx.caster.id };
      result.damages.push({ unitId: target.id, amount: damage, isCrit: true });
      result.effectsApplied.push({ unitId: target.id, effect: poison }, { unitId: target.id, effect: bleed });
      let newM = { ...target, hp: Math.max(0, target.hp - damage) };
      newM = addEffect(newM, poison) as Monster;
      newM = addEffect(newM, bleed) as Monster;
      newM = addEffect(newM, mark) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `🌑 SOMBRA ABSOLUTA! ${damage} dano (3x, DEF=0) + todos os debuffs em ${target.name}!`, 'level_up'));
      result.statePatches = {
        monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m),
        groupMomentum: Math.min(BALANCE.MOMENTUM_MAX, ctx.state.groupMomentum + BALANCE.MOMENTUM_PER_ULT),
      };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── SHAMAN SKILLS (reworked — was terrible) ──────────────
// Old: accumulate 5 stacks over 5 turns doing nothing, release for mediocre damage
// New: each stack attack is USEFUL (deals real damage). Release scales hard.
//      Also gains passive: each stack = +3% max HP as bonus MP regen passively shown
export const SHAMAN_SKILLS: Skill[] = [
  {
    id: 'shaman_spirit_strike',
    name: 'Golpe Espiritual', emoji: '🌀', mpCost: 5,
    description: '+8 dano + ganha 1 Carga (máx 5). Cada carga = +3 ATK efetivo neste turno.',
    target: 'enemy', category: 'attack', synergyTag: 'spirit',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const stacks = ctx.caster.spiritStacks;
      // Each existing stack adds bonus damage — accumulating is rewarding even before release
      const stackBonus = stacks * 3;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 8 + stackBonus });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      const newStacks = Math.min(BALANCE.SPIRIT_MAX_STACKS, stacks + 1);
      const newCaster: Player = { ...ctx.caster, spiritStacks: newStacks };
      result.logEntries.push(makeLog(ctx.state.turn,
        `🌀 ${ctx.caster.name} Golpe Espiritual! ${damage} dano${crit ? ' CRÍTICO!' : ''} + Carga [${newStacks}/5]`,
        'player_action'));
      result.statePatches = {
        monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m),
        players: { ...ctx.state.players, [ctx.caster.id]: newCaster },
      };
      return result;
    },
  },
  {
    id: 'shaman_release',
    name: 'Liberar Espíritos', emoji: '💫', mpCost: 15,
    description: 'Libera todas as cargas: (12 + 40% ATK) × cargas em TODOS os inimigos. Com 5 cargas, devastador.',
    target: 'enemy_aoe', category: 'magic', synergyTag: 'spirit',
    execute(ctx) {
      const result = emptyResult();
      const stacks = ctx.caster.spiritStacks;
      if (stacks === 0) {
        result.logEntries.push(makeLog(ctx.state.turn, `❌ ${ctx.caster.name}: sem Cargas Espirituais!`, 'system'));
        return result;
      }
      const dmgPerStack = BALANCE.SPIRIT_DMG_PER_STACK + Math.floor(ctx.caster.attack * BALANCE.SPIRIT_ATK_SCALE);
      const totalDmgBase = dmgPerStack * stacks;
      const roll = ctx.roll;
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const dmg = Math.max(1, totalDmgBase + roll - Math.floor(enemy.defense * 0.3));
        result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: stacks === 5 });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
        result.logEntries.push(makeLog(ctx.state.turn, `💫 ${enemy.name}: ${dmg} dano espiritual!`, 'player_action'));
      });
      const newCaster: Player = { ...ctx.caster, spiritStacks: 0 };
      result.logEntries.unshift(makeLog(ctx.state.turn,
        `💫 ${ctx.caster.name} libera ${stacks} Cargas! ${dmgPerStack * stacks} dano base em TODOS!`,
        stacks === 5 ? 'level_up' : 'player_action'));
      result.statePatches = {
        monsters: newMonsters,
        players: { ...ctx.state.players, [ctx.caster.id]: newCaster },
        groupMomentum: Math.min(BALANCE.MOMENTUM_MAX, ctx.state.groupMomentum + (stacks >= 4 ? BALANCE.MOMENTUM_PER_CRIT : 0)),
      };
      return result;
    },
  },
  {
    id: 'shaman_ancestral_heal',
    name: 'Cura Ancestral', emoji: '🌿', mpCost: 18,
    description: 'Cura 40HP em aliado. Se você tem 3+ cargas, cura 40HP extra.',
    target: 'ally', category: 'support', synergyTag: 'spirit',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Player;
      const stacks = ctx.caster.spiritStacks;
      const healAmount = 40 + (stacks >= 3 ? 40 : 0);
      const healed = Math.min(target.maxHp - target.hp, healAmount);
      result.heals.push({ unitId: target.id, amount: healed });
      const newTarget = { ...target, hp: target.hp + healed };
      result.logEntries.push(makeLog(ctx.state.turn,
        `🌿 ${ctx.caster.name} cura ${target.name}! +${healed} HP${stacks >= 3 ? ' (BÔNUS de Cargas!)' : ''}`,
        'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [target.id]: newTarget } };
      return result;
    },
  },
  {
    id: 'shaman_spirit_curse',
    name: 'Maldição dos Espíritos', emoji: '👁️', mpCost: 22,
    description: '-6 DEF e -4 ATK no alvo por 4 turnos. Seus ataques ficam mais fortes contra ele.',
    target: 'enemy', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const curse: StatusEffect = { type: 'cursed', turnsLeft: 4, value: 6, sourceId: ctx.caster.id };
      result.effectsApplied.push({ unitId: target.id, effect: curse });
      const newMonsters = ctx.state.monsters.map(m => m.id === target.id ? addEffect(m, curse) as Monster : m);
      result.logEntries.push(makeLog(ctx.state.turn, `👁️ ${ctx.caster.name} amaldiçoa ${target.name}! -6 DEF, -4 ATK por 4 turnos.`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'shaman_totem',
    name: 'Totem de Cura', emoji: '🏺', mpCost: 25,
    description: '+14 HP/turno por 4 turnos em aliado. Se você tem cargas, elas potencializam a regen.',
    target: 'ally', category: 'support', synergyTag: 'spirit',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Player;
      const stacks = ctx.caster.spiritStacks;
      const regenValue = 14 + stacks * 2; // cargas boost regen
      const regen: StatusEffect = { type: 'regenerating', turnsLeft: 4, value: regenValue, sourceId: ctx.caster.id };
      result.effectsApplied.push({ unitId: target.id, effect: regen });
      const newTarget = addEffect(target, regen) as Player;
      result.logEntries.push(makeLog(ctx.state.turn,
        `🏺 ${ctx.caster.name} planta Totem em ${target.name}! +${regenValue} HP/turno por 4t${stacks > 0 ? ` (cargas: ${stacks}×2 bônus)` : ''}`,
        'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [target.id]: newTarget } };
      return result;
    },
  },
  {
    id: 'shaman_ancestor_wrath',
    name: 'Raiva Ancestral', emoji: '⚡', mpCost: 35,
    description: '+22 dano espiritual em TODOS. Suas cargas aumentam o dano (+5 por carga).',
    target: 'enemy_aoe', category: 'magic', synergyTag: 'spirit',
    execute(ctx) {
      const result = emptyResult();
      const stacks = ctx.caster.spiritStacks;
      const bonus = 22 + stacks * 5;
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus, defMult: BALANCE.DEF_MULT_AOE });
        result.damages.push({ unitId: enemy.id, amount: damage });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `⚡ ${enemy.name}: ${damage} dano ancestral!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `⚡ ${ctx.caster.name} Raiva Ancestral! ${bonus} dano base (${stacks} cargas)`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'shaman_ult',
    name: 'CONVERGÊNCIA ESPIRITUAL', emoji: '🌌', mpCost: 80,
    description: '🌀 ULT: Explosão espiritual em todos + cura o grupo. Consome e amplifica suas cargas. (Nv.3)',
    target: 'enemy_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'shaman',
      ultName: 'CONVERGÊNCIA ESPIRITUAL',
      ultLines: ['Os espíritos de mil ancestrais respondem...', 'O mundo dos vivos e dos mortos se une...', 'CONVERGÊNCIA ESPIRITUAL!'],
      ultColor: '#5f9ea0', ultBg: 'radial-gradient(ellipse, #001a1a 0%, #000505 70%)',
      ultEmoji: '🌌',
    },
    execute(ctx) {
      const result = emptyResult();
      const stacks = ctx.caster.spiritStacks;
      const stackBonus = stacks * 8;
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 45 + stackBonus, defMult: BALANCE.DEF_MULT_PIERCE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: true });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `🌌 ${enemy.name}: ${damage} dano espiritual!`, 'player_action'));
      });
      // Heal all allies
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (p.isAlive) {
          const h = Math.min(p.maxHp - p.hp, 40 + stacks * 5);
          newPlayers[p.id] = { ...p, hp: p.hp + h };
          result.heals.push({ unitId: p.id, amount: h });
        }
      });
      const newCaster: Player = { ...ctx.caster, spiritStacks: 0 };
      newPlayers[ctx.caster.id] = newCaster;
      result.logEntries.unshift(makeLog(ctx.state.turn,
        `🌌 CONVERGÊNCIA ESPIRITUAL! ${ctx.caster.name} libera TUDO (${stacks} cargas) + cura o grupo!`,
        'level_up'));
      result.statePatches = {
        monsters: newMonsters, players: newPlayers,
        groupMomentum: Math.min(BALANCE.MOMENTUM_MAX, ctx.state.groupMomentum + BALANCE.MOMENTUM_PER_ULT),
      };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── SKILL REGISTRY ───────────────────────────────────────
// Map classType → skills array
export const CLASS_SKILLS: Partial<Record<ClassType, Skill[]>> = {
  warrior: WARRIOR_SKILLS,
  assassin: ASSASSIN_SKILLS,
  shaman: SHAMAN_SKILLS,
  // Other classes get filled in next file
};

// Validate MP cost before executing
export function canUseSkill(player: Player, skill: Skill): { ok: boolean; reason?: string } {
  if (player.mp < skill.mpCost) return { ok: false, reason: `MP insuficiente (${player.mp}/${skill.mpCost})` };
  if (skill.isUlt && skill.ultLevel && player.level < skill.ultLevel) {
    return { ok: false, reason: `Nível ${skill.ultLevel} necessário` };
  }
  return { ok: true };
}

// Deduct MP and return updated player
export function spendMp(player: Player, cost: number): Player {
  return { ...player, mp: player.mp - cost };
}