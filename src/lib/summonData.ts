import { Monster, Player } from './types';
import { nanoid } from 'nanoid';

export interface AnimalTemplate {
  id: string;
  name: string;
  emoji: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  multiAttack?: number;
  armorPierce?: number;
  tauntSummon?: boolean;
  healAlly?: boolean;          // heals lowest HP ally instead of attacking
  healAmount?: number;
  buffAllies?: boolean;        // buffs all allies ATK
  buffAtkBonus?: number;
  poisonOnHit?: boolean;       // applies poison on attack
  poisonDmg?: number;
  duration: number;
  role: 'damage' | 'tank' | 'healer' | 'buffer' | 'debuffer';
  roleDesc: string;
}

export const ANIMAL_TEMPLATES: Record<string, AnimalTemplate> = {
  wolf_summon: {
    id: 'wolf_summon', name: 'Lobo da Matilha', emoji: '🐺',
    baseHp: 60, baseAtk: 8, baseDef: 2, multiAttack: 2,
    duration: 4, role: 'damage',
    roleDesc: 'Ataca 2× por turno, velocidade selvagem',
  },
  bear_summon: {
    id: 'bear_summon', name: 'Urso Guardião', emoji: '🐻',
    baseHp: 140, baseAtk: 10, baseDef: 10, tauntSummon: true,
    duration: 4, role: 'tank',
    roleDesc: 'Provoca todos os inimigos, absorve golpes',
  },
  eagle_summon: {
    id: 'eagle_summon', name: 'Águia Caçadora', emoji: '🦅',
    baseHp: 50, baseAtk: 12, baseDef: 1, multiAttack: 3, armorPierce: 0.5,
    duration: 3, role: 'damage',
    roleDesc: 'Ataca 3× ignorando 50% da DEF',
  },
  beast_summon: {
    id: 'beast_summon', name: 'Fera Selvagem', emoji: '🐆',
    baseHp: 90, baseAtk: 15, baseDef: 4, armorPierce: 0.8,
    poisonOnHit: true, poisonDmg: 8,
    duration: 3, role: 'debuffer',
    roleDesc: 'Ignora 80% da DEF + envenena a cada golpe',
  },
  // NEW ANIMALS
  stag_summon: {
    id: 'stag_summon', name: 'Cervo Sagrado', emoji: '🦌',
    baseHp: 80, baseAtk: 2, baseDef: 5,
    healAlly: true, healAmount: 30,
    duration: 4, role: 'healer',
    roleDesc: 'Cura o aliado com menos HP por turno',
  },
  boar_summon: {
    id: 'boar_summon', name: 'Javali de Guerra', emoji: '🐗',
    baseHp: 110, baseAtk: 12, baseDef: 8,
    buffAllies: true, buffAtkBonus: 4,
    duration: 4, role: 'buffer',
    roleDesc: 'Buffa +4 ATK em todos os aliados por turno',
  },
  snake_summon: {
    id: 'snake_summon', name: 'Serpente Venenosa', emoji: '🐍',
    baseHp: 45, baseAtk: 8, baseDef: 1,
    poisonOnHit: true, poisonDmg: 14, armorPierce: 0.6,
    duration: 3, role: 'debuffer',
    roleDesc: 'Veneno forte (14/t) + ignora 60% DEF',
  },
  owl_summon: {
    id: 'owl_summon', name: 'Coruja Sábia', emoji: '🦉',
    baseHp: 55, baseAtk: 4, baseDef: 3,
    healAlly: true, healAmount: 20,
    buffAllies: true, buffAtkBonus: 3,
    duration: 4, role: 'buffer',
    roleDesc: 'Cura + buffa ATK simultaneamente',
  },
};

export function spawnAnimalSummon(
  templateId: string,
  ownerId: string,
  ownerLevel: number,
  ownerAtk: number,
  ownerHp: number = 0
): Monster & { healAlly?: boolean; healAmount?: number; buffAllies?: boolean; buffAtkBonus?: number; poisonOnHit?: boolean; poisonDmg?: number; animalRole?: string } {
  const tpl = ANIMAL_TEMPLATES[templateId] ?? ANIMAL_TEMPLATES['wolf_summon'];
  const levelScale = (ownerLevel - 1) * 8;
  const hp  = tpl.baseHp + levelScale;
  const atk = tpl.baseAtk + Math.floor(ownerAtk * 0.3);

  return {
    id: nanoid(),
    name: tpl.name,
    emoji: tpl.emoji,
    level: ownerLevel,
    hp, maxHp: hp,
    attack: atk,
    defense: tpl.baseDef + Math.floor(ownerLevel * 0.5),
    xpReward: 0, coinReward: 0, isBoss: false, effects: [],
    isSummon: true,
    summonOwnerId: ownerId,
    summonDuration: tpl.duration,
    multiAttack: tpl.multiAttack,
    armorPierce: tpl.armorPierce,
    ...(tpl.tauntSummon ? { tauntSummon: true } : {}),
    ...(tpl.healAlly ? { healAlly: true, healAmount: tpl.healAmount } : {}),
    ...(tpl.buffAllies ? { buffAllies: true, buffAtkBonus: tpl.buffAtkBonus } : {}),
    ...(tpl.poisonOnHit ? { poisonOnHit: true, poisonDmg: tpl.poisonDmg } : {}),
    animalRole: tpl.role,
  } as any;
}

export function spawnNecroShadow(deadMonster: Monster, ownerId: string): Monster {
  const hp  = Math.max(20, Math.floor(deadMonster.maxHp * 0.4));
  const atk = Math.max(4,  Math.floor(deadMonster.attack * 0.6));
  const def = Math.max(0,  Math.floor(deadMonster.defense * 0.4));
  return {
    id: nanoid(),
    name: `Sombra de ${deadMonster.name}`,
    emoji: '👻',
    level: deadMonster.level,
    hp, maxHp: hp, attack: atk, defense: def,
    xpReward: 0, coinReward: 0, isBoss: false, effects: [],
    isSummon: true, isNecroShadow: true,
    summonOwnerId: ownerId, summonDuration: 4,
  };
}

export function spawnGenericShadow(ownerId: string, ownerLevel: number, ownerAtk: number): Monster {
  const hp  = 35 + ownerLevel * 6;
  const atk = Math.max(5, Math.floor(ownerAtk * 0.5));
  return {
    id: nanoid(), name: 'Sombra Espectral', emoji: '👻', level: ownerLevel,
    hp, maxHp: hp, attack: atk, defense: 0,
    xpReward: 0, coinReward: 0, isBoss: false, effects: [],
    isSummon: true, isNecroShadow: true,
    summonOwnerId: ownerId, summonDuration: 4,
  };
}