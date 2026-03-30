// ═══════════════════════════════════════════════════════════
//  REALM OF SHADOWS — Skill System v2 (COMPLETE — 15 classes)
//  Each skill is a pure function. No more if/else hell.
// ═══════════════════════════════════════════════════════════

import { Skill, SkillContext, SkillResult, Player, Monster, Unit, StatusEffect, ClassType } from './types';
import {
  rollDice, calcDamage, addEffect, getEffectiveDef, getCursedDefReduction,
  getMarkMultiplier, isStunned, makeLog, emptyResult, BALANCE, isCrit
} from './utils';
import { nanoid } from 'nanoid';

// ─── Skill Builder Helpers ────────────────────────────────

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

// ─── WARRIOR ──────────────────────────────────────────────
export const WARRIOR_SKILLS: Skill[] = [
  {
    id: 'warrior_heavy_strike',
    name: 'Golpe Pesado', emoji: '⚔️', emojiVariants: ['⚔️', '🗡️', '🔨', '🪓'], mpCost: 0,
    description: '+8 dano bônus. Simples e confiável.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 8 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `${ctx.caster.name} usa Golpe Pesado em ${target.name}! ${crit ? '💥CRÍTICO! ' : ''}${damage} dano`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'warrior_provoke',
    name: 'Provocar', emoji: '😤', emojiVariants: ['😤', '😠', '🤬', '👹'], mpCost: 10,
    description: 'Força inimigos a atacar você por 2 turnos.',
    target: 'none', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const newCaster: Player = { ...ctx.caster };
      (newCaster as any).tauntActive = 2;
      result.logEntries.push(makeLog(ctx.state.turn, `${ctx.caster.name} PROVOCA os inimigos! Foco nele por 2 turnos! 😤`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'warrior_battle_cry',
    name: 'Grito de Guerra', emoji: '📣', emojiVariants: ['📣', '🔔', '📢', '🎺'], mpCost: 20,
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
      result.logEntries.push(makeLog(ctx.state.turn, `📣 ${ctx.caster.name} Grito de Guerra! TODOS +6 ATK por 3 turnos!`, 'player_action'));
      result.statePatches = { players: newPlayers };
      return result;
    },
  },
  {
    id: 'warrior_whirlwind',
    name: 'Investida', emoji: '🌪️', emojiVariants: ['🌪️', '💨', '⚡', '🏃'], mpCost: 20,
    description: 'Ataca TODOS os inimigos (+10 dano bônus).',
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
    name: 'Bloquear', emoji: '🛡️', emojiVariants: ['🛡️', '🧱', '🏛️', '🪨'], mpCost: 15,
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
    name: 'Fúria de Batalha', emoji: '💢', emojiVariants: ['💢', '🔥', '💥', '😡'], mpCost: 30,
    description: '+20 dano, ignora 85% da DEF do alvo.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 20, defMult: BALANCE.DEF_MULT_PIERCE });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `💢 ${ctx.caster.name} Fúria de Batalha! ${damage} dano (ignora DEF)${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'warrior_ult',
    name: 'COLOSSO DA GUERRA', emoji: '🌋', mpCost: 80,
    description: '🔥 ULT: Explosão em TODOS + atordoa 1 turno. (Nv.3)',
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
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = addEffect({ ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) }, stun) as Monster;
        result.logEntries.push(makeLog(ctx.state.turn, `🌋 ${enemy.name}: ${damage} dano + ATORDOADO!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌋 COLOSSO DA GUERRA! ${ctx.caster.name} destrói tudo!`, 'level_up'));
      result.statePatches = { monsters: newMonsters };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── MAGE ─────────────────────────────────────────────────
export const MAGE_SKILLS: Skill[] = [
  {
    id: 'mage_fireball',
    name: 'Bola de Fogo', emoji: '🔥', emojiVariants: ['🔥', '🌋', '🔴', '✨'], mpCost: 15,
    description: '+10 dano de fogo.',
    target: 'enemy', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 10 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🔥 ${ctx.caster.name} Bola de Fogo em ${target.name}! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'mage_ice_ray',
    name: 'Raio de Gelo', emoji: '❄️', emojiVariants: ['❄️', '🧊', '🍦', '💎'], mpCost: 12,
    description: '+8 dano + lentidão (-30% dano) por 2 turnos.',
    target: 'enemy', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 8 });
      const slow: StatusEffect = { type: 'slowed', turnsLeft: 2, value: 0.3, sourceId: ctx.caster.id };
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.effectsApplied.push({ unitId: target.id, effect: slow });
      const newM = addEffect({ ...target, hp: Math.max(0, target.hp - damage) }, slow) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `❄️ ${ctx.caster.name} Raio de Gelo! ${damage} dano + ${target.name} lento!`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      return result;
    },
  },
  {
    id: 'mage_arcane_shield',
    name: 'Escudo Arcano', emoji: '🔵', emojiVariants: ['🔵', '🛡️', '⭕', '💠'], mpCost: 20,
    description: '+10 DEF por 2 turnos (própria).',
    target: 'self', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const buff: StatusEffect = { type: 'fortified', turnsLeft: 2, value: 10, sourceId: ctx.caster.id };
      const newCaster = addEffect(ctx.caster, buff) as Player;
      result.effectsApplied.push({ unitId: ctx.caster.id, effect: buff });
      result.logEntries.push(makeLog(ctx.state.turn, `🔵 ${ctx.caster.name} Escudo Arcano! +10 DEF por 2 turnos.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'mage_arcane_explosion',
    name: 'Explosão Arcana', emoji: '💥', emojiVariants: ['💥', '✨', '⚡', '🌪️'], mpCost: 50,
    description: 'Dano MASSIVO em todos os inimigos.',
    target: 'enemy_aoe', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage, isCrit: crit } = dealDamage(ctx, enemy, { bonus: 25, defMult: BALANCE.DEF_MULT_AOE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: crit });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `💥 ${enemy.name}: ${damage} dano arcano!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `💥 ${ctx.caster.name} Explosão Arcana em TODOS!`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'mage_lightning',
    name: 'Raio Veloz', emoji: '⚡', emojiVariants: ['⚡', '🌩️', '🔌', '💫'], mpCost: 18,
    description: '+14 dano elétrico.',
    target: 'enemy', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 14 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `⚡ ${ctx.caster.name} Raio Veloz! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'mage_meteor',
    name: 'Chuva de Meteoros', emoji: '☄️', emojiVariants: ['☄️', '🌌', '💫', '⭐'], mpCost: 55,
    description: 'Meteoros em todos os inimigos.',
    target: 'enemy_aoe', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage, isCrit: crit } = dealDamage(ctx, enemy, { bonus: 18, defMult: BALANCE.DEF_MULT_AOE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: crit });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `☄️ ${enemy.name}: ${damage} dano meteórico!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `☄️ ${ctx.caster.name} Chuva de Meteoros!`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'mage_ult',
    name: 'APOCALIPSE ARCANO', emoji: '🌌', mpCost: 100,
    description: '🔮 ULT: Destrói a realidade. Dano devastador em todos. (Nv.3)',
    target: 'enemy_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'mage',
      ultName: 'APOCALIPSE ARCANO',
      ultLines: ['O mago canaliza energia do além...', 'O tecido da realidade se rompe...', 'APOCALIPSE ARCANO!'],
      ultColor: '#9b59b6', ultBg: 'radial-gradient(ellipse, #1a0030 0%, #000008 70%)',
      ultEmoji: '🌌',
    },
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 80, defMult: BALANCE.DEF_MULT_PIERCE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: true });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `🌌 ${enemy.name}: ${damage} dano arcano!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌌 APOCALIPSE ARCANO! ${ctx.caster.name} destrói a realidade!`, 'level_up'));
      result.statePatches = { monsters: newMonsters };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── ROGUE ────────────────────────────────────────────────
export const ROGUE_SKILLS: Skill[] = [
  {
    id: 'rogue_stab',
    name: 'Punhalada', emoji: '🗡️', emojiVariants: ['🗡️', '🔪', '🗝️', '⚔️'], mpCost: 0,
    description: '+5 dano básico.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 5 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🗡️ ${ctx.caster.name} Punhalada em ${target.name}! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'rogue_poison',
    name: 'Envenenar', emoji: '☠️', emojiVariants: ['☠️', '🐍', '☣️', '💀'], mpCost: 20,
    description: 'Veneno: 10 dano/turno por 4 turnos.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const poison: StatusEffect = { type: 'poisoned', turnsLeft: 4, value: 10, sourceId: ctx.caster.id };
      result.effectsApplied.push({ unitId: target.id, effect: poison });
      const newM = addEffect(target, poison) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `☠️ ${ctx.caster.name} Envenena ${target.name}! 10 dano/turno por 4t.`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      return result;
    },
  },
  {
    id: 'rogue_smoke',
    name: 'Fumaça', emoji: '💨', emojiVariants: ['💨', '💫', '🌫️', '👁️'], mpCost: 15,
    description: 'Esquiva dos próximos 2 ataques.',
    target: 'self', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const dodge: StatusEffect = { type: 'invisible', turnsLeft: 2, value: 2, sourceId: ctx.caster.id };
      const newCaster = addEffect(ctx.caster, dodge) as Player;
      result.effectsApplied.push({ unitId: ctx.caster.id, effect: dodge });
      result.logEntries.push(makeLog(ctx.state.turn, `💨 ${ctx.caster.name} Fumaça! Esquiva por 2 ataques.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'rogue_critical',
    name: 'Golpe Crítico', emoji: '⚡', mpCost: 40,
    description: '3x dano, ignora TODA a defesa.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage } = dealDamage(ctx, target, { bonus: 25, defMult: 0, extraMult: 3 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: true });
      result.logEntries.push(makeLog(ctx.state.turn, `⚡ GOLPE CRÍTICO! ${ctx.caster.name} → ${target.name}: ${damage} dano (3x, DEF=0)!`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'rogue_double',
    name: 'Sombra Dupla', emoji: '👥', mpCost: 25,
    description: 'Ataca 2x no mesmo alvo (+12 cada).',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      let currentHp = target.hp;
      let totalDmg = 0;
      for (let i = 0; i < 2; i++) {
        const roll = rollDice();
        const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 12, targetDef: getEffectiveDef({ ...target, hp: currentHp }), roll, damageMultiplier: getMarkMultiplier(target) });
        currentHp = Math.max(0, currentHp - dmg);
        totalDmg += dmg;
        result.damages.push({ unitId: target.id, amount: dmg, isCrit: isCrit(roll) });
      }
      result.logEntries.push(makeLog(ctx.state.turn, `👥 ${ctx.caster.name} Sombra Dupla! ${totalDmg} dano total (2 hits)`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: currentHp, isAlive: currentHp > 0 } : m) };
      return result;
    },
  },
  {
    id: 'rogue_poison_blade',
    name: 'Lâmina Venenosa', emoji: '🐍', mpCost: 35,
    description: '+10 dano + veneno (12/t por 5 turnos).',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 10 });
      const poison: StatusEffect = { type: 'poisoned', turnsLeft: 5, value: 12, sourceId: ctx.caster.id };
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.effectsApplied.push({ unitId: target.id, effect: poison });
      const newM = addEffect({ ...target, hp: Math.max(0, target.hp - damage) }, poison) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `🐍 ${ctx.caster.name} Lâmina Venenosa! ${damage} dano + veneno 12/t por 5t.`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      return result;
    },
  },
  {
    id: 'rogue_ult',
    name: 'DANÇA DA MORTE', emoji: '💀', mpCost: 100,
    description: '🗡️ ULT: Golpe único devastador que ignora toda DEF + veneno letal. (Nv.3)',
    target: 'enemy', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'rogue',
      ultName: 'DANÇA DA MORTE',
      ultLines: ['O ladino desaparece nas sombras...', 'Mil lâminas cortam o ar...', 'DANÇA DA MORTE!'],
      ultColor: '#1abc9c', ultBg: 'radial-gradient(ellipse, #001a15 0%, #000a08 70%)',
      ultEmoji: '💀',
    },
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage } = dealDamage(ctx, target, { bonus: 50, defMult: 0, extraMult: 2.5 });
      const poison: StatusEffect = { type: 'poisoned', turnsLeft: 5, value: 20, sourceId: ctx.caster.id };
      result.damages.push({ unitId: target.id, amount: damage, isCrit: true });
      result.effectsApplied.push({ unitId: target.id, effect: poison });
      const newM = addEffect({ ...target, hp: Math.max(0, target.hp - damage) }, poison) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `💀 DANÇA DA MORTE! ${damage} dano (DEF=0) + veneno letal em ${target.name}!`, 'level_up'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── NECROMANCER ──────────────────────────────────────────
export const NECROMANCER_SKILLS: Skill[] = [
  {
    id: 'necro_shadow_ray',
    name: 'Raio Sombrio', emoji: '🖤', emojiVariants: ['🖤', '👁️', '🌑', '🕷️'], mpCost: 10,
    description: '+10 dano sombrio.',
    target: 'enemy', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 10 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🖤 ${ctx.caster.name} Raio Sombrio! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'necro_drain',
    name: 'Drenar Vida', emoji: '🩸', emojiVariants: ['🩸', '🧛', '💀', '🩷'], mpCost: 20,
    description: '+12 dano, drena 18HP de volta.',
    target: 'enemy', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 12 });
      const healed = Math.min(ctx.caster.maxHp - ctx.caster.hp, 18);
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.heals.push({ unitId: ctx.caster.id, amount: healed });
      const newCaster = { ...ctx.caster, hp: ctx.caster.hp + healed };
      result.logEntries.push(makeLog(ctx.state.turn, `🩸 ${ctx.caster.name} Drena Vida! ${damage} dano + ${healed}HP recuperado.`, 'player_action'));
      result.statePatches = {
        monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m),
        players: { ...ctx.state.players, [ctx.caster.id]: newCaster },
      };
      return result;
    },
  },
  {
    id: 'necro_curse',
    name: 'Maldição Profunda', emoji: '🔮', emojiVariants: ['🔮', '🖤', '🔥', '💀'], mpCost: 25,
    description: '-5 DEF e -4 ATK no alvo por 4 turnos.',
    target: 'enemy', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const curse: StatusEffect = { type: 'cursed', turnsLeft: 4, value: 5, sourceId: ctx.caster.id };
      result.effectsApplied.push({ unitId: target.id, effect: curse });
      const newM = addEffect(target, curse) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `🔮 ${ctx.caster.name} amaldiçoa ${target.name}! -5 DEF, -4 ATK por 4 turnos.`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      return result;
    },
  },
  {
    id: 'necro_undead_buff',
    name: 'Invocar Morto-Vivo', emoji: '💀', mpCost: 45,
    description: '+8 dano para TODO o grupo por 5 turnos.',
    target: 'ally_aoe', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const buff: StatusEffect = { type: 'empowered', turnsLeft: 5, value: 8, sourceId: ctx.caster.id };
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (p.isAlive) {
          newPlayers[p.id] = addEffect(p, buff) as Player;
          result.effectsApplied.push({ unitId: p.id, effect: buff });
        }
      });
      result.logEntries.push(makeLog(ctx.state.turn, `💀 ${ctx.caster.name} invoca Morto-Vivo! TODOS +8 dano por 5 turnos!`, 'player_action'));
      result.statePatches = { players: newPlayers };
      return result;
    },
  },
  {
    id: 'necro_shadow_explosion',
    name: 'Explosão Sombria', emoji: '🌑', mpCost: 35,
    description: 'Dano sombrio em TODOS os inimigos.',
    target: 'enemy_aoe', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage, isCrit: crit } = dealDamage(ctx, enemy, { bonus: 14, defMult: BALANCE.DEF_MULT_AOE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: crit });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `🌑 ${enemy.name}: ${damage} dano sombrio!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌑 ${ctx.caster.name} Explosão Sombria!`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'necro_summon_shadow',
    name: 'Invocar Sombra', emoji: '👻', mpCost: 40,
    description: 'Gasta 1 Alma: invoca a sombra do último inimigo morto por 4 turnos.',
    target: 'none', category: 'summon',
    execute(ctx) {
      const result = emptyResult();
      if (ctx.caster.soulCount <= 0) {
        result.logEntries.push(makeLog(ctx.state.turn, `❌ ${ctx.caster.name}: sem Almas! Mate inimigos primeiro.`, 'system'));
        return result;
      }
      const newCaster: Player = { ...ctx.caster, soulCount: ctx.caster.soulCount - 1 };
      result.logEntries.push(makeLog(ctx.state.turn, `👻 ${ctx.caster.name} gasta 1 Alma e invoca uma Sombra! [${newCaster.soulCount}/5 almas]`, 'player_action'));
      result.statePatches = {
        players: { ...ctx.state.players, [ctx.caster.id]: newCaster },
        // Shadow spawning is handled at game engine level via pendingSummon
      };
      (result as any).pendingSummon = { type: 'necro_shadow', ownerId: ctx.caster.id };
      return result;
    },
  },
  {
    id: 'necro_ult',
    name: 'LEVANTE DOS MORTOS', emoji: '☠️', mpCost: 100,
    description: '💀 ULT: Dano em área + cura o necromante. (Nv.3)',
    target: 'enemy_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'necromancer',
      ultName: 'LEVANTE DOS MORTOS',
      ultLines: ['Os mortos respondem ao chamado...', 'Exércitos das trevas emergem...', 'LEVANTE DOS MORTOS!'],
      ultColor: '#8e44ad', ultBg: 'radial-gradient(ellipse, #1a0028 0%, #050005 70%)',
      ultEmoji: '☠️',
    },
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 50, defMult: BALANCE.DEF_MULT_PIERCE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: true });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `☠️ ${enemy.name}: ${damage} dano mortal!`, 'player_action'));
      });
      const healed = Math.min(ctx.caster.maxHp - ctx.caster.hp, 40);
      result.heals.push({ unitId: ctx.caster.id, amount: healed });
      const newCaster = { ...ctx.caster, hp: ctx.caster.hp + healed };
      result.logEntries.unshift(makeLog(ctx.state.turn, `☠️ LEVANTE DOS MORTOS! +${healed}HP drenado.`, 'level_up'));
      result.statePatches = { monsters: newMonsters, players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── PALADIN ──────────────────────────────────────────────
export const PALADIN_SKILLS: Skill[] = [
  {
    id: 'paladin_smite',
    name: 'Smite', emoji: '✨', mpCost: 10,
    description: '+8 dano sagrado.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 8 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `✨ ${ctx.caster.name} Smite! ${damage} dano sagrado${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'paladin_heal',
    name: 'Curar', emoji: '💚', mpCost: 20,
    description: 'Cura 35HP em aliado escolhido.',
    target: 'ally', category: 'support',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Player;
      const healed = Math.min(target.maxHp - target.hp, 35);
      result.heals.push({ unitId: target.id, amount: healed });
      result.logEntries.push(makeLog(ctx.state.turn, `💚 ${ctx.caster.name} cura ${target.name}! +${healed} HP.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [target.id]: { ...target, hp: target.hp + healed } } };
      return result;
    },
  },
  {
    id: 'paladin_shield',
    name: 'Escudo de Luz', emoji: '🌟', mpCost: 25,
    description: '+12 DEF por 3 turnos (própria).',
    target: 'self', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const buff: StatusEffect = { type: 'fortified', turnsLeft: 3, value: 12, sourceId: ctx.caster.id };
      const newCaster = addEffect(ctx.caster, buff) as Player;
      result.effectsApplied.push({ unitId: ctx.caster.id, effect: buff });
      result.logEntries.push(makeLog(ctx.state.turn, `🌟 ${ctx.caster.name} Escudo de Luz! +12 DEF por 3 turnos.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'paladin_divine_blessing',
    name: 'Bênção Divina', emoji: '🙏', mpCost: 60,
    description: 'Cura 40HP em TODOS os aliados vivos.',
    target: 'ally_aoe', category: 'support',
    execute(ctx) {
      const result = emptyResult();
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (!p.isAlive) return;
        const healed = Math.min(p.maxHp - p.hp, 40);
        newPlayers[p.id] = { ...p, hp: p.hp + healed };
        result.heals.push({ unitId: p.id, amount: healed });
        if (healed > 0) result.logEntries.push(makeLog(ctx.state.turn, `💚 ${p.name} +${healed} HP!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🙏 ${ctx.caster.name} Bênção Divina! Cura 40HP em todos!`, 'player_action'));
      result.statePatches = { players: newPlayers };
      return result;
    },
  },
  {
    id: 'paladin_hammer',
    name: 'Martelo Sagrado', emoji: '🔨', mpCost: 30,
    description: '+18 dano sagrado.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 18 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🔨 ${ctx.caster.name} Martelo Sagrado! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'paladin_resurrect',
    name: 'Ressurreição', emoji: '✝️', mpCost: 70,
    description: 'Revive aliado morto com 40% do HP máximo.',
    target: 'ally', category: 'support',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Player;
      if (target.isAlive) {
        result.logEntries.push(makeLog(ctx.state.turn, `❌ ${target.name} ainda está vivo!`, 'system'));
        return result;
      }
      const revHp = Math.floor(target.maxHp * 0.4);
      result.heals.push({ unitId: target.id, amount: revHp });
      result.logEntries.push(makeLog(ctx.state.turn, `✝️ ${ctx.caster.name} ressuscita ${target.name} com ${revHp} HP!`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [target.id]: { ...target, isAlive: true, hp: revHp } } };
      return result;
    },
  },
  {
    id: 'paladin_ult',
    name: 'JULGAMENTO DIVINO', emoji: '⚡', mpCost: 100,
    description: '⚡ ULT: Luz divina destrói todos + cura o grupo. (Nv.3)',
    target: 'enemy_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'paladin',
      ultName: 'JULGAMENTO DIVINO',
      ultLines: ['A luz dos deuses desce sobre o campo...', 'Nenhuma sombra pode resistir...', 'JULGAMENTO DIVINO!'],
      ultColor: '#f39c12', ultBg: 'radial-gradient(ellipse, #2a1a00 0%, #0a0600 70%)',
      ultEmoji: '⚡',
    },
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 55, defMult: BALANCE.DEF_MULT_PIERCE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: true });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `⚡ ${enemy.name}: ${damage} dano sagrado!`, 'player_action'));
      });
      // Heal + revive all allies
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (!p.isAlive) {
          const revHp = Math.floor(p.maxHp * 0.5);
          newPlayers[p.id] = { ...p, isAlive: true, hp: revHp };
          result.logEntries.push(makeLog(ctx.state.turn, `✝️ ${p.name} ressuscita com ${revHp} HP!`, 'player_action'));
        } else {
          const healed = Math.min(p.maxHp - p.hp, 30);
          newPlayers[p.id] = { ...p, hp: p.hp + healed };
          result.heals.push({ unitId: p.id, amount: healed });
        }
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `⚡ JULGAMENTO DIVINO! Luz e cura para todos!`, 'level_up'));
      result.statePatches = { monsters: newMonsters, players: newPlayers };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── RANGER ───────────────────────────────────────────────
export const RANGER_SKILLS: Skill[] = [
  {
    id: 'ranger_arrow',
    name: 'Flechada', emoji: '🏹', mpCost: 0,
    description: '+6 dano básico.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 6 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🏹 ${ctx.caster.name} Flechada! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'ranger_trap',
    name: 'Armadilha', emoji: '🪤', mpCost: 20,
    description: 'Atordoa o alvo por 2 turnos.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const stun: StatusEffect = { type: 'stunned', turnsLeft: 2, value: 0, sourceId: ctx.caster.id };
      result.effectsApplied.push({ unitId: target.id, effect: stun });
      const newM = addEffect(target, stun) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `🪤 ${ctx.caster.name} Armadilha! ${target.name} atordoado por 2 turnos!`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      return result;
    },
  },
  {
    id: 'ranger_eagle_eye',
    name: 'Olho de Águia', emoji: '🦅', mpCost: 25,
    description: 'Próximo ataque básico +18 dano bônus.',
    target: 'self', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      // Store aim bonus via empowered effect with high value marker
      const aim: StatusEffect = { type: 'empowered', turnsLeft: 1, value: 18, sourceId: ctx.caster.id };
      const newCaster = { ...ctx.caster };
      (newCaster as any).aimBonus = ((ctx.caster as any).aimBonus ?? 0) + 18;
      result.effectsApplied.push({ unitId: ctx.caster.id, effect: aim });
      result.logEntries.push(makeLog(ctx.state.turn, `🦅 ${ctx.caster.name} Olho de Águia! Próximo ataque +18 dano!`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'ranger_rain',
    name: 'Chuva de Flechas', emoji: '🌧️', mpCost: 45,
    description: 'Ataca TODOS os inimigos (+12 cada).',
    target: 'enemy_aoe', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage, isCrit: crit } = dealDamage(ctx, enemy, { bonus: 12, defMult: BALANCE.DEF_MULT_AOE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: crit });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `🌧️ ${enemy.name}: ${damage} dano!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌧️ ${ctx.caster.name} Chuva de Flechas!`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'ranger_explosive',
    name: 'Flecha Explosiva', emoji: '💣', mpCost: 30,
    description: '+16 dano explosivo.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 16 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `💣 ${ctx.caster.name} Flecha Explosiva! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'ranger_pierce',
    name: 'Tiro Perfurante', emoji: '🎯', mpCost: 35,
    description: 'Ignora TODA a defesa do alvo.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 12, defMult: 0 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🎯 ${ctx.caster.name} Tiro Perfurante! ${damage} dano (ignora DEF)${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'ranger_ult',
    name: 'TEMPESTADE DE FLECHAS', emoji: '🌪️', mpCost: 100,
    description: '🏹 ULT: Mil flechas caem. Todos os inimigos atordoados. (Nv.3)',
    target: 'enemy_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'ranger',
      ultName: 'TEMPESTADE DE FLECHAS',
      ultLines: ['O arqueiro mira em tudo ao mesmo tempo...', 'O céu escurece com flechas...', 'TEMPESTADE DE FLECHAS!'],
      ultColor: '#3498db', ultBg: 'radial-gradient(ellipse, #001428 0%, #000508 70%)',
      ultEmoji: '🌪️',
    },
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 45, defMult: BALANCE.DEF_MULT_PIERCE });
        const stun: StatusEffect = { type: 'stunned', turnsLeft: 1, value: 0, sourceId: ctx.caster.id };
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: true });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = addEffect({ ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) }, stun) as Monster;
        result.logEntries.push(makeLog(ctx.state.turn, `🌪️ ${enemy.name}: ${damage} dano + atordoado!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌪️ TEMPESTADE DE FLECHAS! Todos atordoados!`, 'level_up'));
      result.statePatches = { monsters: newMonsters };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── ASSASSIN ─────────────────────────────────────────────
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
      const newM = addEffect({ ...target, hp: Math.max(0, target.hp - damage) }, bleed) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `🌙 ${ctx.caster.name} golpe furtivo em ${target.name}! ${damage} dano + Sangramento${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
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
      const newM = addEffect(target, mark) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `🎯 ${ctx.caster.name} marca ${target.name}! +60% dano recebido por 3 turnos.`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
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
      result.logEntries.push(makeLog(ctx.state.turn, `🌫️ ${ctx.caster.name} Névoa das Sombras! Esquiva por 2 ataques.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'assassin_execute',
    name: 'Execução', emoji: '💀', mpCost: 35,
    description: 'Se < 40% HP: 2.2x dano + ignora 75% DEF.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const isExecute = target.hp < target.maxHp * BALANCE.EXECUTE_THRESHOLD;
      let damage: number; let crit: boolean;
      if (isExecute) {
        const res = dealDamage(ctx, target, { bonus: 15, defMult: BALANCE.EXECUTE_DEF_MULT, extraMult: BALANCE.EXECUTE_MULTIPLIER });
        damage = res.damage; crit = res.isCrit;
        result.logEntries.push(makeLog(ctx.state.turn, `💀 EXECUÇÃO! ${target.name} abaixo de 40% HP → ${damage} dano (×${BALANCE.EXECUTE_MULTIPLIER})${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      } else {
        const res = dealDamage(ctx, target, { bonus: 15 });
        damage = res.damage; crit = res.isCrit;
        result.logEntries.push(makeLog(ctx.state.turn, `💀 ${ctx.caster.name} tenta Execução (HP alto): ${damage} dano.`, 'player_action'));
      }
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'assassin_double',
    name: 'Golpe Duplo', emoji: '⚡', mpCost: 22,
    description: 'Dois golpes (+12 cada). Cada um pode aplicar Sangramento.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      let currentHp = target.hp;
      let totalDmg = 0;
      let newMonsterState = { ...target };
      for (let i = 0; i < 2; i++) {
        const localRoll = rollDice();
        const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 12, targetDef: getEffectiveDef(newMonsterState), roll: localRoll, damageMultiplier: getMarkMultiplier(newMonsterState) });
        currentHp = Math.max(0, currentHp - dmg);
        totalDmg += dmg;
        result.damages.push({ unitId: target.id, amount: dmg, isCrit: isCrit(localRoll) });
        if (Math.random() < 0.4) {
          const bleed: StatusEffect = { type: 'bleeding', turnsLeft: 2, value: 4, sourceId: ctx.caster.id, stacks: 1 };
          newMonsterState = addEffect(newMonsterState, bleed) as Monster;
        }
      }
      newMonsterState = { ...newMonsterState, hp: currentHp, isAlive: currentHp > 0 };
      result.logEntries.push(makeLog(ctx.state.turn, `⚡ ${ctx.caster.name} Golpe Duplo! ${totalDmg} dano total (2 hits)`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newMonsterState : m) };
      return result;
    },
  },
  {
    id: 'assassin_deathly_poison',
    name: 'Veneno Mortal', emoji: '☠️', mpCost: 30,
    description: '+12 dano + Sangramento (3 stacks) + Veneno (15/t por 4t).',
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
      result.logEntries.push(makeLog(ctx.state.turn, `☠️ ${ctx.caster.name} Veneno Mortal! ${damage} dano + Veneno 15/t + 3× Sangramento!`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      return result;
    },
  },
  {
    id: 'assassin_ult',
    name: 'SOMBRA ABSOLUTA', emoji: '🌑', mpCost: 80,
    description: '🌑 ULT: 3× dano (DEF=0) + todos os debuffs. (Nv.3)',
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
      const { damage } = dealDamage(ctx, target, { bonus: 30, defMult: 0, extraMult: 3.0 });
      const poison: StatusEffect = { type: 'poisoned', turnsLeft: 5, value: 20, sourceId: ctx.caster.id };
      const bleed: StatusEffect = { type: 'bleeding', turnsLeft: 4, value: 10, sourceId: ctx.caster.id, stacks: 5 };
      result.damages.push({ unitId: target.id, amount: damage, isCrit: true });
      result.effectsApplied.push({ unitId: target.id, effect: poison }, { unitId: target.id, effect: bleed });
      let newM = { ...target, hp: Math.max(0, target.hp - damage) };
      newM = addEffect(newM, poison) as Monster;
      newM = addEffect(newM, bleed) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `🌑 SOMBRA ABSOLUTA! ${damage} dano (3×, DEF=0) + todos os debuffs em ${target.name}!`, 'level_up'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── ELEMENTALIST ─────────────────────────────────────────
export const ELEMENTALIST_SKILLS: Skill[] = [
  {
    id: 'elem_flame',
    name: 'Chama Menor', emoji: '🔥', mpCost: 10,
    description: '+8 dano de fogo.',
    target: 'enemy', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 8 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🔥 ${ctx.caster.name} Chama! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'elem_ice_lance',
    name: 'Lança de Gelo', emoji: '❄️', mpCost: 15,
    description: '+10 dano + lentidão por 2 turnos.',
    target: 'enemy', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 10 });
      const slow: StatusEffect = { type: 'slowed', turnsLeft: 2, value: 0.3, sourceId: ctx.caster.id };
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.effectsApplied.push({ unitId: target.id, effect: slow });
      const newM = addEffect({ ...target, hp: Math.max(0, target.hp - damage) }, slow) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `❄️ ${ctx.caster.name} Lança de Gelo! ${damage} dano + ${target.name} lento!`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      return result;
    },
  },
  {
    id: 'elem_lightning_bolt',
    name: 'Raio Cadente', emoji: '⚡', mpCost: 18,
    description: '+14 dano elétrico.',
    target: 'enemy', category: 'magic', synergyTag: 'elemental',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 14 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `⚡ ${ctx.caster.name} Raio Cadente! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'elem_storm',
    name: 'Tempestade Elemental', emoji: '🌊', mpCost: 55,
    description: 'Fogo+gelo+raio em TODOS os inimigos.',
    target: 'enemy_aoe', category: 'magic', synergyTag: 'elemental',
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage, isCrit: crit } = dealDamage(ctx, enemy, { bonus: 20, defMult: BALANCE.DEF_MULT_AOE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: crit });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `🌊 ${enemy.name}: ${damage} dano elemental!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌊 ${ctx.caster.name} Tempestade Elemental!`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'elem_blizzard',
    name: 'Nova de Gelo', emoji: '🌨️', mpCost: 30,
    description: '+10 dano em TODOS + lentidão.',
    target: 'enemy_aoe', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 10, defMult: BALANCE.DEF_MULT_AOE });
        const slow: StatusEffect = { type: 'slowed', turnsLeft: 2, value: 0.3, sourceId: ctx.caster.id };
        result.damages.push({ unitId: enemy.id, amount: damage });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = addEffect({ ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) }, slow) as Monster;
        result.logEntries.push(makeLog(ctx.state.turn, `🌨️ ${enemy.name}: ${damage} dano + lento!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌨️ ${ctx.caster.name} Nova de Gelo! Todos lentos.`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'elem_magma',
    name: 'Meteoro de Magma', emoji: '🌋', mpCost: 45,
    description: '+30 dano de fogo massivo em 1 alvo.',
    target: 'enemy', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 30 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🌋 ${ctx.caster.name} Meteoro de Magma! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'elem_ult',
    name: 'CONVERGÊNCIA ELEMENTAL', emoji: '🌀', mpCost: 100,
    description: '🌀 ULT: Todos os elementos explodem simultaneamente. (Nv.3)',
    target: 'enemy_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'elementalist',
      ultName: 'CONVERGÊNCIA ELEMENTAL',
      ultLines: ['Os 4 elementos se unem em um ponto...', 'Fogo, gelo, raio e vento convergem...', 'CONVERGÊNCIA ELEMENTAL!'],
      ultColor: '#e67e22', ultBg: 'radial-gradient(ellipse, #1a0f00 0%, #060300 70%)',
      ultEmoji: '🌀',
    },
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 65, defMult: BALANCE.DEF_MULT_PIERCE });
        const slow: StatusEffect = { type: 'slowed', turnsLeft: 2, value: 0.3, sourceId: ctx.caster.id };
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: true });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = addEffect({ ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) }, slow) as Monster;
        result.logEntries.push(makeLog(ctx.state.turn, `🌀 ${enemy.name}: ${damage} dano + lento!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌀 CONVERGÊNCIA ELEMENTAL! Todos os elementos explodem!`, 'level_up'));
      result.statePatches = { monsters: newMonsters };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── BERSERKER ────────────────────────────────────────────
export const BERSERKER_SKILLS: Skill[] = [
  {
    id: 'berserker_slash',
    name: 'Golpe Selvagem', emoji: '🪓', mpCost: 0,
    description: '+8 dano brutal.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 8 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🪓 ${ctx.caster.name} Golpe Selvagem! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'berserker_frenzy',
    name: 'Frenesi', emoji: '😡', mpCost: 20,
    description: '+8 ATK, -3 DEF por 3 turnos.',
    target: 'self', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const atkBuff: StatusEffect = { type: 'empowered', turnsLeft: 3, value: 8, sourceId: ctx.caster.id };
      const defDebuff: StatusEffect = { type: 'fortified', turnsLeft: 3, value: -3, sourceId: ctx.caster.id };
      let newCaster = addEffect(ctx.caster, atkBuff) as Player;
      newCaster = addEffect(newCaster, defDebuff) as Player;
      result.effectsApplied.push({ unitId: ctx.caster.id, effect: atkBuff });
      result.logEntries.push(makeLog(ctx.state.turn, `😡 ${ctx.caster.name} FRENESI! +8 ATK, -3 DEF por 3 turnos.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'berserker_roar',
    name: 'Rugido', emoji: '🦁', mpCost: 15,
    description: 'Força inimigos a atacar você por 2 turnos.',
    target: 'none', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const newCaster = { ...ctx.caster };
      (newCaster as any).tauntActive = 2;
      result.logEntries.push(makeLog(ctx.state.turn, `🦁 ${ctx.caster.name} RUGIDO! Inimigos focam nele por 2 turnos!`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'berserker_devastate',
    name: 'Devastar', emoji: '💥', mpCost: 35,
    description: 'Ignora 50% da DEF, +22 dano.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 22, defMult: BALANCE.DEF_MULT_HALF });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `💥 ${ctx.caster.name} Devastar! ${damage} dano (ignora 50% DEF)${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'berserker_triple',
    name: 'Golpe Triplo', emoji: '⚡', mpCost: 25,
    description: 'Ataca 3× no alvo (+10 cada).',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      let currentHp = target.hp;
      let totalDmg = 0;
      for (let i = 0; i < 3; i++) {
        const roll = rollDice();
        const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 10, targetDef: getEffectiveDef(target), roll });
        currentHp = Math.max(0, currentHp - dmg);
        totalDmg += dmg;
        result.damages.push({ unitId: target.id, amount: dmg, isCrit: isCrit(roll) });
      }
      result.logEntries.push(makeLog(ctx.state.turn, `⚡ ${ctx.caster.name} Golpe Triplo! ${totalDmg} dano (3 hits)`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: currentHp, isAlive: currentHp > 0 } : m) };
      return result;
    },
  },
  {
    id: 'berserker_blood_rage',
    name: 'Ira Sanguinária', emoji: '🩸', mpCost: 45,
    description: 'Dano escala com HP faltando (até 2.5×).',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const missingHpPct = 1 - ctx.caster.hp / ctx.caster.maxHp;
      const rageMult = 1 + missingHpPct * (BALANCE.RAGE_MAX_MULTIPLIER - 1);
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 20, extraMult: rageMult });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🩸 ${ctx.caster.name} Ira Sanguinária! Fator ×${rageMult.toFixed(1)} → ${damage} dano!`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'berserker_ult',
    name: 'FÚRIA DO TITÃ', emoji: '⚡', mpCost: 100,
    description: '⚡ ULT: Violência absoluta em área. (Nv.3)',
    target: 'enemy_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'berserker',
      ultName: 'FÚRIA DO TITÃ',
      ultLines: ['O berserker abandona toda razão...', 'Pura violência primordial desencadeada...', 'FÚRIA DO TITÃ!'],
      ultColor: '#c0392b', ultBg: 'radial-gradient(ellipse, #280000 0%, #080000 70%)',
      ultEmoji: '⚡',
    },
    execute(ctx) {
      const result = emptyResult();
      const missingHpPct = 1 - ctx.caster.hp / ctx.caster.maxHp;
      const rageMult = 1 + missingHpPct * (BALANCE.RAGE_MAX_MULTIPLIER - 1);
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 75, defMult: BALANCE.DEF_MULT_PIERCE, extraMult: rageMult });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: true });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `⚡ ${enemy.name}: ${damage} dano (×${rageMult.toFixed(1)})!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `⚡ FÚRIA DO TITÃ! Violência absoluta!`, 'level_up'));
      result.statePatches = { monsters: newMonsters };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── GUARDIAN ─────────────────────────────────────────────
export const GUARDIAN_SKILLS: Skill[] = [
  {
    id: 'guardian_shield_bash',
    name: 'Escudaraço', emoji: '🗿', mpCost: 0,
    description: '+6 dano com escudo.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 6 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🗿 ${ctx.caster.name} Escudaraço! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'guardian_full_taunt',
    name: 'Provocação Total', emoji: '📢', mpCost: 10,
    description: 'TODOS os inimigos atacam o Guardião por 2 turnos.',
    target: 'none', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const newCaster = { ...ctx.caster };
      (newCaster as any).tauntActive = 2;
      result.logEntries.push(makeLog(ctx.state.turn, `📢 ${ctx.caster.name} Provocação Total! Todos focam nele!`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'guardian_wall',
    name: 'Muralha', emoji: '🏰', mpCost: 30,
    description: 'Grupo recebe 20% do dano por 2 turnos.',
    target: 'ally_aoe', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      // Wall effect: fortified with special value > 100 to signal 80% reduction
      const wall: StatusEffect = { type: 'fortified', turnsLeft: 2, value: 999, sourceId: ctx.caster.id };
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (p.isAlive) {
          newPlayers[p.id] = addEffect(p, wall) as Player;
          result.effectsApplied.push({ unitId: p.id, effect: wall });
        }
      });
      result.logEntries.push(makeLog(ctx.state.turn, `🏰 ${ctx.caster.name} ergue Muralha! Grupo recebe 20% do dano por 2 turnos!`, 'player_action'));
      result.statePatches = { players: newPlayers };
      return result;
    },
  },
  {
    id: 'guardian_counter',
    name: 'Contra-Ataque', emoji: '🔄', mpCost: 25,
    description: 'Reflete 60% do próximo dano recebido.',
    target: 'self', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      // counterReflect tracked outside status effects in the old system; use shielded as marker
      const counter: StatusEffect = { type: 'shielded', turnsLeft: 1, value: 60, sourceId: ctx.caster.id };
      const newCaster = addEffect(ctx.caster, counter) as Player;
      result.effectsApplied.push({ unitId: ctx.caster.id, effect: counter });
      result.logEntries.push(makeLog(ctx.state.turn, `🔄 ${ctx.caster.name} Contra-Ataque! Reflete 60% do próximo dano.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'guardian_fortify',
    name: 'Fortaleza', emoji: '⛩️', mpCost: 20,
    description: '+20 DEF por 3 turnos (própria).',
    target: 'self', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const buff: StatusEffect = { type: 'fortified', turnsLeft: 3, value: 20, sourceId: ctx.caster.id };
      const newCaster = addEffect(ctx.caster, buff) as Player;
      result.effectsApplied.push({ unitId: ctx.caster.id, effect: buff });
      result.logEntries.push(makeLog(ctx.state.turn, `⛩️ ${ctx.caster.name} Fortaleza! +20 DEF por 3 turnos.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'guardian_shield_slam',
    name: 'Golpe de Escudo', emoji: '🛡️', mpCost: 35,
    description: '+22 dano e atordoa o alvo por 1 turno.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 22 });
      const stun: StatusEffect = { type: 'stunned', turnsLeft: 1, value: 0, sourceId: ctx.caster.id };
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.effectsApplied.push({ unitId: target.id, effect: stun });
      const newM = addEffect({ ...target, hp: Math.max(0, target.hp - damage) }, stun) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `🛡️ ${ctx.caster.name} Golpe de Escudo! ${damage} dano + atordoado!`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      return result;
    },
  },
  {
    id: 'guardian_ult',
    name: 'BASTIÃO ETERNO', emoji: '🗿', mpCost: 100,
    description: '🗿 ULT: Grupo invulnerável por 3 turnos + dano em área. (Nv.3)',
    target: 'enemy_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'guardian',
      ultName: 'BASTIÃO ETERNO',
      ultLines: ['O guardião se torna uma montanha...', 'Nenhuma força pode mover essa rocha...', 'BASTIÃO ETERNO!'],
      ultColor: '#7f8c8d', ultBg: 'radial-gradient(ellipse, #0f1010 0%, #030404 70%)',
      ultEmoji: '🗿',
    },
    execute(ctx) {
      const result = emptyResult();
      // AoE damage
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 30, defMult: BALANCE.DEF_MULT_AOE });
        result.damages.push({ unitId: enemy.id, amount: damage });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `🗿 ${enemy.name}: ${damage} dano!`, 'player_action'));
      });
      // Invulnerability for group (use shielded with very high value)
      const invuln: StatusEffect = { type: 'shielded', turnsLeft: 3, value: 99999, sourceId: ctx.caster.id };
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (p.isAlive) newPlayers[p.id] = addEffect(p, invuln) as Player;
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🗿 BASTIÃO ETERNO! Grupo invulnerável por 3 turnos!`, 'level_up'));
      result.statePatches = { monsters: newMonsters, players: newPlayers };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── DRUID ────────────────────────────────────────────────
export const DRUID_SKILLS: Skill[] = [
  {
    id: 'druid_thorns',
    name: 'Espinhos', emoji: '🌿', mpCost: 0,
    description: '+6 dano da natureza.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 6 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🌿 ${ctx.caster.name} Espinhos! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'druid_natural_heal',
    name: 'Cura Natural', emoji: '🍃', mpCost: 15,
    description: 'Cura 40HP em aliado escolhido.',
    target: 'ally', category: 'support',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Player;
      const healed = Math.min(target.maxHp - target.hp, 40);
      result.heals.push({ unitId: target.id, amount: healed });
      result.logEntries.push(makeLog(ctx.state.turn, `🍃 ${ctx.caster.name} cura ${target.name}! +${healed} HP.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [target.id]: { ...target, hp: target.hp + healed } } };
      return result;
    },
  },
  {
    id: 'druid_regen',
    name: 'Regenerar', emoji: '♻️', mpCost: 20,
    description: '+15HP/turno por 4 turnos em aliado.',
    target: 'ally', category: 'support',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Player;
      const regen: StatusEffect = { type: 'regenerating', turnsLeft: 4, value: 15, sourceId: ctx.caster.id };
      result.effectsApplied.push({ unitId: target.id, effect: regen });
      const newTarget = addEffect(target, regen) as Player;
      result.logEntries.push(makeLog(ctx.state.turn, `♻️ ${ctx.caster.name} Regenerar! ${target.name} +15HP/t por 4 turnos.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [target.id]: newTarget } };
      return result;
    },
  },
  {
    id: 'druid_circle_of_life',
    name: 'Círculo da Vida', emoji: '🌸', mpCost: 55,
    description: 'Cura 50HP em TODOS os aliados vivos.',
    target: 'ally_aoe', category: 'support',
    execute(ctx) {
      const result = emptyResult();
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (!p.isAlive) return;
        const healed = Math.min(p.maxHp - p.hp, 50);
        newPlayers[p.id] = { ...p, hp: p.hp + healed };
        result.heals.push({ unitId: p.id, amount: healed });
        if (healed > 0) result.logEntries.push(makeLog(ctx.state.turn, `🌸 ${p.name} +${healed} HP!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌸 ${ctx.caster.name} Círculo da Vida! Cura 50HP em todos!`, 'player_action'));
      result.statePatches = { players: newPlayers };
      return result;
    },
  },
  {
    id: 'druid_entangle',
    name: 'Raiz Presa', emoji: '🌱', mpCost: 25,
    description: 'Enraíza e atordoa o alvo por 2 turnos.',
    target: 'enemy', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const stun: StatusEffect = { type: 'stunned', turnsLeft: 2, value: 0, sourceId: ctx.caster.id };
      result.effectsApplied.push({ unitId: target.id, effect: stun });
      const newM = addEffect(target, stun) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `🌱 ${ctx.caster.name} Raiz Presa! ${target.name} atordoado por 2 turnos!`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      return result;
    },
  },
  {
    id: 'druid_forest_storm',
    name: 'Tempestade da Floresta', emoji: '🍂', mpCost: 40,
    description: '+14 dano em área + veneno (8/t 3t) em todos.',
    target: 'enemy_aoe', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 14, defMult: BALANCE.DEF_MULT_AOE });
        const poison: StatusEffect = { type: 'poisoned', turnsLeft: 3, value: 8, sourceId: ctx.caster.id };
        result.damages.push({ unitId: enemy.id, amount: damage });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = addEffect({ ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) }, poison) as Monster;
        result.logEntries.push(makeLog(ctx.state.turn, `🍂 ${enemy.name}: ${damage} dano + veneno!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🍂 ${ctx.caster.name} Tempestade da Floresta!`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'druid_ult',
    name: 'RENASCIMENTO DA TERRA', emoji: '🌍', mpCost: 100,
    description: '🌍 ULT: Cura e ressuscita todos os aliados. (Nv.3)',
    target: 'ally_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'druid',
      ultName: 'RENASCIMENTO DA TERRA',
      ultLines: ['A terra pulsa com energia ancestral...', 'A natureza responde ao chamado...', 'RENASCIMENTO DA TERRA!'],
      ultColor: '#27ae60', ultBg: 'radial-gradient(ellipse, #001a08 0%, #000503 70%)',
      ultEmoji: '🌍',
    },
    execute(ctx) {
      const result = emptyResult();
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (!p.isAlive) {
          const revHp = Math.floor(p.maxHp * 0.5);
          newPlayers[p.id] = { ...p, isAlive: true, hp: revHp };
          result.logEntries.push(makeLog(ctx.state.turn, `✝️ ${p.name} ressuscita com ${revHp} HP!`, 'player_action'));
        } else {
          const healed = Math.min(p.maxHp - p.hp, 80);
          newPlayers[p.id] = { ...p, hp: p.hp + healed };
          result.heals.push({ unitId: p.id, amount: healed });
          if (healed > 0) result.logEntries.push(makeLog(ctx.state.turn, `🌍 ${p.name} +${healed} HP!`, 'player_action'));
        }
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌍 RENASCIMENTO DA TERRA! Natureza cura e ressuscita todos!`, 'level_up'));
      result.statePatches = { players: newPlayers };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── BARD ─────────────────────────────────────────────────
export const BARD_SKILLS: Skill[] = [
  {
    id: 'bard_sharp_note',
    name: 'Nota Cortante', emoji: '🎵', mpCost: 0,
    description: '+6 dano sonoro.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 6 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🎵 ${ctx.caster.name} Nota Cortante! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'bard_healing_song',
    name: 'Canção de Cura', emoji: '🎶', mpCost: 15,
    description: 'Cura 30HP em aliado escolhido.',
    target: 'ally', category: 'support',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Player;
      const healed = Math.min(target.maxHp - target.hp, 30);
      result.heals.push({ unitId: target.id, amount: healed });
      result.logEntries.push(makeLog(ctx.state.turn, `🎶 ${ctx.caster.name} Canção de Cura! ${target.name} +${healed} HP.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [target.id]: { ...target, hp: target.hp + healed } } };
      return result;
    },
  },
  {
    id: 'bard_inspire',
    name: 'Melodia Inspiradora', emoji: '🎸', mpCost: 20,
    description: '+5 ATK para TODOS do grupo por 3 turnos.',
    target: 'ally_aoe', category: 'buff', synergyTag: 'inspire',
    execute(ctx) {
      const result = emptyResult();
      const buff: StatusEffect = { type: 'empowered', turnsLeft: 3, value: 5, sourceId: ctx.caster.id };
      const inspireBuff: StatusEffect = { type: 'inspired', turnsLeft: 3, value: 1, sourceId: ctx.caster.id };
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (p.isAlive) {
          let newP = addEffect(p, buff) as Player;
          newP = addEffect(newP, inspireBuff) as Player;
          newPlayers[p.id] = newP;
          result.effectsApplied.push({ unitId: p.id, effect: buff });
        }
      });
      result.logEntries.push(makeLog(ctx.state.turn, `🎸 ${ctx.caster.name} Melodia Inspiradora! TODOS +5 ATK + inspirados!`, 'player_action'));
      result.statePatches = { players: newPlayers };
      return result;
    },
  },
  {
    id: 'bard_epic_ballad',
    name: 'Balada Épica', emoji: '🎺', mpCost: 60,
    description: '+7 ATK, +7 DEF e +30HP para TODOS do grupo.',
    target: 'ally_aoe', category: 'support',
    execute(ctx) {
      const result = emptyResult();
      const atkBuff: StatusEffect = { type: 'empowered', turnsLeft: 3, value: 7, sourceId: ctx.caster.id };
      const defBuff: StatusEffect = { type: 'fortified', turnsLeft: 3, value: 7, sourceId: ctx.caster.id };
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (!p.isAlive) return;
        const healed = Math.min(p.maxHp - p.hp, 30);
        let newP = addEffect(p, atkBuff) as Player;
        newP = addEffect(newP, defBuff) as Player;
        newPlayers[p.id] = { ...newP, hp: newP.hp + healed };
        result.heals.push({ unitId: p.id, amount: healed });
        result.logEntries.push(makeLog(ctx.state.turn, `🎺 ${p.name}: +7ATK +7DEF +${healed}HP!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🎺 ${ctx.caster.name} Balada Épica!`, 'player_action'));
      result.statePatches = { players: newPlayers };
      return result;
    },
  },
  {
    id: 'bard_dissonance',
    name: 'Dissonância', emoji: '📯', mpCost: 25,
    description: '+10 dano em todos (40% chance atordoar).',
    target: 'enemy_aoe', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 10, defMult: BALANCE.DEF_MULT_AOE });
        result.damages.push({ unitId: enemy.id, amount: damage });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) {
          let newM = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
          if (Math.random() < 0.4) {
            const stun: StatusEffect = { type: 'stunned', turnsLeft: 1, value: 0, sourceId: ctx.caster.id };
            newM = addEffect(newM, stun) as Monster;
            result.logEntries.push(makeLog(ctx.state.turn, `📯 ${enemy.name}: ${damage} dano + atordoado!`, 'player_action'));
          } else {
            result.logEntries.push(makeLog(ctx.state.turn, `📯 ${enemy.name}: ${damage} dano!`, 'player_action'));
          }
          newMonsters[idx] = newM;
        }
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `📯 ${ctx.caster.name} Dissonância!`, 'player_action'));
      result.statePatches = { monsters: newMonsters };
      return result;
    },
  },
  {
    id: 'bard_death_song',
    name: 'Canção da Morte', emoji: '🎻', mpCost: 45,
    description: '+22 dano letal.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 22 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🎻 ${ctx.caster.name} Canção da Morte! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'bard_ult',
    name: 'SINFONIA DO APOCALIPSE', emoji: '🎼', mpCost: 100,
    description: '🎼 ULT: Dano + TODOS os buffs máximos. (Nv.3)',
    target: 'enemy_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'bard',
      ultName: 'SINFONIA DO APOCALIPSE',
      ultLines: ['Uma melodia que rasga o mundo...', 'Toda criação treme com o som...', 'SINFONIA DO APOCALIPSE!'],
      ultColor: '#d35400', ultBg: 'radial-gradient(ellipse, #1a0800 0%, #060200 70%)',
      ultEmoji: '🎼',
    },
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 40, defMult: BALANCE.DEF_MULT_AOE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: true });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `🎼 ${enemy.name}: ${damage} dano!`, 'player_action'));
      });
      // Mega buff group
      const atkBuff: StatusEffect = { type: 'empowered', turnsLeft: 4, value: 12, sourceId: ctx.caster.id };
      const defBuff: StatusEffect = { type: 'fortified', turnsLeft: 4, value: 12, sourceId: ctx.caster.id };
      const regen: StatusEffect = { type: 'regenerating', turnsLeft: 3, value: 20, sourceId: ctx.caster.id };
      const inspire: StatusEffect = { type: 'inspired', turnsLeft: 4, value: 1, sourceId: ctx.caster.id };
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (!p.isAlive) return;
        const healed = Math.min(p.maxHp - p.hp, 60);
        let newP = addEffect(p, atkBuff) as Player;
        newP = addEffect(newP, defBuff) as Player;
        newP = addEffect(newP, regen) as Player;
        newP = addEffect(newP, inspire) as Player;
        newPlayers[p.id] = { ...newP, hp: newP.hp + healed };
        result.heals.push({ unitId: p.id, amount: healed });
        result.logEntries.push(makeLog(ctx.state.turn, `🎼 ${p.name}: +12ATK +12DEF +${healed}HP +regen!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🎼 SINFONIA DO APOCALIPSE! Dano + buffs máximos!`, 'level_up'));
      result.statePatches = { monsters: newMonsters, players: newPlayers };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── ANIMALIST ────────────────────────────────────────────
export const ANIMALIST_SKILLS: Skill[] = [
  {
    id: 'animalist_bite',
    name: 'Mordida Selvagem', emoji: '🦷', mpCost: 0,
    description: '+5 dano de mordida.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 5 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🦷 ${ctx.caster.name} Mordida! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'animalist_wolf',
    name: 'Invocar Lobo', emoji: '🐺', mpCost: 20,
    description: 'Lobo da Matilha [ATK duplo, 4 turnos].',
    target: 'none', category: 'summon',
    execute(ctx) {
      const result = emptyResult();
      if (ctx.caster.summonCount >= 3) {
        result.logEntries.push(makeLog(ctx.state.turn, `❌ ${ctx.caster.name}: máximo de 3 animais!`, 'system'));
        return result;
      }
      const newCaster: Player = { ...ctx.caster, summonCount: ctx.caster.summonCount + 1 };
      result.logEntries.push(makeLog(ctx.state.turn, `🐺 ${ctx.caster.name} invoca um Lobo! [${newCaster.summonCount}/3]`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      (result as any).pendingSummon = { type: 'animal', templateId: 'wolf_summon', ownerId: ctx.caster.id };
      return result;
    },
  },
  {
    id: 'animalist_bear',
    name: 'Invocar Urso', emoji: '🐻', mpCost: 25,
    description: 'Urso Guardião [Provoca inimigos, tanque, 4 turnos].',
    target: 'none', category: 'summon',
    execute(ctx) {
      const result = emptyResult();
      if (ctx.caster.summonCount >= 3) {
        result.logEntries.push(makeLog(ctx.state.turn, `❌ ${ctx.caster.name}: máximo de 3 animais!`, 'system'));
        return result;
      }
      const newCaster: Player = { ...ctx.caster, summonCount: ctx.caster.summonCount + 1 };
      result.logEntries.push(makeLog(ctx.state.turn, `🐻 ${ctx.caster.name} invoca um Urso! [${newCaster.summonCount}/3]`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      (result as any).pendingSummon = { type: 'animal', templateId: 'bear_summon', ownerId: ctx.caster.id };
      return result;
    },
  },
  {
    id: 'animalist_stag',
    name: 'Invocar Cervo', emoji: '🦌', mpCost: 28,
    description: 'Cervo Sagrado [Cura aliado com menos HP por turno].',
    target: 'none', category: 'summon',
    execute(ctx) {
      const result = emptyResult();
      if (ctx.caster.summonCount >= 3) {
        result.logEntries.push(makeLog(ctx.state.turn, `❌ ${ctx.caster.name}: máximo de 3 animais!`, 'system'));
        return result;
      }
      const newCaster: Player = { ...ctx.caster, summonCount: ctx.caster.summonCount + 1 };
      result.logEntries.push(makeLog(ctx.state.turn, `🦌 ${ctx.caster.name} invoca um Cervo! [${newCaster.summonCount}/3]`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      (result as any).pendingSummon = { type: 'animal', templateId: 'stag_summon', ownerId: ctx.caster.id };
      return result;
    },
  },
  {
    id: 'animalist_boar',
    name: 'Invocar Javali', emoji: '🐗', mpCost: 30,
    description: 'Javali de Guerra [Buffa +4 ATK em todos por turno].',
    target: 'none', category: 'summon',
    execute(ctx) {
      const result = emptyResult();
      if (ctx.caster.summonCount >= 3) {
        result.logEntries.push(makeLog(ctx.state.turn, `❌ ${ctx.caster.name}: máximo de 3 animais!`, 'system'));
        return result;
      }
      const newCaster: Player = { ...ctx.caster, summonCount: ctx.caster.summonCount + 1 };
      result.logEntries.push(makeLog(ctx.state.turn, `🐗 ${ctx.caster.name} invoca um Javali! [${newCaster.summonCount}/3]`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      (result as any).pendingSummon = { type: 'animal', templateId: 'boar_summon', ownerId: ctx.caster.id };
      return result;
    },
  },
  {
    id: 'animalist_beast',
    name: 'Invocar Fera', emoji: '🐆', mpCost: 40,
    description: 'Fera Selvagem [80% pierce + veneno a cada golpe].',
    target: 'none', category: 'summon',
    execute(ctx) {
      const result = emptyResult();
      if (ctx.caster.summonCount >= 3) {
        result.logEntries.push(makeLog(ctx.state.turn, `❌ ${ctx.caster.name}: máximo de 3 animais!`, 'system'));
        return result;
      }
      const newCaster: Player = { ...ctx.caster, summonCount: ctx.caster.summonCount + 1 };
      result.logEntries.push(makeLog(ctx.state.turn, `🐆 ${ctx.caster.name} invoca uma Fera! [${newCaster.summonCount}/3]`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      (result as any).pendingSummon = { type: 'animal', templateId: 'beast_summon', ownerId: ctx.caster.id };
      return result;
    },
  },
  {
    id: 'animalist_ult',
    name: 'TEMPESTADE ANIMAL', emoji: '🌿', mpCost: 100,
    description: '🐾 ULT: +30 dano em TODOS + invoca 3 aliados. (Nv.3)',
    target: 'enemy_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'animalist',
      ultName: 'TEMPESTADE ANIMAL',
      ultLines: ['O animalista chama todos os seres da floresta...', 'Uma maré de dentes, garras e chifres...', 'TEMPESTADE ANIMAL!'],
      ultColor: '#a0522d', ultBg: 'radial-gradient(ellipse, #1a0f00 0%, #050200 70%)',
      ultEmoji: '🌿',
    },
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 30, defMult: BALANCE.DEF_MULT_AOE });
        result.damages.push({ unitId: enemy.id, amount: damage });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `🌿 ${enemy.name}: ${damage} dano!`, 'player_action'));
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌿 TEMPESTADE ANIMAL! Maré de criaturas!`, 'level_up'));
      // Signal engine to spawn 3 animals
      const newCaster = { ...ctx.caster, summonCount: Math.min(3, ctx.caster.summonCount) };
      result.statePatches = { monsters: newMonsters, players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      (result as any).pendingSummon = { type: 'animal_ult', ownerId: ctx.caster.id };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── SHAMAN ───────────────────────────────────────────────
export const SHAMAN_SKILLS: Skill[] = [
  {
    id: 'shaman_spirit_strike',
    name: 'Golpe Espiritual', emoji: '🌀', mpCost: 5,
    description: '+8 dano + ganha 1 Carga (máx 5). Cada carga = +3 ATK efetivo.',
    target: 'enemy', category: 'attack', synergyTag: 'spirit',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const stacks = ctx.caster.spiritStacks;
      const stackBonus = stacks * 3;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 8 + stackBonus });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      const newStacks = Math.min(BALANCE.SPIRIT_MAX_STACKS, stacks + 1);
      const newCaster: Player = { ...ctx.caster, spiritStacks: newStacks };
      result.logEntries.push(makeLog(ctx.state.turn, `🌀 ${ctx.caster.name} Golpe Espiritual! ${damage} dano${crit ? ' CRÍTICO!' : ''} + Carga [${newStacks}/5]`, 'player_action'));
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
    description: 'Libera todas as cargas: (12 + 40% ATK) × cargas em TODOS.',
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
      result.logEntries.unshift(makeLog(ctx.state.turn, `💫 ${ctx.caster.name} libera ${stacks} Cargas! ${dmgPerStack * stacks} dano base em TODOS!`, stacks === 5 ? 'level_up' : 'player_action'));
      result.statePatches = {
        monsters: newMonsters,
        players: { ...ctx.state.players, [ctx.caster.id]: newCaster },
      };
      return result;
    },
  },
  {
    id: 'shaman_ancestral_heal',
    name: 'Cura Ancestral', emoji: '🌿', mpCost: 18,
    description: 'Cura 40HP em aliado. Se 3+ cargas, +40HP extra.',
    target: 'ally', category: 'support', synergyTag: 'spirit',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Player;
      const stacks = ctx.caster.spiritStacks;
      const healAmount = 40 + (stacks >= 3 ? 40 : 0);
      const healed = Math.min(target.maxHp - target.hp, healAmount);
      result.heals.push({ unitId: target.id, amount: healed });
      const newTarget = { ...target, hp: target.hp + healed };
      result.logEntries.push(makeLog(ctx.state.turn, `🌿 ${ctx.caster.name} cura ${target.name}! +${healed} HP${stacks >= 3 ? ' (BÔNUS de Cargas!)' : ''}`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [target.id]: newTarget } };
      return result;
    },
  },
  {
    id: 'shaman_spirit_curse',
    name: 'Maldição dos Espíritos', emoji: '👁️', mpCost: 22,
    description: '-6 DEF e -4 ATK no alvo por 4 turnos.',
    target: 'enemy', category: 'magic',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const curse: StatusEffect = { type: 'cursed', turnsLeft: 4, value: 6, sourceId: ctx.caster.id };
      result.effectsApplied.push({ unitId: target.id, effect: curse });
      const newM = addEffect(target, curse) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `👁️ ${ctx.caster.name} amaldiçoa ${target.name}! -6 DEF, -4 ATK por 4 turnos.`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      return result;
    },
  },
  {
    id: 'shaman_totem',
    name: 'Totem de Cura', emoji: '🏺', mpCost: 25,
    description: '+14 HP/turno por 4 turnos em aliado. Cargas potencializam regen.',
    target: 'ally', category: 'support', synergyTag: 'spirit',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Player;
      const stacks = ctx.caster.spiritStacks;
      const regenValue = 14 + stacks * 2;
      const regen: StatusEffect = { type: 'regenerating', turnsLeft: 4, value: regenValue, sourceId: ctx.caster.id };
      result.effectsApplied.push({ unitId: target.id, effect: regen });
      const newTarget = addEffect(target, regen) as Player;
      result.logEntries.push(makeLog(ctx.state.turn, `🏺 ${ctx.caster.name} Totem em ${target.name}! +${regenValue} HP/turno por 4t${stacks > 0 ? ` (${stacks}× cargas bônus)` : ''}`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [target.id]: newTarget } };
      return result;
    },
  },
  {
    id: 'shaman_ancestor_wrath',
    name: 'Raiva Ancestral', emoji: '⚡', mpCost: 35,
    description: '+22 dano espiritual em TODOS. Cargas aumentam dano (+5/carga).',
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
    description: '🌀 ULT: Explosão espiritual em todos + cura o grupo. (Nv.3)',
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
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌌 CONVERGÊNCIA ESPIRITUAL! ${ctx.caster.name} libera TUDO (${stacks} cargas) + cura o grupo!`, 'level_up'));
      result.statePatches = { monsters: newMonsters, players: newPlayers };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── TRICKSTER ────────────────────────────────────────────
export const TRICKSTER_SKILLS: Skill[] = [
  {
    id: 'trickster_illusion_blade',
    name: 'Faca Ilusória', emoji: '🃏', mpCost: 0,
    description: '+7 dano ilusório.',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 7 });
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.logEntries.push(makeLog(ctx.state.turn, `🃏 ${ctx.caster.name} Faca Ilusória! ${damage} dano${crit ? ' CRÍTICO!' : ''}`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - damage) } : m) };
      return result;
    },
  },
  {
    id: 'trickster_smoke_curtain',
    name: 'Cortina de Fumaça', emoji: '💨', mpCost: 15,
    description: 'Esquiva dos próximos 2 ataques.',
    target: 'self', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const dodge: StatusEffect = { type: 'invisible', turnsLeft: 2, value: 2, sourceId: ctx.caster.id };
      const newCaster = addEffect(ctx.caster, dodge) as Player;
      result.effectsApplied.push({ unitId: ctx.caster.id, effect: dodge });
      result.logEntries.push(makeLog(ctx.state.turn, `💨 ${ctx.caster.name} Cortina de Fumaça! Esquiva por 2 ataques.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'trickster_clone',
    name: 'Clone Ilusório', emoji: '👤', mpCost: 30,
    description: 'Clone absorve 1 golpe e reflete 80% por 3 turnos.',
    target: 'self', category: 'buff',
    execute(ctx) {
      const result = emptyResult();
      const clone: StatusEffect = { type: 'cloned', turnsLeft: 3, value: 3, sourceId: ctx.caster.id };
      const newCaster = addEffect(ctx.caster, clone) as Player;
      result.effectsApplied.push({ unitId: ctx.caster.id, effect: clone });
      result.logEntries.push(makeLog(ctx.state.turn, `👤 ${ctx.caster.name} Clone Ilusório! Absorve 1 golpe e reflete 80% por 3 turnos.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
      return result;
    },
  },
  {
    id: 'trickster_position_swap',
    name: 'Troca de Lugar', emoji: '🔄', mpCost: 20,
    description: 'Aliado ganha 2 esquivas por 2 turnos.',
    target: 'ally', category: 'support',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Player;
      const dodge: StatusEffect = { type: 'invisible', turnsLeft: 2, value: 2, sourceId: ctx.caster.id };
      const newTarget = addEffect(target, dodge) as Player;
      result.effectsApplied.push({ unitId: target.id, effect: dodge });
      result.logEntries.push(makeLog(ctx.state.turn, `🔄 ${ctx.caster.name} Troca de Lugar com ${target.name}! ${target.name} ganha 2 esquivas.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [target.id]: newTarget } };
      return result;
    },
  },
  {
    id: 'trickster_illusion_strength',
    name: 'Ilusão de Força', emoji: '💪', mpCost: 25,
    description: 'Aliado ganha +8 ATK e 2 esquivas por 2 turnos.',
    target: 'ally', category: 'support',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Player;
      const atkBuff: StatusEffect = { type: 'empowered', turnsLeft: 2, value: 8, sourceId: ctx.caster.id };
      const dodge: StatusEffect = { type: 'invisible', turnsLeft: 2, value: 2, sourceId: ctx.caster.id };
      let newTarget = addEffect(target, atkBuff) as Player;
      newTarget = addEffect(newTarget, dodge) as Player;
      result.effectsApplied.push({ unitId: target.id, effect: atkBuff });
      result.logEntries.push(makeLog(ctx.state.turn, `💪 ${ctx.caster.name} Ilusão de Força em ${target.name}! +8 ATK + 2 esquivas.`, 'player_action'));
      result.statePatches = { players: { ...ctx.state.players, [target.id]: newTarget } };
      return result;
    },
  },
  {
    id: 'trickster_double_fake',
    name: 'Duplo Falso', emoji: '👥', mpCost: 35,
    description: '+20 dano + marca alvo (×2 dano por 3 turnos).',
    target: 'enemy', category: 'attack',
    execute(ctx) {
      const result = emptyResult();
      const target = ctx.target as Monster;
      const { damage, isCrit: crit } = dealDamage(ctx, target, { bonus: 20 });
      const mark: StatusEffect = { type: 'marked', turnsLeft: 3, value: 2.0, sourceId: ctx.caster.id };
      result.damages.push({ unitId: target.id, amount: damage, isCrit: crit });
      result.effectsApplied.push({ unitId: target.id, effect: mark });
      const newM = addEffect({ ...target, hp: Math.max(0, target.hp - damage) }, mark) as Monster;
      result.logEntries.push(makeLog(ctx.state.turn, `👥 ${ctx.caster.name} Duplo Falso! ${damage} dano + ${target.name} marcado (×2 dano)!`, 'player_action'));
      result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? newM : m) };
      return result;
    },
  },
  {
    id: 'trickster_ult',
    name: 'ILUSÃO TOTAL', emoji: '🌈', mpCost: 100,
    description: '🃏 ULT: 55 dano em todos + grupo recebe clone por 2 turnos. (Nv.3)',
    target: 'enemy_aoe', category: 'ultimate', isUlt: true, ultLevel: 3,
    ultData: {
      playerId: '', playerName: '', classType: 'trickster',
      ultName: 'ILUSÃO TOTAL',
      ultLines: ['O ilusionista duplica a realidade...', 'Mil versões dele atacam ao mesmo tempo...', 'ILUSÃO TOTAL!'],
      ultColor: '#da70d6', ultBg: 'radial-gradient(ellipse, #1a001a 0%, #050005 70%)',
      ultEmoji: '🌈',
    },
    execute(ctx) {
      const result = emptyResult();
      const aliveEnemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = [...ctx.state.monsters];
      aliveEnemies.forEach(enemy => {
        const { damage } = dealDamage(ctx, enemy, { bonus: 55, defMult: BALANCE.DEF_MULT_AOE });
        result.damages.push({ unitId: enemy.id, amount: damage, isCrit: true });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - damage) };
        result.logEntries.push(makeLog(ctx.state.turn, `🌈 ${enemy.name}: ${damage} dano!`, 'player_action'));
      });
      // Clone for whole group
      const clone: StatusEffect = { type: 'cloned', turnsLeft: 2, value: 2, sourceId: ctx.caster.id };
      const newPlayers = { ...ctx.state.players };
      Object.values(newPlayers).forEach(p => {
        if (p.isAlive) newPlayers[p.id] = addEffect(p, clone) as Player;
      });
      result.logEntries.unshift(makeLog(ctx.state.turn, `🌈 ILUSÃO TOTAL! Dano em todos + grupo tem clone por 2 turnos!`, 'level_up'));
      result.statePatches = { monsters: newMonsters, players: newPlayers };
      result.triggerUltCutscene = { ...this.ultData!, playerId: ctx.caster.id, playerName: ctx.caster.name, classType: ctx.caster.classType };
      return result;
    },
  },
];

// ─── SKILL REGISTRY ───────────────────────────────────────
export const CLASS_SKILLS: Record<ClassType, Skill[]> = {
  warrior:      WARRIOR_SKILLS,
  mage:         MAGE_SKILLS,
  rogue:        ROGUE_SKILLS,
  necromancer:  NECROMANCER_SKILLS,
  paladin:      PALADIN_SKILLS,
  ranger:       RANGER_SKILLS,
  assassin:     ASSASSIN_SKILLS,
  elementalist: ELEMENTALIST_SKILLS,
  berserker:    BERSERKER_SKILLS,
  guardian:     GUARDIAN_SKILLS,
  druid:        DRUID_SKILLS,
  bard:         BARD_SKILLS,
  animalist:    ANIMALIST_SKILLS,
  shaman:       SHAMAN_SKILLS,
  trickster:    TRICKSTER_SKILLS,
};

// ─── Validation helpers ───────────────────────────────────
export function canUseSkill(player: Player, skill: Skill): { ok: boolean; reason?: string } {
  if (player.mp < skill.mpCost) return { ok: false, reason: `MP insuficiente (${player.mp}/${skill.mpCost})` };
  if (skill.isUlt && skill.ultLevel && player.level < skill.ultLevel) {
    return { ok: false, reason: `Nível ${skill.ultLevel} necessário` };
  }
  return { ok: true };
}

export function spendMp(player: Player, cost: number): Player {
  return { ...player, mp: player.mp - cost };
}