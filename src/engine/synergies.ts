// ═══════════════════════════════════════════════════════════
//  REALM OF SHADOWS — Synergy System
//
//  Sinergias são combos entre classes que criam efeitos únicos.
//  Ex: Bardo usa "Inspirar" → Guerreiro ataca → SINERGIA: dano dobrado
//      Necromante marca inimigo → Assassino executa → SINERGIA: explosão de sombra
//
//  O sistema de Momentum rastreia ações do grupo e libera
//  ataques sincronizados quando atinge 100.
// ═══════════════════════════════════════════════════════════

import { CombatState, Player, Monster, StatusEffect, LogEntry } from './types';
import { BALANCE, makeLog, addEffect, calcDamage, rollDice } from './utils';
import { nanoid } from 'nanoid';

// ─── Synergy Definitions ──────────────────────────────────
// Each synergy watches for a trigger condition and fires an effect

export interface SynergyDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  // Classes involved (at least one of each must be alive)
  requiredClasses: string[][];  // OR within each array, AND between arrays
  // What tag the triggering skill must have
  triggerTag?: string;
  // What condition enables it
  check: (state: CombatState, actingPlayer: Player, lastSkillTag?: string) => boolean;
  // The effect that fires
  fire: (state: CombatState, actingPlayer: Player, targets: Monster[]) => SynergyResult;
}

export interface SynergyResult {
  newState: Partial<CombatState>;
  logEntries: LogEntry[];
  damages: { unitId: string; amount: number; isCrit?: boolean }[];
  heals: { unitId: string; amount: number }[];
  bannerText: string;
  bannerColor: string;
}

// ─── Active Synergies ─────────────────────────────────────

export const SYNERGIES: SynergyDefinition[] = [

  // ── WAR HYMN ──────────────────────────────────────────
  // Bard has "inspired" active on group + Warrior/Berserker attacks → BONUS ATTACK
  {
    id: 'war_hymn',
    name: 'Hino de Guerra',
    emoji: '🎵⚔️',
    description: 'Bardo inspirou o grupo + Guerreiro/Berserker ataca → golpe extra automático',
    requiredClasses: [['bard'], ['warrior', 'berserker']],
    check(state, actingPlayer) {
      if (!['warrior', 'berserker'].includes(actingPlayer.classType)) return false;
      const bard = Object.values(state.players).find(p => p.classType === 'bard' && p.isAlive);
      if (!bard) return false;
      return actingPlayer.effects.some(e => e.type === 'inspired');
    },
    fire(state, actingPlayer, targets) {
      const target = targets[0];
      if (!target) return emptySynergyResult('Hino de Guerra', '#d35400');
      const bonusDmg = Math.floor(actingPlayer.attack * 0.5);
      const roll = rollDice();
      const dmg = calcDamage({ attackerAtk: actingPlayer.attack, targetDef: target.defense, roll, bonus: bonusDmg });
      const newMonsters = state.monsters.map(m =>
        m.id === target.id ? { ...m, hp: Math.max(0, m.hp - dmg) } : m
      );
      return {
        newState: { monsters: newMonsters },
        logEntries: [makeLog(state.turn, `🎵⚔️ SINERGIA — HINO DE GUERRA! ${actingPlayer.name} recebe golpe bônus: ${dmg} dano em ${target.name}!`, 'synergy')],
        damages: [{ unitId: target.id, amount: dmg, isCrit: true }],
        heals: [],
        bannerText: 'HINO DE GUERRA!',
        bannerColor: '#d35400',
      };
    },
  },

  // ── SHADOW EXECUTION ──────────────────────────────────
  // Target is marked (necromancer curse or assassin mark) + assassin executes → explosion
  {
    id: 'shadow_execution',
    name: 'Execução das Sombras',
    emoji: '🔮💀',
    description: 'Necromante maldiz o alvo + Assassino usa qualquer habilidade de dano → explosão sombria extra',
    requiredClasses: [['necromancer'], ['assassin']],
    check(state, actingPlayer) {
      if (actingPlayer.classType !== 'assassin') return false;
      const necro = Object.values(state.players).find(p => p.classType === 'necromancer' && p.isAlive);
      if (!necro) return false;
      // Check if any alive enemy has cursed effect from necromancer
      return state.monsters.some(m => m.hp > 0 && m.effects.some(e => e.type === 'cursed'));
    },
    fire(state, actingPlayer, targets) {
      // Hit ALL cursed enemies with shadow explosion
      const cursedEnemies = state.monsters.filter(m => m.hp > 0 && m.effects.some(e => e.type === 'cursed'));
      const newMonsters = [...state.monsters];
      const damages: SynergyResult['damages'] = [];
      const logs: LogEntry[] = [];
      cursedEnemies.forEach(enemy => {
        const bonusDmg = Math.floor(actingPlayer.attack * 0.8);
        const dmg = calcDamage({ attackerAtk: actingPlayer.attack, targetDef: 0, roll: rollDice(), bonus: bonusDmg });
        const idx = newMonsters.findIndex(m => m.id === enemy.id);
        if (idx !== -1) newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
        damages.push({ unitId: enemy.id, amount: dmg, isCrit: true });
        logs.push(makeLog(state.turn, `🔮💀 Explosão das Sombras em ${enemy.name}: ${dmg} dano!`, 'synergy'));
      });
      logs.unshift(makeLog(state.turn, `🔮💀 SINERGIA — EXECUÇÃO DAS SOMBRAS! Maldições explodem!`, 'synergy'));
      return {
        newState: { monsters: newMonsters },
        logEntries: logs,
        damages, heals: [],
        bannerText: 'EXECUÇÃO DAS SOMBRAS!',
        bannerColor: '#8e44ad',
      };
    },
  },

  // ── NATURE'S BLESSING ─────────────────────────────────
  // Druid heals + any ally is below 30% HP → emergency super-heal bonus
  {
    id: 'natures_blessing',
    name: 'Bênção da Natureza',
    emoji: '🌿💚',
    description: 'Druida cura aliado abaixo de 30% HP → cura dupla automática',
    requiredClasses: [['druid']],
    check(state, actingPlayer) {
      if (actingPlayer.classType !== 'druid') return false;
      return Object.values(state.players).some(p => p.isAlive && p.hp < p.maxHp * 0.30 && p.id !== actingPlayer.id);
    },
    fire(state, actingPlayer, _targets) {
      const criticalAlly = Object.values(state.players)
        .filter(p => p.isAlive && p.hp < p.maxHp * 0.30 && p.id !== actingPlayer.id)
        .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      if (!criticalAlly) return emptySynergyResult('Bênção da Natureza', '#27ae60');
      const bonusHeal = Math.floor(criticalAlly.maxHp * 0.25);
      const actualHeal = Math.min(criticalAlly.maxHp - criticalAlly.hp, bonusHeal);
      const newPlayers = { ...state.players, [criticalAlly.id]: { ...criticalAlly, hp: criticalAlly.hp + actualHeal } };
      return {
        newState: { players: newPlayers },
        logEntries: [makeLog(state.turn, `🌿💚 SINERGIA — BÊNÇÃO DA NATUREZA! ${criticalAlly.name} recebe +${actualHeal} HP de emergência!`, 'synergy')],
        damages: [],
        heals: [{ unitId: criticalAlly.id, amount: actualHeal }],
        bannerText: 'BÊNÇÃO DA NATUREZA!',
        bannerColor: '#27ae60',
      };
    },
  },

  // ── ELEMENTAL STORM ───────────────────────────────────
  // Elementalist + Mage both alive and attack same target → lightning chain
  {
    id: 'elemental_storm',
    name: 'Tempestade Elemental',
    emoji: '⚡🌊',
    description: 'Elementalista ataca + Mago está vivo → raio encadeado no mesmo alvo',
    requiredClasses: [['elementalist'], ['mage']],
    check(state, actingPlayer) {
      if (actingPlayer.classType !== 'elementalist') return false;
      return Object.values(state.players).some(p => p.classType === 'mage' && p.isAlive);
    },
    fire(state, actingPlayer, targets) {
      const target = targets[0];
      if (!target) return emptySynergyResult('Tempestade Elemental', '#e67e22');
      const mage = Object.values(state.players).find(p => p.classType === 'mage' && p.isAlive)!;
      // Chain: mage auto-fires a lightning bolt
      const dmg = calcDamage({ attackerAtk: mage.attack + 10, targetDef: Math.floor(target.defense * 0.3), roll: rollDice() });
      const slow: StatusEffect = { type: 'slowed', turnsLeft: 1, value: 0.3, sourceId: mage.id };
      const newMonsters = state.monsters.map(m =>
        m.id === target.id ? addEffect({ ...m, hp: Math.max(0, m.hp - dmg) }, slow) as Monster : m
      );
      return {
        newState: { monsters: newMonsters },
        logEntries: [makeLog(state.turn, `⚡🌊 SINERGIA — TEMPESTADE ELEMENTAL! ${mage.name} encadeia raio em ${target.name}: ${dmg} dano + Lentidão!`, 'synergy')],
        damages: [{ unitId: target.id, amount: dmg, isCrit: true }],
        heals: [],
        bannerText: 'TEMPESTADE ELEMENTAL!',
        bannerColor: '#e67e22',
      };
    },
  },

  // ── GUARDIAN SHIELD ───────────────────────────────────
  // Guardian + Paladin both alive → shared shielding
  {
    id: 'guardian_shield',
    name: 'Escudo Sagrado',
    emoji: '🗿🛡️',
    description: 'Guardião + Paladino → quando um aliado seria morto, absorvem o golpe juntos',
    requiredClasses: [['guardian'], ['paladin']],
    check(state, actingPlayer) {
      // This fires reactively during monster attacks — checked differently
      // Here we make it so Guardian's actions buff Paladin's healing
      if (actingPlayer.classType !== 'guardian') return false;
      return Object.values(state.players).some(p => p.classType === 'paladin' && p.isAlive);
    },
    fire(state, actingPlayer, _targets) {
      const paladin = Object.values(state.players).find(p => p.classType === 'paladin' && p.isAlive)!;
      const shield: StatusEffect = { type: 'shielded', turnsLeft: 2, value: Math.floor(actingPlayer.defense * 1.5), sourceId: actingPlayer.id };
      const newPlayers = { ...state.players };
      Object.values(newPlayers).forEach(p => {
        if (p.isAlive) newPlayers[p.id] = addEffect(p, shield) as Player;
      });
      return {
        newState: { players: newPlayers },
        logEntries: [makeLog(state.turn, `🗿🛡️ SINERGIA — ESCUDO SAGRADO! Guardião e Paladino protegem o grupo (${shield.value} absorção)!`, 'synergy')],
        damages: [],
        heals: [],
        bannerText: 'ESCUDO SAGRADO!',
        bannerColor: '#7f8c8d',
      };
    },
  },
];

// ─── Momentum / Group Synergy Attack ──────────────────────

export function checkMomentumSynergy(state: CombatState): CombatState | null {
  if (!state.synergyReady || state.groupMomentum < BALANCE.MOMENTUM_MAX) return null;

  const alivePlayers = Object.values(state.players).filter(p => p.isAlive);
  const aliveEnemies = state.monsters.filter(m => m.hp > 0 && !m.isSummon);
  if (aliveEnemies.length === 0) return null;

  const newLog = [...state.log];
  newLog.push(makeLog(state.turn, `✨ ATAQUE SINCRONIZADO! O grupo age em uníssono!`, 'synergy'));

  // Each alive player deals a bonus hit
  const newMonsters = [...state.monsters];
  alivePlayers.forEach(player => {
    const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    const dmg = calcDamage({
      attackerAtk: player.attack,
      targetDef: Math.floor(target.defense * 0.4),
      roll: rollDice(),
      bonus: 15,
    });
    const idx = newMonsters.findIndex(m => m.id === target.id);
    if (idx !== -1) {
      newMonsters[idx] = { ...newMonsters[idx], hp: Math.max(0, newMonsters[idx].hp - dmg) };
    }
    newLog.push(makeLog(state.turn, `✨ ${player.name} [${player.classType}]: ${dmg} dano sincronizado!`, 'synergy'));
  });

  return {
    ...state,
    monsters: newMonsters,
    log: newLog,
    groupMomentum: 0,
    synergyReady: false,
  };
}

// ─── Check and fire any triggered synergies ───────────────
export function checkSynergies(
  state: CombatState,
  actingPlayer: Player,
  lastSkillTag?: string,
  primaryTargets?: Monster[]
): { fired: SynergyDefinition[]; newState: CombatState } {
  let currentState = state;
  const fired: SynergyDefinition[] = [];

  for (const synergy of SYNERGIES) {
    // Check class requirements
    const classesPresent = synergy.requiredClasses.every(classGroup =>
      classGroup.some(cls => Object.values(state.players).some(p => p.classType === cls && p.isAlive))
    );
    if (!classesPresent) continue;
    if (!synergy.check(currentState, actingPlayer, lastSkillTag)) continue;

    const targets = primaryTargets ?? currentState.monsters.filter(m => m.hp > 0 && !m.isSummon);
    const result = synergy.fire(currentState, actingPlayer, targets);

    currentState = {
      ...currentState,
      ...result.newState,
      log: [...currentState.log, ...result.logEntries],
    };
    fired.push(synergy);
  }

  return { fired, newState: currentState };
}

function emptySynergyResult(name: string, color: string): SynergyResult {
  return { newState: {}, logEntries: [], damages: [], heals: [], bannerText: name, bannerColor: color };
}