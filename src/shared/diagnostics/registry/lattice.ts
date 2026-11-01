// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Lattice infill (`body.lattice({...})`) and the mesh-solid body it produces.

import type { DiagnosticCodeSpec } from './types';

export const LATTICE_CODES = {
  'feature.lattice.report': {
    hintTemplate:
      'Informational: the lattice was built. Read the measured wall / skin, solid fraction and triangle count in the message; the result is a mesh solid (STL / 3MF / OBJ export, no booleans, fillets or STEP).',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'info',
    group: 'feature',
    description: 'A lattice body was built; the message carries its measured wall, skin, solid fraction, triangle count and timings.',
  },
  'feature.lattice.grade-unavailable': {
    hintTemplate:
      "The lattice grading source could not be evaluated (no feaStudy on the host for grade { from: 'fea' }, the solve failed, or no hole walls for grade { from: 'holes' }). Declare body.feaStudy({...}) on the same body before .lattice(), or grade from 'surface'.",
    nextAction: { kind: 'fix-arg', field: 'grade' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A lattice grade source (stress field or hole faces) was requested but could not be computed.',
  },
  'feature.lattice.mesh-input': {
    hintTemplate:
      'Apply solid operations (booleans, holes, fillets, shell) to the host body BEFORE .lattice(); the lattice result is a mesh solid and only accepts rigid transforms, export and assembly placement.',
    nextAction: { kind: 'reorder-pipeline', guidance: 'move .lattice() to the end of the body chain' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A B-rep operation was applied to a lattice (mesh-solid) body, or .lattice() was called on a mesh body.',
  },
  'dfm.lattice.wall-too-thin': {
    hintTemplate:
      'A lattice wall or strut, measured on the built mesh, is thinner than dfmSpec.minWall or twice the nozzle. Raise lattice wall / density (or the grade near value), use a larger cell, or switch to the network variant.',
    nextAction: { kind: 'fix-arg', field: 'wall' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'The measured 5th-percentile lattice wall is below the printable minimum.',
  },
  'dfm.lattice.enclosed-cavities': {
    hintTemplate:
      'Informational: a lattice with a closed skin encloses its void network. FDM prints it like infill; resin and powder processes trap material inside — add drain holes through the skin (holes before .lattice()) or use skin: 0.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'info',
    group: 'dfm',
    description: 'The lattice skin seals the void network (expected for FDM infill; a drain problem for resin/powder).',
  },
  'export.mesh-body.format-unsupported': {
    hintTemplate:
      'This body is a mesh solid (lattice), which has no B-rep: export it as stl, 3mf or obj. STEP, DXF, drawings and B-rep-only formats need the host body without .lattice().',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A B-rep-only export format was requested for a mesh-solid (lattice) body.',
  },
} as const satisfies Record<string, DiagnosticCodeSpec>;
