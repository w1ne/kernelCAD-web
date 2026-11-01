// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/latticeRecord.ts
//
// Normalized `body.lattice({...})` options as stored on the 'lattice'
// FeatureRecord (metadata.lattice). Numeric design values that may be
// param()-driven (cell, wall / density, skin) live in record.params.

export const LATTICE_TYPES = ['gyroid', 'schwarzP', 'diamond', 'neovius'] as const;
export type LatticeType = (typeof LATTICE_TYPES)[number];

export const LATTICE_VARIANTS = ['sheet', 'network'] as const;
export type LatticeVariant = (typeof LATTICE_VARIANTS)[number];

export const LATTICE_FRAMES = ['part', 'world', 'cylindrical'] as const;
export type LatticeFrameKind = (typeof LATTICE_FRAMES)[number];

export const LATTICE_GRADE_SOURCES = ['surface', 'holes', 'fea'] as const;
export type LatticeGradeSource = (typeof LATTICE_GRADE_SOURCES)[number];

/** One stress band for grade { from: 'fea' } — same shape and meaning as
 *  the stress-graded infill bands (fraction of yield -> infill percent). */
export interface LatticeStressBand {
  name: string;
  fromYield: number;
  densityPercent: number;
}

export interface LatticeGradeMetadata {
  from: LatticeGradeSource;
  /** surface / holes: wall (sheet, mm) or solid fraction (network) at the source. */
  near?: number;
  /** surface / holes: value `over` mm away; default the base value. */
  far?: number;
  /** surface / holes: blend length, mm. */
  over?: number;
  /** fea: feaStudy name (default: the last study on the host body). */
  study?: string;
  /** fea: band table (default: the stress-graded infill defaults). */
  bands?: LatticeStressBand[];
}

export interface LatticeMetadata {
  type: LatticeType;
  variant: LatticeVariant;
  /** Which of wall / density the author gave (the other is derived). */
  valueKind: 'wall' | 'density';
  frame: LatticeFrameKind;
  /** cylindrical: explicit axis (default: the part frame's Z through its origin). */
  axis?: { origin: [number, number, number]; direction: [number, number, number] };
  grade?: LatticeGradeMetadata;
  resolution?: number;
  tolerance?: number;
}
