// ═══════════════════════════════════════════════════════════
//  src/engine/transformData.ts
//  Dados de transformação por classe (Essência do Deus Antigo)
// ═══════════════════════════════════════════════════════════

import type { ClassType, Skill, SkillContext, SkillResult } from './types';
import { makeLog, emptyResult, calcDamage, rollDice, getEffectiveDef, addEffect, BALANCE } from './utils';
import type { StatusEffect } from './types';

export interface TransformData {
  name: string;
  emoji: string;
  atkMultiplier: number;
  defMultiplier: number;
  hpBonus: number;
  duration: number;
  ultColor: string;
  skillOverrides: Skill[];
}

export const TRANSFORMS: Record<ClassType, TransformData> = {
  warrior: {
    name: 'Colosso Divino',
    emoji: '⚡',
    atkMultiplier: 2.2,
    defMultiplier: 2.0,
    hpBonus: 80,
    duration: 6,
    ultColor: '#e74c3c',
    skillOverrides: [
      {
        id: 'transform_warrior_smash',
        name: 'Golpe do Titã', emoji: '⚡', mpCost: 0,
        description: 'Golpe devastador que ignora defesa.',
        target: 'enemy', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const target = ctx.target as any;
          const roll = rollDice();
          const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 30, targetDef: 0, roll });
          result.logEntries.push(makeLog(ctx.state.turn, `⚡ ${ctx.caster.name} GOLPE DO TITÃ! ${dmg} dano (DEF=0)!`, 'player_action'));
          result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - dmg) } : m) };
          result.damages.push({ unitId: target.id, amount: dmg, isCrit: true });
          return result;
        },
      },
      {
        id: 'transform_warrior_aoe',
        name: 'Devastação Total', emoji: '🌋', mpCost: 20,
        description: 'Dano massivo em todos os inimigos.',
        target: 'enemy_aoe', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            const roll = rollDice();
            const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 20, targetDef: Math.floor(enemy.defense * 0.2), roll });
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
            result.logEntries.push(makeLog(ctx.state.turn, `🌋 ${enemy.name}: ${dmg} dano divino!`, 'player_action'));
            result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: true });
          });
          result.logEntries.unshift(makeLog(ctx.state.turn, `🌋 ${ctx.caster.name} DEVASTAÇÃO TOTAL!`, 'level_up'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
    ],
  },
  mage: {
    name: 'Arcano Supremo',
    emoji: '🌌',
    atkMultiplier: 2.5,
    defMultiplier: 1.2,
    hpBonus: 40,
    duration: 6,
    ultColor: '#9b59b6',
    skillOverrides: [
      {
        id: 'transform_mage_blast',
        name: 'Explosão Primordial', emoji: '🌌', mpCost: 0,
        description: 'Magia pura em todos os inimigos.',
        target: 'enemy_aoe', category: 'magic',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            const roll = rollDice();
            const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 40, targetDef: 0, roll });
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
            result.logEntries.push(makeLog(ctx.state.turn, `🌌 ${enemy.name}: ${dmg} dano arcano!`, 'player_action'));
            result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: true });
          });
          result.logEntries.unshift(makeLog(ctx.state.turn, `🌌 ${ctx.caster.name} EXPLOSÃO PRIMORDIAL!`, 'level_up'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
      {
        id: 'transform_mage_drain',
        name: 'Drenar Essência', emoji: '💜', mpCost: 30,
        description: 'Drena vida de todos os inimigos.',
        target: 'enemy_aoe', category: 'magic',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          let totalDrained = 0;
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            const roll = rollDice();
            const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 20, targetDef: 0, roll });
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
            totalDrained += Math.floor(dmg * 0.3);
            result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: true });
          });
          const healed = Math.min(ctx.caster.maxHp - ctx.caster.hp, totalDrained);
          const newCaster = { ...ctx.caster, hp: ctx.caster.hp + healed };
          result.logEntries.push(makeLog(ctx.state.turn, `💜 ${ctx.caster.name} Drenar Essência! +${healed} HP drenado!`, 'player_action'));
          result.statePatches = { monsters: newMonsters, players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
          result.heals.push({ unitId: ctx.caster.id, amount: healed });
          return result;
        },
      },
    ],
  },
  rogue: {
    name: 'Sombra Absoluta',
    emoji: '🌑',
    atkMultiplier: 2.8,
    defMultiplier: 1.3,
    hpBonus: 30,
    duration: 6,
    ultColor: '#1abc9c',
    skillOverrides: [
      {
        id: 'transform_rogue_strike',
        name: 'Golpe das Sombras', emoji: '🌑', mpCost: 0,
        description: 'Ataque letal que ignora toda defesa.',
        target: 'enemy', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const target = ctx.target as any;
          const roll = rollDice();
          const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 35, targetDef: 0, roll, damageMultiplier: 2 });
          result.logEntries.push(makeLog(ctx.state.turn, `🌑 ${ctx.caster.name} GOLPE DAS SOMBRAS! ${dmg} dano!`, 'player_action'));
          result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - dmg) } : m) };
          result.damages.push({ unitId: target.id, amount: dmg, isCrit: true });
          return result;
        },
      },
      {
        id: 'transform_rogue_vanish',
        name: 'Desaparecer', emoji: '💨', mpCost: 15,
        description: 'Esquiva 3 ataques e reaparece com buff de dano.',
        target: 'self', category: 'buff',
        execute(ctx) {
          const result = emptyResult();
          const dodge: StatusEffect = { type: 'invisible', turnsLeft: 3, value: 3, sourceId: ctx.caster.id };
          const empower: StatusEffect = { type: 'empowered', turnsLeft: 3, value: 15, sourceId: ctx.caster.id };
          let newCaster = addEffect(ctx.caster, dodge) as any;
          newCaster = addEffect(newCaster, empower) as any;
          result.logEntries.push(makeLog(ctx.state.turn, `💨 ${ctx.caster.name} desaparece! 3 esquivas + +15 ATK!`, 'player_action'));
          result.statePatches = { players: { ...ctx.state.players, [ctx.caster.id]: newCaster } };
          return result;
        },
      },
    ],
  },
  necromancer: {
    name: 'Senhor da Morte',
    emoji: '☠️',
    atkMultiplier: 2.3,
    defMultiplier: 1.4,
    hpBonus: 50,
    duration: 6,
    ultColor: '#8e44ad',
    skillOverrides: [
      {
        id: 'transform_necro_death',
        name: 'Toque da Morte', emoji: '☠️', mpCost: 0,
        description: 'Drenagem massiva de vida.',
        target: 'enemy', category: 'magic',
        execute(ctx) {
          const result = emptyResult();
          const target = ctx.target as any;
          const roll = rollDice();
          const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 30, targetDef: 0, roll });
          const healed = Math.min(ctx.caster.maxHp - ctx.caster.hp, Math.floor(dmg * 0.5));
          const newCaster = { ...ctx.caster, hp: ctx.caster.hp + healed };
          result.logEntries.push(makeLog(ctx.state.turn, `☠️ ${ctx.caster.name} TOQUE DA MORTE! ${dmg} dano + ${healed} HP!`, 'player_action'));
          result.statePatches = {
            monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - dmg) } : m),
            players: { ...ctx.state.players, [ctx.caster.id]: newCaster },
          };
          result.damages.push({ unitId: target.id, amount: dmg, isCrit: true });
          result.heals.push({ unitId: ctx.caster.id, amount: healed });
          return result;
        },
      },
      {
        id: 'transform_necro_aoe',
        name: 'Apocalipse Sombrio', emoji: '🌑', mpCost: 40,
        description: 'Dano em todos + maldição permanente.',
        target: 'enemy_aoe', category: 'magic',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            const roll = rollDice();
            const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 25, targetDef: 0, roll });
            const curse: StatusEffect = { type: 'cursed', turnsLeft: 5, value: 8, sourceId: ctx.caster.id };
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) newMonsters[idx] = addEffect({ ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) }, curse) as any;
            result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: true });
          });
          result.logEntries.push(makeLog(ctx.state.turn, `🌑 ${ctx.caster.name} APOCALIPSE SOMBRIO!`, 'level_up'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
    ],
  },
  paladin: {
    name: 'Campeão Sagrado',
    emoji: '⚡',
    atkMultiplier: 2.0,
    defMultiplier: 2.5,
    hpBonus: 100,
    duration: 6,
    ultColor: '#f39c12',
    skillOverrides: [
      {
        id: 'transform_paladin_smite',
        name: 'Julgamento Divino', emoji: '⚡', mpCost: 0,
        description: 'Ataque sagrado + cura o grupo.',
        target: 'enemy', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const target = ctx.target as any;
          const roll = rollDice();
          const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 25, targetDef: 0, roll });
          const newPlayers = { ...ctx.state.players };
          Object.values(newPlayers).forEach(p => {
            if (p.isAlive) {
              const h = Math.min(p.maxHp - p.hp, 20);
              newPlayers[p.id] = { ...p, hp: p.hp + h };
              result.heals.push({ unitId: p.id, amount: h });
            }
          });
          result.logEntries.push(makeLog(ctx.state.turn, `⚡ ${ctx.caster.name} JULGAMENTO DIVINO! ${dmg} dano + grupo curado!`, 'player_action'));
          result.statePatches = {
            monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - dmg) } : m),
            players: newPlayers,
          };
          result.damages.push({ unitId: target.id, amount: dmg, isCrit: true });
          return result;
        },
      },
      {
        id: 'transform_paladin_heal',
        name: 'Cura Divina Total', emoji: '💛', mpCost: 30,
        description: 'Cura massiva e ressuscita aliados.',
        target: 'ally_aoe', category: 'support',
        execute(ctx) {
          const result = emptyResult();
          const newPlayers = { ...ctx.state.players };
          Object.values(newPlayers).forEach(p => {
            if (!p.isAlive) {
              const revHp = Math.floor(p.maxHp * 0.6);
              newPlayers[p.id] = { ...p, isAlive: true, hp: revHp };
              result.logEntries.push(makeLog(ctx.state.turn, `💛 ${p.name} ressuscita com ${revHp} HP!`, 'player_action'));
            } else {
              const h = Math.min(p.maxHp - p.hp, 80);
              newPlayers[p.id] = { ...p, hp: p.hp + h };
              result.heals.push({ unitId: p.id, amount: h });
            }
          });
          result.logEntries.unshift(makeLog(ctx.state.turn, `💛 ${ctx.caster.name} CURA DIVINA TOTAL!`, 'level_up'));
          result.statePatches = { players: newPlayers };
          return result;
        },
      },
    ],
  },
  ranger: {
    name: 'Caçador Lendário',
    emoji: '🦅',
    atkMultiplier: 2.4,
    defMultiplier: 1.5,
    hpBonus: 40,
    duration: 6,
    ultColor: '#3498db',
    skillOverrides: [
      {
        id: 'transform_ranger_shot',
        name: 'Tiro Divino', emoji: '🦅', mpCost: 0,
        description: 'Flecha que ignora toda defesa.',
        target: 'enemy', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const target = ctx.target as any;
          const roll = rollDice();
          const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 35, targetDef: 0, roll });
          result.logEntries.push(makeLog(ctx.state.turn, `🦅 ${ctx.caster.name} TIRO DIVINO! ${dmg} dano!`, 'player_action'));
          result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - dmg) } : m) };
          result.damages.push({ unitId: target.id, amount: dmg, isCrit: true });
          return result;
        },
      },
      {
        id: 'transform_ranger_storm',
        name: 'Tempestade de Flechas', emoji: '🌪️', mpCost: 30,
        description: 'Ataca TODOS + atordoa.',
        target: 'enemy_aoe', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            const roll = rollDice();
            const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 20, targetDef: 0, roll });
            const stun: StatusEffect = { type: 'stunned', turnsLeft: 1, value: 0, sourceId: ctx.caster.id };
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) newMonsters[idx] = addEffect({ ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) }, stun) as any;
            result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: true });
          });
          result.logEntries.push(makeLog(ctx.state.turn, `🌪️ ${ctx.caster.name} TEMPESTADE DE FLECHAS! Todos atordoados!`, 'level_up'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
    ],
  },
  assassin: {
    name: 'Morte Encarnada',
    emoji: '🌑',
    atkMultiplier: 3.0,
    defMultiplier: 1.2,
    hpBonus: 20,
    duration: 6,
    ultColor: '#2c3e50',
    skillOverrides: [
      {
        id: 'transform_assassin_kill',
        name: 'Execução Perfeita', emoji: '🌑', mpCost: 0,
        description: '4x dano, ignora toda defesa.',
        target: 'enemy', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const target = ctx.target as any;
          const roll = rollDice();
          const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 20, targetDef: 0, roll, damageMultiplier: 4 });
          result.logEntries.push(makeLog(ctx.state.turn, `🌑 ${ctx.caster.name} EXECUÇÃO PERFEITA! ${dmg} dano (4×)!`, 'player_action'));
          result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - dmg) } : m) };
          result.damages.push({ unitId: target.id, amount: dmg, isCrit: true });
          return result;
        },
      },
      {
        id: 'transform_assassin_mark_all',
        name: 'Marca da Morte', emoji: '💀', mpCost: 20,
        description: 'Marca todos os inimigos (+100% dano).',
        target: 'enemy_aoe', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            const mark: StatusEffect = { type: 'marked', turnsLeft: 3, value: 2.0, sourceId: ctx.caster.id };
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) newMonsters[idx] = addEffect(newMonsters[idx], mark) as any;
          });
          result.logEntries.push(makeLog(ctx.state.turn, `💀 ${ctx.caster.name} MARCA DA MORTE em todos! (+100% dano)`, 'player_action'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
    ],
  },
  elementalist: {
    name: 'Avatar Elemental',
    emoji: '🌀',
    atkMultiplier: 2.6,
    defMultiplier: 1.3,
    hpBonus: 30,
    duration: 6,
    ultColor: '#e67e22',
    skillOverrides: [
      {
        id: 'transform_elem_nova',
        name: 'Nova Elemental', emoji: '🌀', mpCost: 0,
        description: 'Explosão de todos os elementos em todos.',
        target: 'enemy_aoe', category: 'magic',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            const roll = rollDice();
            const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 35, targetDef: 0, roll });
            const slow: StatusEffect = { type: 'slowed', turnsLeft: 2, value: 0.5, sourceId: ctx.caster.id };
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) newMonsters[idx] = addEffect({ ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) }, slow) as any;
            result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: true });
          });
          result.logEntries.push(makeLog(ctx.state.turn, `🌀 ${ctx.caster.name} NOVA ELEMENTAL! Todos lentos!`, 'level_up'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
      {
        id: 'transform_elem_chain',
        name: 'Raio Encadeado', emoji: '⚡', mpCost: 25,
        description: 'Raio que salta entre todos os inimigos.',
        target: 'enemy_aoe', category: 'magic',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          const enemies = ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon);
          enemies.forEach((enemy, i) => {
            const mult = 1 - i * 0.1;
            const roll = rollDice();
            const dmg = Math.max(1, Math.floor(calcDamage({ attackerAtk: ctx.caster.attack + 28, targetDef: 0, roll }) * mult));
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
            result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: i === 0 });
            result.logEntries.push(makeLog(ctx.state.turn, `⚡ Raio salta em ${enemy.name}: ${dmg} dano!`, 'player_action'));
          });
          result.logEntries.unshift(makeLog(ctx.state.turn, `⚡ ${ctx.caster.name} RAIO ENCADEADO!`, 'player_action'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
    ],
  },
  berserker: {
    name: 'Fúria Primordial',
    emoji: '🩸',
    atkMultiplier: 3.0,
    defMultiplier: 1.0,
    hpBonus: 60,
    duration: 6,
    ultColor: '#c0392b',
    skillOverrides: [
      {
        id: 'transform_berserk_smash',
        name: 'Destruição Total', emoji: '🩸', mpCost: 0,
        description: 'Dano máximo + autoflagelação.',
        target: 'enemy', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const target = ctx.target as any;
          const missingHpPct = 1 - ctx.caster.hp / ctx.caster.maxHp;
          const rage = 1 + missingHpPct * 3;
          const roll = rollDice();
          const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 20, targetDef: 0, roll, damageMultiplier: rage });
          const selfDmg = Math.floor(dmg * 0.05);
          const newCaster = { ...ctx.caster, hp: Math.max(1, ctx.caster.hp - selfDmg) };
          result.logEntries.push(makeLog(ctx.state.turn, `🩸 ${ctx.caster.name} DESTRUIÇÃO TOTAL! ${dmg} dano (×${rage.toFixed(1)}) -${selfDmg} próprio!`, 'player_action'));
          result.statePatches = {
            monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - dmg) } : m),
            players: { ...ctx.state.players, [ctx.caster.id]: newCaster },
          };
          result.damages.push({ unitId: target.id, amount: dmg, isCrit: true });
          return result;
        },
      },
      {
        id: 'transform_berserk_rampage',
        name: 'Carnificina', emoji: '💢', mpCost: 20,
        description: 'Ataca todos múltiplas vezes.',
        target: 'enemy_aoe', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            for (let i = 0; i < 3; i++) {
              const roll = rollDice();
              const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 10, targetDef: 0, roll });
              const idx = newMonsters.findIndex(m => m.id === enemy.id);
              if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
              result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: roll >= 8 });
            }
          });
          result.logEntries.push(makeLog(ctx.state.turn, `💢 ${ctx.caster.name} CARNIFICINA! 3× em todos!`, 'level_up'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
    ],
  },
  guardian: {
    name: 'Bastião Eterno',
    emoji: '🗿',
    atkMultiplier: 1.8,
    defMultiplier: 3.0,
    hpBonus: 150,
    duration: 6,
    ultColor: '#7f8c8d',
    skillOverrides: [
      {
        id: 'transform_guardian_smash',
        name: 'Golpe de Rocha', emoji: '🗿', mpCost: 0,
        description: 'Dano baseado na defesa do Guardião.',
        target: 'enemy', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const target = ctx.target as any;
          const dmg = Math.max(10, ctx.caster.defense * 2);
          result.logEntries.push(makeLog(ctx.state.turn, `🗿 ${ctx.caster.name} GOLPE DE ROCHA! ${dmg} dano (2× DEF)!`, 'player_action'));
          result.statePatches = { monsters: ctx.state.monsters.map(m => m.id === target.id ? { ...m, hp: Math.max(0, m.hp - dmg) } : m) };
          result.damages.push({ unitId: target.id, amount: dmg, isCrit: true });
          return result;
        },
      },
      {
        id: 'transform_guardian_fortress',
        name: 'Fortaleza Divina', emoji: '🏰', mpCost: 20,
        description: 'Grupo se torna invulnerável por 2 turnos.',
        target: 'ally_aoe', category: 'buff',
        execute(ctx) {
          const result = emptyResult();
          const shield: StatusEffect = { type: 'shielded', turnsLeft: 2, value: 99999, sourceId: ctx.caster.id };
          const newPlayers = { ...ctx.state.players };
          Object.values(newPlayers).forEach(p => {
            if (p.isAlive) newPlayers[p.id] = addEffect(p, shield) as any;
          });
          result.logEntries.push(makeLog(ctx.state.turn, `🏰 ${ctx.caster.name} FORTALEZA DIVINA! Grupo invulnerável por 2t!`, 'level_up'));
          result.statePatches = { players: newPlayers };
          return result;
        },
      },
    ],
  },
  druid: {
    name: 'Espírito da Natureza',
    emoji: '🌍',
    atkMultiplier: 1.8,
    defMultiplier: 1.8,
    hpBonus: 80,
    duration: 6,
    ultColor: '#27ae60',
    skillOverrides: [
      {
        id: 'transform_druid_restore',
        name: 'Restauração Total', emoji: '🌍', mpCost: 0,
        description: 'Cura massiva e regen para o grupo.',
        target: 'ally_aoe', category: 'support',
        execute(ctx) {
          const result = emptyResult();
          const regen: StatusEffect = { type: 'regenerating', turnsLeft: 4, value: 30, sourceId: ctx.caster.id };
          const newPlayers = { ...ctx.state.players };
          Object.values(newPlayers).forEach(p => {
            if (!p.isAlive) {
              newPlayers[p.id] = { ...p, isAlive: true, hp: Math.floor(p.maxHp * 0.5) };
            } else {
              const h = Math.min(p.maxHp - p.hp, 100);
              newPlayers[p.id] = addEffect({ ...p, hp: p.hp + h }, regen) as any;
              result.heals.push({ unitId: p.id, amount: h });
            }
          });
          result.logEntries.push(makeLog(ctx.state.turn, `🌍 ${ctx.caster.name} RESTAURAÇÃO TOTAL! +100HP + regen 30/t por 4t!`, 'level_up'));
          result.statePatches = { players: newPlayers };
          return result;
        },
      },
      {
        id: 'transform_druid_wrath',
        name: 'Fúria da Natureza', emoji: '🍂', mpCost: 25,
        description: 'Dano e veneno em todos os inimigos.',
        target: 'enemy_aoe', category: 'magic',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            const roll = rollDice();
            const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 25, targetDef: 0, roll });
            const poison: StatusEffect = { type: 'poisoned', turnsLeft: 5, value: 20, sourceId: ctx.caster.id };
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) newMonsters[idx] = addEffect({ ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) }, poison) as any;
            result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: true });
          });
          result.logEntries.push(makeLog(ctx.state.turn, `🍂 ${ctx.caster.name} FÚRIA DA NATUREZA! Veneno letal!`, 'level_up'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
    ],
  },
  bard: {
    name: 'Minstrel Lendário',
    emoji: '🎼',
    atkMultiplier: 2.0,
    defMultiplier: 1.6,
    hpBonus: 50,
    duration: 6,
    ultColor: '#d35400',
    skillOverrides: [
      {
        id: 'transform_bard_anthem',
        name: 'Hino dos Deuses', emoji: '🎼', mpCost: 0,
        description: 'Buffa todo o grupo massivamente.',
        target: 'ally_aoe', category: 'buff',
        execute(ctx) {
          const result = emptyResult();
          const atk: StatusEffect = { type: 'empowered', turnsLeft: 3, value: 20, sourceId: ctx.caster.id };
          const def: StatusEffect = { type: 'fortified', turnsLeft: 3, value: 20, sourceId: ctx.caster.id };
          const newPlayers = { ...ctx.state.players };
          Object.values(newPlayers).forEach(p => {
            if (p.isAlive) {
              let np = addEffect(p, atk) as any;
              np = addEffect(np, def);
              newPlayers[p.id] = np;
            }
          });
          result.logEntries.push(makeLog(ctx.state.turn, `🎼 ${ctx.caster.name} HINO DOS DEUSES! Todos +20 ATK/DEF!`, 'level_up'));
          result.statePatches = { players: newPlayers };
          return result;
        },
      },
      {
        id: 'transform_bard_requiem',
        name: 'Réquiem', emoji: '🎻', mpCost: 30,
        description: 'Som letal em todos os inimigos.',
        target: 'enemy_aoe', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            const roll = rollDice();
            const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 30, targetDef: 0, roll });
            const stun: StatusEffect = { type: 'stunned', turnsLeft: 1, value: 0, sourceId: ctx.caster.id };
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) newMonsters[idx] = addEffect({ ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) }, stun) as any;
            result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: true });
          });
          result.logEntries.push(makeLog(ctx.state.turn, `🎻 ${ctx.caster.name} RÉQUIEM! Todos atordoados!`, 'level_up'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
    ],
  },
  animalist: {
    name: 'Rei da Selva',
    emoji: '🌿',
    atkMultiplier: 2.2,
    defMultiplier: 1.8,
    hpBonus: 60,
    duration: 6,
    ultColor: '#a0522d',
    skillOverrides: [
      {
        id: 'transform_animalist_pack',
        name: 'Ataque da Matilha', emoji: '🌿', mpCost: 0,
        description: 'Ataque múltiplo em todos os inimigos.',
        target: 'enemy_aoe', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            for (let i = 0; i < 3; i++) {
              const roll = rollDice();
              const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 8, targetDef: Math.floor(enemy.defense * 0.3), roll });
              const idx = newMonsters.findIndex(m => m.id === enemy.id);
              if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
              result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: roll === 10 });
            }
          });
          result.logEntries.push(makeLog(ctx.state.turn, `🌿 ${ctx.caster.name} ATAQUE DA MATILHA! 3× em todos!`, 'level_up'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
      {
        id: 'transform_animalist_roar',
        name: 'Rugido Primordial', emoji: '🦁', mpCost: 20,
        description: 'Aterroriza todos os inimigos.',
        target: 'enemy_aoe', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            const curse: StatusEffect = { type: 'cursed', turnsLeft: 3, value: 10, sourceId: ctx.caster.id };
            const stun: StatusEffect = { type: 'stunned', turnsLeft: 1, value: 0, sourceId: ctx.caster.id };
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) {
              let m = addEffect(newMonsters[idx], curse) as any;
              m = addEffect(m, stun);
              newMonsters[idx] = m;
            }
          });
          result.logEntries.push(makeLog(ctx.state.turn, `🦁 ${ctx.caster.name} RUGIDO PRIMORDIAL! Todos atordoados e malditos!`, 'level_up'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
    ],
  },
  shaman: {
    name: 'Xamã Ancestral',
    emoji: '🌌',
    atkMultiplier: 2.4,
    defMultiplier: 1.6,
    hpBonus: 50,
    duration: 6,
    ultColor: '#5f9ea0',
    skillOverrides: [
      {
        id: 'transform_shaman_spirit',
        name: 'Vórtice Espiritual', emoji: '🌌', mpCost: 0,
        description: 'Libera espíritos ancestrais em todos.',
        target: 'enemy_aoe', category: 'magic',
        execute(ctx) {
          const result = emptyResult();
          const stacks = ctx.caster.spiritStacks;
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            const roll = rollDice();
            const dmg = calcDamage({ attackerAtk: ctx.caster.attack + 25 + stacks * 10, targetDef: 0, roll });
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
            result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: true });
          });
          result.logEntries.push(makeLog(ctx.state.turn, `🌌 ${ctx.caster.name} VÓRTICE ESPIRITUAL (${stacks} cargas)!`, 'level_up'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
      {
        id: 'transform_shaman_bless',
        name: 'Bênção Ancestral', emoji: '🏺', mpCost: 20,
        description: 'Cura e buffa baseado nas cargas espirituais.',
        target: 'ally_aoe', category: 'support',
        execute(ctx) {
          const result = emptyResult();
          const stacks = ctx.caster.spiritStacks;
          const healAmt = 40 + stacks * 15;
          const buffAmt = 5 + stacks * 3;
          const atk: StatusEffect = { type: 'empowered', turnsLeft: 3, value: buffAmt, sourceId: ctx.caster.id };
          const newPlayers = { ...ctx.state.players };
          Object.values(newPlayers).forEach(p => {
            if (p.isAlive) {
              const h = Math.min(p.maxHp - p.hp, healAmt);
              newPlayers[p.id] = addEffect({ ...p, hp: p.hp + h }, atk) as any;
              result.heals.push({ unitId: p.id, amount: h });
            }
          });
          result.logEntries.push(makeLog(ctx.state.turn, `🏺 ${ctx.caster.name} BÊNÇÃO ANCESTRAL! +${healAmt}HP +${buffAmt}ATK!`, 'player_action'));
          result.statePatches = { players: newPlayers };
          return result;
        },
      },
    ],
  },
  trickster: {
    name: 'Mestre das Ilusões',
    emoji: '🌈',
    atkMultiplier: 2.5,
    defMultiplier: 1.4,
    hpBonus: 40,
    duration: 6,
    ultColor: '#da70d6',
    skillOverrides: [
      {
        id: 'transform_trickster_chaos',
        name: 'Caos Total', emoji: '🌈', mpCost: 0,
        description: 'Ataque aleatório devastador.',
        target: 'enemy_aoe', category: 'attack',
        execute(ctx) {
          const result = emptyResult();
          const newMonsters = [...ctx.state.monsters];
          ctx.state.monsters.filter(m => m.hp > 0 && !m.isSummon).forEach(enemy => {
            const roll = rollDice();
            const mult = 1 + Math.random() * 2;
            const dmg = Math.floor(calcDamage({ attackerAtk: ctx.caster.attack + 20, targetDef: 0, roll }) * mult);
            const idx = newMonsters.findIndex(m => m.id === enemy.id);
            if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
            result.damages.push({ unitId: enemy.id, amount: dmg, isCrit: mult > 2 });
            result.logEntries.push(makeLog(ctx.state.turn, `🌈 ${enemy.name}: ${dmg} dano (×${mult.toFixed(1)})!`, 'player_action'));
          });
          result.logEntries.unshift(makeLog(ctx.state.turn, `🌈 ${ctx.caster.name} CAOS TOTAL!`, 'level_up'));
          result.statePatches = { monsters: newMonsters };
          return result;
        },
      },
      {
        id: 'transform_trickster_mirror',
        name: 'Espelho Infinito', emoji: '👥', mpCost: 25,
        description: 'Cria clones para todo o grupo.',
        target: 'ally_aoe', category: 'buff',
        execute(ctx) {
          const result = emptyResult();
          const clone: StatusEffect = { type: 'cloned', turnsLeft: 3, value: 3, sourceId: ctx.caster.id };
          const dodge: StatusEffect = { type: 'invisible', turnsLeft: 2, value: 2, sourceId: ctx.caster.id };
          const newPlayers = { ...ctx.state.players };
          Object.values(newPlayers).forEach(p => {
            if (p.isAlive) {
              let np = addEffect(p, clone) as any;
              np = addEffect(np, dodge);
              newPlayers[p.id] = np;
            }
          });
          result.logEntries.push(makeLog(ctx.state.turn, `👥 ${ctx.caster.name} ESPELHO INFINITO! Grupo com clone + 2 esquivas!`, 'level_up'));
          result.statePatches = { players: newPlayers };
          return result;
        },
      },
    ],
  },
};