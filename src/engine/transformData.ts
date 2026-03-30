// ═══════════════════════════════════════════════════════════
//  src/lib/index.ts — Ponte de compatibilidade
//  Reexporta tudo do engine. Após migrar os componentes,
//  pode deletar este arquivo e importar direto de @/engine/*.
// ═══════════════════════════════════════════════════════════

// ─── Tipos ────────────────────────────────────────────────
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

// MonsterEffect = alias para StatusEffect (engine unifica)
export type { StatusEffect as MonsterEffect } from '@/engine/types';

// ─── Dados estáticos ──────────────────────────────────────
export { CLASSES, MAPS, SHOP_ITEMS, TRANSFORM_ITEM } from '@/engine/data';

// SKILLS: o engine exporta CLASS_SKILLS (objetos com .execute()).
// Os componentes só leem .name, .emoji, .mpCost, .description — compatível.
export { CLASS_SKILLS as SKILLS } from '@/engine/skills';

// ─── Transforms ───────────────────────────────────────────
// TRANSFORMS exportado via @/engine/transformData
// (que reexporta de src/lib/transformData.ts até migração completa)

// ─── Helpers de compatibilidade: player.buffs ─────────────
// No engine novo, buffs ficam em player.effects: StatusEffect[].
// Esta função recria o formato antigo de PlayerBuffs para que
// Combat.tsx não precise ser reescrito de uma vez.

import type { Player } from '@/engine/types';

export function getPlayerBuffs(player: Player) {
  const fx = player.effects ?? [];

  // Encontra efeito por tipo
  const find = (type: string) => fx.find(e => e.type === type && e.turnsLeft > 0);

  const empowered  = find('empowered');
  const fortified  = find('fortified');
  const wallEffect = fx.find(e => e.type === 'fortified' && e.value > 100 && e.turnsLeft > 0);
  const shielded   = find('shielded');
  const regen      = find('regenerating');
  const invisible  = find('invisible');
  const cloned     = find('cloned');

  return {
    // Ataque / defesa temporários
    tempAtkBonus:    empowered?.value ?? 0,
    tempDefBonus:    (fortified && fortified.value <= 100) ? fortified.value : 0,
    tempBonusTurns:  empowered?.turnsLeft ?? fortified?.turnsLeft ?? 0,

    // Regeneração
    regenHpPerTurn:  regen?.value ?? 0,
    regenTurnsLeft:  regen?.turnsLeft ?? 0,

    // Esquiva
    dodgeTurnsLeft:  invisible?.turnsLeft ?? 0,

    // Aim (mantido como 0 — engine rastreia via empowered com marker especial)
    aimBonus: 0,

    // Contra-ataque: shielded com value <= 100 = % de reflect
    counterReflect:  (shielded && shielded.value <= 100) ? shielded.value / 100 : 0,

    // Muralha: fortified com value > 100 = wall ativo
    wallTurnsLeft:   wallEffect?.turnsLeft ?? 0,

    // Necro buff: empowered aplicado pelo necromante (aproximação)
    necroBonusDmg:       0,
    necroBonusTurnsLeft: 0,

    // Berserk
    berserkTurnsLeft: 0,

    // Transformação — campos diretos no Player no engine novo
    transformTurnsLeft:       player.transformTurnsLeft  ?? 0,
    transformUsedThisCombat:  player.transformUsedThisCombat ?? false,

    // Guardião ult: shielded com value > 100 = invulnerabilidade
    guardianUltTurnsLeft: (shielded && shielded.value > 100) ? shielded.turnsLeft : 0,

    // Counters de classe — campos diretos no Player
    soulCount:    player.soulCount    ?? 0,
    summonCount:  player.summonCount  ?? 0,
    spiritStacks: player.spiritStacks ?? 0,

    // Trickster clone
    cloneTurnsLeft: cloned?.turnsLeft ?? 0,

    // Guard (position swap)
    guardTurnsLeft:    0,
    guardReductionPct: 0,
  };
}

// ─── Helper: campo currentMonsters → monsters ─────────────
// GameState do engine usa .monsters; componentes antigos usam .currentMonsters.
// Cria uma view compatível sem copiar o estado.
import type { GameState } from '@/engine/types';

export function compatGameState(gs: GameState) {
  return {
    ...gs,
    // alias para código legado
    currentMonsters: gs.monsters,
    // alias para turnPhase (não existe no novo engine)
    turnPhase: 'player_turns' as const,
    // shopItems sempre disponível
    shopItems: [],
    // unlockedClasses — engine não tem, assume todas desbloqueadas
    unlockedClasses: Object.keys({}) as any[],
  };
}