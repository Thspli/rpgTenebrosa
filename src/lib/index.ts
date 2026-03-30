// ═══════════════════════════════════════════════════════════
//  src/lib/index.ts — Ponte de compatibilidade
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

export { CLASSES, MAPS, SHOP_ITEMS, TRANSFORM_ITEM } from '@/engine/data';
export { CLASS_SKILLS as SKILLS } from '@/engine/skills';

import type { Player, GameState } from '@/engine/types';

export function getPlayerBuffs(player: Player) {
  const fx = player.effects ?? [];

  const find = (type: string) => fx.find(e => e.type === type && e.turnsLeft > 0);

  const empowered  = find('empowered');
  const fortified  = find('fortified');
  const wallEffect = fx.find(e => e.type === 'fortified' && e.value > 100 && e.turnsLeft > 0);
  const shielded   = find('shielded');
  const regen      = find('regenerating');
  const invisible  = find('invisible');
  const cloned     = find('cloned');

  return {
    tempAtkBonus:    empowered?.value ?? 0,
    tempDefBonus:    (fortified && fortified.value <= 100) ? fortified.value : 0,
    tempBonusTurns:  empowered?.turnsLeft ?? fortified?.turnsLeft ?? 0,

    regenHpPerTurn:  regen?.value ?? 0,
    regenTurnsLeft:  regen?.turnsLeft ?? 0,

    dodgeTurnsLeft:  invisible?.turnsLeft ?? 0,

    aimBonus: 0,

    counterReflect:  (shielded && shielded.value <= 100) ? shielded.value / 100 : 0,

    wallTurnsLeft:   wallEffect?.turnsLeft ?? 0,

    necroBonusDmg:       0,
    necroBonusTurnsLeft: 0,

    berserkTurnsLeft: 0,

    transformTurnsLeft:       player.transformTurnsLeft  ?? 0,
    transformUsedThisCombat:  player.transformUsedThisCombat ?? false,

    guardianUltTurnsLeft: (shielded && shielded.value > 100) ? shielded.turnsLeft : 0,

    soulCount:    player.soulCount    ?? 0,
    summonCount:  player.summonCount  ?? 0,
    spiritStacks: player.spiritStacks ?? 0,

    cloneTurnsLeft: cloned?.turnsLeft ?? 0,

    guardTurnsLeft:    0,
    guardReductionPct: 0,
  };
}

export function compatGameState(gs: GameState) {
  return {
    ...gs,
    currentMonsters: gs.monsters,
    turnPhase: 'player_turns' as const,
    shopItems: [],
    unlockedClasses: [] as any[],
  };
}