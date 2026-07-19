// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/cheatSheetTaxonomy.ts
//
// Task-organized view over the receiver-organized data in `listApi.ts`.
// `listApi` answers "what can I call on a Shape?"; an agent arriving cold
// asks "how do I cut a hole?" — a question no receiver grouping answers.
// This file is the ONLY place that mapping lives, and it stores entry NAMES
// only: signatures and prose stay in listApi so the two can never disagree.
//
// Drift contract: `tests/unit/skill/cheatSheetTaxonomyDrift.test.ts` fails if
// any listApi entry is unclassified, if a name here does not exist in listApi,
// or if `docs/cheat-sheet.md` is stale. Adding an API without giving it a task
// home is a build failure, by design.

import {
  GLOBALS,
  SHAPE_METHODS,
  SHAPE_LIST_METHODS,
  SKETCH_METHODS,
  PARAM_REF_METHODS,
  PATH_BUILDER_METHODS,
  SCENE_METHODS,
  SURFACE_METHODS,
  CURVE3D_METHODS,
  CURVE3D_ANALYTICS_METHODS,
  type ApiEntry,
} from './listApi';

/** One source array plus how a call on it is spelled in a script. */
export interface ApiEntrySource {
  /** Human label for the receiver, used in failure messages. */
  readonly label: string;
  /** Prefix rendered before the entry name in the cheat sheet ('' for globals). */
  readonly callPrefix: string;
  readonly entries: readonly ApiEntry[];
}

/**
 * Every array whose entries must have a task home. Ordered so the generated
 * doc lists a duplicated name (e.g. `union` on both the global and Shape) with
 * the global form first — that is the form an agent reaches for first.
 *
 * SCENE_PART_PROPERTIES is deliberately absent: those are data fields on a
 * Scene result, not calls an author makes, so they have no task.
 */
export const API_ENTRY_SOURCES: readonly ApiEntrySource[] = [
  { label: 'GLOBALS', callPrefix: '', entries: GLOBALS },
  { label: 'SHAPE_METHODS', callPrefix: 'Shape.', entries: SHAPE_METHODS },
  { label: 'SHAPE_LIST_METHODS', callPrefix: 'ShapeList.', entries: SHAPE_LIST_METHODS },
  { label: 'SKETCH_METHODS', callPrefix: 'Sketch.', entries: SKETCH_METHODS },
  { label: 'PARAM_REF_METHODS', callPrefix: 'ParamRef.', entries: PARAM_REF_METHODS },
  { label: 'PATH_BUILDER_METHODS', callPrefix: 'PathBuilder.', entries: PATH_BUILDER_METHODS },
  { label: 'SCENE_METHODS', callPrefix: 'Scene.', entries: SCENE_METHODS },
  { label: 'SURFACE_METHODS', callPrefix: 'Surface.', entries: SURFACE_METHODS },
  { label: 'CURVE3D_METHODS', callPrefix: 'Curve3D.', entries: CURVE3D_METHODS },
  {
    label: 'CURVE3D_ANALYTICS_METHODS',
    callPrefix: 'Curve3D.analytics.',
    entries: CURVE3D_ANALYTICS_METHODS,
  },
];

export interface CheatSheetGroup {
  /** Task heading, phrased as the thing the author is trying to do. */
  readonly task: string;
  /** One line: when you reach for this group. */
  readonly blurb: string;
  /** listApi entry names. A name may repeat across receivers — that is fine. */
  readonly names: readonly string[];
}

/**
 * The taxonomy. Ordering is the order of a build: start a shape, add and
 * remove material, combine, finish, then select / place / assemble, with the
 * specialist surfaces and the non-geometry concerns last.
 *
 * A name appears in two groups only where both readings are genuinely how an
 * author looks for it (`subtract` is both a boolean and ParamRef arithmetic;
 * `intersect` is both a boolean and a curve-intersection query). Everything
 * else has exactly one home.
 */
export const CHEAT_SHEET_TAXONOMY: readonly CheatSheetGroup[] = [
  {
    task: 'Start a shape',
    blurb: 'The first call in any model: a solid primitive, or a 2D profile to extrude.',
    names: [
      'box', 'cylinder', 'sphere', 'torus', 'spring',
      'extrudeRect', 'extrudeCircle', 'extrudePolygon', 'extrudeRoundedRect',
      'sheetMetal', 'sdf',
      'path', 'moveTo', 'lineTo', 'close', 'label', 'circle',
      'tangentArc', 'threePointsArc', 'sagittaArc', 'bulgeArc', 'radiusArc',
      'smoothSpline', 'spline', 'nurbsSegment', 'hermiteG2',
    ],
  },
  {
    task: 'Add material',
    blurb: 'Turn a profile into a solid, or grow one along a path.',
    names: ['extrude', 'revolve', 'sweep', 'loft', 'variableSweep', 'helix'],
  },
  {
    task: 'Remove material',
    blurb: 'Cut into a solid: bolt holes, pockets, slots, plain subtraction.',
    names: ['subtract', 'hole', 'holes', 'cutout'],
  },
  {
    task: 'Combine shapes',
    blurb: 'Merge or intersect solids, or group them without paying for a boolean.',
    names: ['union', 'intersect', 'toCompound', 'toUnion'],
  },
  {
    task: 'Finish edges',
    blurb: 'Break edges, add draft, hollow out a wall, fold sheet metal.',
    names: ['fillet', 'chamfer', 'draft', 'shell', 'bend', 'flattenPattern'],
  },
  {
    task: 'Select geometry',
    blurb:
      'Pick the edges or faces a feature acts on. Query inside OCCT first, then sort or group what comes back.',
    names: [
      'selectEdges', 'selectEdge', 'select', 'q',
      'sortBy', 'sortByDistance', 'groupBy', 'filterBy', 'filterByPosition',
      'take', 'first', 'last', 'at',
    ],
  },
  {
    task: 'Place & transform',
    blurb: 'Move a body into position, mirror it, or repeat it.',
    names: [
      'translate', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'transform',
      'alongAxis', 'scale', 'reflect', 'mirror',
      'patternLinear', 'patternGrid', 'patternCircular',
      'recenter', 'seatOnFloor',
    ],
  },
  {
    task: 'Assemble',
    blurb: 'Build a mechanism from parts: connectors, mates, joints, posed Scenes.',
    names: ['assembly', 'joint', 'part', 'parts', 'assemblyName'],
  },
  {
    task: 'Curves & surfaces',
    blurb:
      'NURBS curves and surfaces, plus the evaluators for measuring them before they become solids.',
    names: [
      'nurbsCurve', 'spline3d', 'hermiteG2', 'nurbsSurface', 'surfaceFromCurves',
      'surfaceFromBoundary', 'sew', 'thicken', 'toShape', 'trimTo', 'split',
      'projectCurve',
      'sample', 'pointAt', 'tangentAt', 'domain',
      'closestPoint', 'closestParam', 'divideByEqualArcLength', 'divideByArcLength',
      'derivatives', 'tessellate', 'intersect',
    ],
  },
  {
    task: 'Measure & verify',
    blurb: 'Ask the kernel what you actually built, and check it before shipping.',
    names: ['boundingBox', 'bbox', 'length', 'lower', 'kinematic', 'dfmSpec'],
  },
  {
    task: 'Parametrize',
    blurb: 'Declare editable dimensions and do arithmetic on them (JS operators throw on a ParamRef).',
    names: ['param', 'params', 'add', 'subtract', 'multiply', 'divide', 'negate'],
  },
  {
    task: 'Import & export',
    blurb: 'Bring in vendor geometry, and write models back out.',
    names: ['lib', 'toCompound'],
  },
  {
    task: 'Annotate & present',
    blurb: 'Change how a model reads without changing what it is: text, color, lighting, camera, motion.',
    names: [
      'sketch', 'fontPath', 'embossText', 'color', 'material',
      'referenceImage', 'setRenderEnvironment', 'setCameraTarget', 'setCameraDistance',
      'animationView',
    ],
  },
];

/** Every entry name that must be classified, deduped across receivers. */
export function allApiEntryNames(): string[] {
  const seen = new Set<string>();
  for (const src of API_ENTRY_SOURCES) {
    for (const e of src.entries) seen.add(e.name);
  }
  return [...seen];
}

/** Resolve a taxonomy name back to its listApi entries (one per receiver). */
export function resolveEntry(name: string): Array<{ source: ApiEntrySource; entry: ApiEntry }> {
  const out: Array<{ source: ApiEntrySource; entry: ApiEntry }> = [];
  for (const source of API_ENTRY_SOURCES) {
    for (const entry of source.entries) {
      if (entry.name === name) out.push({ source, entry });
    }
  }
  return out;
}
