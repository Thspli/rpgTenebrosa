import { ClassDefinition, ClassType, Item, MapDefinition, MapId, Monster, Skill } from './types';

export const CLASSES: Record<ClassType, ClassDefinition> = {
  warrior: {
    name: 'Guerreiro',
    emoji: '⚔️',
    description: 'Combatente corpo-a-corpo com alta defesa e vida.',
    baseStats: { hp: 120, mp: 40, attack: 8, defense: 6 },
    special: 'Fúria de Batalha: Ataque duplo que ignora 50% da defesa inimiga.',
    unlockedByDefault: true,
    color: '#e74c3c',
  },
  mage: {
    name: 'Mago',
    emoji: '🔮',
    description: 'Lançador de magias com alto ataque mágico e baixa defesa.',
    baseStats: { hp: 70, mp: 120, attack: 12, defense: 2 },
    special: 'Explosão Arcana: Dano massivo em área a todos os inimigos.',
    unlockedByDefault: true,
    color: '#9b59b6',
  },
  rogue: {
    name: 'Ladino',
    emoji: '🗡️',
    description: 'Ágil e furtivo, causa dano crítico com habilidade.',
    baseStats: { hp: 85, mp: 60, attack: 10, defense: 3 },
    special: 'Golpe Crítico: Dano triplicado com chance de atordoar.',
    unlockedByDefault: true,
    color: '#1abc9c',
  },
  necromancer: {
    name: 'Necromante',
    emoji: '💀',
    description: 'Invoca mortos para lutar. Passiva: +4 dano por 3 turnos ao agir.',
    baseStats: { hp: 75, mp: 100, attack: 9, defense: 2 },
    special: 'Invocar Morto-Vivo: Adiciona +4 dano fixo por 3 turnos ao grupo.',
    unlockedByDefault: true,
    color: '#2ecc71',
  },
  paladin: {
    name: 'Paladino',
    emoji: '🛡️',
    description: 'Guerreiro sagrado que pode curar aliados e tankar dano.',
    baseStats: { hp: 110, mp: 70, attack: 7, defense: 8 },
    special: 'Bênção Divina: Cura 30HP de todos os aliados vivos.',
    unlockedByDefault: false,
    unlockMap: 1,
    color: '#f39c12',
  },
  ranger: {
    name: 'Arqueiro',
    emoji: '🏹',
    description: 'Atirador preciso com bônus de ataque à distância e mobilidade.',
    baseStats: { hp: 90, mp: 80, attack: 11, defense: 4 },
    special: 'Chuva de Flechas: Ataca todos os inimigos por dano moderado.',
    unlockedByDefault: false,
    unlockMap: 2,
    color: '#3498db',
  },
};

export const SKILLS: Record<ClassType, Skill[]> = {
  warrior: [
    { name: 'Golpe Pesado', description: 'Ataque poderoso que causa +5 de dano', mpCost: 0, emoji: '⚔️', damage: 5 },
    { name: 'Provocar', description: 'Atrai atenção dos inimigos, reduz dano ao grupo', mpCost: 10, emoji: '😤', effect: 'taunt' },
    { name: 'Bloqueio', description: 'Aumenta sua defesa em +5 por 1 turno', mpCost: 15, emoji: '🛡️', effect: 'defense_up' },
    { name: 'Fúria de Batalha', description: 'Ataque duplo que ignora 50% da defesa inimiga', mpCost: 30, emoji: '💢', damage: 15 },
  ],
  mage: [
    { name: 'Bola de Fogo', description: 'Projétil flamejante que causa +7 de dano', mpCost: 15, emoji: '🔥', damage: 7 },
    { name: 'Raio de Gelo', description: 'Congela o alvo, causando +6 de dano', mpCost: 12, emoji: '❄️', damage: 6 },
    { name: 'Escudo Arcano', description: 'Cria barreira mágica, +6 defesa por 1 turno', mpCost: 20, emoji: '🔵', effect: 'defense_up' },
    { name: 'Explosão Arcana', description: 'Dano massivo em todos os inimigos', mpCost: 50, emoji: '💥', damage: 20 },
  ],
  rogue: [
    { name: 'Punhalada', description: 'Ataque rápido que causa +4 de dano', mpCost: 0, emoji: '🗡️', damage: 4 },
    { name: 'Envenenar', description: 'Veneno que causa dano por 3 turnos', mpCost: 20, emoji: '☠️', effect: 'poison' },
    { name: 'Fumaça', description: 'Reduz chance de ser atacado por 1 turno', mpCost: 15, emoji: '💨', effect: 'dodge' },
    { name: 'Golpe Crítico', description: 'Dano triplicado com chance de atordoar', mpCost: 40, emoji: '⚡', damage: 18 },
  ],
  necromancer: [
    { name: 'Raio Sombrio', description: 'Projétil de trevas que causa +5 de dano', mpCost: 10, emoji: '🖤', damage: 5 },
    { name: 'Drenar Vida', description: 'Rouba HP do inimigo (+4 dano, +4 cura)', mpCost: 20, emoji: '🩸', damage: 4, heal: 4 },
    { name: 'Maldição', description: 'Reduz ataque do inimigo por 2 turnos', mpCost: 25, emoji: '🔮', effect: 'curse' },
    { name: 'Invocar Morto-Vivo', description: 'Adiciona +4 dano fixo por 3 turnos', mpCost: 45, emoji: '💀', effect: 'necro_buff' },
  ],
  paladin: [
    { name: 'Smite', description: 'Golpe sagrado que causa +6 de dano', mpCost: 10, emoji: '✨', damage: 6 },
    { name: 'Curar', description: 'Restaura 20HP de um aliado', mpCost: 20, emoji: '💚', heal: 20 },
    { name: 'Escudo de Luz', description: 'Proteção divina, +8 defesa por 1 turno', mpCost: 25, emoji: '🌟', effect: 'defense_up' },
    { name: 'Bênção Divina', description: 'Cura 30HP de todos os aliados vivos', mpCost: 60, emoji: '🙏', heal: 30 },
  ],
  ranger: [
    { name: 'Flechada', description: 'Tiro preciso que causa +5 de dano', mpCost: 0, emoji: '🏹', damage: 5 },
    { name: 'Armadilha', description: 'Prende o inimigo, impedindo de atacar', mpCost: 20, emoji: '🪤', effect: 'stun' },
    { name: 'Olho de Águia', description: 'Próximo ataque causa +10 de dano extra', mpCost: 25, emoji: '🦅', effect: 'aim' },
    { name: 'Chuva de Flechas', description: 'Ataca todos os inimigos por dano moderado', mpCost: 45, emoji: '🌧️', damage: 10 },
  ],
};

function makeMonster(
  id: string, name: string, emoji: string, level: number,
  hp: number, attack: number, defense: number,
  xp: number, coins: number, isBoss = false
): Monster {
  return { id, name, emoji, level, hp, maxHp: hp, attack, defense, xpReward: xp, coinReward: coins, isBoss };
}

export const MAPS: MapDefinition[] = [
  {
    id: 1,
    name: 'Floresta Sombria',
    theme: '🌲',
    description: 'Uma floresta antiga cheia de criaturas selvagens. Ideal para iniciantes.',
    difficulty: 'Iniciante',
    defenseDebuff: 0,
    manaCostMultiplier: 1,
    bgColor: '#1a2f1a',
    unlocked: true,
    monsters: [
      makeMonster('goblin', 'Goblin', '👺', 1, 30, 4, 1, 15, 5),
      makeMonster('wolf', 'Lobo Selvagem', '🐺', 1, 25, 5, 2, 12, 4),
      makeMonster('slime', 'Gosma Verde', '🟢', 1, 20, 3, 0, 10, 3),
      makeMonster('spider', 'Aranha Gigante', '🕷️', 1, 28, 4, 1, 14, 4),
    ],
    boss: makeMonster('troll', 'Troll da Floresta', '👹', 1, 120, 8, 4, 80, 30, true),
  },
  {
    id: 2,
    name: 'Cavernas de Pedra',
    theme: '🪨',
    description: 'Cavernas escuras com criaturas blindadas. Sua defesa é reduzida em 20%!',
    difficulty: 'Intermediário',
    defenseDebuff: 0.2,
    manaCostMultiplier: 1,
    bgColor: '#1a1a2f',
    unlocked: false,
    monsters: [
      makeMonster('orc', 'Orc Guerreiro', '🧌', 5, 70, 10, 6, 40, 15),
      makeMonster('stone_golem_small', 'Mini Golem', '🪨', 5, 80, 9, 8, 45, 18),
      makeMonster('dark_elf', 'Elfo Sombrio', '🧝', 5, 60, 12, 4, 38, 14),
      makeMonster('cave_bat', 'Morcego Gigante', '🦇', 5, 55, 11, 3, 35, 12),
    ],
    boss: makeMonster('stone_golem', 'Golem de Pedra', '⛏️', 5, 250, 16, 12, 180, 70, true),
  },
  {
    id: 3,
    name: 'Torre do Abismo',
    theme: '🏰',
    description: 'A torre final. O custo de mana está dobrado. O Boss Final aguarda no topo!',
    difficulty: 'Avançado',
    defenseDebuff: 0,
    manaCostMultiplier: 2,
    bgColor: '#2f1a1a',
    unlocked: false,
    monsters: [
      makeMonster('demon', 'Demônio Menor', '😈', 10, 140, 18, 10, 90, 35),
      makeMonster('lich', 'Lich', '💀', 10, 120, 20, 8, 95, 38),
      makeMonster('dragon_small', 'Draconato', '🐉', 10, 160, 17, 12, 100, 40),
    ],
    boss: makeMonster('demon_lord', 'Lorde Demoníaco', '👿', 10, 500, 25, 15, 500, 200, true),
  },
];

export const SHOP_ITEMS: Item[] = [
  { id: 'iron_sword', name: 'Espada de Ferro', emoji: '⚔️', price: 30, attackBonus: 5, defenseBonus: 0, description: '+5 Ataque' },
  { id: 'steel_shield', name: 'Escudo de Aço', emoji: '🛡️', price: 30, attackBonus: 0, defenseBonus: 5, description: '+5 Defesa' },
  { id: 'magic_ring', name: 'Anel Mágico', emoji: '💍', price: 50, attackBonus: 3, defenseBonus: 3, description: '+3 Ataque e +3 Defesa' },
  { id: 'dragon_scale', name: 'Escama de Dragão', emoji: '🐉', price: 80, attackBonus: 0, defenseBonus: 10, description: '+10 Defesa' },
  { id: 'enchanted_blade', name: 'Lâmina Encantada', emoji: '✨', price: 80, attackBonus: 10, defenseBonus: 0, description: '+10 Ataque' },
  { id: 'amulet', name: 'Amuleto da Sorte', emoji: '📿', price: 60, attackBonus: 4, defenseBonus: 4, description: '+4 Ataque e +4 Defesa' },
];

export const XP_PER_LEVEL = (level: number) => level * 100;

export function getEffectiveDefense(player: Player, mapDef: MapDefinition): number {
  const totalDefense = player.defense;
  return Math.floor(totalDefense * (1 - mapDef.defenseDebuff));
}

import { Player } from './types';

export function createPlayer(id: string, name: string, classType: ClassType): Player {
  const cls = CLASSES[classType];
  return {
    id,
    name,
    classType,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    hp: cls.baseStats.hp,
    maxHp: cls.baseStats.hp,
    mp: cls.baseStats.mp,
    maxMp: cls.baseStats.mp,
    attack: cls.baseStats.attack,
    defense: cls.baseStats.defense,
    baseAttack: cls.baseStats.attack,
    baseDefense: cls.baseStats.defense,
    inventory: [],
    coins: 0,
    isReady: false,
    isAlive: true,
    statusEffects: [],
  };
}

export function rollDice(): number {
  return Math.floor(Math.random() * 10) + 1;
}

export function calculateDamage(attackerAttack: number, targetDefense: number, diceRoll: number, bonus = 0): number {
  const raw = diceRoll + attackerAttack + bonus - targetDefense;
  return Math.max(1, raw);
}

export function levelUp(player: Player): { player: Player; didLevelUp: boolean } {
  if (player.xp < player.xpToNextLevel) return { player, didLevelUp: false };

  const newLevel = player.level + 1;
  const hpIncrease = 15;
  const mpIncrease = 10;

  return {
    player: {
      ...player,
      level: newLevel,
      xp: player.xp - player.xpToNextLevel,
      xpToNextLevel: XP_PER_LEVEL(newLevel),
      maxHp: player.maxHp + hpIncrease,
      hp: Math.min(player.hp + hpIncrease, player.maxHp + hpIncrease),
      maxMp: player.maxMp + mpIncrease,
      attack: player.baseAttack + Math.floor(newLevel * 1.5),
      defense: player.baseDefense + Math.floor(newLevel * 0.8),
    },
    didLevelUp: true,
  };
}