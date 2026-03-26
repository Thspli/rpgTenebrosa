import { Monster } from './types';
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
  duration: number;
}

export const ANIMAL_TEMPLATES: Record<string, AnimalTemplate> = {
  wolf_summon:  { id: 'wolf_summon',  name: 'Lobo Invocado',  emoji: '🐺', baseHp: 60,  baseAtk: 8,  baseDef: 2, duration: 3 },
  bear_summon:  { id: 'bear_summon',  name: 'Urso Invocado',  emoji: '🐻', baseHp: 100, baseAtk: 12, baseDef: 6, tauntSummon: true, duration: 3 },
  eagle_summon: { id: 'eagle_summon', name: 'Águia Invocada', emoji: '🦅', baseHp: 45,  baseAtk: 10, baseDef: 1, multiAttack: 2, duration: 3 },
  beast_summon: { id: 'beast_summon', name: 'Fera Selvagem',  emoji: '🐆', baseHp: 80,  baseAtk: 16, baseDef: 3, armorPierce: 0.8, duration: 3 },
};

export function spawnAnimalSummon(templateId: string, ownerId: string, ownerLevel: number, ownerAtk: number): Monster {
  const tpl = ANIMAL_TEMPLATES[templateId] ?? ANIMAL_TEMPLATES['wolf_summon'];
  const hp  = tpl.baseHp  + (ownerLevel - 1) * 8;
  const atk = tpl.baseAtk + Math.floor(ownerAtk * 0.3);
  return {
    id: nanoid(), name: tpl.name, emoji: tpl.emoji, level: ownerLevel,
    hp, maxHp: hp, attack: atk, defense: tpl.baseDef,
    xpReward: 0, coinReward: 0, isBoss: false, effects: [],
    isSummon: true, summonOwnerId: ownerId, summonDuration: tpl.duration,
    multiAttack: tpl.multiAttack, armorPierce: tpl.armorPierce,
    ...(tpl.tauntSummon ? { tauntSummon: true } : {}),
  } as Monster & { tauntSummon?: boolean };
}

export function spawnNecroShadow(deadMonster: Monster, ownerId: string): Monster {
  const hp  = Math.max(15, Math.floor(deadMonster.maxHp    * 0.35));
  const atk = Math.max(3,  Math.floor(deadMonster.attack   * 0.55));
  const def = Math.max(0,  Math.floor(deadMonster.defense  * 0.40));
  return {
    id: nanoid(),
    name: `Sombra de ${deadMonster.name}`, emoji: '👻',
    level: deadMonster.level, hp, maxHp: hp, attack: atk, defense: def,
    xpReward: 0, coinReward: 0, isBoss: false, effects: [],
    isSummon: true, isNecroShadow: true, summonOwnerId: ownerId, summonDuration: 4,
  };
}

export function spawnGenericShadow(ownerId: string, ownerLevel: number, ownerAtk: number): Monster {
  const hp  = 30 + ownerLevel * 6;
  const atk = Math.max(4, Math.floor(ownerAtk * 0.45));
  return {
    id: nanoid(), name: 'Sombra Espectral', emoji: '👻', level: ownerLevel,
    hp, maxHp: hp, attack: atk, defense: 0,
    xpReward: 0, coinReward: 0, isBoss: false, effects: [],
    isSummon: true, isNecroShadow: true, summonOwnerId: ownerId, summonDuration: 4,
  };
}