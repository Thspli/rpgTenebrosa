// ═══════════════════════════════════════════════════════════
//  REALM OF SHADOWS — Static Game Data
//  Classes, Maps, Items, Summon Templates
// ═══════════════════════════════════════════════════════════

import { ClassType, ClassDefinition, MapId, Monster, Item } from './types';
import { nanoid } from 'nanoid';
import { BALANCE } from './utils';

// ─── Class Definitions ────────────────────────────────────

export const CLASSES: Record<ClassType, ClassDefinition> = {
  warrior: {
    name: 'Guerreiro', emoji: '⚔️', emojiVariants: ['⚔️', '🗡️', '🔪', '🪓', '🛡️'], color: '#e74c3c', role: 'tank',
    description: 'Combatente corpo-a-corpo. Alta vida, defesa sólida, força bruta.',
    baseStats: { hp: 150, mp: 50, attack: 10, defense: 8 },
    passiveDescription: 'Grito de Guerra: buffa o grupo. Muralha: protege todos.',
    synergyTags: ['war_cry', 'physical'],
  },
  mage: {
    name: 'Mago', emoji: '🔮', emojiVariants: ['🔮', '🧙', '🧙‍♂️', '🧙‍♀️', '✨', '🌟'], color: '#9b59b6', role: 'dps',
    description: 'Mágica pura. Menor HP do jogo, maior dano mágico.',
    baseStats: { hp: 80, mp: 150, attack: 14, defense: 2 },
    passiveDescription: 'Explosão Arcana atinge todos. Sinergia: Tempestade Elemental com Elementalista.',
    synergyTags: ['magic', 'elemental'],
  },
  rogue: {
    name: 'Ladino', emoji: '🗡️', emojiVariants: ['🗡️', '🕵️', '🕵️‍♂️', '🕵️‍♀️', '🗝️', '🔑'], color: '#1abc9c', role: 'dps',
    description: 'Veloz e furtivo. Veneno e esquivas.',
    baseStats: { hp: 95, mp: 70, attack: 12, defense: 4 },
    passiveDescription: 'Cada ataque acumula Sangramento. Smoke Screen garante esquivas.',
    synergyTags: ['shadow', 'poison'],
  },
  necromancer: {
    name: 'Necromante', emoji: '💀', emojiVariants: ['💀', '👻', '🦇', '🕸️', '🪦', '⚰️'], color: '#8e44ad', role: 'hybrid',
    description: 'Drena vida, maldiz inimigos, invoca sombras.',
    baseStats: { hp: 90, mp: 150, attack: 13, defense: 3 },
    passiveDescription: 'Cada inimigo morto = 1 Alma (máx 5). Sinergia: Execução das Sombras com Assassino.',
    synergyTags: ['shadow', 'curse', 'soul'],
  },
  paladin: {
    name: 'Paladino', emoji: '🛡️', emojiVariants: ['🛡️', '⚔️', '🙏', '✝️', '⛪', '👼'], color: '#f39c12', role: 'support',
    description: 'Cura, protege e pune. O melhor suporte do jogo.',
    baseStats: { hp: 130, mp: 90, attack: 8, defense: 10 },
    passiveDescription: 'Único com Ressurreição. Sinergia: Escudo Sagrado com Guardião.',
    synergyTags: ['holy', 'support'],
  },
  ranger: {
    name: 'Arqueiro', emoji: '🏹', emojiVariants: ['🏹', '🏹', '🎯', '🦅', '🌳', '🪶'], color: '#3498db', role: 'dps',
    description: 'Precisão letal. Atordoa, atira em área, acumula mira.',
    baseStats: { hp: 100, mp: 90, attack: 12, defense: 5 },
    passiveDescription: 'Olho de Águia: próximo ataque +40 dano. Chuva de Flechas em área.',
    synergyTags: ['physical', 'precision'],
  },
  assassin: {
    name: 'Assassino', emoji: '🌙', emojiVariants: ['🌙', '🗡️', '🕵️', '🕶️', '🌑', '🔪'], color: '#2c3e50', role: 'dps',
    description: 'Máximo dano em alvos fracos. Sangramento e veneno acumulam.',
    baseStats: { hp: 85, mp: 100, attack: 15, defense: 3 },
    passiveDescription: 'Execução (2.2x abaixo de 40% HP). ULT (3x DEF=0) sempre supera Execução. Sinergia: com Necromante.',
    synergyTags: ['shadow', 'mark', 'bleed'],
  },
  elementalist: {
    name: 'Elementalista', emoji: '🌊', emojiVariants: ['🌊', '🔥', '❄️', '⚡', '🌪️', '🌋'], color: '#e67e22', role: 'dps',
    description: 'Fogo, gelo e raio. Dano em área massivo.',
    baseStats: { hp: 80, mp: 160, attack: 13, defense: 2 },
    passiveDescription: 'Sinergia: Tempestade Elemental com Mago. Aplica Lentidão em área.',
    synergyTags: ['elemental', 'magic', 'aoe'],
  },
  berserker: {
    name: 'Berserker', emoji: '🪓', emojiVariants: ['🪓', '⚔️', '🔥', '💪', '🩸', '😡'], color: '#c0392b', role: 'dps',
    description: 'Quanto menos HP, mais dano. Autodestruição controlada.',
    baseStats: { hp: 160, mp: 30, attack: 16, defense: 4 },
    passiveDescription: 'Ira Sanguinária escala com HP perdido (até 2.5x). Sinergia: Hino de Guerra com Bardo.',
    synergyTags: ['physical', 'rage', 'war_cry'],
  },
  guardian: {
    name: 'Guardião', emoji: '🗿', emojiVariants: ['🗿', '🛡️', '🪨', '🏔️', '🧱', '🪵'], color: '#7f8c8d', role: 'tank',
    description: 'Muralha viva. Absorve dano do grupo inteiro.',
    baseStats: { hp: 200, mp: 60, attack: 8, defense: 18 },
    passiveDescription: 'Muralha: grupo recebe 20% dano por 2 turnos. Sinergia: Escudo Sagrado com Paladino.',
    synergyTags: ['tank', 'protect'],
  },
  druid: {
    name: 'Druida', emoji: '🌿', emojiVariants: ['🌿', '🌳', '🌸', '🍃', '🌱', '🌲'], color: '#27ae60', role: 'support',
    description: 'Cura, regenera e ressuscita. Natureza primordial.',
    baseStats: { hp: 100, mp: 130, attack: 7, defense: 6 },
    passiveDescription: 'Bênção da Natureza (sinergia): cura dupla em aliados abaixo de 30% HP.',
    synergyTags: ['nature', 'support', 'heal'],
  },
  bard: {
    name: 'Bardo', emoji: '🎵', emojiVariants: ['🎵', '🎶', '🎼', '🎤', '🎸', '🥁'], color: '#d35400', role: 'support',
    description: 'Buffa o grupo inteiro. Inspira aliados para sinergias.',
    baseStats: { hp: 100, mp: 120, attack: 9, defense: 6 },
    passiveDescription: 'Melodia Inspiradora: aliados ganham "inspirado" — ativa sinergia Hino de Guerra.',
    synergyTags: ['support', 'inspire', 'war_cry'],
  },
  animalist: {
    name: 'Animalista', emoji: '🐾', emojiVariants: ['🐾', '🐺', '🐻', '🦌', '🐗', '🦊'], color: '#a0522d', role: 'hybrid',
    description: 'Invoca até 3 animais aliados com papéis distintos.',
    baseStats: { hp: 110, mp: 110, attack: 10, defense: 6 },
    passiveDescription: 'Animais agem automaticamente: Lobo ataca 2x, Urso provoca, Cervo cura, Javali buffa.',
    synergyTags: ['nature', 'summon'],
  },
  shaman: {
    name: 'Xamã', emoji: '🌀', emojiVariants: ['🌀', '🌪️', '💫', '🔮', '🪶', '🦅'], color: '#5f9ea0', role: 'hybrid',
    description: 'Acumula Cargas Espirituais que potencializam TODOS os seus ataques.',
    baseStats: { hp: 95, mp: 140, attack: 11, defense: 4 },
    passiveDescription: 'Cada carga (+1 por Golpe Espiritual) adiciona +3 dano imediato E +5 no release. Com 5 cargas, ULT é devastadora.',
    synergyTags: ['spirit', 'magic'],
  },
  trickster: {
    name: 'Ilusionista', emoji: '🃏', emojiVariants: ['🃏', '🎭', '🪄', '🎪', '🎨', '🦄'], color: '#da70d6', role: 'hybrid',
    description: 'Clone absorve golpes e reflete dano. Confunde e marca inimigos.',
    baseStats: { hp: 90, mp: 130, attack: 13, defense: 3 },
    passiveDescription: 'Clone Ilusório absorve 1 hit e reflete 80% por 3 turnos.',
    synergyTags: ['shadow', 'illusion'],
  },
};

// ─── Map Definitions ──────────────────────────────────────

function makeMonster(
  id: string, name: string, emoji: string, level: number,
  hp: number, atk: number, def: number, xp: number, coins: number,
  extras: Partial<Monster> = {}
): Monster {
  return {
    id, name, emoji, level,
    hp, maxHp: hp, mp: 0, maxMp: 0,
    attack: atk, defense: def,
    xpReward: xp, coinReward: coins,
    isBoss: false, isSummon: false,
    effects: [], isAlive: true,
    ...extras,
  };
}

export interface MapDefinition {
  id: MapId;
  name: string;
  theme: string;
  description: string;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado' | 'Épico' | 'Lendário' | 'Infernal' | 'Divino';
  defenseDebuff: number;       // 0.2 = enemies ignore 20% of player defense
  manaCostMultiplier: number;  // 2 = skills cost 2x MP
  bgColor: string;
  unlocked: boolean;
  monsters: Monster[];
  boss: Monster;
}

export const MAPS: MapDefinition[] = [
  {
    id: 1, name: 'Floresta Sombria', theme: '🌲', difficulty: 'Iniciante',
    description: 'Uma floresta antiga. Boa pra aprender.',
    defenseDebuff: 0, manaCostMultiplier: 1, bgColor: '#1a2f1a', unlocked: true,
    monsters: [
      makeMonster('goblin', 'Goblin', '👺', 1, 45, 7, 2, 15, 5),
      makeMonster('wolf', 'Lobo Selvagem', '🐺', 1, 40, 8, 3, 12, 4),
      makeMonster('slime', 'Gosma Verde', '🟢', 1, 38, 6, 1, 10, 3),
      makeMonster('spider', 'Aranha Gigante', '🕷️', 1, 42, 7, 2, 14, 4),
      makeMonster('bandit', 'Bandido', '🪓', 1, 50, 8, 2, 16, 6),
    ],
    boss: makeMonster('troll', 'Troll da Floresta', '👹', 3, 420, 16, 8, 100, 40, {
      isBoss: true, multiAttack: 1,
      enrageThreshold: 0.5, enrageAtkBonus: 6,
      splashChance: 0.2,
      bossUlt: {
        name: 'PANCADA DEVASTADORA', emoji: '👊',
        lines: ['O Troll levanta seu clube...', 'O chão racha sob o impacto!', 'PANCADA DEVASTADORA!'],
        color: '#e74c3c', bg: 'radial-gradient(ellipse, #2a0000 0%, #080000 70%)',
        aoeDamage: 22,
      },
      ultCooldown: 4, ultTurnsLeft: 4,
    }),
  },
  {
    id: 2, name: 'Pântano Maldito', theme: '🌿', difficulty: 'Iniciante',
    description: 'Veneno no ar. Criaturas resistentes.',
    defenseDebuff: 0, manaCostMultiplier: 1, bgColor: '#1a2a10', unlocked: false,
    monsters: [
      makeMonster('frog', 'Sapo Venenoso', '🐸', 3, 65, 12, 3, 20, 7),
      makeMonster('snake', 'Serpente', '🐍', 3, 60, 13, 2, 18, 6),
      makeMonster('mushroom', 'Cogumelo Tóxico', '🍄', 3, 72, 10, 4, 22, 8),
      makeMonster('lizard', 'Lagarto Gigante', '🦎', 3, 68, 12, 3, 21, 7),
    ],
    boss: makeMonster('hydra', 'Hidra do Pântano', '🐲', 5, 620, 20, 10, 150, 55, {
      isBoss: true, multiAttack: 2,
      enrageThreshold: 0.4, enrageAtkBonus: 8,
      regenPerTurn: 15, splashChance: 0.35,
      bossUlt: {
        name: 'VENENO DAS TRÊS CABEÇAS', emoji: '☠️',
        lines: ['As três cabeças se voltam...', 'Veneno ancestral no ar...', 'VENENO DAS TRÊS CABEÇAS!'],
        color: '#27ae60', bg: 'radial-gradient(ellipse, #001a08 0%, #000503 70%)',
        aoeDamage: 28,
      },
      ultCooldown: 4, ultTurnsLeft: 4,
    }),
  },
  {
    id: 3, name: 'Cavernas de Pedra', theme: '🪨', difficulty: 'Intermediário',
    description: 'Escuro. Sua defesa é reduzida em 20%.',
    defenseDebuff: 0.2, manaCostMultiplier: 1, bgColor: '#1a1a2f', unlocked: false,
    monsters: [
      makeMonster('orc', 'Orc Guerreiro', '🧌', 6, 120, 17, 8, 50, 18),
      makeMonster('dark_elf', 'Elfo Sombrio', '🧝', 6, 100, 19, 5, 48, 17),
      makeMonster('cave_bat', 'Morcego Gigante', '🦇', 6, 90, 18, 4, 42, 15),
    ],
    boss: makeMonster('stone_golem', 'Golem de Pedra', '⛏️', 7, 850, 26, 20, 220, 85, {
      isBoss: true, multiAttack: 2,
      enrageThreshold: 0.45, enrageAtkBonus: 10,
      armorPierce: 0.4, regenPerTurn: 20,
      bossUlt: {
        name: 'TERREMOTO', emoji: '🌍',
        lines: ['O Golem bate os punhos no chão...', 'Rachaduras se abrem...', 'TERREMOTO!'],
        color: '#7f8c8d', bg: 'radial-gradient(ellipse, #0f1010 0%, #030404 70%)',
        aoeDamage: 35, removeDebuffs: true,
      },
      ultCooldown: 3, ultTurnsLeft: 3,
    }),
  },
  {
    id: 4, name: 'Ruínas Amaldiçoadas', theme: '🏚️', difficulty: 'Intermediário',
    description: 'Fantasmas e mortos-vivos. DEF -10%.',
    defenseDebuff: 0.1, manaCostMultiplier: 1, bgColor: '#2a1a2f', unlocked: false,
    monsters: [
      makeMonster('ghost', 'Fantasma', '👻', 8, 115, 22, 4, 60, 22),
      makeMonster('skeleton', 'Esqueleto Guerreiro', '💀', 8, 140, 20, 8, 65, 24),
      makeMonster('zombie', 'Zumbi Antigo', '🧟', 8, 165, 18, 7, 62, 23),
    ],
    boss: makeMonster('lich_king', 'Rei Lich', '☠️', 9, 1050, 32, 16, 320, 120, {
      isBoss: true, multiAttack: 2,
      enrageThreshold: 0.5, enrageAtkBonus: 14,
      armorPierce: 0.3, splashChance: 0.4,
      bossUlt: {
        name: 'MALDIÇÃO ANCESTRAL', emoji: '🔮',
        lines: ['O Rei Lich ergue seu cajado...', 'A energia vital é sugada...', 'MALDIÇÃO ANCESTRAL!'],
        color: '#8e44ad', bg: 'radial-gradient(ellipse, #1a0028 0%, #050005 70%)',
        aoeDamage: 42, buffAtk: 8, buffAtkTurns: 3,
      },
      ultCooldown: 3, ultTurnsLeft: 3,
    }),
  },
  {
    id: 5, name: 'Vulcão Ardente', theme: '🌋', difficulty: 'Avançado',
    description: 'Calor intenso: mana custa o dobro.',
    defenseDebuff: 0, manaCostMultiplier: 2, bgColor: '#2f1510', unlocked: false,
    monsters: [
      makeMonster('fire_elem', 'Elemental de Fogo', '🔥', 10, 175, 28, 12, 90, 35),
      makeMonster('lava_golem', 'Golem de Lava', '🌋', 10, 210, 25, 17, 95, 38),
      makeMonster('ember', 'Espírito da Brasa', '✨', 10, 155, 32, 8, 88, 34),
    ],
    boss: makeMonster('fire_titan', 'Titã de Fogo', '🔴', 11, 1400, 38, 22, 450, 175, {
      isBoss: true, multiAttack: 3,
      enrageThreshold: 0.45, enrageAtkBonus: 18,
      armorPierce: 0.5, regenPerTurn: 30, splashChance: 0.5,
      bossUlt: {
        name: 'ERUPÇÃO VULCÂNICA', emoji: '🌋',
        lines: ['O Titã absorve o magma...', 'O vulcão explode de uma vez!', 'ERUPÇÃO VULCÂNICA!'],
        color: '#e74c3c', bg: 'radial-gradient(ellipse, #3d0000 0%, #0a0000 70%)',
        aoeDamage: 55, removeDebuffs: true, buffAtk: 15, buffAtkTurns: 2,
      },
      ultCooldown: 3, ultTurnsLeft: 3,
    }),
  },
  {
    id: 6, name: 'Torre do Abismo', theme: '🏰', difficulty: 'Avançado',
    description: 'Mana dobrada. Demônios guardam cada andar.',
    defenseDebuff: 0, manaCostMultiplier: 2, bgColor: '#2f1a1a', unlocked: false,
    monsters: [
      makeMonster('demon', 'Demônio Menor', '😈', 12, 235, 33, 17, 110, 45),
      makeMonster('lich', 'Lich', '💀', 12, 205, 36, 12, 115, 48),
      makeMonster('darkknight', 'Cavaleiro das Trevas', '🖤', 12, 245, 34, 18, 118, 47),
    ],
    boss: makeMonster('demon_lord', 'Lorde Demoníaco', '👿', 13, 1800, 44, 25, 650, 260, {
      isBoss: true, multiAttack: 3,
      enrageThreshold: 0.4, enrageAtkBonus: 22,
      armorPierce: 0.55, regenPerTurn: 40, splashChance: 0.55,
      bossUlt: {
        name: 'INFERNO DEMONÍACO', emoji: '👿',
        lines: ['Portal para o inferno se abre...', 'Chamas eternas brotam do abismo...', 'INFERNO DEMONÍACO!'],
        color: '#c0392b', bg: 'radial-gradient(ellipse, #280000 0%, #080000 70%)',
        aoeDamage: 68, healSelf: 200, buffAtk: 18, buffAtkTurns: 3,
      },
      ultCooldown: 3, ultTurnsLeft: 3,
    }),
  },
  {
    id: 7, name: 'Reino dos Deuses Caídos', theme: '⚡', difficulty: 'Lendário',
    description: 'DEF -30%, mana x2. Aqui dropa a Essência do Deus Antigo.',
    defenseDebuff: 0.3, manaCostMultiplier: 2, bgColor: '#1a1030', unlocked: false,
    monsters: [
      makeMonster('fallen_angel', 'Anjo Caído', '🪽', 16, 355, 42, 22, 180, 72),
      makeMonster('chaos_beast', 'Besta do Caos', '🌀', 16, 390, 40, 25, 185, 74),
      makeMonster('void_reaper', 'Ceifador do Vazio', '🌑', 16, 320, 46, 20, 190, 76),
    ],
    boss: makeMonster('ancient_god', 'Deus Antigo Corrompido', '🌟', 20, 3200, 58, 32, 1500, 600, {
      isBoss: true, multiAttack: 3,
      enrageThreshold: 0.45, enrageAtkBonus: 28,
      armorPierce: 0.6, regenPerTurn: 60, splashChance: 0.6,
      bossUlt: {
        name: 'IRA DOS DEUSES', emoji: '⚡',
        lines: ['O Deus Antigo libera séculos de fúria...', 'A realidade se dobra...', 'IRA DOS DEUSES!'],
        color: '#f0c040', bg: 'radial-gradient(ellipse, #2a1a00 0%, #0a0600 70%)',
        aoeDamage: 85, healSelf: 350, removeDebuffs: true, buffAtk: 24, buffAtkTurns: 3,
      },
      ultCooldown: 3, ultTurnsLeft: 3,
    }),
  },
  {
    id: 8, name: 'Cripta Eterna', theme: '🪦', difficulty: 'Infernal',
    description: 'DEF -40%, mana x2. Os mortos nunca descansam aqui.',
    defenseDebuff: 0.4, manaCostMultiplier: 2, bgColor: '#150a20', unlocked: false,
    monsters: [
      makeMonster('death_knight', 'Cavaleiro da Morte', '💀', 20, 440, 52, 28, 250, 100),
      makeMonster('vampire', 'Senhor Vampiro', '🧛', 20, 400, 56, 22, 260, 105),
      makeMonster('bone_dragon', 'Dragão Ósseo', '🦴', 20, 480, 50, 30, 255, 102),
    ],
    boss: makeMonster('lich_emperor', 'Imperador Lich', '👑', 24, 4200, 70, 38, 2000, 800, {
      isBoss: true, multiAttack: 4,
      enrageThreshold: 0.5, enrageAtkBonus: 35,
      armorPierce: 0.65, regenPerTurn: 80, splashChance: 0.65,
      bossUlt: {
        name: 'APOCALIPSE DOS MORTOS', emoji: '💀',
        lines: ['Portais da morte se abrem...', 'Milhares de almas gritam...', 'APOCALIPSE DOS MORTOS!'],
        color: '#8e44ad', bg: 'radial-gradient(ellipse, #1a0028 0%, #050005 70%)',
        aoeDamage: 100, healSelf: 400, removeDebuffs: true, buffAtk: 30, buffAtkTurns: 4,
      },
      ultCooldown: 3, ultTurnsLeft: 3,
    }),
  },
  {
    id: 9, name: 'Abismo Cósmico', theme: '🌌', difficulty: 'Infernal',
    description: 'DEF -35%, mana x3. Criaturas além da realidade.',
    defenseDebuff: 0.35, manaCostMultiplier: 3, bgColor: '#050515', unlocked: false,
    monsters: [
      makeMonster('void_horror', 'Horror do Vazio', '🌀', 24, 520, 62, 32, 320, 130),
      makeMonster('star_spawn', 'Filho das Estrelas', '⭐', 24, 480, 66, 26, 330, 132),
      makeMonster('elder_thing', 'Coisa Anciã', '👾', 24, 560, 60, 34, 315, 128),
    ],
    boss: makeMonster('cosmic_titan', 'Titã Cósmico', '🌌', 28, 5500, 82, 44, 2800, 1100, {
      isBoss: true, multiAttack: 4,
      enrageThreshold: 0.5, enrageAtkBonus: 42,
      armorPierce: 0.7, regenPerTurn: 100, splashChance: 0.7,
      bossUlt: {
        name: 'COLAPSO GRAVITACIONAL', emoji: '🌌',
        lines: ['O Titã dobra o espaço...', 'Gravidade de buraco negro...', 'COLAPSO GRAVITACIONAL!'],
        color: '#9b59b6', bg: 'radial-gradient(ellipse, #05000f 0%, #000002 70%)',
        aoeDamage: 120, healSelf: 500, removeDebuffs: true, buffAtk: 38, buffAtkTurns: 4,
      },
      ultCooldown: 3, ultTurnsLeft: 3,
    }),
  },
  {
    id: 10, name: 'Forja dos Titãs', theme: '⚒️', difficulty: 'Infernal',
    description: 'DEF -40%, mana x3. O lar dos Titãs imortais.',
    defenseDebuff: 0.4, manaCostMultiplier: 3, bgColor: '#201008', unlocked: false,
    monsters: [
      makeMonster('iron_titan', 'Titã de Ferro', '⚙️', 28, 620, 72, 40, 400, 160),
      makeMonster('flame_titan', 'Titã Flamejante', '🔥', 28, 580, 78, 34, 410, 164),
      makeMonster('storm_titan', 'Titã da Tempestade', '⚡', 28, 600, 74, 38, 405, 162),
    ],
    boss: makeMonster('prime_titan', 'Titã Primordial', '⚒️', 32, 7000, 95, 52, 3500, 1400, {
      isBoss: true, multiAttack: 4,
      enrageThreshold: 0.5, enrageAtkBonus: 50,
      armorPierce: 0.75, regenPerTurn: 130, splashChance: 0.75,
      bossUlt: {
        name: 'FORJA DA DESTRUIÇÃO', emoji: '⚒️',
        lines: ['A forja cósmica aquece...', 'Metal e fogo tornam-se um...', 'FORJA DA DESTRUIÇÃO!'],
        color: '#e67e22', bg: 'radial-gradient(ellipse, #1a0f00 0%, #060300 70%)',
        aoeDamage: 145, healSelf: 650, removeDebuffs: true, buffAtk: 45, buffAtkTurns: 4,
      },
      ultCooldown: 2, ultTurnsLeft: 2,
    }),
  },
  {
    id: 11, name: 'Paraíso Corrompido', theme: '😇', difficulty: 'Divino',
    description: 'DEF -50%, mana x3. O céu caiu e virou inferno.',
    defenseDebuff: 0.5, manaCostMultiplier: 3, bgColor: '#0a0a20', unlocked: false,
    monsters: [
      makeMonster('fallen_seraph', 'Serafim Caído', '😇', 32, 720, 88, 46, 500, 200),
      makeMonster('dark_angel', 'Anjo das Trevas', '🖤', 32, 680, 94, 40, 510, 204),
      makeMonster('corrupted_god', 'Deus Corrompido', '👁️', 32, 760, 86, 50, 495, 198),
    ],
    boss: makeMonster('archangel_fallen', 'Arcanjo das Trevas', '😈', 36, 9000, 112, 62, 5000, 2000, {
      isBoss: true, multiAttack: 4,
      enrageThreshold: 0.5, enrageAtkBonus: 60,
      armorPierce: 0.8, regenPerTurn: 170, splashChance: 0.8,
      bossUlt: {
        name: 'JULGAMENTO DIVINO NEGRO', emoji: '😈',
        lines: ['Asas negras se abrem...', 'Luz e escuridão colidem...', 'JULGAMENTO DIVINO NEGRO!'],
        color: '#f39c12', bg: 'radial-gradient(ellipse, #2a1a00 0%, #0a0600 70%)',
        aoeDamage: 175, healSelf: 900, removeDebuffs: true, buffAtk: 55, buffAtkTurns: 5,
      },
      ultCooldown: 2, ultTurnsLeft: 2,
    }),
  },
  {
    id: 12, name: 'O Fim de Tudo', theme: '🌑', difficulty: 'Divino',
    description: '⚠️ FINAL BOSS — DEF -60%, mana x3.',
    defenseDebuff: 0.6, manaCostMultiplier: 3, bgColor: '#000000', unlocked: false,
    monsters: [
      makeMonster('oblivion_shade', 'Sombra do Oblívio', '🌑', 36, 850, 105, 55, 650, 260),
      makeMonster('entropy_wraith', 'Espectro da Entropia', '🌀', 36, 800, 112, 48, 660, 264),
      makeMonster('nihil_colossus', 'Colosso do Nada', '👁️', 36, 920, 108, 58, 655, 262),
    ],
    boss: makeMonster('void_god', 'O DEUS DO VAZIO', '💫', 40, 14000, 140, 75, 10000, 4000, {
      isBoss: true, multiAttack: 5,
      enrageThreshold: 0.5, enrageAtkBonus: 80,
      armorPierce: 0.85, regenPerTurn: 250, splashChance: 0.85,
      bossUlt: {
        name: 'ANIQUILAÇÃO TOTAL', emoji: '💫',
        lines: ['O Deus do Vazio abre os olhos...', 'Toda existência geme...', 'ANIQUILAÇÃO TOTAL!'],
        color: '#9b59b6', bg: 'radial-gradient(ellipse, #050005 0%, #000000 70%)',
        aoeDamage: 230, healSelf: 1500, removeDebuffs: true, buffAtk: 70, buffAtkTurns: 5,
      },
      ultCooldown: 2, ultTurnsLeft: 2,
    }),
  },
];

// ─── Shop Items ───────────────────────────────────────────

export const SHOP_ITEMS: Item[] = [
  // Potions
  { id: 'potion_hp_s', name: 'Poção de Vida P', emoji: '🧪', price: 20, attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 50, quantity: 2, description: '+50 HP (2 usos)' },
  { id: 'potion_hp_m', name: 'Poção de Vida M', emoji: '💊', price: 40, attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 90, quantity: 2, description: '+90 HP (2 usos)' },
  { id: 'potion_hp_l', name: 'Elixir de Vida', emoji: '⚗️', price: 80, attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 160, quantity: 2, description: '+160 HP (2 usos)' },
  { id: 'potion_hp_xl', name: 'Elixir Divino', emoji: '🌹', price: 160, attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 320, quantity: 2, description: '+320 HP (2 usos)' },
  { id: 'potion_mp_s', name: 'Poção de Mana P', emoji: '💧', price: 20, attackBonus: 0, defenseBonus: 0, consumable: true, consumeMpHeal: 40, quantity: 2, description: '+40 MP (2 usos)' },
  { id: 'potion_mp_m', name: 'Poção de Mana M', emoji: '🫧', price: 40, attackBonus: 0, defenseBonus: 0, consumable: true, consumeMpHeal: 80, quantity: 2, description: '+80 MP (2 usos)' },
  { id: 'potion_mp_l', name: 'Elixir de Mana', emoji: '💙', price: 90, attackBonus: 0, defenseBonus: 0, consumable: true, consumeMpHeal: 160, quantity: 2, description: '+160 MP (2 usos)' },
  { id: 'potion_full', name: 'Elixir Total', emoji: '🌟', price: 100, attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 120, consumeMpHeal: 120, quantity: 1, description: '+120 HP e MP (1 uso)' },
  { id: 'potion_ultra', name: 'Elixir dos Deuses', emoji: '✨', price: 250, attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 400, consumeMpHeal: 300, quantity: 1, description: '+400 HP e +300 MP (1 uso)' },
  // Basic gear
  { id: 'iron_sword', name: 'Espada de Ferro', emoji: '⚔️', price: 30, attackBonus: 6, defenseBonus: 0, description: '+6 ATK', permanent: true },
  { id: 'steel_shield', name: 'Escudo de Aço', emoji: '🛡️', price: 30, attackBonus: 0, defenseBonus: 6, description: '+6 DEF', permanent: true },
  { id: 'health_stone', name: 'Pedra da Vitalidade', emoji: '❤️', price: 40, attackBonus: 0, defenseBonus: 0, hpBonus: 40, description: '+40 HP Máx', permanent: true },
  { id: 'mana_crystal', name: 'Cristal de Mana', emoji: '💎', price: 40, attackBonus: 0, defenseBonus: 0, mpBonus: 40, description: '+40 MP Máx', permanent: true },
  { id: 'magic_ring', name: 'Anel Mágico', emoji: '💍', price: 55, attackBonus: 4, defenseBonus: 4, description: '+4 ATK +4 DEF', permanent: true },
  { id: 'war_boots', name: 'Botas de Guerra', emoji: '👢', price: 55, attackBonus: 5, defenseBonus: 3, description: '+5 ATK +3 DEF', permanent: true },
  { id: 'mystic_orb', name: 'Orbe Místico', emoji: '🔮', price: 65, attackBonus: 7, defenseBonus: 0, mpBonus: 25, description: '+7 ATK +25 MP', permanent: true },
  // Advanced gear
  { id: 'dragon_scale', name: 'Escama de Dragão', emoji: '🐉', price: 85, attackBonus: 0, defenseBonus: 12, description: '+12 DEF', permanent: true },
  { id: 'enchanted_blade', name: 'Lâmina Encantada', emoji: '✨', price: 85, attackBonus: 12, defenseBonus: 0, description: '+12 ATK', permanent: true },
  { id: 'arcane_tome', name: 'Tomo Arcano', emoji: '📖', price: 110, attackBonus: 10, defenseBonus: 0, mpBonus: 50, description: '+10 ATK +50 MP', permanent: true },
  { id: 'titan_armor', name: 'Armadura de Titã', emoji: '🦺', price: 130, attackBonus: 3, defenseBonus: 18, description: '+3 ATK +18 DEF', permanent: true },
  { id: 'void_blade', name: 'Lâmina do Vazio', emoji: '🌑', price: 130, attackBonus: 18, defenseBonus: 0, description: '+18 ATK', permanent: true },
  { id: 'godslayer', name: 'Mata-Deuses', emoji: '🗡️', price: 200, attackBonus: 24, defenseBonus: 6, description: '+24 ATK +6 DEF', permanent: true },
  { id: 'divine_shield', name: 'Escudo Divino', emoji: '🌟', price: 200, attackBonus: 6, defenseBonus: 24, hpBonus: 40, description: '+6 ATK +24 DEF +40 HP', permanent: true },
  // Legendary
  { id: 'abyssal_crown', name: 'Coroa Abissal', emoji: '👑', price: 280, attackBonus: 30, defenseBonus: 10, description: '+30 ATK +10 DEF', permanent: true },
  { id: 'celestial_armor', name: 'Armadura Celestial', emoji: '🌈', price: 280, attackBonus: 10, defenseBonus: 32, hpBonus: 60, description: '+10 ATK +32 DEF +60 HP', permanent: true },
  { id: 'cosmic_staff', name: 'Cajado Cósmico', emoji: '🌌', price: 300, attackBonus: 28, defenseBonus: 0, mpBonus: 100, description: '+28 ATK +100 MP', permanent: true },
  { id: 'void_relic', name: 'Relíquia do Vazio', emoji: '🔯', price: 350, attackBonus: 32, defenseBonus: 14, hpBonus: 50, mpBonus: 60, description: '+32 ATK +14 DEF +50HP +60MP', permanent: true },
  { id: 'annihilator', name: 'O Aniquilador', emoji: '💥', price: 500, attackBonus: 50, defenseBonus: 15, hpBonus: 60, description: '+50 ATK +15 DEF +60 HP', permanent: true },
  { id: 'eternity_ring', name: 'Anel da Eternidade', emoji: '♾️', price: 500, attackBonus: 20, defenseBonus: 20, hpBonus: 100, mpBonus: 100, description: '+20/20 ATK/DEF +100 HP/MP', permanent: true },
];

export const TRANSFORM_ITEM: Item = {
  id: 'ancient_god_essence', name: 'Essência do Deus Antigo', emoji: '🌟',
  price: 0, attackBonus: 0, defenseBonus: 0,
  description: 'Dropa do Deus Antigo Corrompido (Mapa 7). Transformação por 6 turnos (1 uso/combate).',
  consumable: false, permanent: true, isTransformItem: true,
};

// ─── Summon Templates ─────────────────────────────────────

export function createAnimalSummon(
  templateId: string, ownerId: string, ownerLevel: number, ownerAtk: number
): Monster {
  const templates: Record<string, { name: string; emoji: string; baseHp: number; baseAtk: number; baseDef: number; duration: number; ability: Monster['summonAbility'] }> = {
    wolf_summon:  { name: 'Lobo da Matilha', emoji: '🐺', baseHp: 60, baseAtk: 8, baseDef: 2, duration: 4, ability: { type: 'attack', value: 0, attackCount: 2 } },
    bear_summon:  { name: 'Urso Guardião', emoji: '🐻', baseHp: 140, baseAtk: 10, baseDef: 10, duration: 4, ability: { type: 'taunt', value: 0 } },
    stag_summon:  { name: 'Cervo Sagrado', emoji: '🦌', baseHp: 80, baseAtk: 2, baseDef: 5, duration: 4, ability: { type: 'heal_lowest', value: 30 } },
    boar_summon:  { name: 'Javali de Guerra', emoji: '🐗', baseHp: 110, baseAtk: 12, baseDef: 8, duration: 4, ability: { type: 'buff_group', value: 4 } },
    beast_summon: { name: 'Fera Selvagem', emoji: '🐆', baseHp: 90, baseAtk: 15, baseDef: 4, duration: 3, ability: { type: 'attack', value: 0, attackCount: 1, armorPierce: 0.8, poisonOnHit: 8 } },
    eagle_summon: { name: 'Águia Caçadora', emoji: '🦅', baseHp: 50, baseAtk: 12, baseDef: 1, duration: 3, ability: { type: 'attack', value: 0, attackCount: 3, armorPierce: 0.5 } },
  };
  const t = templates[templateId] ?? templates['wolf_summon'];
  const levelScale = (ownerLevel - 1) * 8;
  const hp = t.baseHp + levelScale;
  const atk = t.baseAtk + Math.floor(ownerAtk * BALANCE.SUMMON_ATK_OWNER_SCALE);
  return {
    id: nanoid(), name: t.name, emoji: t.emoji, level: ownerLevel,
    hp, maxHp: hp, mp: 0, maxMp: 0,
    attack: atk, defense: t.baseDef + Math.floor(ownerLevel * 0.5),
    xpReward: 0, coinReward: 0, isBoss: false, isSummon: true,
    effects: [], isAlive: true,
    summonOwnerId: ownerId, summonDuration: t.duration,
    summonAbility: t.ability,
    summonRole: 'damage',
  };
}

export function createNecroShadow(base: Monster | null, ownerId: string, ownerLevel: number, ownerAtk: number): Monster {
  const hp = base ? Math.floor(base.maxHp * 0.4) : 35 + ownerLevel * 6;
  const atk = base ? Math.floor(base.attack * 0.6) : Math.floor(ownerAtk * 0.5);
  return {
    id: nanoid(), name: base ? `Sombra de ${base.name}` : 'Sombra Espectral',
    emoji: '👻', level: ownerLevel,
    hp, maxHp: hp, mp: 0, maxMp: 0,
    attack: atk, defense: 0,
    xpReward: 0, coinReward: 0, isBoss: false, isSummon: true,
    effects: [], isAlive: true,
    summonOwnerId: ownerId, summonDuration: 4,
    summonAbility: { type: 'attack', value: 0, attackCount: 1 },
    isNecroShadow: true, summonRole: 'damage',
  };
}

// Re-export BALANCE for use in other files
export { BALANCE } from './utils';