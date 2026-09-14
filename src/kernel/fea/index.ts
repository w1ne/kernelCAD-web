// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/index.ts
//
// Barrel for the structural-FEA path: declaration -> mesh -> solve -> evidence.

export { runFeaStudy, defaultMeshSize, cleanupJobDir, DEFAULT_MESH_TIMEOUT_MS, DEFAULT_SOLVE_TIMEOUT_MS, MAX_ELEMENTS, STRESS_ERROR_WARN_PERCENT } from './runFea';
export type { RunFeaOptions, RunFeaResult } from './runFea';
export { detectFeaToolchain, FEA_INSTALL_HINT } from './toolchain';
export type { FeaToolchain } from './toolchain';
export { resolveFeaMaterial, feaMaterialTable, FEA_MATERIAL_NAMES } from './feaMaterials';
export { writeInp, GMSH_TO_CCX_TET10 } from './inpWriter';
export { parseFrd, vonMisesFromTensor } from './frdParser';
export { parseDat } from './datParser';
export { meshStep, LOW_QUALITY_SICN } from './gmshDriver';
export { buildHeatmap, binaryStl, DEFAULT_BANDS } from './heatmap';
export type { HeatmapBand, HeatmapBuild } from './heatmap';
export type * from './types';
