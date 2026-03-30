// ═══════════════════════════════════════════════════════════
//  REALM OF SHADOWS — Engine Types v2
// ═══════════════════════════════════════════════════════════

export type ClassType =
  | 'warrior' | 'mage' | 'rogue' | 'necromancer' | 'paladin'
  | 'ranger' | 'assassin' | 'elementalist' | 'berserker' | 'guardian'
  | 'druid' | 'bard' | 'animalist' | 'shaman' | 'trickster';

export type MapId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type GamePhase =
  | 'lobby' | 'class_selection' | 'map_selection'
  | 'shopping' | 'combat' | 'victory_shopping' | 'defeat';

export type LogType = 'player_action' | 'monster_action' | 'system' | 'level_up' | 'death' | 'synergy';

// ─── Status Effects ───────────────────────────────────────
// Every effect on a unit is a StatusEffect — clean and uniform
export type EffectType =
  | 'poisoned'      // dmg per turn
  | 'stunned'       // skip turn
  | 'slowed'        // -30% damage dealt
  | 'cursed'        // -DEF, -ATK
  | 'marked'        // +% damage taken
  | 'burning'       // dmg per turn, higher than poison
  | 'frozen'        // stunned + next hit deals +50% dmg
  | 'bleeding'      // dmg per turn, stacks
  | 'shielded'      // absorbs flat damage
  | 'regenerating'  // HP per turn
  | 'empowered'     // +ATK bonus
  | 'fortified'     // +DEF bonus
  | 'inspired'      // +% damage dealt (bard synergy)
  | 'enraged'       // +ATK but -DEF
  | 'invisible'     // dodge next N hits
  | 'cloned'        // absorbs 1 hit and reflects
  | 'marked_death'  // assassin mark: next hit executes if <40% hp
  | 'soul_link'     // necro: damage dealt heals the linked ally
  | 'spirit_charge' // shaman: accumulated energy
  | 'momentum';     // group synergy charge

export interface StatusEffect {
  type: EffectType;
  turnsLeft: number;
  value: number;      // damage / bonus amount / stacks
  sourceId?: string;  // who applied it
  stacks?: number;    // for stackable effects like bleeding
}

// ─── Entities ────────────────────────────────────────────
export interface Unit {
  id: string;
  name: string;
  emoji: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  effects: StatusEffect[];
  isAlive: boolean;
}

export interface Player extends Unit {
  classType: ClassType;
  baseAttack: number;
  baseDefense: number;
  xp: number;
  xpToNextLevel: number;
  coins: number;
  inventory: Item[];
  isReady: boolean;
  // Transform state
  transformed: boolean;
  transformTurnsLeft: number;
  transformUsedThisCombat: boolean;
  // Class-specific counters (clean — no more giant buff object)
  soulCount: number;       // necromancer
  summonCount: number;     // animalist
  spiritStacks: number;    // shaman
  // Synergy
  momentumContribution: number; // how much this player contributed to group momentum
}

export interface Monster extends Unit {
  isBoss: boolean;
  isSummon: boolean;
  xpReward: number;
  coinReward: number;
  // Boss specific
  multiAttack?: number;
  enrageThreshold?: number;
  enrageAtkBonus?: number;
  armorPierce?: number;
  regenPerTurn?: number;
  splashChance?: number;
  bossUlt?: BossUlt;
  ultCooldown?: number;
  ultTurnsLeft?: number;
  // Summon specific
  summonOwnerId?: string;
  summonDuration?: number;
  summonRole?: 'damage' | 'tank' | 'healer' | 'buffer' | 'debuffer';
  summonAbility?: SummonAbility;
  isNecroShadow?: boolean;
}

export interface SummonAbility {
  type: 'attack' | 'heal_lowest' | 'buff_group' | 'aoe_attack' | 'taunt';
  value: number;       // damage / heal / buff amount
  attackCount?: number;
  armorPierce?: number;
  poisonOnHit?: number;
}

export interface BossUlt {
  name: string;
  emoji: string;
  lines: string[];
  color: string;
  bg: string;
  aoeDamage?: number;
  healSelf?: number;
  removeDebuffs?: boolean;
  buffAtk?: number;
  buffAtkTurns?: number;
  enrageMultiplier?: number;
}

// ─── Skills ──────────────────────────────────────────────
// Each skill is a self-contained object — no more giant if/else
export type SkillTarget = 'enemy' | 'enemy_aoe' | 'ally' | 'ally_aoe' | 'self' | 'none';
export type SkillCategory = 'attack' | 'magic' | 'support' | 'buff' | 'summon' | 'ultimate';

export interface SkillContext {
  state: CombatState;
  caster: Player;
  target?: Unit;        // single target
  targets?: Unit[];     // aoe resolved targets
  roll: number;         // 1-10 dice roll
}

export interface SkillResult {
  logEntries: LogEntry[];
  statePatches: Partial<CombatState>;
  // Explicit outcomes for UI feedback
  damages: { unitId: string; amount: number; isCrit?: boolean }[];
  heals: { unitId: string; amount: number }[];
  effectsApplied: { unitId: string; effect: StatusEffect }[];
  triggerUltCutscene?: UltCutsceneData;
  triggerSynergy?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  emoji: string;
  emojiVariants?: string[]; // Additional emoji options for variety
  description: string;
  mpCost: number;
  target: SkillTarget;
  category: SkillCategory;
  cooldown?: number;         // turns — future feature
  synergyTag?: string;       // for synergy system: 'fire', 'shadow', 'holy', etc.
  isUlt?: boolean;
  ultLevel?: number;         // minimum level to unlock ult
  ultData?: UltCutsceneData;
  // The actual logic — pure function
  execute: (ctx: SkillContext) => SkillResult;
}

// ─── Combat State ─────────────────────────────────────────
export interface CombatState {
  players: Record<string, Player>;
  playerOrder: string[];
  activePlayerId: string | null;
  monsters: Monster[];
  turn: number;
  actionsThisTurn: Record<string, boolean>;
  log: LogEntry[];
  // Synergy / Momentum
  groupMomentum: number;      // 0-100, fills up with good plays
  momentumThreshold: number;  // when full, synergy attack triggers
  synergyReady: boolean;
  // Boss ult pending (for cutscene)
  pendingUlt: UltCutsceneData | null;
}

// ─── Game State (full, includes non-combat) ───────────────
export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Record<string, Player>;
  playerOrder: string[];
  currentMap: MapId;
  monsters: Monster[];
  turn: number;
  combatLog: LogEntry[];
  groupCoins: number;
  unlockedMaps: MapId[];
  actionsThisTurn: Record<string, boolean>;
  activePlayerId: string | null;
  bossDefeated: boolean;
  waveNumber: number;
  // REMOVIDO: shopCountdown foi removido pois loja intermediária foi desabilitada
  // shopCountdown: number;
  shopReady: Record<string, boolean>;
  // Synergy
  groupMomentum: number;
  synergyReady: boolean;
  // ULT cutscene
  activeUlt: UltCutsceneData | null;
}

// ─── Log ─────────────────────────────────────────────────
export interface LogEntry {
  id: string;
  turn: number;
  message: string;
  type: LogType;
  timestamp: number;
}

// ─── ULT Cutscene ────────────────────────────────────────
export interface UltCutsceneData {
  playerId: string;
  playerName: string;
  classType: ClassType;
  ultName: string;
  ultLines: string[];
  ultColor: string;
  ultBg: string;
  ultEmoji: string;
  isBossUlt?: boolean;
  bossName?: string;
  isTransform?: boolean;
}

// ─── Items ───────────────────────────────────────────────
export interface Item {
  id: string;
  name: string;
  emoji: string;
  price: number;
  attackBonus: number;
  defenseBonus: number;
  hpBonus?: number;
  mpBonus?: number;
  description: string;
  consumable?: boolean;
  consumeHeal?: number;
  consumeMpHeal?: number;
  quantity?: number;
  permanent?: boolean;
  isTransformItem?: boolean;
}

export interface ClassDefinition {
  name: string;
  emoji: string;
  emojiVariants: string[]; // Additional emoji options for variety
  description: string;
  color: string;
  role: 'tank' | 'dps' | 'support' | 'hybrid';
  baseStats: { hp: number; mp: number; attack: number; defense: number };
  passiveDescription: string; // what makes this class unique mechanically
  synergyTags: string[];      // what synergies this class provides/benefits from
}