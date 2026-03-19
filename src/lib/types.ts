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
}

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
  necromancerBuff?: { damage: number; turnsLeft: number };
  statusEffects: StatusEffect[];
}

export interface StatusEffect {
  type: 'necromancer_buff' | 'poisoned' | 'stunned';
  value: number;
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
  statusEffects?: StatusEffect[];
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
  damage?: number;
  heal?: number;
  effect?: string;
  aoe?: boolean;
}