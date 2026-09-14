// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/drawingGdtRecord.ts
//
// Types for `shape.datum(label, face)` and `shape.tolerance({...})`: GD&T
// declarations captured on the feature graph and consumed by the
// `svg-drawing` exporter. Both are capture-only (virtual) records — they
// never produce geometry. The exporter collects every declaration bound to
// the exported shape (or any shape feeding it) and draws it: a datum feature
// symbol, or a feature control frame. When `autoAnnotate` is on, a declared
// datum pins that letter to that face and a declared tolerance replaces the
// automatic tolerance of the same type on the same feature.

import type { EdgeQuery, FaceQuery } from './queryTypes';

/** The GD&T characteristics the drawing surface supports. */
export type GdtType =
  | 'position'
  | 'flatness'
  | 'perpendicularity'
  | 'parallelism'
  | 'concentricity'
  | 'cylindricity';

export const GDT_TYPES: readonly GdtType[] = [
  'position',
  'flatness',
  'perpendicularity',
  'parallelism',
  'concentricity',
  'cylindricity',
];

/** Form tolerances control a feature on its own and never reference datums. */
export const GDT_FORM_TYPES: readonly GdtType[] = ['flatness', 'cylindricity'];

/** Diametral / material-condition modifier on a tolerance value. */
export type GdtModifier = '⌀' | 'M' | 'S';

export const GDT_MODIFIERS: readonly GdtModifier[] = ['⌀', 'M', 'S'];

/** Datum letters: one or two capitals, never I, O or Q (they read as digits). */
export const DATUM_LABEL_RE = /^(?![IOQ])[A-Z](?![IOQ])[A-Z]?$/;

/** A declared datum: the face a datum letter identifies. */
export interface DrawingDatumDecl {
  label: string;
  face: FaceQuery;
}

/** `shape.tolerance({...})` argument. Exactly one of `face` / `edge`. */
export interface DrawingToleranceSpec {
  type: GdtType;
  /** Tolerance zone size, mm. */
  value: number;
  face?: FaceQuery;
  edge?: EdgeQuery;
  /** Datum references in precedence order, e.g. `['A', 'B', 'C']`. */
  datums?: readonly string[];
  modifier?: GdtModifier;
}

/** A declared tolerance after capture-time validation. */
export interface DrawingToleranceDecl {
  type: GdtType;
  value: number;
  face?: FaceQuery;
  edge?: EdgeQuery;
  datums: string[];
  modifier?: GdtModifier;
}

/** Metadata stored on a `drawingDatum` record. */
export interface DrawingDatumMetadata extends DrawingDatumDecl {
  virtual: true;
}

/** Metadata stored on a `drawingTolerance` record. */
export interface DrawingToleranceMetadata extends DrawingToleranceDecl {
  virtual: true;
}

/** Everything the exporter needs from the feature graph. */
export interface DrawingDeclarations {
  datums: DrawingDatumDecl[];
  tolerances: DrawingToleranceDecl[];
}
