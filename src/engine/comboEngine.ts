// ═══════════════════════════════════════════════════════════
//  REALM OF SHADOWS — Combo/Reação System v1
//
//  CONCEITO:
//  Quando um jogador aplica certos efeitos (Primer),
//  o próximo jogador que atacar o alvo pode "detonar" o combo
//  recebendo um bônus massivo (Detonator).
//
//  Ex: Necromante usa MALDIÇÃO → inimigo fica "preparado"
//      Assassino usa EXECUÇÃO → DETONAÇÃO: Execução das Sombras (3x dano)
//
//  Também existe sistema de CADEIA (Chain):
//  Cada kill consecutiva no mesmo turno acumula stacks de "streak"
//  que aumentam dano e XP por alguns turnos.
//
//  COMBO TYPES:
//  1. ELEMENTAL CHAIN   — Fogo → Gelo → Raio (Elementalista+Mago)
//  2. SOMBRA EXECUÇÃO   — Maldição → Execução (Necro+Assassino)
//  3. BATALHA INSPIRADA — Inspirar → Atacar (Bardo+Guerreiro/Berserker)
//  4. ESCUDO SAGRADO    — Muralha → Cura (Guardião+Paladino/Druida)
//  5. VENENO ESPIRITUAL — Veneno → Carga Espiritual (Ladino/Assassino+Xamã)
//  6. MORTE FANTASMA    — Alma ganha → Invocação (Necro acumula combo solo)
//  7. FÚRIA ANIMAL      — Rugido → Ataque em área (Animalista+Berserker)
//  8. ILUSÃO DE SOMBRA  — Clone+Esquiva → Ataque Triplo (Ilusionista+Ladino)
//  9. MOMENTUM TOTAL    — Qualquer 3 kills seguidas = SINERGIA DO GRUPO
//  10. RESSURREIÇÃO FÚRIA — Paladino revive → Berserker ataca = BERSERK SAGRADO
// ═══════════════════════════════════════════════════════════

import type { CombatState, Player, Monster, StatusEffect, LogEntry } from './types';
import { makeLog, calcDamage, rollDice, addEffect } from './utils';
import { nanoid } from 'nanoid';

// ─── Tipos de Combo ────────────────────────────────────────

export type ComboType =
  | 'elemental_chain'
  | 'shadow_execution'
  | 'inspired_battle'
  | 'holy_shield'
  | 'venom_spirit'
  | 'soul_explosion'
  | 'beast_rage'
  | 'illusion_shadow'
  | 'triple_kill_momentum'
  | 'resurrection_fury';

export interface ActiveCombo {
  id: string;
  type: ComboType;
  primerPlayerId: string;
  primerSkillName: string;
  targetId: string;   // monster id primed
  turnsLeft: number;  // expires after N turns
  stackCount: number; // some combos stack (soul explosion)
  power: number;      // damage/heal multiplier
}

export interface ComboResult {
  triggered: boolean;
  comboType?: ComboType;
  comboName?: string;
  comboEmoji?: string;
  bonusDamage?: number;
  bonusHeal?: number;
  logEntries: LogEntry[];
  statePatches: Partial<CombatState>;
  bannerColor?: string;
  bannerText?: string;
}

// ─── Combo Metadata ────────────────────────────────────────

export const COMBO_META: Record<ComboType, {
  name: string;
  emoji: string;
  color: string;
  description: string;
  primer: string;
  detonator: string;
}> = {
  elemental_chain: {
    name: 'CADEIA ELEMENTAL',
    emoji: '⚡🔥❄️',
    color: '#e67e22',
    description: 'Elementalista aplica Lentidão → Mago/Elementalista ataca → triplo elemento',
    primer: 'Lentidão (slowed)',
    detonator: 'Qualquer magia por Mago ou Elementalista',
  },
  shadow_execution: {
    name: 'EXECUÇÃO DAS SOMBRAS',
    emoji: '🔮💀',
    color: '#8e44ad',
    description: 'Necromante amaldiçoa → Assassino ataca → explosão de sombra 3x',
    primer: 'Maldição (cursed)',
    detonator: 'Qualquer ataque do Assassino',
  },
  inspired_battle: {
    name: 'BATALHA INSPIRADA',
    emoji: '🎵⚔️',
    color: '#d35400',
    description: 'Bardo inspira grupo → Guerreiro/Berserker ataca → golpe duplo automático',
    primer: 'Inspirado (inspired)',
    detonator: 'Ataque físico de Guerreiro ou Berserker',
  },
  holy_shield: {
    name: 'ESCUDO SAGRADO',
    emoji: '🗿🛡️',
    color: '#7f8c8d',
    description: 'Guardião ergue Muralha → Paladino/Druida cura → HP extra ao grupo',
    primer: 'Muralha ativa (fortified>100)',
    detonator: 'Qualquer cura de Paladino ou Druida',
  },
  venom_spirit: {
    name: 'VENENO ESPIRITUAL',
    emoji: '☠️🌀',
    color: '#5f9ea0',
    description: 'Ladino/Assassino aplica veneno → Xamã usa Raiva Ancestral → veneno explode',
    primer: 'Veneno (poisoned)',
    detonator: 'Qualquer habilidade espiritual do Xamã',
  },
  soul_explosion: {
    name: 'EXPLOSÃO DE ALMAS',
    emoji: '💀💥',
    color: '#9b2c9b',
    description: 'Necromante acumula 3+ almas em combate → próximo ataque explode todas',
    primer: '3+ almas acumuladas (soulCount≥3)',
    detonator: 'Qualquer ataque ou skill do Necromante',
  },
  beast_rage: {
    name: 'FÚRIA BESTIAL',
    emoji: '🐾💢',
    color: '#a0522d',
    description: 'Animalista tem 2+ animais → Berserker entra em Frenesi → ataque em área conjunto',
    primer: '2+ summons do Animalista',
    detonator: 'Berserker usa Frenesi ou Ira Sanguinária',
  },
  illusion_shadow: {
    name: 'SOMBRA ILUSÓRIA',
    emoji: '👤🌑',
    color: '#da70d6',
    description: 'Ilusionista cria Clone → Ladino/Assassino ataca mesmo alvo → ataque triplo',
    primer: 'Clone ativo (cloned)',
    detonator: 'Qualquer ataque de Ladino ou Assassino',
  },
  triple_kill_momentum: {
    name: 'MOMENTUM TRIPLO',
    emoji: '✨✨✨',
    color: '#ffc832',
    description: 'Grupo mata 3 inimigos no mesmo turno de jogadores → ATAQUE SINCRONIZADO GRÁTIS',
    primer: '2 kills no turno atual',
    detonator: 'Qualquer kill que seja a 3ª no turno',
  },
  resurrection_fury: {
    name: 'FÚRIA SAGRADA',
    emoji: '✝️🩸',
    color: '#e74c3c',
    description: 'Paladino/Druida ressuscita aliado → Berserker/Guerreiro ataca no mesmo turno',
    primer: 'Aliado ressuscitado neste turno',
    detonator: 'Berserker ou Guerreiro ataca',
  },
};

// ─── Estado global de combos ───────────────────────────────
// Será injetado no CombatState via extensão

export interface ComboStateExtension {
  activeCombos: ActiveCombo[];
  killsThisTurn: number;         // para triple_kill_momentum
  reviveHappenedThisTurn: boolean; // para resurrection_fury
  lastComboTriggered?: ComboType;
  comboStreak: number;           // consecutive combos = bônus crescente
}

// ─── Inicialização ─────────────────────────────────────────

export function initComboState(): ComboStateExtension {
  return {
    activeCombos: [],
    killsThisTurn: 0,
    reviveHappenedThisTurn: false,
    comboStreak: 0,
  };
}

// ─── Checar se Primer foi aplicado ────────────────────────

export function checkAndRegisterPrimer(
  state: CombatState,
  comboExt: ComboStateExtension,
  actingPlayer: Player,
  skillId: string,
  affectedMonsterIds: string[]
): ComboStateExtension {
  let ext = { ...comboExt, activeCombos: [...comboExt.activeCombos] };

  // ELEMENTAL CHAIN — Elementalista aplica slowed
  if (
    (actingPlayer.classType === 'elementalist' || actingPlayer.classType === 'mage') &&
    (skillId.includes('ice') || skillId.includes('blizzard') || skillId.includes('nova') || skillId.includes('slow'))
  ) {
    affectedMonsterIds.forEach(mId => {
      const m = state.monsters.find(m => m.id === mId);
      if (m?.effects.some(e => e.type === 'slowed')) {
        ext.activeCombos.push({
          id: nanoid(), type: 'elemental_chain',
          primerPlayerId: actingPlayer.id,
          primerSkillName: 'Lentidão',
          targetId: mId, turnsLeft: 2, stackCount: 1,
          power: 1.8,
        });
      }
    });
  }

  // SHADOW EXECUTION — Necromante aplica cursed
  if (actingPlayer.classType === 'necromancer' && skillId.includes('curse')) {
    affectedMonsterIds.forEach(mId => {
      ext.activeCombos.push({
        id: nanoid(), type: 'shadow_execution',
        primerPlayerId: actingPlayer.id,
        primerSkillName: 'Maldição',
        targetId: mId, turnsLeft: 3, stackCount: 1,
        power: 3.0,
      });
    });
  }

  // INSPIRED BATTLE — Bardo aplica inspired
  if (actingPlayer.classType === 'bard' && skillId.includes('inspire')) {
    // Primer é no grupo, não num monstro — usamos targetId vazio
    ext.activeCombos.push({
      id: nanoid(), type: 'inspired_battle',
      primerPlayerId: actingPlayer.id,
      primerSkillName: 'Melodia Inspiradora',
      targetId: '__group__', turnsLeft: 3, stackCount: 1,
      power: 1.5,
    });
  }

  // VENOM SPIRIT — Ladino/Assassino aplica poisoned
  if (
    (actingPlayer.classType === 'rogue' || actingPlayer.classType === 'assassin') &&
    (skillId.includes('poison') || skillId.includes('blade') || skillId.includes('venom'))
  ) {
    affectedMonsterIds.forEach(mId => {
      const m = state.monsters.find(m => m.id === mId);
      if (m?.effects.some(e => e.type === 'poisoned')) {
        ext.activeCombos.push({
          id: nanoid(), type: 'venom_spirit',
          primerPlayerId: actingPlayer.id,
          primerSkillName: 'Veneno',
          targetId: mId, turnsLeft: 4, stackCount: 1,
          power: 2.2,
        });
      }
    });
  }

  // HOLY SHIELD — Guardião ativa Muralha
  if (actingPlayer.classType === 'guardian' && skillId.includes('wall')) {
    ext.activeCombos.push({
      id: nanoid(), type: 'holy_shield',
      primerPlayerId: actingPlayer.id,
      primerSkillName: 'Muralha',
      targetId: '__group__', turnsLeft: 2, stackCount: 1,
      power: 1.0, // heal bonus é fixo
    });
  }

  // SOUL EXPLOSION — Necromante com 3+ almas auto-registra
  if (actingPlayer.classType === 'necromancer' && actingPlayer.soulCount >= 3) {
    const already = ext.activeCombos.find(c => c.type === 'soul_explosion' && c.primerPlayerId === actingPlayer.id);
    if (!already) {
      ext.activeCombos.push({
        id: nanoid(), type: 'soul_explosion',
        primerPlayerId: actingPlayer.id,
        primerSkillName: `${actingPlayer.soulCount} Almas`,
        targetId: '__any__', turnsLeft: 2, stackCount: actingPlayer.soulCount,
        power: 1.0 + actingPlayer.soulCount * 0.4,
      });
    }
  }

  // BEAST RAGE — Animalista com 2+ summons
  if (actingPlayer.classType === 'animalist' && actingPlayer.summonCount >= 2) {
    const already = ext.activeCombos.find(c => c.type === 'beast_rage');
    if (!already) {
      ext.activeCombos.push({
        id: nanoid(), type: 'beast_rage',
        primerPlayerId: actingPlayer.id,
        primerSkillName: `${actingPlayer.summonCount} Animais`,
        targetId: '__any__', turnsLeft: 2, stackCount: actingPlayer.summonCount,
        power: 1.0 + actingPlayer.summonCount * 0.3,
      });
    }
  }

  // ILLUSION SHADOW — Ilusionista aplica clone
  if (actingPlayer.classType === 'trickster' && skillId.includes('clone')) {
    ext.activeCombos.push({
      id: nanoid(), type: 'illusion_shadow',
      primerPlayerId: actingPlayer.id,
      primerSkillName: 'Clone Ilusório',
      targetId: '__any__', turnsLeft: 3, stackCount: 1,
      power: 3.0, // 3 hits
    });
  }

  return ext;
}

// ─── Checar se Detonator foi ativado ──────────────────────

export function checkAndFireDetonator(
  state: CombatState,
  comboExt: ComboStateExtension,
  actingPlayer: Player,
  skillId: string,
  targetMonster?: Monster
): { result: ComboResult; newExt: ComboStateExtension } {
  let newExt = { ...comboExt, activeCombos: [...comboExt.activeCombos] };
  const result: ComboResult = {
    triggered: false,
    logEntries: [],
    statePatches: {},
  };

  // Streak bonus
  const streakMult = 1 + (newExt.comboStreak * 0.15);

  // ── ELEMENTAL CHAIN ────────────────────────────────────
  if (
    targetMonster &&
    (actingPlayer.classType === 'elementalist' || actingPlayer.classType === 'mage') &&
    !skillId.includes('ice') && !skillId.includes('blizzard')
  ) {
    const combo = newExt.activeCombos.find(
      c => c.type === 'elemental_chain' && c.targetId === targetMonster.id
    );
    if (combo && targetMonster.effects.some(e => e.type === 'slowed')) {
      const bonusDmg = Math.floor(calcDamage({
        attackerAtk: actingPlayer.attack + 30,
        targetDef: 0,
        roll: rollDice(),
      }) * combo.power * streakMult);

      result.triggered = true;
      result.comboType = 'elemental_chain';
      result.comboName = COMBO_META.elemental_chain.name;
      result.comboEmoji = COMBO_META.elemental_chain.emoji;
      result.bonusDamage = bonusDmg;
      result.bannerColor = COMBO_META.elemental_chain.color;
      result.bannerText = COMBO_META.elemental_chain.name;
      result.logEntries.push(makeLog(state.turn,
        `⚡🔥❄️ COMBO — CADEIA ELEMENTAL! ${actingPlayer.name} detona a lentidão: +${bonusDmg} dano elemental!`, 'synergy'));
      result.statePatches = {
        monsters: state.monsters.map(m =>
          m.id === targetMonster.id ? { ...m, hp: Math.max(0, m.hp - bonusDmg) } : m
        ),
      };

      newExt.activeCombos = newExt.activeCombos.filter(c => c.id !== combo.id);
      newExt.comboStreak++;
    }
  }

  // ── SHADOW EXECUTION ───────────────────────────────────
  if (targetMonster && actingPlayer.classType === 'assassin' && !result.triggered) {
    const combo = newExt.activeCombos.find(
      c => c.type === 'shadow_execution' && c.targetId === targetMonster.id
    );
    if (combo && targetMonster.effects.some(e => e.type === 'cursed')) {
      const bonusDmg = Math.floor(calcDamage({
        attackerAtk: actingPlayer.attack + 20,
        targetDef: 0,
        roll: rollDice(),
        damageMultiplier: combo.power * streakMult,
      }));

      result.triggered = true;
      result.comboType = 'shadow_execution';
      result.comboName = COMBO_META.shadow_execution.name;
      result.bonusDamage = bonusDmg;
      result.bannerColor = COMBO_META.shadow_execution.color;
      result.bannerText = COMBO_META.shadow_execution.name;
      result.logEntries.push(makeLog(state.turn,
        `🔮💀 COMBO — EXECUÇÃO DAS SOMBRAS! Maldição explode em ${targetMonster.name}: ${bonusDmg} dano (×${combo.power.toFixed(1)})!`, 'synergy'));
      result.statePatches = {
        monsters: state.monsters.map(m =>
          m.id === targetMonster.id ? { ...m, hp: Math.max(0, m.hp - bonusDmg) } : m
        ),
      };

      newExt.activeCombos = newExt.activeCombos.filter(c => c.id !== combo.id);
      newExt.comboStreak++;
    }
  }

  // ── INSPIRED BATTLE ────────────────────────────────────
  if (
    targetMonster &&
    (actingPlayer.classType === 'warrior' || actingPlayer.classType === 'berserker') &&
    !result.triggered
  ) {
    const combo = newExt.activeCombos.find(c => c.type === 'inspired_battle');
    if (combo && actingPlayer.effects.some(e => e.type === 'inspired')) {
      const bonusDmg = Math.floor(calcDamage({
        attackerAtk: actingPlayer.attack + 10,
        targetDef: Math.floor(targetMonster.defense * 0.5),
        roll: rollDice(),
        damageMultiplier: combo.power * streakMult,
      }));

      result.triggered = true;
      result.comboType = 'inspired_battle';
      result.comboName = COMBO_META.inspired_battle.name;
      result.bonusDamage = bonusDmg;
      result.bannerColor = COMBO_META.inspired_battle.color;
      result.bannerText = COMBO_META.inspired_battle.name;
      result.logEntries.push(makeLog(state.turn,
        `🎵⚔️ COMBO — BATALHA INSPIRADA! A música do Bardo potencializa ${actingPlayer.name}: +${bonusDmg} bônus!`, 'synergy'));
      result.statePatches = {
        monsters: state.monsters.map(m =>
          m.id === targetMonster.id ? { ...m, hp: Math.max(0, m.hp - bonusDmg) } : m
        ),
      };

      newExt.comboStreak++;
      // Não remove o combo — pode disparar 1x por turno enquanto inspirado
    }
  }

  // ── VENOM SPIRIT ───────────────────────────────────────
  if (
    targetMonster &&
    actingPlayer.classType === 'shaman' &&
    (skillId.includes('ancestor') || skillId.includes('spirit') || skillId.includes('release') || skillId.includes('wrath')) &&
    !result.triggered
  ) {
    const combo = newExt.activeCombos.find(
      c => c.type === 'venom_spirit' && c.targetId === targetMonster.id
    );
    if (combo && targetMonster.effects.some(e => e.type === 'poisoned')) {
      const poisonEffect = targetMonster.effects.find(e => e.type === 'poisoned');
      const poisonDmg = (poisonEffect?.value ?? 0) * (poisonEffect?.turnsLeft ?? 0);
      const bonusDmg = Math.floor(poisonDmg * combo.power * streakMult);

      result.triggered = true;
      result.comboType = 'venom_spirit';
      result.comboName = COMBO_META.venom_spirit.name;
      result.bonusDamage = bonusDmg;
      result.bannerColor = COMBO_META.venom_spirit.color;
      result.bannerText = COMBO_META.venom_spirit.name;
      result.logEntries.push(makeLog(state.turn,
        `☠️🌀 COMBO — VENENO ESPIRITUAL! Os espíritos detonam o veneno em ${targetMonster.name}: ${bonusDmg} dano (veneno acumulado ×${combo.power.toFixed(1)})!`, 'synergy'));

      // Remove veneno e aplica dano
      const newMonsters = state.monsters.map(m => {
        if (m.id !== targetMonster.id) return m;
        return {
          ...m,
          hp: Math.max(0, m.hp - bonusDmg),
          effects: m.effects.filter(e => e.type !== 'poisoned'),
        };
      });
      result.statePatches = { monsters: newMonsters };

      newExt.activeCombos = newExt.activeCombos.filter(c => c.id !== combo.id);
      newExt.comboStreak++;
    }
  }

  // ── SOUL EXPLOSION ─────────────────────────────────────
  if (
    actingPlayer.classType === 'necromancer' &&
    actingPlayer.soulCount >= 3 &&
    targetMonster &&
    !result.triggered
  ) {
    const combo = newExt.activeCombos.find(
      c => c.type === 'soul_explosion' && c.primerPlayerId === actingPlayer.id
    );
    if (combo) {
      const bonusDmg = Math.floor(calcDamage({
        attackerAtk: actingPlayer.attack * combo.stackCount,
        targetDef: 0,
        roll: rollDice(),
        damageMultiplier: streakMult,
      }));

      // AoE em todos os inimigos
      const aliveEnemies = state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const newMonsters = state.monsters.map(m => {
        if (m.hp <= 0 || m.isSummon) return m;
        return { ...m, hp: Math.max(0, m.hp - bonusDmg) };
      });

      const newPlayers = {
        ...state.players,
        [actingPlayer.id]: { ...actingPlayer, soulCount: 0 },
      };

      result.triggered = true;
      result.comboType = 'soul_explosion';
      result.comboName = COMBO_META.soul_explosion.name;
      result.bonusDamage = bonusDmg * aliveEnemies.length;
      result.bannerColor = COMBO_META.soul_explosion.color;
      result.bannerText = COMBO_META.soul_explosion.name;
      result.logEntries.push(makeLog(state.turn,
        `💀💥 COMBO — EXPLOSÃO DE ALMAS! ${actingPlayer.soulCount} almas explodem em TODOS! ${bonusDmg} dano cada!`, 'synergy'));
      result.statePatches = { monsters: newMonsters, players: newPlayers };

      newExt.activeCombos = newExt.activeCombos.filter(c => c.id !== combo.id);
      newExt.comboStreak++;
    }
  }

  // ── BEAST RAGE ─────────────────────────────────────────
  if (
    actingPlayer.classType === 'berserker' &&
    (skillId.includes('frenzy') || skillId.includes('blood_rage') || skillId.includes('rage')) &&
    !result.triggered
  ) {
    const combo = newExt.activeCombos.find(c => c.type === 'beast_rage');
    if (combo) {
      const aliveEnemies = state.monsters.filter(m => m.hp > 0 && !m.isSummon);
      const bonusDmgEach = Math.floor(calcDamage({
        attackerAtk: actingPlayer.attack + 15,
        targetDef: 0,
        roll: rollDice(),
        damageMultiplier: combo.power * streakMult,
      }));

      const newMonsters = state.monsters.map(m => {
        if (m.hp <= 0 || m.isSummon) return m;
        return { ...m, hp: Math.max(0, m.hp - bonusDmgEach) };
      });

      result.triggered = true;
      result.comboType = 'beast_rage';
      result.comboName = COMBO_META.beast_rage.name;
      result.bonusDamage = bonusDmgEach * aliveEnemies.length;
      result.bannerColor = COMBO_META.beast_rage.color;
      result.bannerText = COMBO_META.beast_rage.name;
      result.logEntries.push(makeLog(state.turn,
        `🐾💢 COMBO — FÚRIA BESTIAL! Os animais do Animalista unem forças com ${actingPlayer.name}! ${bonusDmgEach} dano em TODOS!`, 'synergy'));
      result.statePatches = { monsters: newMonsters };

      newExt.activeCombos = newExt.activeCombos.filter(c => c.id !== combo.id);
      newExt.comboStreak++;
    }
  }

  // ── ILLUSION SHADOW ────────────────────────────────────
  if (
    targetMonster &&
    (actingPlayer.classType === 'rogue' || actingPlayer.classType === 'assassin') &&
    !result.triggered
  ) {
    const combo = newExt.activeCombos.find(c => c.type === 'illusion_shadow');
    const trickster = Object.values(state.players).find(
      p => p.classType === 'trickster' && p.isAlive && p.effects.some(e => e.type === 'cloned')
    );

    if (combo && trickster) {
      // 3 hits!
      let totalDmg = 0;
      const newMonsters = [...state.monsters];
      for (let i = 0; i < 3; i++) {
        const dmg = Math.floor(calcDamage({
          attackerAtk: actingPlayer.attack + 8,
          targetDef: 0,
          roll: rollDice(),
          damageMultiplier: streakMult,
        }));
        totalDmg += dmg;
        const idx = newMonsters.findIndex(m => m.id === targetMonster.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
      }

      result.triggered = true;
      result.comboType = 'illusion_shadow';
      result.comboName = COMBO_META.illusion_shadow.name;
      result.bonusDamage = totalDmg;
      result.bannerColor = COMBO_META.illusion_shadow.color;
      result.bannerText = COMBO_META.illusion_shadow.name;
      result.logEntries.push(makeLog(state.turn,
        `👤🌑 COMBO — SOMBRA ILUSÓRIA! Clone do Ilusionista multiplica o ataque de ${actingPlayer.name}: 3× ${Math.floor(totalDmg/3)} = ${totalDmg} dano!`, 'synergy'));
      result.statePatches = { monsters: newMonsters };

      newExt.activeCombos = newExt.activeCombos.filter(c => c.id !== combo.id);
      newExt.comboStreak++;
    }
  }

  // ── TRIPLE KILL MOMENTUM ───────────────────────────────
  // Checado separadamente após cada kill — ver checkTripleKill()

  // ── RESURRECTION FURY ──────────────────────────────────
  if (
    targetMonster &&
    (actingPlayer.classType === 'berserker' || actingPlayer.classType === 'warrior') &&
    newExt.reviveHappenedThisTurn &&
    !result.triggered
  ) {
    const bonusDmg = Math.floor(calcDamage({
      attackerAtk: actingPlayer.attack + 25,
      targetDef: 0,
      roll: rollDice(),
      damageMultiplier: 2.5 * streakMult,
    }));

    result.triggered = true;
    result.comboType = 'resurrection_fury';
    result.comboName = COMBO_META.resurrection_fury.name;
    result.bonusDamage = bonusDmg;
    result.bannerColor = COMBO_META.resurrection_fury.color;
    result.bannerText = COMBO_META.resurrection_fury.name;
    result.logEntries.push(makeLog(state.turn,
      `✝️🩸 COMBO — FÚRIA SAGRADA! A ressurreição inspirou ${actingPlayer.name}: ${bonusDmg} dano sagrado!`, 'synergy'));
    result.statePatches = {
      monsters: state.monsters.map(m =>
        m.id === targetMonster.id ? { ...m, hp: Math.max(0, m.hp - bonusDmg) } : m
      ),
    };

    newExt.reviveHappenedThisTurn = false; // consume
    newExt.comboStreak++;
  }

  // Decrementa streak se não trigou nada
  if (!result.triggered && newExt.comboStreak > 0) {
    newExt.comboStreak = Math.max(0, newExt.comboStreak - 1);
  }

  return { result, newExt };
}

// ─── Registrar kill para Triple Momentum ──────────────────

export function registerKill(
  state: CombatState,
  comboExt: ComboStateExtension
): { newExt: ComboStateExtension; tripleKillResult: ComboResult | null } {
  const newExt = { ...comboExt, killsThisTurn: comboExt.killsThisTurn + 1 };
  const result: ComboResult = { triggered: false, logEntries: [], statePatches: {} };

  if (newExt.killsThisTurn >= 3) {
    // Triple Kill! Dispara ataque sincronizado do grupo
    const alivePlayers = Object.values(state.players).filter(p => p.isAlive);
    const aliveEnemies = state.monsters.filter(m => m.hp > 0 && !m.isSummon);
    if (aliveEnemies.length === 0) return { newExt, tripleKillResult: null };

    const newMonsters = [...state.monsters];
    let totalDmg = 0;

    result.logEntries.push(makeLog(state.turn,
      `✨✨✨ COMBO — MOMENTUM TRIPLO! 3 kills no turno! O grupo age em uníssono!`, 'synergy'));

    alivePlayers.forEach(p => {
      const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      const dmg = calcDamage({
        attackerAtk: p.attack + 20,
        targetDef: Math.floor(target.defense * 0.3),
        roll: rollDice(),
      });
      totalDmg += dmg;
      const idx = newMonsters.findIndex(m => m.id === target.id);
      if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
      result.logEntries.push(makeLog(state.turn,
        `  ✨ ${p.name}: ${dmg} dano sincronizado!`, 'synergy'));
    });

    result.triggered = true;
    result.comboType = 'triple_kill_momentum';
    result.bonusDamage = totalDmg;
    result.bannerColor = COMBO_META.triple_kill_momentum.color;
    result.bannerText = COMBO_META.triple_kill_momentum.name;
    result.statePatches = { monsters: newMonsters };

    newExt.killsThisTurn = 0;
    newExt.comboStreak = Math.min(10, newExt.comboStreak + 2);

    return { newExt, tripleKillResult: result };
  }

  return { newExt, tripleKillResult: null };
}

// ─── Registrar ressurreição ────────────────────────────────

export function registerRevive(comboExt: ComboStateExtension): ComboStateExtension {
  return { ...comboExt, reviveHappenedThisTurn: true };
}

// ─── Tick de turno (expire combos) ────────────────────────

export function tickCombosOnTurn(comboExt: ComboStateExtension): ComboStateExtension {
  return {
    ...comboExt,
    killsThisTurn: 0,
    reviveHappenedThisTurn: false,
    activeCombos: comboExt.activeCombos
      .map(c => ({ ...c, turnsLeft: c.turnsLeft - 1 }))
      .filter(c => c.turnsLeft > 0),
  };
}

// ─── Listar combos disponíveis para o jogador ─────────────

export function getAvailableCombosForPlayer(
  state: CombatState,
  comboExt: ComboStateExtension,
  player: Player,
  targetMonster?: Monster
): { comboType: ComboType; name: string; emoji: string; description: string }[] {
  const available: ReturnType<typeof getAvailableCombosForPlayer> = [];

  for (const combo of comboExt.activeCombos) {
    const meta = COMBO_META[combo.type];

    // Verifica se este jogador pode ser o detonator
    switch (combo.type) {
      case 'elemental_chain':
        if (
          (player.classType === 'elementalist' || player.classType === 'mage') &&
          targetMonster?.id === combo.targetId
        ) available.push({ comboType: combo.type, ...meta });
        break;
      case 'shadow_execution':
        if (player.classType === 'assassin' && targetMonster?.id === combo.targetId)
          available.push({ comboType: combo.type, ...meta });
        break;
      case 'inspired_battle':
        if (
          (player.classType === 'warrior' || player.classType === 'berserker') &&
          player.effects.some(e => e.type === 'inspired')
        ) available.push({ comboType: combo.type, ...meta });
        break;
      case 'venom_spirit':
        if (player.classType === 'shaman' && targetMonster?.id === combo.targetId)
          available.push({ comboType: combo.type, ...meta });
        break;
      case 'soul_explosion':
        if (player.classType === 'necromancer' && player.soulCount >= 3)
          available.push({ comboType: combo.type, ...meta });
        break;
      case 'beast_rage':
        if (player.classType === 'berserker')
          available.push({ comboType: combo.type, ...meta });
        break;
      case 'illusion_shadow':
        if (player.classType === 'rogue' || player.classType === 'assassin')
          available.push({ comboType: combo.type, ...meta });
        break;
      case 'resurrection_fury':
        if (
          (player.classType === 'berserker' || player.classType === 'warrior') &&
          comboExt.reviveHappenedThisTurn
        ) available.push({ comboType: combo.type, ...meta });
        break;
      case 'holy_shield':
        if (player.classType === 'paladin' || player.classType === 'druid')
          available.push({ comboType: combo.type, ...meta });
        break;
    }
  }

  // Triple kill sempre disponível se 2 kills já aconteceram
  if (comboExt.killsThisTurn >= 2) {
    available.push({
      comboType: 'triple_kill_momentum',
      ...COMBO_META.triple_kill_momentum,
    });
  }

  return available;
}