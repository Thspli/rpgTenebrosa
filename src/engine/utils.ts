// ═══════════════════════════════════════════════════════════
//  REALM OF SHADOWS — Combat Utilities
// ═══════════════════════════════════════════════════════════

import { Unit, Player, Monster, StatusEffect, EffectType, LogEntry, SkillResult } from './types';
import { nanoid } from 'nanoid';

// ─── Balance Constants ─────────────────────────────────────
// Change numbers HERE only — no hunting through 900 lines
export const BALANCE = {
  // Dice
  DICE_SIDES: 10,
  DICE_BONUS: 1, // floor(1..10)

  // Damage formula: floor(ATK + ROLL + bonus - DEF * defMult)
  // DEF is never fully ignored — minimum 1 damage always
  DEF_MULT_NORMAL: 1.0,
  DEF_MULT_PIERCE: 0.15,      // "ignore defense" skills leave 15% — not 0
  DEF_MULT_HALF: 0.5,
  DEF_MULT_AOE: 0.6,          // AoE skills hit slightly weaker vs defense

  // Crit (from dice roll = 10)
  CRIT_MULTIPLIER: 1.6,
  CRIT_ROLL: 10,

  // Execution — capped unlike before (was basically infinite)
  EXECUTE_THRESHOLD: 0.40,    // target must be below 40% HP (was 50%)
  EXECUTE_MULTIPLIER: 2.2,    // was 3x — still strong but not broken
  EXECUTE_DEF_MULT: 0.25,     // still mostly ignores def

  // Berserker rage scale
  RAGE_MAX_MULTIPLIER: 2.5,   // at 0 HP remaining would be 2.5x (was 3x)

  // Shaman spirit stacks
  SPIRIT_DMG_PER_STACK: 12,   // flat
  SPIRIT_ATK_SCALE: 0.4,      // also scales with ATK (was fully flat = bad)
  SPIRIT_MAX_STACKS: 5,

  // AoE damage split: hits all enemies but each gets slightly less
  AOE_COUNT_PENALTY: false,   // true = split damage, false = full damage each (we keep full)

  // Momentum / Synergy
  MOMENTUM_MAX: 100,
  MOMENTUM_PER_KILL: 20,
  MOMENTUM_PER_CRIT: 12,
  MOMENTUM_PER_HEAL: 8,
  MOMENTUM_PER_ULT: 25,
  MOMENTUM_DECAY_PER_TURN: 5, // drains slowly if group is passive

  // Level scaling
  HP_PER_LEVEL: 16,
  MP_PER_LEVEL: 10,
  ATK_PER_LEVEL: 1.5,         // flat per level (was 1.8 — warriors were too strong late)
  DEF_PER_LEVEL: 0.8,

  // MP regen per turn (% of maxMp)
  MP_REGEN_PCT: 0.07,

  // Summon HP/ATK scaling with owner
  SUMMON_HP_OWNER_SCALE: 0.5, // summon HP = base + ownerLevel * 8 + ownerMaxHp * 0.1
  SUMMON_ATK_OWNER_SCALE: 0.35,
} as const;

// ─── Dice ─────────────────────────────────────────────────
export function rollDice(): number {
  return Math.floor(Math.random() * BALANCE.DICE_SIDES) + BALANCE.DICE_BONUS;
}

export function isCrit(roll: number): boolean {
  return roll === BALANCE.CRIT_ROLL;
}

// ─── Damage Calculation ───────────────────────────────────
export interface DamageOptions {
  attackerAtk: number;
  targetDef: number;
  roll: number;
  bonus?: number;           // flat bonus damage
  defMult?: number;         // override DEF multiplier
  damageMultiplier?: number; // post-calc multiplier (marks, crits, etc.)
}

export function calcDamage(opts: DamageOptions): number {
  const {
    attackerAtk,
    targetDef,
    roll,
    bonus = 0,
    defMult = BALANCE.DEF_MULT_NORMAL,
    damageMultiplier = 1,
  } = opts;

  const effectiveDef = Math.floor(targetDef * defMult);
  const raw = roll + attackerAtk + bonus - effectiveDef;
  const final = Math.max(1, Math.round(raw * damageMultiplier));
  return final;
}

// ─── Effect Helpers ───────────────────────────────────────
export function hasEffect(unit: Unit, type: EffectType): boolean {
  return unit.effects.some(e => e.type === type && e.turnsLeft > 0);
}

export function getEffect(unit: Unit, type: EffectType): StatusEffect | undefined {
  return unit.effects.find(e => e.type === type && e.turnsLeft > 0);
}

export function addEffect(unit: Unit, effect: StatusEffect): Unit {
  // For stackable effects (bleeding), add stacks
  if (effect.type === 'bleeding') {
    const existing = unit.effects.find(e => e.type === 'bleeding');
    if (existing) {
      return {
        ...unit,
        effects: unit.effects.map(e =>
          e.type === 'bleeding'
            ? { ...e, stacks: (e.stacks ?? 1) + 1, turnsLeft: Math.max(e.turnsLeft, effect.turnsLeft) }
            : e
        ),
      };
    }
  }
  // For non-stackable, replace existing
  const filtered = unit.effects.filter(e => e.type !== effect.type);
  return { ...unit, effects: [...filtered, effect] };
}

export function removeEffect(unit: Unit, type: EffectType): Unit {
  return { ...unit, effects: unit.effects.filter(e => e.type !== type) };
}

export function tickEffects(unit: Unit): { unit: Unit; tickDamage: number; tickHeal: number } {
  let tickDamage = 0;
  let tickHeal = 0;

  const newEffects: StatusEffect[] = [];

  for (const eff of unit.effects) {
    const remaining = eff.turnsLeft - 1;

    switch (eff.type) {
      case 'poisoned':
        tickDamage += eff.value;
        break;
      case 'burning':
        tickDamage += eff.value;
        break;
      case 'bleeding':
        tickDamage += eff.value * (eff.stacks ?? 1);
        break;
      case 'regenerating':
        tickHeal += eff.value;
        break;
      default:
        break;
    }

    if (remaining > 0) {
      newEffects.push({ ...eff, turnsLeft: remaining });
    }
  }

  const newHp = Math.max(0, Math.min(unit.maxHp, unit.hp - tickDamage + tickHeal));
  return {
    unit: { ...unit, effects: newEffects, hp: newHp, isAlive: newHp > 0 },
    tickDamage,
    tickHeal,
  };
}

// ─── Effective Stats (with effects applied) ───────────────
export function getEffectiveAtk(unit: Unit): number {
  let atk = unit.attack;
  for (const eff of unit.effects) {
    if (eff.type === 'empowered') atk += eff.value;
    if (eff.type === 'enraged') atk += eff.value;
    if (eff.type === 'cursed') atk -= eff.value; // cursed stores ATK reduction in value... wait
  }
  return Math.max(1, atk);
}

export function getEffectiveDef(unit: Unit): number {
  let def = unit.defense;
  for (const eff of unit.effects) {
    if (eff.type === 'fortified') def += eff.value;
  }
  return Math.max(0, def);
}

export function getCursedDefReduction(unit: Unit): number {
  const curse = unit.effects.find(e => e.type === 'cursed');
  return curse ? Math.floor(curse.value) : 0; // value = def reduction
}

export function getCursedAtkReduction(unit: Unit): number {
  const curse = unit.effects.find(e => e.type === 'cursed');
  return curse ? Math.floor(curse.value * 0.6) : 0; // atk reduction = 60% of def reduction
}

export function getMarkMultiplier(unit: Unit): number {
  const mark = unit.effects.find(e => e.type === 'marked');
  return mark ? mark.value : 1;
}

export function isStunned(unit: Unit): boolean {
  return hasEffect(unit, 'stunned') || hasEffect(unit, 'frozen');
}

export function isInvisible(unit: Unit): boolean {
  return hasEffect(unit, 'invisible');
}

// ─── Log Builder ──────────────────────────────────────────
export function makeLog(turn: number, message: string, type: LogEntry['type']): LogEntry {
  return { id: nanoid(), turn, message, type, timestamp: Date.now() };
}

// ─── Empty SkillResult ────────────────────────────────────
export function emptyResult(): SkillResult {
  return {
    logEntries: [],
    statePatches: {},
    damages: [],
    heals: [],
    effectsApplied: [],
  };
}

// ─── XP ──────────────────────────────────────────────────
export function xpToNextLevel(level: number): number {
  return level * 100;
}

export function applyXp(player: Player, xpGain: number): { player: Player; leveled: boolean; newLevel?: number } {
  let p = { ...player, xp: player.xp + xpGain };
  let leveled = false;
  let newLevel: number | undefined;

  while (p.xp >= p.xpToNextLevel) {
    p.xp -= p.xpToNextLevel;
    const lv = p.level + 1;
    p = {
      ...p,
      level: lv,
      xpToNextLevel: xpToNextLevel(lv),
      maxHp: p.maxHp + BALANCE.HP_PER_LEVEL,
      hp: p.hp + BALANCE.HP_PER_LEVEL,
      maxMp: p.maxMp + BALANCE.MP_PER_LEVEL,
      mp: p.mp + BALANCE.MP_PER_LEVEL,
      attack: p.baseAttack + Math.floor(lv * BALANCE.ATK_PER_LEVEL),
      defense: p.baseDefense + Math.floor(lv * BALANCE.DEF_PER_LEVEL),
    };
    leveled = true;
    newLevel = lv;
  }

  return { player: p, leveled, newLevel };
}

// ─── Emoji Utilities ──────────────────────────────────────
/**
 * Get the emoji to display for a unit/skill
 * Returns a random variant if emojiVariants exists, otherwise the base emoji
 */
export function getDisplayEmoji(emoji: string, variants?: string[]): string {
  if (!variants || variants.length === 0) return emoji;
  const randomIndex = Math.floor(Math.random() * variants.length);
  return variants[randomIndex];
}