// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto.ts
//
// Automatic dimensioning and GD&T for the `svg-drawing` sheet
// (`options.autoAnnotate`), plus rendering of GD&T declared on the feature
// graph (`shape.datum` / `shape.tolerance`).
//
// Rules (documented in the kernelcad-drawings skill):
//
//   Datum A  largest planar face. Faces within 1 % of the largest tie; ties
//            prefer the face whose outward normal is most opposite the
//            counterbore / countersink mouths (the face the part is bolted
//            down on), then −Z, −Y, −X.
//   Datum B  largest planar face orthogonal to A. When the part has holes,
//            only faces parallel to the dominant hole axis count (the faces a
//            hole pattern is located from). Ties prefer the face nearest a
//            hole axis, then −Y, −X, −Z.
//   Datum C  same rule, orthogonal to A and B.
//   Holes    grouped by identical composite (diameter, THRU / depth,
//            counterbore, countersink, axis): `4× ⌀6.5 THRU` with a position
//            frame `⌖ ⌀t A B C` stacked under it. t is the ISO 2768-1
//            permissible deviation of the class's finest range (f 0.05,
//            m 0.1, c 0.2).
//   Position hole centres dimensioned from the datum plane normal to each
//            in-view axis (baseline style), unique coordinates only.
//   Flatness on A: ISO 2768-2 straightness/flatness for the face's longest
//            side, class H / K / L for f / m / c.
//   Overall  width under the front view, height right of it, depth left of
//            the top view.
//   Radii    fillets and rounds grouped by radius per view: `4× R5`.
//   Chamfers grouped by legs per view: `4× 1 × 45°`.
//   Note     `ISO 2768-mK` in a general-tolerance cell beside the title block.
//
// Declarations override: a declared datum pins its letter to its face and the
// rules fill in the rest; a declared tolerance of type T on a feature replaces
// the automatic T on that feature (a hole group is one feature).
//
// Placement: linear dimensions stack on fixed free sides of each view. Leader
// callouts are placed greedily — every candidate (anchor × angle × stem) is
// rendered, its label boxes (the estimator `drawing.annotation.overlap` uses)
// are tested against drawn geometry, already-placed labels and leaders, view
// captions and the sheet frame, and the cheapest clean candidate wins. Whatever
// still collides is counted as overlapped in the report and named in a
// `drawing.annotation.overlap` warning.

import { KernelError } from '../../../shared/intent/kernelError';
import { DATUM_LABEL_RE } from '../../../shared/intent/drawingGdtRecord';
import type { DrawingDatumDecl } from '../../../shared/intent/drawingGdtRecord';
import { recogniseDrawingFeatures } from './drawingFeatures';
import { AUTO_ANNOTATE_KINDS } from './drawingAuto/options';
import type { AutoAnnotateKind, AutoAnnotateOptions, Iso2768Class, NormalisedOptions } from './drawingAuto/options';
import type { AutoDrawingInput, AutoDrawingResult } from './drawingAuto/contracts';
import type { RenderCtx } from './drawingAuto/renderContext';
import { addViewCaptions, buildObstacles, collectHoleGroups, collectLinearDimensions } from './drawingAuto/collectPhases';
import { finalise, unclassifiedHolesDiagnostic } from './drawingAuto/finalise';
import {
  placeDatumSymbols,
  placeFlatnessOnA,
  placeHoleCallouts,
  placeLeftoverTolerances,
  placeRadiusAndChamferNotes,
} from './drawingAuto/placePhases';
import { resolveDatumFacts, resolveDeclaredTolerances } from './drawingAuto/resolvePhases';

export type { AutoAnnotateKind, AutoAnnotateOptions, Iso2768Class } from './drawingAuto/options';
export { AUTO_ANNOTATE_KINDS } from './drawingAuto/options';
export type {
  AutoDrawingInput,
  AutoDrawingResult,
  DrawingReport,
  DrawingReportAnnotation,
} from './drawingAuto/contracts';
export { flatnessFor, generalToleranceNote } from './drawingAuto/iso2768';

// ---------------------------------------------------------------------------
// Option validation
// ---------------------------------------------------------------------------

const CLASSES: readonly Iso2768Class[] = ['ISO2768-f', 'ISO2768-m', 'ISO2768-c'];

function invalid(field: string, why: string): never {
  throw new KernelError(
    'feature.invalid-args',
    `svg-drawing: options.autoAnnotate${field} ${why}.`,
    undefined,
    "Pass autoAnnotate: true, or { tolerance?: 'ISO2768-f' | 'ISO2768-m' | 'ISO2768-c', datums?: 'auto' | [{ label, face }], include?: [...] }.",
  );
}

export function normaliseAutoAnnotate(raw: boolean | AutoAnnotateOptions | undefined): NormalisedOptions {
  if (raw === undefined || raw === false) {
    return { enabled: false, tolerance: 'ISO2768-m', include: new Set(), datums: [] };
  }
  if (raw === true) {
    return { enabled: true, tolerance: 'ISO2768-m', include: new Set(AUTO_ANNOTATE_KINDS), datums: [] };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    invalid('', `must be true or an options object; got ${JSON.stringify(raw)}`);
  }
  const tolerance = raw.tolerance ?? 'ISO2768-m';
  if (!CLASSES.includes(tolerance)) {
    invalid('.tolerance', `must be one of ${CLASSES.join(' | ')}; got ${JSON.stringify(raw.tolerance)}`);
  }
  let include: Set<AutoAnnotateKind>;
  if (raw.include === undefined) {
    include = new Set(AUTO_ANNOTATE_KINDS);
  } else {
    if (!Array.isArray(raw.include)) invalid('.include', `must be an array; got ${JSON.stringify(raw.include)}`);
    for (const k of raw.include) {
      if (!(AUTO_ANNOTATE_KINDS as readonly string[]).includes(k)) {
        invalid('.include', `entries must be one of ${AUTO_ANNOTATE_KINDS.join(' | ')}; got ${JSON.stringify(k)}`);
      }
    }
    include = new Set(raw.include);
  }
  const datums: DrawingDatumDecl[] = [];
  if (raw.datums !== undefined && raw.datums !== 'auto') {
    if (!Array.isArray(raw.datums)) {
      invalid('.datums', `must be 'auto' or an array of { label, face }; got ${JSON.stringify(raw.datums)}`);
    }
    for (const [i, d] of raw.datums.entries()) {
      if (typeof d !== 'object' || d === null || typeof d.label !== 'string' || !DATUM_LABEL_RE.test(d.label)) {
        invalid(`.datums[${i}].label`, `must be one or two capital letters other than I, O and Q; got ${JSON.stringify(d?.label)}`);
      }
      if (typeof d.face !== 'object' || d.face === null || Array.isArray(d.face)) {
        invalid(`.datums[${i}].face`, `must be a FaceQuery object; got ${JSON.stringify(d.face)}`);
      }
      datums.push({ label: d.label, face: d.face });
    }
  }
  return { enabled: true, tolerance, include, datums };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function renderAutoDrawing(input: AutoDrawingInput): AutoDrawingResult {
  const opts = normaliseAutoAnnotate(input.autoAnnotate);
  const { parts, declarations, views, scale, sheet } = input;

  const model = recogniseDrawingFeatures(input.compound, {
    holes: opts.enabled && (opts.include.has('holes') || opts.include.has('hole-positions') || opts.include.has('datums')),
    radii: opts.enabled && opts.include.has('fillets'),
    chamfers: opts.enabled && opts.include.has('chamfers'),
  });

  const ctx: RenderCtx = {
    input, opts, parts, declarations, views, scale, sheet, include: opts.include, model,
    diagnostics: [],
    svg: [],
    bottomReserve: { ...input.bottomReserve },
    byKind: {},
    annotations: [],
    fixed: new Map(),
    datums: new Map(),
    frameDatums: [],
    resolvedTols: [],
    consumedTols: new Set(),
    obstacles: buildObstacles(input, views, scale, sheet),
    placed: [],
    ownerSeq: 0,
    datumLines: new Map(),
    holeGroups: [],
    linear: [],
  };

  // --- datums ------------------------------------------------------------
  resolveDatumFacts(ctx);
  ctx.frameDatums = ['A', 'B', 'C'].filter(l => ctx.datums.has(l));

  // --- declared tolerances ----------------------------------------------
  ctx.resolvedTols = resolveDeclaredTolerances(ctx);

  // --- hole groups ----------------------------------------------------------
  collectHoleGroups(ctx);

  // --- linear dimensions ----------------------------------------------------
  ctx.linear = collectLinearDimensions(ctx);

  // View captions sit under each view, below whatever stacks there.
  addViewCaptions(ctx);

  // Hole callouts first: the largest labels need the most room.
  placeHoleCallouts(ctx);

  // Datum feature symbols.
  placeDatumSymbols(ctx);

  // Flatness on A (auto, or the declared flatness on A's face).
  placeFlatnessOnA(ctx);

  // Radius and chamfer notes.
  placeRadiusAndChamferNotes(ctx);

  // Declared tolerances no automatic feature absorbed: their own frames.
  placeLeftoverTolerances(ctx);

  // --- unclassified holes -------------------------------------------------
  unclassifiedHolesDiagnostic(ctx);

  // --- final collision pass -------------------------------------------------
  return finalise(ctx);
}
