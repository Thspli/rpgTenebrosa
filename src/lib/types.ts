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

export type MapId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

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
  permanent?: boolean;
}

export interface PlayerBuffs {
  tempAtkBonus: number;
  tempDefBonus: number;
  tempBonusTurns: number;
  regenHpPerTurn: number;
  regenTurnsLeft: number;
  dodgeTurnsLeft: number;
  aimBonus: number;
  counterReflect: number;
  wallTurnsLeft: number;
  necroBonusDmg: number;
  necroBonusTurnsLeft: number;
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
  statusEffects: StatusEffect[];
}

export interface StatusEffect {
  type: 'necromancer_buff' | 'poisoned' | 'stunned';
  value: number;
  turnsLeft: number;
}

export interface MonsterEffect {
  type: 'poisoned' | 'stunned' | 'cursed' | 'marked' | 'slowed';
  damage?: number;
  atkReduction?: number;
  defReduction?: number;
  damageMultiplier?: number;
  turnsLeft: number;
}

export interface BossUlt {
  name: string;
  emoji: string;
  description: string;
  // what it does
  aoeDamage?: number;       // fixed damage to ALL players (ignores def partially)
  healSelf?: number;        // boss heals itself
  buffAtk?: number;         // boss ATK boost for N turns
  buffAtkTurns?: number;
  removeAllDebuffs?: boolean;
  enrageMultiplier?: number; // permanent dmg multiplier after ult
  color: string;
  bg: string;
  lines: string[];
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
  // Boss mechanics
  multiAttack?: number;          // how many times boss attacks per turn
  enrageThreshold?: number;      // HP% where boss enrages (0.5 = 50%)
  enraged?: boolean;             // runtime flag
  enrageAtkBonus?: number;       // bonus ATK when enraged
  ultCooldown?: number;          // turns between boss ults
  ultTurnsLeft?: number;         // runtime: turns until next ult
  bossUlt?: BossUlt;             // boss ultimate ability
  ultUsed?: boolean;             // runtime: has ult been used this fight?
  // Splash attack: hits multiple players
  splashChance?: number;         // 0-1 chance to splash AOE attack
  armorPierce?: number;          // % of defense ignored (0-1)
  regenPerTurn?: number;         // boss regenerates HP each turn
}

export interface MapDefinition {
  id: MapId;
  name: string;
  theme: string;
  description: string;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado' | 'Épico' | 'Lendário' | 'Infernal' | 'Divino';
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
  activeUlt?: {
    playerId: string;
    playerName: string;
    classType: ClassType;
    ultName: string;
    ultLines: string[];
    ultColor: string;
    ultBg: string;
    ultEmoji: string;
    // Boss ult variant
    isBossUlt?: boolean;
    bossName?: string;
  } | null;
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
  damage?: number;
  heal?: number;
  aoe?: boolean;
  targetAlly?: boolean;
  selfOnly?: boolean;
  effect?: SkillEffect;
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
  markMult?: number;
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
  pierceDef?: boolean;
  ultLevel?: number;
  ultName?: string;
  ultLines?: string[];
  ultColor?: string;
  ultBg?: string;
}

export type SkillEffect =
  | 'poison' | 'stun' | 'defense_up' | 'group_atk_up' | 'necro_buff'
  | 'curse' | 'mark' | 'aim' | 'regen' | 'wall' | 'counter'
  | 'berserk' | 'dodge' | 'balada' | 'revive' | 'aoe_heal'
  | 'pierce' | 'ignore_half_def' | 'execute' | 'rage_scale'
  | 'slow' | 'taunt' | 'ult';