// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/options.ts

import type { DrawingDatumDecl } from '../../../../shared/intent/drawingGdtRecord';

export type Iso2768Class = 'ISO2768-f' | 'ISO2768-m' | 'ISO2768-c';

export const AUTO_ANNOTATE_KINDS = [
  'datums',
  'flatness',
  'holes',
  'hole-positions',
  'overall',
  'fillets',
  'chamfers',
  'general-tolerance',
] as const;

export type AutoAnnotateKind = (typeof AUTO_ANNOTATE_KINDS)[number];

export interface AutoAnnotateOptions {
  /** General-tolerance class; default `'ISO2768-m'`. */
  tolerance?: Iso2768Class;
  /** `'auto'` (default) derives A/B/C; an array pins letters to faces and the
   *  rules derive whichever of A/B/C is left. */
  datums?: 'auto' | readonly DrawingDatumDecl[];
  /** Which annotation families to emit; default all. */
  include?: readonly AutoAnnotateKind[];
}
export interface NormalisedOptions {
  enabled: boolean;
  tolerance: Iso2768Class;
  include: Set<AutoAnnotateKind>;
  datums: DrawingDatumDecl[];
}
