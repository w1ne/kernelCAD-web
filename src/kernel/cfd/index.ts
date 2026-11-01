// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd — steady incompressible CFD through an external OpenFOAM.
export { runCfdStudy, maxCfdCores, type RunCfdOptions, type RunCfdResult } from './runCfd';
export { detectCfdToolchain, requireCfdToolchainIfDemanded, CFD_INSTALL_HINT, type CfdToolchain } from './toolchain';
export { normalizeCfdStudy, CFD_FLUIDS, CFD_FLUID_NAMES, CFD_STUDY_EXAMPLE } from './studySpec';
export { CFD_DISCLAIMER } from './summary';
export type { CfdSummary } from './types';
