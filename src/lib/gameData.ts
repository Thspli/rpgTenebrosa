import { ClassDefinition, ClassType, Item, MapDefinition, MapId, Monster, Skill } from './types';

export const CLASSES: Record<ClassType, ClassDefinition> = {
  warrior: {
    name: 'Guerreiro', emoji: '⚔️',
    description: 'Combatente corpo-a-corpo com alta defesa e vida.',
    baseStats: { hp: 120, mp: 40, attack: 8, defense: 6 },
    special: 'Fúria de Batalha: Ataque duplo que ignora 50% da defesa.',
    unlockedByDefault: true, color: '#e74c3c',
  },
  mage: {
    name: 'Mago', emoji: '🔮',
    description: 'Lançador de magias com alto ataque mágico.',
    baseStats: { hp: 70, mp: 120, attack: 12, defense: 2 },
    special: 'Explosão Arcana: Dano massivo em área.',
    unlockedByDefault: true, color: '#9b59b6',
  },
  rogue: {
    name: 'Ladino', emoji: '🗡️',
    description: 'Ágil e furtivo, causa dano crítico.',
    baseStats: { hp: 85, mp: 60, attack: 10, defense: 3 },
    special: 'Golpe Crítico: Dano triplicado.',
    unlockedByDefault: true, color: '#1abc9c',
  },
  necromancer: {
    name: 'Necromante', emoji: '💀',
    description: 'Mestre da morte. Drena vida e invoca mortos que buffam o grupo.',
    baseStats: { hp: 90, mp: 130, attack: 13, defense: 3 },
    special: 'Invocar Morto-Vivo: +6 dano para o grupo por 4 turnos.',
    unlockedByDefault: true, color: '#8e44ad',
  },
  paladin: {
    name: 'Paladino', emoji: '🛡️',
    description: 'Guerreiro sagrado que cura aliados e tanka dano.',
    baseStats: { hp: 110, mp: 70, attack: 7, defense: 8 },
    special: 'Bênção Divina: Cura 30HP de todos os aliados.',
    unlockedByDefault: true, color: '#f39c12',
  },
  ranger: {
    name: 'Arqueiro', emoji: '🏹',
    description: 'Atirador preciso com mobilidade e ataques em área.',
    baseStats: { hp: 90, mp: 80, attack: 11, defense: 4 },
    special: 'Chuva de Flechas: Ataca todos os inimigos.',
    unlockedByDefault: true, color: '#3498db',
  },
  assassin: {
    name: 'Assassino', emoji: '🌙',
    description: 'Sombra mortal. Golpes furtivos causam dano massivo e ignoram defesa.',
    baseStats: { hp: 80, mp: 90, attack: 14, defense: 2 },
    special: 'Execução: Causa dano triplicado se o alvo tiver menos de 50% HP.',
    unlockedByDefault: true, color: '#2c3e50',
  },
  elementalist: {
    name: 'Elementalista', emoji: '🌊',
    description: 'Domina fogo, gelo e raio. Alterna elementos para maximizar dano.',
    baseStats: { hp: 75, mp: 140, attack: 11, defense: 2 },
    special: 'Tempestade Elemental: Ataca todos com fogo, gelo e raio simultaneamente.',
    unlockedByDefault: true, color: '#e67e22',
  },
  berserker: {
    name: 'Berserker', emoji: '🪓',
    description: 'Guerreiro selvagem. Quanto menos HP, mais dano causa.',
    baseStats: { hp: 140, mp: 30, attack: 15, defense: 4 },
    special: 'Frenesi: Ataca 3 vezes seguidas ignorando defesa.',
    unlockedByDefault: true, color: '#c0392b',
  },
  guardian: {
    name: 'Guardião', emoji: '🗿',
    description: 'Fortíssimo e lento. Absorve dano pelos aliados e contra-ataca.',
    baseStats: { hp: 180, mp: 60, attack: 8, defense: 16 },
    special: 'Muralha: Bloqueia todo dano do grupo por 1 turno.',
    unlockedByDefault: true, color: '#7f8c8d',
  },
  druid: {
    name: 'Druida', emoji: '🌿',
    description: 'Curador da natureza. Cura, regenera e revive aliados.',
    baseStats: { hp: 85, mp: 110, attack: 6, defense: 5 },
    special: 'Círculo da Vida: Cura 40HP de todos os aliados vivos.',
    unlockedByDefault: true, color: '#27ae60',
  },
  bard: {
    name: 'Bardo', emoji: '🎵',
    description: 'Músico guerreiro. Buffa o grupo, cura com música e causa dano sonoro.',
    baseStats: { hp: 88, mp: 100, attack: 8, defense: 5 },
    special: 'Balada Épica: +5 ATK, +5 DEF e +20HP para todo o grupo.',
    unlockedByDefault: true, color: '#d35400',
  },
};

export const SKILLS: Record<ClassType, Skill[]> = {
  warrior: [
    { name: 'Golpe Pesado',      emoji: '⚔️',  mpCost: 0,  damage: 5,  description: '+5 dano' },
    { name: 'Provocar',          emoji: '😤',  mpCost: 10, effect: 'taunt',      description: 'Atrai inimigos por 1 turno' },
    { name: 'Bloqueio',          emoji: '🛡️',  mpCost: 15, effect: 'defense_up', description: '+5 DEF por 1 turno' },
    { name: 'Fúria de Batalha',  emoji: '💢',  mpCost: 30, damage: 15, description: 'Ignora 50% da defesa' },
    { name: 'Investida',         emoji: '🌪️',  mpCost: 20, damage: 6,  aoe: true,  description: 'Ataca todos os inimigos' },
    { name: 'Grito de Guerra',   emoji: '📣',  mpCost: 25, effect: 'group_atk_up', description: '+3 ATK grupo por 2 turnos' },
  ],
  mage: [
    { name: 'Bola de Fogo',      emoji: '🔥',  mpCost: 15, damage: 7,  description: '+7 dano' },
    { name: 'Raio de Gelo',      emoji: '❄️',  mpCost: 12, damage: 6,  description: '+6 dano' },
    { name: 'Escudo Arcano',     emoji: '🔵',  mpCost: 20, effect: 'defense_up', description: '+6 DEF por 1 turno' },
    { name: 'Explosão Arcana',   emoji: '💥',  mpCost: 50, damage: 20, aoe: true,  description: 'Dano massivo em área' },
    { name: 'Raio Veloz',        emoji: '⚡',  mpCost: 18, damage: 9,  description: '+9 dano' },
    { name: 'Chuva de Meteoros', emoji: '☄️',  mpCost: 55, damage: 14, aoe: true,  description: 'Meteoros em todos inimigos' },
  ],
  rogue: [
    { name: 'Punhalada',         emoji: '🗡️',  mpCost: 0,  damage: 4,  description: '+4 dano' },
    { name: 'Envenenar',         emoji: '☠️',  mpCost: 20, effect: 'poison',     description: 'Veneno por 3 turnos' },
    { name: 'Fumaça',            emoji: '💨',  mpCost: 15, effect: 'dodge',      description: 'Esquiva por 1 turno' },
    { name: 'Golpe Crítico',     emoji: '⚡',  mpCost: 40, damage: 18, description: 'Dano triplicado' },
    { name: 'Sombra Dupla',      emoji: '👥',  mpCost: 25, damage: 10, description: 'Ataca 2x (+5 cada)' },
    { name: 'Lâmina Venenosa',   emoji: '🐍',  mpCost: 35, damage: 8,  effect: 'poison', description: '+8 dano + veneno' },
  ],
  necromancer: [
    { name: 'Raio Sombrio',      emoji: '🖤',  mpCost: 10, damage: 8,  description: '+8 dano sombrio' },
    { name: 'Drenar Vida',       emoji: '🩸',  mpCost: 20, damage: 8,  heal: 8,   description: '+8 dano, +8 cura' },
    { name: 'Maldição Profunda', emoji: '🔮',  mpCost: 25, effect: 'curse',      description: 'Reduz ATK/DEF por 3 turnos' },
    { name: 'Invocar Morto-Vivo',emoji: '💀',  mpCost: 45, effect: 'necro_buff', description: '+6 dano grupo por 4 turnos' },
    { name: 'Explosão Sombria',  emoji: '🌑',  mpCost: 35, damage: 10, aoe: true,  description: '+10 dano em todos inimigos' },
    { name: 'Toque da Morte',    emoji: '☠️',  mpCost: 55, damage: 18, heal: 12,  description: '+18 dano, +12 cura' },
  ],
  paladin: [
    { name: 'Smite',             emoji: '✨',  mpCost: 10, damage: 6,  description: '+6 dano sagrado' },
    { name: 'Curar',             emoji: '💚',  mpCost: 20, heal: 20,   description: 'Cura 20HP num aliado' },
    { name: 'Escudo de Luz',     emoji: '🌟',  mpCost: 25, effect: 'defense_up', description: '+8 DEF por 1 turno' },
    { name: 'Bênção Divina',     emoji: '🙏',  mpCost: 60, heal: 30,   effect: 'aoe_heal', description: 'Cura 30HP em todos' },
    { name: 'Martelo Sagrado',   emoji: '🔨',  mpCost: 30, damage: 12, description: '+12 dano sagrado' },
    { name: 'Ressurreição',      emoji: '✝️',  mpCost: 70, effect: 'revive',     description: 'Revive aliado com 30% HP' },
  ],
  ranger: [
    { name: 'Flechada',          emoji: '🏹',  mpCost: 0,  damage: 5,  description: '+5 dano' },
    { name: 'Armadilha',         emoji: '🪤',  mpCost: 20, effect: 'stun',       description: 'Atordoa inimigo' },
    { name: 'Olho de Águia',     emoji: '🦅',  mpCost: 25, effect: 'aim',        description: '+10 dano próximo ataque' },
    { name: 'Chuva de Flechas',  emoji: '🌧️',  mpCost: 45, damage: 10, aoe: true,  description: 'Flechas em todos inimigos' },
    { name: 'Flecha Explosiva',  emoji: '💣',  mpCost: 30, damage: 11, description: '+11 dano' },
    { name: 'Tiro Perfurante',   emoji: '🎯',  mpCost: 35, damage: 8,  effect: 'pierce', description: 'Ignora toda a defesa' },
  ],
  assassin: [
    { name: 'Ataque Furtivo',    emoji: '🌙',  mpCost: 0,  damage: 6,  description: '+6 dano furtivo' },
    { name: 'Marca da Morte',    emoji: '🎯',  mpCost: 15, effect: 'mark',       description: '+50% dano no marcado por 2t' },
    { name: 'Névoa das Sombras', emoji: '🌫️',  mpCost: 20, effect: 'dodge',     description: 'Esquiva total por 1 turno' },
    { name: 'Execução',          emoji: '💀',  mpCost: 40, damage: 25, effect: 'execute',  description: '3x dano se alvo < 50% HP' },
    { name: 'Golpe Duplo',       emoji: '⚡',  mpCost: 25, damage: 12, description: 'Dois golpes rápidos' },
    { name: 'Veneno Mortal',     emoji: '☠️',  mpCost: 35, damage: 10, effect: 'poison', description: '+10 dano + veneno forte' },
  ],
  elementalist: [
    { name: 'Chama Menor',       emoji: '🔥',  mpCost: 10, damage: 6,  description: '+6 dano de fogo' },
    { name: 'Lança de Gelo',     emoji: '❄️',  mpCost: 15, damage: 8,  effect: 'slow', description: '+8 dano + lentidão' },
    { name: 'Raio Cadente',      emoji: '⚡',  mpCost: 18, damage: 10, description: '+10 dano elétrico' },
    { name: 'Tempestade Elemental', emoji: '🌊', mpCost: 55, damage: 18, aoe: true, description: 'Fogo+gelo+raio em todos' },
    { name: 'Nova de Gelo',      emoji: '🌨️',  mpCost: 30, damage: 8,  aoe: true,  description: 'Gelo em todos inimigos' },
    { name: 'Meteoro de Magma',  emoji: '🌋',  mpCost: 45, damage: 22, description: '+22 dano de fogo massivo' },
  ],
  berserker: [
    { name: 'Golpe Selvagem',    emoji: '🪓',  mpCost: 0,  damage: 7,  description: '+7 dano brutal' },
    { name: 'Frenesi',           emoji: '😡',  mpCost: 20, effect: 'berserk',    description: '+5 ATK, -3 DEF por 2 turnos' },
    { name: 'Rugido',            emoji: '🦁',  mpCost: 15, effect: 'taunt',      description: 'Atrai todos os ataques' },
    { name: 'Devastar',          emoji: '💥',  mpCost: 35, damage: 20, description: 'Dano massivo ignorando 30% DEF' },
    { name: 'Golpe Triplo',      emoji: '⚡',  mpCost: 25, damage: 8,  description: 'Ataca 3x (+8 cada)' },
    { name: 'Ira Sanguinária',   emoji: '🩸',  mpCost: 45, damage: 30, description: 'Mais dano quanto menos HP' },
  ],
  guardian: [
    { name: 'Escudaraço',        emoji: '🗿',  mpCost: 0,  damage: 4,  description: '+4 dano com escudo' },
    { name: 'Provocação Total',  emoji: '📢',  mpCost: 10, effect: 'taunt',      description: 'Todos atacam o Guardião' },
    { name: 'Muralha',           emoji: '🏰',  mpCost: 30, effect: 'wall',       description: 'Bloqueia dano do grupo 1 turno' },
    { name: 'Contra-Ataque',     emoji: '🔄',  mpCost: 25, effect: 'counter',    description: 'Reflete 50% do próximo dano' },
    { name: 'Fortaleza',         emoji: '⛩️',  mpCost: 20, effect: 'defense_up', description: '+12 DEF por 2 turnos' },
    { name: 'Golpe de Escudo',   emoji: '🛡️',  mpCost: 35, damage: 15, description: '+15 dano + atordoa' },
  ],
  druid: [
    { name: 'Espinhos',          emoji: '🌿',  mpCost: 0,  damage: 5,  description: '+5 dano da natureza' },
    { name: 'Cura Natural',      emoji: '🍃',  mpCost: 15, heal: 25,   description: 'Cura 25HP num aliado' },
    { name: 'Regenerar',         emoji: '♻️',  mpCost: 20, effect: 'regen',      description: '+10HP por turno por 3t' },
    { name: 'Círculo da Vida',   emoji: '🌸',  mpCost: 55, heal: 40,   effect: 'aoe_heal', description: 'Cura 40HP em todos' },
    { name: 'Raiz Presa',        emoji: '🌱',  mpCost: 25, effect: 'stun',       description: 'Enraíza inimigo por 1 turno' },
    { name: 'Tempestade da Floresta', emoji: '🍂', mpCost: 40, damage: 12, aoe: true, description: 'Dano em área + envenenar' },
  ],
  bard: [
    { name: 'Nota Cortante',     emoji: '🎵',  mpCost: 0,  damage: 5,  description: '+5 dano sonoro' },
    { name: 'Canção de Cura',    emoji: '🎶',  mpCost: 15, heal: 20,   description: 'Cura 20HP num aliado' },
    { name: 'Melodia Inspiradora',emoji: '🎸', mpCost: 20, effect: 'group_atk_up', description: '+4 ATK grupo por 2t' },
    { name: 'Balada Épica',      emoji: '🎺',  mpCost: 60, effect: 'balada',     description: '+5 ATK/DEF +20HP grupo' },
    { name: 'Dissonância',       emoji: '📯',  mpCost: 25, damage: 8,  aoe: true,  description: 'Som ensurdecedor em todos' },
    { name: 'Canção da Morte',   emoji: '🎻',  mpCost: 45, damage: 14, description: 'Nota letal +14 dano' },
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
    id: 1, name: 'Floresta Sombria', theme: '🌲',
    description: 'Uma floresta antiga cheia de criaturas selvagens.',
    difficulty: 'Iniciante', defenseDebuff: 0, manaCostMultiplier: 1, bgColor: '#1a2f1a', unlocked: true,
    monsters: [
      makeMonster('goblin','Goblin','👺',1,40,6,1,18,6),
      makeMonster('wolf','Lobo Selvagem','🐺',1,35,7,2,14,5),
      makeMonster('slime','Gosma Verde','🟢',1,25,4,0,12,4),
      makeMonster('spider','Aranha Gigante','🕷️',1,38,5,1,16,5),
      makeMonster('bandit','Bandido','🪓',1,42,6,1,18,7),
    ],
    boss: makeMonster('troll','Troll da Floresta','👹',2,200,15,6,100,40,true),
  },
  {
    id: 2, name: 'Pântano Maldito', theme: '🌿',
    description: 'Terrenos alagados com criaturas venenosas.',
    difficulty: 'Iniciante', defenseDebuff: 0, manaCostMultiplier: 1, bgColor: '#1a2a10', unlocked: false,
    monsters: [
      makeMonster('frog','Sapo Venenoso','🐸',2,45,8,2,24,9),
      makeMonster('snake','Serpente do Pântano','🐍',2,40,9,1,22,8),
      makeMonster('mushroom','Cogumelo Tóxico','🍄',2,50,5,3,26,10),
      makeMonster('lizard','Lagarto Gigante','🦎',2,48,8,2,25,9),
    ],
    boss: makeMonster('hydra','Hidra do Pântano','🐲',3,250,18,7,140,55,true),
  },
  {
    id: 3, name: 'Cavernas de Pedra', theme: '🪨',
    description: 'Cavernas escuras. Sua defesa é reduzida em 20%!',
    difficulty: 'Intermediário', defenseDebuff: 0.2, manaCostMultiplier: 1, bgColor: '#1a1a2f', unlocked: false,
    monsters: [
      makeMonster('orc','Orc Guerreiro','🧌',5,70,10,6,40,15),
      makeMonster('stone_golem_small','Mini Golem','🪨',5,80,9,8,45,18),
      makeMonster('dark_elf','Elfo Sombrio','🧝',5,60,12,4,38,14),
      makeMonster('cave_bat','Morcego Gigante','🦇',5,55,11,3,35,12),
      makeMonster('troll_cave','Troll das Cavernas','👾',5,75,11,5,42,16),
    ],
    boss: makeMonster('stone_golem','Golem de Pedra','⛏️',6,300,18,14,200,80,true),
  },
  {
    id: 4, name: 'Ruínas Amaldiçoadas', theme: '🏚️',
    description: 'Fantasmas e mortos-vivos habitam estas paredes.',
    difficulty: 'Intermediário', defenseDebuff: 0.1, manaCostMultiplier: 1, bgColor: '#2a1a2f', unlocked: false,
    monsters: [
      makeMonster('ghost','Fantasma','👻',7,65,13,3,50,20),
      makeMonster('skeleton','Esqueleto Guerreiro','💀',7,80,12,6,55,22),
      makeMonster('zombie','Zumbi Antigo','🧟',7,90,10,5,52,21),
      makeMonster('wraith','Espectro Sombrio','🌑',7,70,14,4,58,23),
    ],
    boss: makeMonster('lich_king','Rei Lich','☠️',8,380,21,12,280,110,true),
  },
  {
    id: 5, name: 'Vulcão Ardente', theme: '🌋',
    description: 'Calor intenso dobra o custo de mana!',
    difficulty: 'Avançado', defenseDebuff: 0, manaCostMultiplier: 2, bgColor: '#2f1510', unlocked: false,
    monsters: [
      makeMonster('fire_elemental','Elemental de Fogo','🔥',9,100,16,7,70,28),
      makeMonster('lava_golem','Golem de Lava','🌋',9,120,14,10,75,30),
      makeMonster('fire_drake','Drake Flamejante','🐉',9,110,17,8,72,29),
      makeMonster('ember_spirit','Espírito da Brasa','✨',9,90,18,5,68,27),
    ],
    boss: makeMonster('fire_titan','Titã de Fogo','🔴',10,450,24,16,400,160,true),
  },
  {
    id: 6, name: 'Torre do Abismo', theme: '🏰',
    description: 'Mana dobrada. Demônios guardam cada andar.',
    difficulty: 'Avançado', defenseDebuff: 0, manaCostMultiplier: 2, bgColor: '#2f1a1a', unlocked: false,
    monsters: [
      makeMonster('demon','Demônio Menor','😈',10,140,18,10,90,35),
      makeMonster('lich','Lich','💀',10,120,20,8,95,38),
      makeMonster('dragon_small','Draconato','🐉',10,160,17,12,100,40),
      makeMonster('dark_knight','Cavaleiro das Trevas','🖤',10,150,19,11,98,39),
    ],
    boss: makeMonster('demon_lord','Lorde Demoníaco','👿',11,550,27,17,550,220,true),
  },
  {
    id: 7, name: 'Reino dos Deuses Caídos', theme: '⚡',
    description: 'Defesa -30% e mana x2. Apenas os mais fortes sobrevivem.',
    difficulty: 'Lendário', defenseDebuff: 0.3, manaCostMultiplier: 2, bgColor: '#1a1030', unlocked: false,
    monsters: [
      makeMonster('fallen_angel','Anjo Caído','🪽',15,200,24,14,150,60),
      makeMonster('chaos_beast','Besta do Caos','🌀',15,220,22,15,155,62),
      makeMonster('void_reaper','Ceifador do Vazio','🌑',15,190,26,12,160,64),
      makeMonster('titan_spawn','Filhote de Titã','👁️',15,210,23,16,152,61),
    ],
    boss: makeMonster('ancient_god','Deus Antigo Corrompido','🌟',20,1200,40,22,1200,450,true),
  },
];

export const SHOP_ITEMS: Item[] = [
  // Consumables — usable in combat
  { id: 'potion_hp_s',    name: 'Poção de Vida P',      emoji: '🧪', price: 20,  attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 30,  quantity: 2, description: 'Usa no combate: +30 HP (2 usos)' },
  { id: 'potion_hp_m',    name: 'Poção de Vida M',      emoji: '💊', price: 40,  attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 60,  quantity: 2, description: 'Usa no combate: +60 HP (2 usos)' },
  { id: 'potion_hp_l',    name: 'Elixir de Vida',       emoji: '⚗️', price: 80,  attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 120, quantity: 2, description: 'Usa no combate: +120 HP (2 usos)' },
  { id: 'potion_mp_s',    name: 'Poção de Mana P',      emoji: '💧', price: 20,  attackBonus: 0, defenseBonus: 0, consumable: true, consumeMpHeal: 30,  quantity: 2, description: 'Usa no combate: +30 MP (2 usos)' },
  { id: 'potion_mp_m',    name: 'Poção de Mana M',      emoji: '🫧', price: 40,  attackBonus: 0, defenseBonus: 0, consumable: true, consumeMpHeal: 60,  quantity: 2, description: 'Usa no combate: +60 MP (2 usos)' },
  { id: 'potion_full',    name: 'Elixir Total',         emoji: '🌟', price: 100, attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 80, consumeMpHeal: 80, quantity: 1, description: 'Usa no combate: +80 HP e +80 MP (1 uso)' },
  // Tier 1 — equipamentos
  { id: 'iron_sword',     name: 'Espada de Ferro',      emoji: '⚔️', price: 30,  attackBonus: 5,  defenseBonus: 0,  description: '+5 Ataque' },
  { id: 'steel_shield',   name: 'Escudo de Aço',        emoji: '🛡️', price: 30,  attackBonus: 0,  defenseBonus: 5,  description: '+5 Defesa' },
  { id: 'health_stone',   name: 'Pedra da Vitalidade',  emoji: '❤️', price: 40,  attackBonus: 0,  defenseBonus: 0,  hpBonus: 30, description: '+30 HP Máximo' },
  { id: 'mana_crystal',   name: 'Cristal de Mana',      emoji: '💎', price: 40,  attackBonus: 0,  defenseBonus: 0,  mpBonus: 30, description: '+30 MP Máximo' },
  // Tier 2
  { id: 'magic_ring',     name: 'Anel Mágico',          emoji: '💍', price: 55,  attackBonus: 3,  defenseBonus: 3,  description: '+3 Ataque e +3 Defesa' },
  { id: 'amulet',         name: 'Amuleto da Sorte',     emoji: '📿', price: 65,  attackBonus: 4,  defenseBonus: 4,  description: '+4 Ataque e +4 Defesa' },
  { id: 'war_boots',      name: 'Botas de Guerra',      emoji: '👢', price: 55,  attackBonus: 4,  defenseBonus: 2,  description: '+4 Ataque e +2 Defesa' },
  { id: 'mystic_orb',     name: 'Orbe Místico',         emoji: '🔮', price: 65,  attackBonus: 6,  defenseBonus: 0,  mpBonus: 15, description: '+6 Ataque e +15 MP' },
  // Tier 3
  { id: 'dragon_scale',   name: 'Escama de Dragão',     emoji: '🐉', price: 85,  attackBonus: 0,  defenseBonus: 10, description: '+10 Defesa' },
  { id: 'enchanted_blade',name: 'Lâmina Encantada',     emoji: '✨', price: 85,  attackBonus: 10, defenseBonus: 0,  description: '+10 Ataque' },
  { id: 'arcane_tome',    name: 'Tomo Arcano',          emoji: '📖', price: 110, attackBonus: 8,  defenseBonus: 0,  mpBonus: 40, description: '+8 Ataque e +40 MP' },
  { id: 'elixir_life',    name: 'Pedra da Vida',        emoji: '💠', price: 110, attackBonus: 0,  defenseBonus: 5,  hpBonus: 50, description: '+50 HP e +5 Defesa' },
  // Tier 4
  { id: 'titan_armor',    name: 'Armadura de Titã',     emoji: '🦺', price: 130, attackBonus: 2,  defenseBonus: 15, description: '+2 Ataque e +15 Defesa' },
  { id: 'void_blade',     name: 'Lâmina do Vazio',      emoji: '🌑', price: 130, attackBonus: 15, defenseBonus: 0,  description: '+15 Ataque' },
  { id: 'godslayer',      name: 'Mata-Deuses',          emoji: '🗡️', price: 200, attackBonus: 20, defenseBonus: 5,  description: '+20 Ataque e +5 Defesa' },
  { id: 'divine_shield',  name: 'Escudo Divino',        emoji: '🌟', price: 200, attackBonus: 5,  defenseBonus: 20, hpBonus: 30, description: '+5 ATK, +20 DEF e +30 HP' },
];

export const XP_PER_LEVEL = (level: number) => level * 100;

import { Player } from './types';

export function createPlayer(id: string, name: string, classType: ClassType): Player {
  const cls = CLASSES[classType];
  return {
    id, name, classType,
    level: 1, xp: 0, xpToNextLevel: 100,
    hp: cls.baseStats.hp, maxHp: cls.baseStats.hp,
    mp: cls.baseStats.mp, maxMp: cls.baseStats.mp,
    attack: cls.baseStats.attack, defense: cls.baseStats.defense,
    baseAttack: cls.baseStats.attack, baseDefense: cls.baseStats.defense,
    inventory: [], coins: 0, isReady: false, isAlive: true, statusEffects: [],
  };
}

export function rollDice(): number {
  return Math.floor(Math.random() * 10) + 1;
}

export function calculateDamage(attackerAttack: number, targetDefense: number, diceRoll: number, bonus = 0): number {
  return Math.max(1, diceRoll + attackerAttack + bonus - targetDefense);
}

export function levelUp(player: Player): { player: Player; didLevelUp: boolean } {
  if (player.xp < player.xpToNextLevel) return { player, didLevelUp: false };
  const newLevel = player.level + 1;
  return {
    player: {
      ...player,
      level: newLevel,
      xp: player.xp - player.xpToNextLevel,
      xpToNextLevel: XP_PER_LEVEL(newLevel),
      maxHp: player.maxHp + 15,
      hp: Math.min(player.hp + 15, player.maxHp + 15),
      maxMp: player.maxMp + 10,
      attack: player.baseAttack + Math.floor(newLevel * 1.5),
      defense: player.baseDefense + Math.floor(newLevel * 0.8),
    },
    didLevelUp: true,
  };
}