export type ClassType =
  | 'warrior'
  | 'mage'
  | 'rogue'
  | 'necromancer'
  | 'paladin'
  | 'ranger'
  | 'assassin'
  | 'elementalist'
  | 'berserker'
  | 'guardian'
  | 'druid'
  | 'bard';

export type MapId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ClassDefinition {
  name: string;
  emoji: string;
  description: string;
  baseStats: { hp: number; mp: number; attack: number; defense: number; };
  special: string;
  unlockedByDefault: boolean;
  unlockMap?: MapId;
  color: string;
}

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
  permanent?: boolean; // equipment that persists across maps/class changes
}

export interface PlayerBuffs {
  // Temporary ATK/DEF bonus (lasts N turns)
  tempAtkBonus: number;
  tempDefBonus: number;
  tempBonusTurns: number;
  // Regen
  regenHpPerTurn: number;
  regenTurnsLeft: number;
  // Dodge (skip next incoming hits)
  dodgeTurnsLeft: number;
  // Aim (bonus on next basic attack)
  aimBonus: number;
  // Counter-reflect
  counterReflect: number; // fraction 0–1
  // Guardian wall (reduce all group damage)
  wallTurnsLeft: number;
  // Necromancer group buff
  necroBonusDmg: number;
  necroBonusTurnsLeft: number;
  // Berserk
  berserkTurnsLeft: number;
}

export const DEFAULT_BUFFS: PlayerBuffs = {
  tempAtkBonus: 0, tempDefBonus: 0, tempBonusTurns: 0,
  regenHpPerTurn: 0, regenTurnsLeft: 0,
  dodgeTurnsLeft: 0,
  aimBonus: 0,
  counterReflect: 0,
  wallTurnsLeft: 0,
  necroBonusDmg: 0, necroBonusTurnsLeft: 0,
  berserkTurnsLeft: 0,
};

export interface Player {
  id: string;
  name: string;
  classType: ClassType;
  level: number;
  xp: number;
  xpToNextLevel: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  baseAttack: number;
  baseDefense: number;
  inventory: Item[];
  coins: number;
  isReady: boolean;
  isAlive: boolean;
  buffs: PlayerBuffs;
  // Legacy (kept for compat)
  statusEffects: StatusEffect[];
}

export interface StatusEffect {
  type: 'necromancer_buff' | 'poisoned' | 'stunned';
  value: number;
  turnsLeft: number;
}

export interface MonsterEffect {
  type: 'poisoned' | 'stunned' | 'cursed' | 'marked' | 'slowed';
  damage?: number;         // poison dps
  atkReduction?: number;   // curse
  defReduction?: number;   // curse
  damageMultiplier?: number; // mark (e.g. 1.5 = +50%)
  turnsLeft: number;
}

export interface Monster {
  id: string;
  name: string;
  emoji: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xpReward: number;
  coinReward: number;
  isBoss: boolean;
  effects: MonsterEffect[];
}

export interface MapDefinition {
  id: MapId;
  name: string;
  theme: string;
  description: string;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado' | 'Épico' | 'Lendário';
  defenseDebuff: number;
  manaCostMultiplier: number;
  monsters: Monster[];
  boss: Monster;
  bgColor: string;
  unlocked: boolean;
}

export interface CombatLogEntry {
  id: string;
  turn: number;
  message: string;
  type: 'player_action' | 'monster_action' | 'system' | 'level_up' | 'death';
  timestamp: number;
}

export type GamePhase =
  | 'lobby'
  | 'class_selection'
  | 'map_selection'
  | 'shopping'
  | 'combat'
  | 'victory_shopping'
  | 'defeat';

export type TurnPhase = 'player_turns' | 'processing' | 'monster_turns' | 'broadcast';

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Record<string, Player>;
  playerOrder: string[];
  currentPlayerIndex: number;
  activePlayerId: string | null;
  currentMap: MapId;
  currentMonsters: Monster[];
  turn: number;
  turnPhase: TurnPhase;
  combatLog: CombatLogEntry[];
  groupCoins: number;
  unlockedMaps: MapId[];
  unlockedClasses: ClassType[];
  actionsThisTurn: Record<string, boolean>;
  shopItems: Item[];
  bossDefeated: boolean;
  waveNumber: number;
  shopCountdown: number;
  shopReady: Record<string, boolean>;
}

export type PlayerAction =
  | { type: 'attack'; targetId: string }
  | { type: 'use_potion'; itemId: string }
  | { type: 'skill'; skillIndex: number; targetId?: string };

export interface Skill {
  name: string;
  description: string;
  mpCost: number;
  emoji: string;
  // What the skill does
  damage?: number;
  heal?: number;
  aoe?: boolean;
  targetAlly?: boolean; // needs ally click to use
  selfOnly?: boolean;   // applies to caster only
  // Effect tags
  effect?: SkillEffect;
  // Effect params
  poisonDmg?: number;
  poisonTurns?: number;
  stunTurns?: number;
  defBonus?: number;
  defBonusTurns?: number;
  atkGroupBonus?: number;
  atkGroupTurns?: number;
  necroAtkBonus?: number;
  necroBonusTurns?: number;
  curseDef?: number;
  curseAtk?: number;
  curseTurns?: number;
  markMult?: number;   // e.g. 1.6
  markTurns?: number;
  aimBonus?: number;
  regenHp?: number;
  regenTurns?: number;
  wallTurns?: number;
  counterPct?: number;
  berserkAtkBonus?: number;
  berserkDefPenalty?: number;
  berserkTurns?: number;
  baladaAtk?: number;
  baladaDef?: number;
  baladaHeal?: number;
  reviveHpPct?: number;
  pierceDef?: boolean; // ignores defense
}

export type SkillEffect =
  | 'poison' | 'stun' | 'defense_up' | 'group_atk_up' | 'necro_buff'
  | 'curse' | 'mark' | 'aim' | 'regen' | 'wall' | 'counter'
  | 'berserk' | 'dodge' | 'balada' | 'revive' | 'aoe_heal'
  | 'pierce' | 'ignore_half_def' | 'execute' | 'rage_scale'
  | 'slow' | 'taunt';