export type ClassType = 'warrior' | 'mage' | 'rogue' | 'necromancer' | 'paladin' | 'ranger';

export type MapId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ClassDefinition {
  name: string;
  emoji: string;
  description: string;
  baseStats: {
    hp: number;
    mp: number;
    attack: number;
    defense: number;
  };
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
  | 'shopping'           // pre-combat shop or mid-combat break
  | 'combat'
  | 'victory_shopping'   // post-boss shop before next map
  | 'defeat';

export type TurnPhase = 'player_turns' | 'processing' | 'monster_turns' | 'broadcast';

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Record<string, Player>;
  playerOrder: string[];
  currentPlayerIndex: number;
  activePlayerId: string | null; // whose turn it is right now
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
  waveNumber: number; // track waves within a map
  shopCountdown: number; // turns until next shop break
}

export type SocketEvent =
  | { type: 'player_join'; payload: { name: string } }
  | { type: 'select_class'; payload: { classType: ClassType } }
  | { type: 'player_ready' }
  | { type: 'select_map'; payload: { mapId: MapId } }
  | { type: 'player_action'; payload: PlayerAction }
  | { type: 'buy_item'; payload: { itemId: string } }
  | { type: 'start_combat' };

export type PlayerAction =
  | { type: 'attack'; targetId: string }
  | { type: 'special'; targetId: string }
  | { type: 'use_item'; itemId: string; targetId?: string }
  | { type: 'skill'; skillIndex: number; targetId: string };

export interface Skill {
  name: string;
  description: string;
  mpCost: number;
  emoji: string;
  damage?: number;
  heal?: number;
  effect?: string;
}