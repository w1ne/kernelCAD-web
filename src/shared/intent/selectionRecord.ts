// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/selectionRecord.ts
//
// What a selector bound to. Every selector syntax (lineage label, `@kc[...]`
// ref, geometric query) reports through the same record, so an edit that
// re-binds a selector to a different entity can be noticed whatever the
// syntax was.

import type { Vec3 } from './types';

export type SelectorSyntax = 'lineage' | 'topoRef' | 'query';

/** Compact signature of one bound entity, in the part frame. Fields that do
 *  not apply to the entity (a plane has no radius) are left out. */
export interface BindingFingerprint {
  entityKind: 'face' | 'edge';
  /** OCCT surface type (faces) or curve type (edges): PLANE, CYLINDRE, LINE, CIRCLE, ... */
  geomType: string;
  /** Feature that produced the entity (lineage). Absent when lineage is not tracked. */
  producer?: string;
  /** Name of the entity within its producer: canonical face name or label. */
  role?: string;
  /** Unit outward normal (faces) or unit tangent at mid-curve (edges). */
  direction?: Vec3;
  /** Cylinder / sphere / circle radius, mm. */
  radius?: number;
  /** Face area (mm^2) or edge length (mm). */
  size: number;
  centroid: Vec3;
}

export interface SelectionRecord {
  consumerFeatureId: string;
  /** The selector as authored: label, `@kc[...]` ref, or the query printed as DSL. */
  selectorText: string;
  syntax: SelectorSyntax;
  fingerprints: BindingFingerprint[];
  /** Diagonal of the bounding box of the shape the selector ran against, mm.
   *  Scales the centroid tolerance to the part. */
  partDiagonal: number;
}
