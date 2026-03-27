// ═══════════════════════════════════════════════════════════
//  src/engine/transformData.ts
//  Reexporta TRANSFORMS para uso nos componentes.
//  Dados definidos em src/lib/transformData.ts (legado) — 
//  após migração completa, mover os dados para cá.
// ═══════════════════════════════════════════════════════════

// Os dados de TRANSFORMS estão em src/lib/transformData.ts.
// O engine/gameEngine.ts os importa de lá internamente.
// Para não duplicar, reexportamos daqui.
export { TRANSFORMS, TRANSFORM_ITEM } from '@/lib/transformData';