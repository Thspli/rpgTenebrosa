// ═══════════════════════════════════════════════════════════
//  src/lib/types.ts — Re-exporta tipos do engine
// ═══════════════════════════════════════════════════════════

export type {
  ClassType,
  MapId,
  GameState,
  GamePhase,
  Player,
  Monster,
  Item,
  UltCutsceneData,
  StatusEffect,
  LogEntry as CombatLogEntry,
  BossUlt,
  SummonAbility,
  Skill,
  SkillResult,
  SkillContext,
} from '@/engine/types';

export type { StatusEffect as MonsterEffect } from '@/engine/types';