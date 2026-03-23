import { ClassDefinition, ClassType, Item, MapDefinition, MapId, Monster, Skill } from './types';

export const CLASSES: Record<ClassType, ClassDefinition> = {
  warrior: {
    name: 'Guerreiro', emoji: '⚔️',
    description: 'Combatente corpo-a-corpo com alta defesa e vida.',
    baseStats: { hp: 150, mp: 50, attack: 10, defense: 8 },
    special: 'Fúria de Batalha: Ataque duplo que ignora 50% da defesa.',
    unlockedByDefault: true, color: '#e74c3c',
  },
  mage: {
    name: 'Mago', emoji: '🔮',
    description: 'Lançador de magias com alto ataque mágico.',
    baseStats: { hp: 80, mp: 150, attack: 14, defense: 2 },
    special: 'Explosão Arcana: Dano massivo em área.',
    unlockedByDefault: true, color: '#9b59b6',
  },
  rogue: {
    name: 'Ladino', emoji: '🗡️',
    description: 'Ágil e furtivo, causa dano crítico e veneno.',
    baseStats: { hp: 95, mp: 70, attack: 12, defense: 4 },
    special: 'Golpe Crítico: Dano triplicado.',
    unlockedByDefault: true, color: '#1abc9c',
  },
  necromancer: {
    name: 'Necromante', emoji: '💀',
    description: 'Mestre da morte. Drena vida e invoca mortos-vivos.',
    baseStats: { hp: 90, mp: 150, attack: 13, defense: 3 },
    special: 'Invocar Morto-Vivo: +8 dano para o grupo por 5 turnos.',
    unlockedByDefault: true, color: '#8e44ad',
  },
  paladin: {
    name: 'Paladino', emoji: '🛡️',
    description: 'Guerreiro sagrado que cura aliados e tanka dano.',
    baseStats: { hp: 130, mp: 90, attack: 8, defense: 10 },
    special: 'Bênção Divina: Cura 40HP de todos os aliados.',
    unlockedByDefault: true, color: '#f39c12',
  },
  ranger: {
    name: 'Arqueiro', emoji: '🏹',
    description: 'Atirador preciso com mobilidade e ataques em área.',
    baseStats: { hp: 100, mp: 90, attack: 12, defense: 5 },
    special: 'Chuva de Flechas: Ataca todos os inimigos.',
    unlockedByDefault: true, color: '#3498db',
  },
  assassin: {
    name: 'Assassino', emoji: '🌙',
    description: 'Sombra mortal. Golpes furtivos causam dano massivo.',
    baseStats: { hp: 85, mp: 100, attack: 15, defense: 3 },
    special: 'Execução: 3x dano se o alvo tiver menos de 50% HP.',
    unlockedByDefault: true, color: '#2c3e50',
  },
  elementalist: {
    name: 'Elementalista', emoji: '🌊',
    description: 'Domina fogo, gelo e raio com dano elemental massivo.',
    baseStats: { hp: 80, mp: 160, attack: 13, defense: 2 },
    special: 'Tempestade Elemental: Ataca todos com 3 elementos.',
    unlockedByDefault: true, color: '#e67e22',
  },
  berserker: {
    name: 'Berserker', emoji: '🪓',
    description: 'Guerreiro selvagem. Quanto menos HP, mais dano causa.',
    baseStats: { hp: 160, mp: 30, attack: 16, defense: 4 },
    special: 'Ira Sanguinária: Dano escala com HP faltando.',
    unlockedByDefault: true, color: '#c0392b',
  },
  guardian: {
    name: 'Guardião', emoji: '🗿',
    description: 'Fortíssimo. Absorve dano do grupo e contra-ataca.',
    baseStats: { hp: 200, mp: 60, attack: 8, defense: 18 },
    special: 'Muralha: Reduz 80% do dano do grupo por 2 turnos.',
    unlockedByDefault: true, color: '#7f8c8d',
  },
  druid: {
    name: 'Druida', emoji: '🌿',
    description: 'Curador da natureza. Cura, regenera e revive aliados.',
    baseStats: { hp: 100, mp: 130, attack: 7, defense: 6 },
    special: 'Círculo da Vida: Cura 50HP de todos os aliados.',
    unlockedByDefault: true, color: '#27ae60',
  },
  bard: {
    name: 'Bardo', emoji: '🎵',
    description: 'Músico guerreiro. Buffa o grupo com ATK, DEF e cura.',
    baseStats: { hp: 100, mp: 120, attack: 9, defense: 6 },
    special: 'Balada Épica: +7 ATK, +7 DEF e +30HP para todo o grupo.',
    unlockedByDefault: true, color: '#d35400',
  },
};

export const SKILLS: Record<ClassType, Skill[]> = {
  warrior: [
    { name: 'Golpe Pesado',     emoji: '⚔️', mpCost: 0,  damage: 6,  description: '+6 dano bônus' },
    { name: 'Provocar',         emoji: '😤', mpCost: 10, effect: 'taunt',       description: 'Força inimigos a atacar você por 2 turnos' },
    { name: 'Bloqueio',         emoji: '🛡️', mpCost: 15, effect: 'defense_up',  defBonus: 8, defBonusTurns: 2, description: '+8 DEF por 2 turnos' },
    { name: 'Fúria de Batalha', emoji: '💢', mpCost: 30, damage: 20, effect: 'ignore_half_def', description: 'Ignora 50% da DEF do alvo, +20 dano' },
    { name: 'Investida',        emoji: '🌪️', mpCost: 20, damage: 8,  aoe: true,  description: 'Ataca TODOS os inimigos (+8 cada)' },
    { name: 'Grito de Guerra',  emoji: '📣', mpCost: 25, effect: 'group_atk_up', atkGroupBonus: 5, atkGroupTurns: 3, description: '+5 ATK para TODOS do grupo por 3 turnos' },
    { name: 'COLOSSO DA GUERRA', emoji: '🌋', mpCost: 100, damage: 60, aoe: true, effect: 'ult', ultLevel: 3,
      ultName: 'COLOSSO DA GUERRA',
      ultLines: ['O guerreiro transcende seus limites...', 'A terra treme sob seus pés...', 'COLOSSO DA GUERRA!'],
      ultColor: '#e74c3c', ultBg: 'radial-gradient(ellipse, #3d0000 0%, #0a0000 70%)',
      description: '🔥 ULT: Explosão devastadora em TODOS os inimigos. Dano massivo + ignora toda DEF. (Nv.3)' },
  ],
  mage: [
    { name: 'Bola de Fogo',      emoji: '🔥', mpCost: 15, damage: 10, description: '+10 dano de fogo' },
    { name: 'Raio de Gelo',      emoji: '❄️', mpCost: 12, damage: 8,  effect: 'slow',        description: '+8 dano + lentidão (-30% dano) por 2 turnos' },
    { name: 'Escudo Arcano',     emoji: '🔵', mpCost: 20, effect: 'defense_up', defBonus: 10, defBonusTurns: 2, selfOnly: true, description: '+10 DEF por 2 turnos (própria)' },
    { name: 'Explosão Arcana',   emoji: '💥', mpCost: 50, damage: 25, aoe: true,  description: 'Dano MASSIVO em todos os inimigos' },
    { name: 'Raio Veloz',        emoji: '⚡', mpCost: 18, damage: 14, description: '+14 dano elétrico' },
    { name: 'Chuva de Meteoros', emoji: '☄️', mpCost: 55, damage: 18, aoe: true,  description: 'Meteoros em todos os inimigos' },
    { name: 'APOCALIPSE ARCANO', emoji: '🌌', mpCost: 100, damage: 80, aoe: true, effect: 'ult', ultLevel: 3,
      ultName: 'APOCALIPSE ARCANO',
      ultLines: ['O mago canaliza energia do além...', 'O tecido da realidade se rompe...', 'APOCALIPSE ARCANO!'],
      ultColor: '#9b59b6', ultBg: 'radial-gradient(ellipse, #1a0030 0%, #000008 70%)',
      description: '🔮 ULT: Destrói toda a realidade. Dano devastador em todos os inimigos. (Nv.3)' },
  ],
  rogue: [
    { name: 'Punhalada',       emoji: '🗡️', mpCost: 0,  damage: 5,  description: '+5 dano' },
    { name: 'Envenenar',       emoji: '☠️', mpCost: 20, effect: 'poison',   poisonDmg: 10, poisonTurns: 4, description: 'Veneno: 10 dano/turno por 4 turnos' },
    { name: 'Fumaça',          emoji: '💨', mpCost: 15, effect: 'dodge',                   description: 'Esquiva dos próximos 2 ataques inimigos' },
    { name: 'Golpe Crítico',   emoji: '⚡', mpCost: 40, damage: 25, effect: 'pierce',       description: '3x dano, ignora TODA a defesa' },
    { name: 'Sombra Dupla',    emoji: '👥', mpCost: 25, damage: 12, description: 'Ataca 2x no mesmo alvo (+12 cada)' },
    { name: 'Lâmina Venenosa', emoji: '🐍', mpCost: 35, damage: 10, effect: 'poison', poisonDmg: 12, poisonTurns: 5, description: '+10 dano + veneno (12/t por 5 turnos)' },
    { name: 'DANÇA DA MORTE', emoji: '💀', mpCost: 100, damage: 70, effect: 'ult', ultLevel: 3,
      ultName: 'DANÇA DA MORTE',
      ultLines: ['O ladino desaparece nas sombras...', 'Mil lâminas cortam o ar...', 'DANÇA DA MORTE!'],
      ultColor: '#1abc9c', ultBg: 'radial-gradient(ellipse, #001a15 0%, #000a08 70%)',
      description: '🗡️ ULT: Golpe único devastador que ignora toda DEF + veneno letal. (Nv.3)' },
  ],
  necromancer: [
    { name: 'Raio Sombrio',       emoji: '🖤', mpCost: 10, damage: 10, description: '+10 dano sombrio' },
    { name: 'Drenar Vida',        emoji: '🩸', mpCost: 20, damage: 10, heal: 15,   selfOnly: true, description: '+10 dano no alvo, +15HP de volta para você' },
    { name: 'Maldição Profunda',  emoji: '🔮', mpCost: 25, effect: 'curse', curseDef: 5, curseAtk: 4, curseTurns: 4, description: '-5 DEF e -4 ATK no alvo por 4 turnos' },
    { name: 'Invocar Morto-Vivo', emoji: '💀', mpCost: 45, effect: 'necro_buff', necroAtkBonus: 8, necroBonusTurns: 5, description: '+8 dano para TODO o grupo por 5 turnos' },
    { name: 'Explosão Sombria',   emoji: '🌑', mpCost: 35, damage: 14, aoe: true,  description: 'Dano sombrio em TODOS os inimigos' },
    { name: 'Toque da Morte',     emoji: '☠️', mpCost: 55, damage: 25, heal: 18,   selfOnly: true, description: '+25 dano + drena 18HP de volta' },
    { name: 'LEVANTE DOS MORTOS', emoji: '☠️', mpCost: 100, damage: 50, aoe: true, effect: 'ult', ultLevel: 3,
      ultName: 'LEVANTE DOS MORTOS',
      ultLines: ['Os mortos respondem ao chamado...', 'Exércitos das trevas emergem...', 'LEVANTE DOS MORTOS!'],
      ultColor: '#8e44ad', ultBg: 'radial-gradient(ellipse, #1a0028 0%, #050005 70%)',
      description: '💀 ULT: Levanta um exército espectral. Dano em área + cura o necromante. (Nv.3)' },
  ],
  paladin: [
    { name: 'Smite',           emoji: '✨', mpCost: 10, damage: 8,  description: '+8 dano sagrado' },
    { name: 'Curar',           emoji: '💚', mpCost: 20, heal: 35,   targetAlly: true, description: 'Cura 35HP em aliado escolhido' },
    { name: 'Escudo de Luz',   emoji: '🌟', mpCost: 25, effect: 'defense_up', defBonus: 12, defBonusTurns: 3, selfOnly: true, description: '+12 DEF por 3 turnos (própria)' },
    { name: 'Bênção Divina',   emoji: '🙏', mpCost: 60, heal: 40,   effect: 'aoe_heal', description: 'Cura 40HP em TODOS os aliados vivos' },
    { name: 'Martelo Sagrado', emoji: '🔨', mpCost: 30, damage: 18, description: '+18 dano sagrado' },
    { name: 'Ressurreição',    emoji: '✝️', mpCost: 70, effect: 'revive', reviveHpPct: 0.4, targetAlly: true, description: 'Revive aliado morto com 40% do HP máximo' },
    { name: 'JULGAMENTO DIVINO', emoji: '⚡', mpCost: 100, damage: 55, aoe: true, effect: 'ult', ultLevel: 3,
      heal: 30,
      ultName: 'JULGAMENTO DIVINO',
      ultLines: ['A luz dos deuses desce sobre o campo...', 'Nenhuma sombra pode resistir...', 'JULGAMENTO DIVINO!'],
      ultColor: '#f39c12', ultBg: 'radial-gradient(ellipse, #2a1a00 0%, #0a0600 70%)',
      description: '⚡ ULT: Luz divina destrói todos os inimigos + cura todo o grupo. (Nv.3)' },
  ],
  ranger: [
    { name: 'Flechada',         emoji: '🏹', mpCost: 0,  damage: 6,  description: '+6 dano' },
    { name: 'Armadilha',        emoji: '🪤', mpCost: 20, effect: 'stun',     stunTurns: 2, description: 'Atordoa o alvo por 2 turnos (perde o turno)' },
    { name: 'Olho de Águia',    emoji: '🦅', mpCost: 25, effect: 'aim',      aimBonus: 18, description: 'Próximo ataque básico +18 dano bônus' },
    { name: 'Chuva de Flechas', emoji: '🌧️', mpCost: 45, damage: 12, aoe: true,  description: 'Ataca TODOS os inimigos (+12 cada)' },
    { name: 'Flecha Explosiva', emoji: '💣', mpCost: 30, damage: 16, description: '+16 dano explosivo' },
    { name: 'Tiro Perfurante',  emoji: '🎯', mpCost: 35, damage: 12, effect: 'pierce', description: 'Ignora TODA a defesa do alvo' },
    { name: 'TEMPESTADE DE FLECHAS', emoji: '🌪️', mpCost: 100, damage: 45, aoe: true, effect: 'ult', ultLevel: 3,
      ultName: 'TEMPESTADE DE FLECHAS',
      ultLines: ['O arqueiro mira em tudo ao mesmo tempo...', 'O céu escurece com flechas...', 'TEMPESTADE DE FLECHAS!'],
      ultColor: '#3498db', ultBg: 'radial-gradient(ellipse, #001428 0%, #000508 70%)',
      description: '🏹 ULT: Mil flechas caem do céu. Todos os inimigos atordoados. (Nv.3)' },
  ],
  assassin: [
    { name: 'Ataque Furtivo',    emoji: '🌙', mpCost: 0,  damage: 7,  description: '+7 dano furtivo' },
    { name: 'Marca da Morte',    emoji: '🎯', mpCost: 15, effect: 'mark',  markMult: 1.6, markTurns: 3, description: '+60% dano no alvo marcado por 3 turnos' },
    { name: 'Névoa das Sombras', emoji: '🌫️', mpCost: 20, effect: 'dodge',                description: 'Esquiva dos próximos 2 ataques inimigos' },
    { name: 'Execução',          emoji: '💀', mpCost: 40, damage: 30, effect: 'execute',   description: '3x dano se alvo < 50% HP (ignora DEF)' },
    { name: 'Golpe Duplo',       emoji: '⚡', mpCost: 25, damage: 15, description: 'Dois golpes rápidos (+15 cada)' },
    { name: 'Veneno Mortal',     emoji: '☠️', mpCost: 35, damage: 12, effect: 'poison', poisonDmg: 15, poisonTurns: 5, description: '+12 dano + veneno mortal (15/t por 5t)' },
    { name: 'SOMBRA ABSOLUTA', emoji: '🌑', mpCost: 100, damage: 90, effect: 'ult', ultLevel: 3,
      ultName: 'SOMBRA ABSOLUTA',
      ultLines: ['O assassino some da existência...', 'Torna-se pura escuridão...', 'SOMBRA ABSOLUTA!'],
      ultColor: '#2c3e50', ultBg: 'radial-gradient(ellipse, #0a0a0f 0%, #000002 70%)',
      description: '🌑 ULT: Golpe de um ser além das sombras. Dano MÁXIMO em um alvo. (Nv.3)' },
  ],
  elementalist: [
    { name: 'Chama Menor',          emoji: '🔥', mpCost: 10, damage: 8,  description: '+8 dano de fogo' },
    { name: 'Lança de Gelo',        emoji: '❄️', mpCost: 15, damage: 10, effect: 'slow',   description: '+10 dano + lentidão por 2 turnos' },
    { name: 'Raio Cadente',         emoji: '⚡', mpCost: 18, damage: 14, description: '+14 dano elétrico' },
    { name: 'Tempestade Elemental', emoji: '🌊', mpCost: 55, damage: 20, aoe: true, description: 'Fogo+gelo+raio em TODOS os inimigos' },
    { name: 'Nova de Gelo',         emoji: '🌨️', mpCost: 30, damage: 10, aoe: true, effect: 'slow', description: 'Gelo+lentidão em TODOS os inimigos' },
    { name: 'Meteoro de Magma',     emoji: '🌋', mpCost: 45, damage: 30, description: '+30 dano de fogo massivo em 1 alvo' },
    { name: 'CONVERGÊNCIA ELEMENTAL', emoji: '🌀', mpCost: 100, damage: 65, aoe: true, effect: 'ult', ultLevel: 3,
      ultName: 'CONVERGÊNCIA ELEMENTAL',
      ultLines: ['Os 4 elementos se unem em um ponto...', 'Fogo, gelo, raio e vento convergem...', 'CONVERGÊNCIA ELEMENTAL!'],
      ultColor: '#e67e22', ultBg: 'radial-gradient(ellipse, #1a0f00 0%, #060300 70%)',
      description: '🌀 ULT: Todos os elementos explodem simultaneamente. (Nv.3)' },
  ],
  berserker: [
    { name: 'Golpe Selvagem', emoji: '🪓', mpCost: 0,  damage: 8,  description: '+8 dano brutal' },
    { name: 'Frenesi',        emoji: '😡', mpCost: 20, effect: 'berserk', berserkAtkBonus: 8, berserkDefPenalty: 3, berserkTurns: 3, description: '+8 ATK, -3 DEF por 3 turnos' },
    { name: 'Rugido',         emoji: '🦁', mpCost: 15, effect: 'taunt',   description: 'Força inimigos a atacar você por 2 turnos' },
    { name: 'Devastar',       emoji: '💥', mpCost: 35, damage: 22, effect: 'ignore_half_def', description: 'Ignora 50% da DEF, +22 dano' },
    { name: 'Golpe Triplo',   emoji: '⚡', mpCost: 25, damage: 10, description: 'Ataca 3x no alvo (+10 cada)' },
    { name: 'Ira Sanguinária',emoji: '🩸', mpCost: 45, damage: 20, effect: 'rage_scale', description: 'Dano escala com HP faltando (até 3x se quase morto)' },
    { name: 'FÚRIA DO TITÃ', emoji: '⚡', mpCost: 100, damage: 75, aoe: true, effect: 'ult', ultLevel: 3,
      ultName: 'FÚRIA DO TITÃ',
      ultLines: ['O berserker abandona toda razão...', 'Pura violência primordial desencadeada...', 'FÚRIA DO TITÃ!'],
      ultColor: '#c0392b', ultBg: 'radial-gradient(ellipse, #280000 0%, #080000 70%)',
      description: '⚡ ULT: Violência absoluta. Dano em área escala com HP perdido. (Nv.3)' },
  ],
  guardian: [
    { name: 'Escudaraço',       emoji: '🗿', mpCost: 0,  damage: 6,  description: '+6 dano com escudo' },
    { name: 'Provocação Total', emoji: '📢', mpCost: 10, effect: 'taunt', description: 'TODOS os inimigos atacam o Guardião por 2 turnos' },
    { name: 'Muralha',          emoji: '🏰', mpCost: 30, effect: 'wall',    wallTurns: 2,    description: 'Reduz 80% do dano de TODOS do grupo por 2 turnos' },
    { name: 'Contra-Ataque',    emoji: '🔄', mpCost: 25, effect: 'counter', counterPct: 0.6, description: 'Reflete 60% do próximo dano recebido' },
    { name: 'Fortaleza',        emoji: '⛩️', mpCost: 20, effect: 'defense_up', defBonus: 20, defBonusTurns: 3, selfOnly: true, description: '+20 DEF por 3 turnos (própria)' },
    { name: 'Golpe de Escudo',  emoji: '🛡️', mpCost: 35, damage: 22, effect: 'stun', stunTurns: 1, description: '+22 dano e atordoa o alvo por 1 turno' },
    { name: 'BASTIÃO ETERNO', emoji: '🗿', mpCost: 100, effect: 'ult', ultLevel: 3,
      ultName: 'BASTIÃO ETERNO',
      ultLines: ['O guardião se torna uma montanha...', 'Nenhuma força pode mover essa rocha...', 'BASTIÃO ETERNO!'],
      ultColor: '#7f8c8d', ultBg: 'radial-gradient(ellipse, #0f1010 0%, #030404 70%)',
      damage: 30, aoe: true,
      description: '🗿 ULT: Torna-se imortal. Grupo invulnerável por 3 turnos + dano em área. (Nv.3)' },
  ],
  druid: [
    { name: 'Espinhos',              emoji: '🌿', mpCost: 0,  damage: 6,  description: '+6 dano da natureza' },
    { name: 'Cura Natural',          emoji: '🍃', mpCost: 15, heal: 40,   targetAlly: true, description: 'Cura 40HP em aliado escolhido' },
    { name: 'Regenerar',             emoji: '♻️', mpCost: 20, effect: 'regen', regenHp: 15, regenTurns: 4, targetAlly: true, description: '+15HP/turno por 4 turnos em aliado escolhido' },
    { name: 'Círculo da Vida',       emoji: '🌸', mpCost: 55, heal: 50,   effect: 'aoe_heal', description: 'Cura 50HP em TODOS os aliados vivos' },
    { name: 'Raiz Presa',            emoji: '🌱', mpCost: 25, effect: 'stun', stunTurns: 2, description: 'Enraíza e atordoa o alvo por 2 turnos' },
    { name: 'Tempestade da Floresta',emoji: '🍂', mpCost: 40, damage: 14, aoe: true, effect: 'poison', poisonDmg: 8, poisonTurns: 3, description: '+14 dano em área + veneno (8/t 3t) em todos' },
    { name: 'RENASCIMENTO DA TERRA', emoji: '🌍', mpCost: 100, heal: 80, effect: 'ult', ultLevel: 3,
      ultName: 'RENASCIMENTO DA TERRA',
      ultLines: ['A terra pulsa com energia ancestral...', 'A natureza responde ao chamado...', 'RENASCIMENTO DA TERRA!'],
      ultColor: '#27ae60', ultBg: 'radial-gradient(ellipse, #001a08 0%, #000503 70%)',
      description: '🌍 ULT: A natureza cura e ressuscita todos os aliados. (Nv.3)' },
  ],
  bard: [
    { name: 'Nota Cortante',      emoji: '🎵', mpCost: 0,  damage: 6,  description: '+6 dano sonoro' },
    { name: 'Canção de Cura',     emoji: '🎶', mpCost: 15, heal: 30,   targetAlly: true, description: 'Cura 30HP em aliado escolhido' },
    { name: 'Melodia Inspiradora',emoji: '🎸', mpCost: 20, effect: 'group_atk_up', atkGroupBonus: 5, atkGroupTurns: 3, description: '+5 ATK para TODOS do grupo por 3 turnos' },
    { name: 'Balada Épica',       emoji: '🎺', mpCost: 60, effect: 'balada', baladaAtk: 7, baladaDef: 7, baladaHeal: 30, description: '+7 ATK, +7 DEF e +30HP para TODOS do grupo' },
    { name: 'Dissonância',        emoji: '📯', mpCost: 25, damage: 10, aoe: true,  effect: 'stun', stunTurns: 1, description: 'Som ensurdecedor em todos (+10 dano, 40% chance atordoar)' },
    { name: 'Canção da Morte',    emoji: '🎻', mpCost: 45, damage: 22, description: '+22 dano letal' },
    { name: 'SINFONIA DO APOCALIPSE', emoji: '🎼', mpCost: 100, effect: 'ult', ultLevel: 3,
      ultName: 'SINFONIA DO APOCALIPSE',
      ultLines: ['Uma melodia que rasga o mundo...', 'Toda criação treme com o som...', 'SINFONIA DO APOCALIPSE!'],
      ultColor: '#d35400', ultBg: 'radial-gradient(ellipse, #1a0800 0%, #060200 70%)',
      damage: 40, aoe: true,
      description: '🎼 ULT: A música que destrói mundos. Dano + TODOS os buffs máximos. (Nv.3)' },
  ],
};

function makeMonster(
  id: string, name: string, emoji: string, level: number,
  hp: number, attack: number, defense: number,
  xp: number, coins: number, isBoss = false
): Monster {
  return { id, name, emoji, level, hp, maxHp: hp, attack, defense, xpReward: xp, coinReward: coins, isBoss, effects: [] };
}

export const MAPS: MapDefinition[] = [
  {
    id: 1, name: 'Floresta Sombria', theme: '🌲',
    description: 'Uma floresta antiga cheia de criaturas selvagens.',
    difficulty: 'Iniciante', defenseDebuff: 0, manaCostMultiplier: 1, bgColor: '#1a2f1a', unlocked: true,
    monsters: [
      makeMonster('goblin',   'Goblin',          '👺', 1, 45, 7, 2, 15, 5),
      makeMonster('wolf',     'Lobo Selvagem',   '🐺', 1, 40, 8, 3, 12, 4),
      makeMonster('slime',    'Gosma Verde',     '🟢', 1, 38, 6, 1, 10, 3),
      makeMonster('spider',   'Aranha Gigante',  '🕷️', 1, 42, 7, 2, 14, 4),
      makeMonster('bandit',   'Bandido',         '🪓', 1, 50, 8, 2, 16, 6),
    ],
    boss: makeMonster('troll', 'Troll da Floresta', '👹', 3, 350, 14, 8, 100, 40, true),
  },
  {
    id: 2, name: 'Pântano Maldito', theme: '🌿',
    description: 'Terrenos alagados com criaturas venenosas.',
    difficulty: 'Iniciante', defenseDebuff: 0, manaCostMultiplier: 1, bgColor: '#1a2a10', unlocked: false,
    monsters: [
      makeMonster('frog',     'Sapo Venenoso',   '🐸', 3, 58, 10, 3, 20, 7),
      makeMonster('snake',    'Serpente',        '🐍', 3, 52, 11, 2, 18, 6),
      makeMonster('mushroom', 'Cogumelo Tóxico', '🍄', 3, 65, 8,  4, 22, 8),
      makeMonster('lizard',   'Lagarto Gigante', '🦎', 3, 60, 10, 3, 21, 7),
    ],
    boss: makeMonster('hydra', 'Hidra do Pântano', '🐲', 5, 500, 16, 9, 150, 55, true),
  },
  {
    id: 3, name: 'Cavernas de Pedra', theme: '🪨',
    description: 'Cavernas escuras. Sua defesa é reduzida em 20%!',
    difficulty: 'Intermediário', defenseDebuff: 0.2, manaCostMultiplier: 1, bgColor: '#1a1a2f', unlocked: false,
    monsters: [
      makeMonster('orc',            'Orc Guerreiro',     '🧌', 6, 100, 14, 8, 50, 18),
      makeMonster('stone_golem_sm', 'Mini Golem',        '🪨', 6, 120, 13, 11,55, 20),
      makeMonster('dark_elf',       'Elfo Sombrio',      '🧝', 6, 85,  16, 5, 48, 17),
      makeMonster('cave_bat',       'Morcego Gigante',   '🦇', 6, 78,  15, 4, 42, 15),
      makeMonster('troll_cave',     'Troll das Cavernas','👾', 6, 110, 14, 7, 52, 19),
    ],
    boss: makeMonster('stone_golem', 'Golem de Pedra', '⛏️', 7, 650, 22, 16, 220, 85, true),
  },
  {
    id: 4, name: 'Ruínas Amaldiçoadas', theme: '🏚️',
    description: 'Fantasmas e mortos-vivos habitam estas paredes.',
    difficulty: 'Intermediário', defenseDebuff: 0.1, manaCostMultiplier: 1, bgColor: '#2a1a2f', unlocked: false,
    monsters: [
      makeMonster('ghost',    'Fantasma',            '👻', 8, 95,  18, 4, 60, 22),
      makeMonster('skeleton', 'Esqueleto Guerreiro', '💀', 8, 115, 17, 8, 65, 24),
      makeMonster('zombie',   'Zumbi Antigo',        '🧟', 8, 135, 15, 7, 62, 23),
      makeMonster('wraith',   'Espectro Sombrio',    '🌑', 8, 100, 20, 5, 68, 25),
    ],
    boss: makeMonster('lich_king', 'Rei Lich', '☠️', 9, 800, 26, 14, 320, 120, true),
  },
  {
    id: 5, name: 'Vulcão Ardente', theme: '🌋',
    description: 'Calor intenso dobra o custo de mana!',
    difficulty: 'Avançado', defenseDebuff: 0, manaCostMultiplier: 2, bgColor: '#2f1510', unlocked: false,
    monsters: [
      makeMonster('fire_elem',  'Elemental de Fogo',  '🔥', 10, 145, 22, 10, 90, 35),
      makeMonster('lava_golem', 'Golem de Lava',      '🌋', 10, 175, 20, 14, 95, 38),
      makeMonster('fire_drake', 'Drake Flamejante',   '🐉', 10, 160, 23, 11, 92, 36),
      makeMonster('ember',      'Espírito da Brasa',  '✨', 10, 130, 24, 7,  88, 34),
    ],
    boss: makeMonster('fire_titan', 'Titã de Fogo', '🔴', 11, 1000, 30, 18, 450, 175, true),
  },
  {
    id: 6, name: 'Torre do Abismo', theme: '🏰',
    description: 'Mana dobrada. Demônios guardam cada andar.',
    difficulty: 'Avançado', defenseDebuff: 0, manaCostMultiplier: 2, bgColor: '#2f1a1a', unlocked: false,
    monsters: [
      makeMonster('demon',      'Demônio Menor',       '😈', 12, 195, 26, 14, 110, 45),
      makeMonster('lich',       'Lich',                '💀', 12, 170, 29, 10, 115, 48),
      makeMonster('draco',      'Draconato',           '🐉', 12, 215, 24, 16, 120, 50),
      makeMonster('darkknight', 'Cavaleiro das Trevas','🖤', 12, 205, 27, 15, 118, 47),
    ],
    boss: makeMonster('demon_lord', 'Lorde Demoníaco', '👿', 13, 1300, 35, 20, 650, 260, true),
  },
  {
    id: 7, name: 'Reino dos Deuses Caídos', theme: '⚡',
    description: 'Defesa -30% e mana x2. Apenas os mais fortes sobrevivem.',
    difficulty: 'Lendário', defenseDebuff: 0.3, manaCostMultiplier: 2, bgColor: '#1a1030', unlocked: false,
    monsters: [
      makeMonster('fallen_angel', 'Anjo Caído',      '🪽', 16, 290, 33, 18, 180, 72),
      makeMonster('chaos_beast',  'Besta do Caos',   '🌀', 16, 320, 31, 20, 185, 74),
      makeMonster('void_reaper',  'Ceifador do Vazio','🌑', 16, 265, 36, 16, 190, 76),
      makeMonster('titan_spawn',  'Filhote de Titã', '👁️', 16, 300, 32, 21, 182, 73),
    ],
    boss: makeMonster('ancient_god', 'Deus Antigo Corrompido', '🌟', 20, 2500, 48, 28, 1500, 600, true),
  },
];

export const SHOP_ITEMS: Item[] = [
  { id: 'potion_hp_s',  name: 'Poção de Vida P',  emoji: '🧪', price: 20,  attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 50,   quantity: 2, description: 'Usa no combate: +50 HP (vem com 2 usos)' },
  { id: 'potion_hp_m',  name: 'Poção de Vida M',  emoji: '💊', price: 40,  attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 90,   quantity: 2, description: 'Usa no combate: +90 HP (vem com 2 usos)' },
  { id: 'potion_hp_l',  name: 'Elixir de Vida',   emoji: '⚗️', price: 80,  attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 160,  quantity: 2, description: 'Usa no combate: +160 HP (vem com 2 usos)' },
  { id: 'potion_mp_s',  name: 'Poção de Mana P',  emoji: '💧', price: 20,  attackBonus: 0, defenseBonus: 0, consumable: true, consumeMpHeal: 40,  quantity: 2, description: 'Usa no combate: +40 MP (vem com 2 usos)' },
  { id: 'potion_mp_m',  name: 'Poção de Mana M',  emoji: '🫧', price: 40,  attackBonus: 0, defenseBonus: 0, consumable: true, consumeMpHeal: 80,  quantity: 2, description: 'Usa no combate: +80 MP (vem com 2 usos)' },
  { id: 'potion_full',  name: 'Elixir Total',      emoji: '🌟', price: 100, attackBonus: 0, defenseBonus: 0, consumable: true, consumeHeal: 120, consumeMpHeal: 120, quantity: 1, description: 'Usa no combate: +120 HP e +120 MP (1 uso)' },
  { id: 'iron_sword',     name: 'Espada de Ferro',     emoji: '⚔️', price: 30,  attackBonus: 6,  defenseBonus: 0,  description: '+6 ATK permanente',         permanent: true },
  { id: 'steel_shield',   name: 'Escudo de Aço',       emoji: '🛡️', price: 30,  attackBonus: 0,  defenseBonus: 6,  description: '+6 DEF permanente',         permanent: true },
  { id: 'health_stone',   name: 'Pedra da Vitalidade', emoji: '❤️', price: 40,  attackBonus: 0,  defenseBonus: 0,  hpBonus: 40,  description: '+40 HP Máx permanente',    permanent: true },
  { id: 'mana_crystal',   name: 'Cristal de Mana',     emoji: '💎', price: 40,  attackBonus: 0,  defenseBonus: 0,  mpBonus: 40,  description: '+40 MP Máx permanente',    permanent: true },
  { id: 'magic_ring',     name: 'Anel Mágico',         emoji: '💍', price: 55,  attackBonus: 4,  defenseBonus: 4,  description: '+4 ATK +4 DEF permanente',  permanent: true },
  { id: 'amulet',         name: 'Amuleto da Sorte',    emoji: '📿', price: 65,  attackBonus: 5,  defenseBonus: 5,  description: '+5 ATK +5 DEF permanente',  permanent: true },
  { id: 'war_boots',      name: 'Botas de Guerra',     emoji: '👢', price: 55,  attackBonus: 5,  defenseBonus: 3,  description: '+5 ATK +3 DEF permanente',  permanent: true },
  { id: 'mystic_orb',     name: 'Orbe Místico',        emoji: '🔮', price: 65,  attackBonus: 7,  defenseBonus: 0,  mpBonus: 25,  description: '+7 ATK +25 MP permanente', permanent: true },
  { id: 'dragon_scale',    name: 'Escama de Dragão',   emoji: '🐉', price: 85,  attackBonus: 0,  defenseBonus: 12, description: '+12 DEF permanente',        permanent: true },
  { id: 'enchanted_blade', name: 'Lâmina Encantada',   emoji: '✨', price: 85,  attackBonus: 12, defenseBonus: 0,  description: '+12 ATK permanente',        permanent: true },
  { id: 'arcane_tome',     name: 'Tomo Arcano',        emoji: '📖', price: 110, attackBonus: 10, defenseBonus: 0,  mpBonus: 50,  description: '+10 ATK +50 MP permanente', permanent: true },
  { id: 'elixir_life',     name: 'Pedra da Vida',      emoji: '💠', price: 110, attackBonus: 0,  defenseBonus: 6,  hpBonus: 70,  description: '+70 HP +6 DEF permanente', permanent: true },
  { id: 'titan_armor',  name: 'Armadura de Titã',  emoji: '🦺', price: 130, attackBonus: 3,  defenseBonus: 18, description: '+3 ATK +18 DEF permanente',     permanent: true },
  { id: 'void_blade',   name: 'Lâmina do Vazio',   emoji: '🌑', price: 130, attackBonus: 18, defenseBonus: 0,  description: '+18 ATK permanente',            permanent: true },
  { id: 'godslayer',    name: 'Mata-Deuses',        emoji: '🗡️', price: 200, attackBonus: 24, defenseBonus: 6,  description: '+24 ATK +6 DEF permanente',     permanent: true },
  { id: 'divine_shield',name: 'Escudo Divino',     emoji: '🌟', price: 200, attackBonus: 6,  defenseBonus: 24, hpBonus: 40, description: '+6 ATK +24 DEF +40 HP perm.', permanent: true },
];

export const XP_PER_LEVEL = (level: number) => level * 100;

import { Player, DEFAULT_BUFFS } from './types';

export function createPlayer(id: string, name: string, classType: ClassType): Player {
  const cls = CLASSES[classType];
  return {
    id, name, classType,
    level: 1, xp: 0, xpToNextLevel: 100,
    hp: cls.baseStats.hp, maxHp: cls.baseStats.hp,
    mp: cls.baseStats.mp, maxMp: cls.baseStats.mp,
    attack: cls.baseStats.attack, defense: cls.baseStats.defense,
    // CRITICAL: store base stats so levelUp can scale correctly
    baseAttack: cls.baseStats.attack,
    baseDefense: cls.baseStats.defense,
    inventory: [], coins: 0, isReady: false, isAlive: true,
    statusEffects: [],
    buffs: { ...DEFAULT_BUFFS },
  };
}

export function rollDice(): number {
  return Math.floor(Math.random() * 10) + 1;
}

export function calculateDamage(attackerAttack: number, targetDefense: number, diceRoll: number, bonus = 0): number {
  return Math.max(1, diceRoll + attackerAttack + bonus - targetDefense);
}

// FIX: scale from baseAttack/baseDefense, not current attack/defense
// Previous code: attack: player.attack + Math.floor(newLevel * 1.8)  ← BUG: compounds
// Fixed code:    attack: player.baseAttack + Math.floor(newLevel * 1.8) ← correct
export function levelUp(player: Player): { player: Player; didLevelUp: boolean } {
  if (player.xp < player.xpToNextLevel) return { player, didLevelUp: false };
  const newLevel = player.level + 1;
  const hpGain = 18;
  const mpGain = 12;
  return {
    player: {
      ...player,
      level: newLevel,
      xp: player.xp - player.xpToNextLevel,
      xpToNextLevel: XP_PER_LEVEL(newLevel),
      maxHp: player.maxHp + hpGain,
      hp: Math.min(player.hp + hpGain, player.maxHp + hpGain),
      maxMp: player.maxMp + mpGain,
      // Scale from BASE stats only — equipment bonuses are already in attack/defense
      // and are preserved because we only change the "level scaling" portion
      attack: player.baseAttack + Math.floor(newLevel * 1.8) + (player.attack - player.baseAttack - Math.floor(player.level * 1.8)),
      defense: player.baseDefense + Math.floor(newLevel * 1.0) + (player.defense - player.baseDefense - Math.floor(player.level * 1.0)),
    },
    didLevelUp: true,
  };
}