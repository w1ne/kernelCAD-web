// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/diffGeometry.ts
//
// MCP `diff_geometry` — MATERIAL-level delta between two versions of a
// kernelCAD model. The deeper sibling of `diff_scripts`.
//
// `diff_scripts` answers "which parts changed, and by how much volume".
// That number is sign-ambiguous about WHERE material moved: a boss that grew
// and a pocket that deepened can report the same |ΔV|, and a part that only
// translated reports ΔV = 0 while being physically somewhere else. Today an
// agent resolves that ambiguity by rendering and looking — the exact step
// the loop is trying to remove.
//
// `diff_geometry` answers it with geometry instead of pixels. Per matched
// body it computes, via the same OCCT booleans the interference checker
// uses:
//   - addedMm3   = volume(B - A)   material that appeared,
//   - removedMm3 = volume(A - B)   material that vanished,
//   - commonMm3  = volume(A ∩ B)   material that stayed put,
// plus bbox deltas, face/edge counts, hole counts (the existing cylindrical
// hole detector), and a two-sided surface deviation. From those it emits one
// VERDICT per body — identical | moved | resized | topology-changed — which
// is the field an agent branches on; the numbers are the evidence it cites.
//
// Reuse map (no new geometry machinery):
// - script run + lowering: `runMcpScript` + `RecomputeEngine` (same prelude
//   as `diff_scripts` / `evaluate_query`),
// - per-body world-frame shapes: `sceneToWorldFrameParts` (the clone-before-
//   transform invariant every multi-body exporter shares),
// - booleans: `clone().subtract(clone())` / `clone().intersect(clone())` —
//   the `detectInterferences` convention, cloned because replicad's ops
//   mutate-and-destroy their operands,
// - holes: `detectCylindricalHoles` (the W4 inspection core behind
//   `inspect({ of: 'holes' })`),
// - deviation: `meshDeviation` over `OcctBackend.getMesh()`,
// - overlay render: the `render_preview` pipeline, unchanged.
//
// Read-only with respect to the model: never touches the active MCP session
// and writes nothing unless `render: true` was asked for.

import { RecomputeEngine, type RecomputeResult } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../../kernel/backends/sceneBackend';
import { sceneToWorldFrameParts } from '../../../kernel/backends/occt/sceneToWorldFrame';
import { detectCylindricalHoles } from '../../../kernel/backends/occt/holeDetection';
import { meshDeviation } from '../../../modeling/runtime/meshDeviation';
import { resolveRootId } from '../../../modeling/buildModel';
import type { RunScriptResult } from '../../../modeling/runtime/runScript';
import { Scene } from '../../../modeling/validation/scene';
import { ParamTable } from '../../../shared/runtime/paramTable';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';
import { runMcpScript } from '../runMcpScript';
import { ROOT_PART_NAME } from './diffScripts';
import { renderDiffOverlay, type DiffOverlayRender } from './diffGeometryRender';

export interface DiffGeometryInput {
  /** Baseline script — path on disk. One of baseFile / baseCode is required. */
  baseFile?: string;
  /** Baseline script — inline source. */
  baseCode?: string;
  /** Revised script — path on disk. Omit when using `params`. */
  file?: string;
  /** Revised script — inline source. Omit when using `params`. */
  code?: string;
  /**
   * Param-override mode: instead of a second script, re-lower the BASELINE
   * with these `param()` values changed. `{ baseFile, params }` is the
   * one-script form of the diff — what a parameter sweep actually asks.
   * Mutually exclusive with `file` / `code`.
   */
  params?: Record<string, number | boolean>;
  /** Render a PNG overlay (added green, removed red) of the whole delta. */
  render?: boolean;
  /** Directory for the overlay PNG + its STL inputs. Default: a temp dir. */
  out_dir?: string;
}

export type BodyVerdict = 'identical' | 'moved' | 'resized' | 'topology-changed';

export interface DiffBbox {
  min: [number, number, number];
  max: [number, number, number];
}

export interface DiffGeometryBody {
  /** Reporting name — the baseline name when the pair matched by name. */
  name: string;
  baseName: string;
  revisedName: string;
  /** How the pair was established. */
  matchedBy: 'name' | 'position';
  verdict: BodyVerdict;
  volumeMm3: { base: number; revised: number; delta: number };
  /** volume(revised − base): material that APPEARED. Always >= 0. */
  addedMm3: number;
  /** volume(base − revised): material that VANISHED. Always >= 0. */
  removedMm3: number;
  /** volume(base ∩ revised): material that stayed put. Always >= 0. */
  commonMm3: number;
  bbox: {
    base: DiffBbox;
    revised: DiffBbox;
    /** revised.min − base.min, per axis (mm). */
    minDelta: [number, number, number];
    /** revised.max − base.max, per axis (mm). */
    maxDelta: [number, number, number];
    /** revised extent − base extent, per axis (mm). */
    extentDelta: [number, number, number];
  };
  faceCount: { base: number; revised: number; delta: number };
  edgeCount: { base: number; revised: number; delta: number };
  holeCount: { base: number; revised: number; delta: number };
  /** Two-sided discrete Hausdorff distance between the two surfaces (mm). */
  maxDeviationMm: number;
}

export interface DiffGeometrySideHeader {
  featureCount: number;
  bodyCount: number;
  isAssembly: boolean;
}

export type DiffGeometryOutput =
  | {
      ok: true;
      base: DiffGeometrySideHeader;
      revised: DiffGeometrySideHeader;
      bodies: DiffGeometryBody[];
      /** Bodies present on only one side (also reported as diff.body.unmatched). */
      unmatched: { side: 'base' | 'revised'; name: string; volumeMm3: number }[];
      summary: {
        identical: number;
        moved: number;
        resized: number;
        topologyChanged: number;
        unmatched: number;
        totalAddedMm3: number;
        totalRemovedMm3: number;
        maxDeviationMm: number;
      };
      render?: DiffOverlayRender;
      diagnostics: CompilerDiagnostic[];
    }
  | {
      ok: false;
      side?: 'base' | 'revised';
      error: string;
      errorCode?: string;
      diagnostics?: CompilerDiagnostic[];
    };

/** Absolute floor (mm / mm³) below which a numeric delta is tessellation
 *  or boolean noise rather than a real change. */
const ABS_TOL = 1e-6;
/** Relative volume tolerance — booleans on identical solids leave residue
 *  many orders of magnitude below the operand volume. */
const REL_VOL_TOL = 1e-9;

interface SideBody {
  name: string;
  shape: OcctBackend;
}

interface SideSummary {
  featureCount: number;
  isAssembly: boolean;
  bodies: SideBody[];
}

type SideResult =
  | { ok: true; side: SideSummary }
  | { ok: false; error: string; errorCode?: string; diagnostics?: CompilerDiagnostic[] };

export async function diffGeometryTool(input: DiffGeometryInput): Promise<DiffGeometryOutput> {
  const hasRevisedScript = input.file !== undefined || input.code !== undefined;
  const hasParams = input.params !== undefined;

  if (input.baseFile === undefined && input.baseCode === undefined) {
    return {
      ok: false,
      side: 'base',
      error: 'diff_geometry: must provide either { baseFile } or { baseCode } for the baseline script.',
      errorCode: 'cli.invalid-args',
    };
  }
  if (!hasRevisedScript && !hasParams) {
    return {
      ok: false,
      side: 'revised',
      error: 'diff_geometry: must provide the revised side as { file } / { code }, or as { params } overrides on the baseline.',
      errorCode: 'cli.invalid-args',
    };
  }
  if (hasRevisedScript && hasParams) {
    return {
      ok: false,
      error: 'diff_geometry: { params } overrides and an explicit { file } / { code } revision are mutually exclusive — pick one revised side.',
      errorCode: 'cli.invalid-args',
    };
  }

  const base = await evaluateSide({ file: input.baseFile, code: input.baseCode });
  if (!base.ok) return { ...base, side: 'base' };

  const revised = hasParams
    ? await evaluateSide({ file: input.baseFile, code: input.baseCode }, input.params)
    : await evaluateSide({ file: input.file, code: input.code });
  if (!revised.ok) return { ...revised, side: 'revised' };

  const diagnostics: CompilerDiagnostic[] = [];
  const { pairs, unmatchedBase, unmatchedRevised } = pairBodies(base.side.bodies, revised.side.bodies);

  for (const b of unmatchedBase) {
    diagnostics.push(unmatchedDiagnostic(b.name, 'base'));
  }
  for (const b of unmatchedRevised) {
    diagnostics.push(unmatchedDiagnostic(b.name, 'revised'));
  }

  const bodies: DiffGeometryBody[] = [];
  for (const pair of pairs) {
    bodies.push(compareBody(pair.base, pair.revised, pair.matchedBy));
  }

  const summary = {
    identical: bodies.filter((b) => b.verdict === 'identical').length,
    moved: bodies.filter((b) => b.verdict === 'moved').length,
    resized: bodies.filter((b) => b.verdict === 'resized').length,
    topologyChanged: bodies.filter((b) => b.verdict === 'topology-changed').length,
    unmatched: unmatchedBase.length + unmatchedRevised.length,
    totalAddedMm3: bodies.reduce((s, b) => s + b.addedMm3, 0),
    totalRemovedMm3: bodies.reduce((s, b) => s + b.removedMm3, 0),
    maxDeviationMm: bodies.reduce((s, b) => Math.max(s, b.maxDeviationMm), 0),
  };

  let render: DiffOverlayRender | undefined;
  if (input.render === true) {
    const r = await renderDiffOverlay(pairs, input.out_dir);
    render = r.render;
    diagnostics.push(...r.diagnostics);
  }

  return {
    ok: true,
    base: {
      featureCount: base.side.featureCount,
      bodyCount: base.side.bodies.length,
      isAssembly: base.side.isAssembly,
    },
    revised: {
      featureCount: revised.side.featureCount,
      bodyCount: revised.side.bodies.length,
      isAssembly: revised.side.isAssembly,
    },
    bodies,
    unmatched: [
      ...unmatchedBase.map((b) => ({ side: 'base' as const, name: b.name, volumeMm3: safeVolume(b.shape) })),
      ...unmatchedRevised.map((b) => ({ side: 'revised' as const, name: b.name, volumeMm3: safeVolume(b.shape) })),
    ],
    summary,
    ...(render !== undefined ? { render } : {}),
    diagnostics: withNextActions(diagnostics),
  };
}

function unmatchedDiagnostic(name: string, side: 'base' | 'revised'): CompilerDiagnostic {
  const other = side === 'base' ? 'revised' : 'baseline';
  return {
    target: 'export-occt',
    code: 'diff.body.unmatched',
    severity: 'warn',
    message: `Body '${name}' exists in the ${side} model but has no counterpart in the ${other} model; it is reported as whole-body ${side === 'base' ? 'removed' : 'added'} instead of a per-body delta.`,
    hint: `Body '${name}' could not be paired by name or by position. Give the part the same assembly().part(name, ...) name on both sides so diff_geometry can compute added/removed/common volume for it, or read it as a whole-body ${side === 'base' ? 'removal' : 'addition'} in the 'unmatched' list.`,
    nextAction: NEXT_ACTIONS['diff.body.unmatched'],
  };
}

// ----- Per-side evaluation ---------------------------------------------------

async function evaluateSide(
  input: { file?: string; code?: string },
  paramOverrides?: Record<string, number | boolean>,
): Promise<SideResult> {
  const script = await runMcpScript(input);
  if (!script.ok) {
    return { ok: false, error: script.error, ...(script.errorCode !== undefined ? { errorCode: script.errorCode } : {}) };
  }
  const { run } = script;

  const overrides = applyParamOverrides(run.paramTable, paramOverrides);
  if (!overrides.ok) return overrides;
  const paramTable = overrides.paramTable;

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const result = await engine.run(run.records, { paramTable });
  const fatal = result.diagnostics.find((d) => d.severity === 'error');
  if (fatal !== undefined) {
    return {
      ok: false,
      error: fatal.message,
      errorCode: fatal.code,
      diagnostics: withNextActions(result.diagnostics),
    };
  }

  const ret = run.returnValue;
  if (ret instanceof Scene) {
    return sceneSideResult(run, result, ret);
  }

  return solidSideResult(run, result, ret);
}

function applyParamOverrides(
  base: ParamTable,
  paramOverrides: Record<string, number | boolean> | undefined,
): { ok: true; paramTable: ParamTable } | { ok: false; error: string; errorCode: string } {
  if (paramOverrides === undefined) return { ok: true, paramTable: base };

  const paramTable = ParamTable.deserialize(base.serialize());
  for (const [name, value] of Object.entries(paramOverrides)) {
    if (!paramTable.has(name)) {
      return {
        ok: false,
        error: `diff_geometry: param '${name}' is not declared by the baseline script. Declared: ${paramTable.list().map((p) => p.name).join(', ') || '(none)'}.`,
        errorCode: 'feature.invalid-args',
      };
    }
    try {
      paramTable.set(name, value);
    } catch (e) {
      return {
        ok: false,
        error: `diff_geometry: param override '${name}' rejected — ${e instanceof Error ? e.message : String(e)}`,
        errorCode: 'feature.invalid-args',
      };
    }
  }
  return { ok: true, paramTable };
}

function sceneSideResult(run: RunScriptResult, result: RecomputeResult, scene: Scene): SideResult {
  const sourceId = scene.__sourceFeatureId();
  const lowered = sourceId !== undefined ? result.shapes.get(sourceId) : undefined;
  if (!lowered || !isSceneBackend(lowered)) {
    return {
      ok: false,
      error: 'diff_geometry: the assembly scene did not lower successfully.',
      errorCode: 'recompute.input.missing',
      diagnostics: withNextActions(result.diagnostics),
    };
  }
  return {
    ok: true,
    side: {
      featureCount: run.records.length,
      isAssembly: true,
      bodies: sceneToWorldFrameParts(lowered).map((p) => ({ name: p.name, shape: p.shape })),
    },
  };
}

function solidSideResult(
  run: RunScriptResult,
  result: RecomputeResult,
  returnValue: RunScriptResult['returnValue'],
): SideResult {
  const tailId = run.records.length > 0 ? run.records[run.records.length - 1].id : undefined;
  const rootId = resolveRootId(returnValue, tailId);
  const rootShape = rootId !== undefined ? result.shapes.get(rootId) : undefined;
  if (!(rootShape instanceof OcctBackend)) {
    return {
      ok: false,
      error: 'diff_geometry: the script did not return a solid Shape (or an assembly Scene) to compare.',
      errorCode: 'export.no-shape',
    };
  }
  return {
    ok: true,
    side: {
      featureCount: run.records.length,
      isAssembly: false,
      bodies: [{ name: ROOT_PART_NAME, shape: rootShape }],
    },
  };
}

// ----- Pairing ---------------------------------------------------------------

export interface BodyPair {
  base: SideBody;
  revised: SideBody;
  matchedBy: 'name' | 'position';
}

/** Pair bodies by name first; whatever is left over pairs positionally in
 *  declaration order. Leftovers beyond the shorter list stay unmatched. */
export function pairBodies(
  base: SideBody[],
  revised: SideBody[],
): { pairs: BodyPair[]; unmatchedBase: SideBody[]; unmatchedRevised: SideBody[] } {
  const pairs: BodyPair[] = [];
  const revisedByName = new Map(revised.map((b) => [b.name, b]));
  const usedRevised = new Set<string>();
  const leftoverBase: SideBody[] = [];

  for (const b of base) {
    const r = revisedByName.get(b.name);
    if (r !== undefined && !usedRevised.has(r.name)) {
      pairs.push({ base: b, revised: r, matchedBy: 'name' });
      usedRevised.add(r.name);
    } else {
      leftoverBase.push(b);
    }
  }
  const leftoverRevised = revised.filter((b) => !usedRevised.has(b.name));

  const positional = Math.min(leftoverBase.length, leftoverRevised.length);
  for (let i = 0; i < positional; i++) {
    pairs.push({ base: leftoverBase[i], revised: leftoverRevised[i], matchedBy: 'position' });
  }

  return {
    pairs,
    unmatchedBase: leftoverBase.slice(positional),
    unmatchedRevised: leftoverRevised.slice(positional),
  };
}

// ----- Per-body comparison ---------------------------------------------------

function safeVolume(shape: OcctBackend): number {
  try {
    return shape.isEmpty() ? 0 : shape.volume();
  } catch {
    return 0;
  }
}

/** Boolean volume with the clone-both-operands lifecycle the interference
 *  checker uses (replicad's ops mutate-and-destroy their inputs). A boolean
 *  that throws on degenerate input reports 0, not a failed diff. */
function booleanVolume(a: OcctBackend, b: OcctBackend, op: 'subtract' | 'intersect'): number {
  try {
    const out = op === 'subtract'
      ? a.clone().subtract(b.clone())
      : a.clone().intersect(b.clone());
    return out.isEmpty() ? 0 : Math.max(0, out.volume());
  } catch {
    return 0;
  }
}

function holeCount(shape: OcctBackend): number {
  try {
    return detectCylindricalHoles(shape).length;
  } catch {
    return 0;
  }
}

function toBbox(bb: { min: ArrayLike<number>; max: ArrayLike<number> }): DiffBbox {
  return {
    min: [bb.min[0], bb.min[1], bb.min[2]],
    max: [bb.max[0], bb.max[1], bb.max[2]],
  };
}

function extents(b: DiffBbox): [number, number, number] {
  return [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
}

function deviation(a: OcctBackend, b: OcctBackend): number {
  try {
    return meshDeviation(a.getMesh(), b.getMesh()).maxDeviationMm;
  } catch {
    return 0;
  }
}

function compareBody(base: SideBody, revised: SideBody, matchedBy: 'name' | 'position'): DiffGeometryBody {
  const volBase = safeVolume(base.shape);
  const volRevised = safeVolume(revised.shape);
  const volTol = Math.max(ABS_TOL, REL_VOL_TOL * Math.max(volBase, volRevised));

  const added = booleanVolume(revised.shape, base.shape, 'subtract');
  const removed = booleanVolume(base.shape, revised.shape, 'subtract');
  const common = booleanVolume(base.shape, revised.shape, 'intersect');

  const bboxBase = toBbox(base.shape.boundingBox({ exact: true }));
  const bboxRevised = toBbox(revised.shape.boundingBox({ exact: true }));
  const extBase = extents(bboxBase);
  const extRevised = extents(bboxRevised);

  const minDelta = [0, 1, 2].map((i) => bboxRevised.min[i] - bboxBase.min[i]) as [number, number, number];
  const maxDelta = [0, 1, 2].map((i) => bboxRevised.max[i] - bboxBase.max[i]) as [number, number, number];
  const extentDelta = [0, 1, 2].map((i) => extRevised[i] - extBase[i]) as [number, number, number];

  const facesBase = base.shape.faceHashes().length;
  const facesRevised = revised.shape.faceHashes().length;
  const edgesBase = base.shape.edgeHashes().length;
  const edgesRevised = revised.shape.edgeHashes().length;
  const holesBase = holeCount(base.shape);
  const holesRevised = holeCount(revised.shape);

  const verdict = classify({
    addedMm3: added,
    removedMm3: removed,
    volTol,
    volumeDelta: volRevised - volBase,
    faceDelta: facesRevised - facesBase,
    edgeDelta: edgesRevised - edgesBase,
    holeDelta: holesRevised - holesBase,
    extentDelta,
    minDelta,
  });

  return {
    name: matchedBy === 'name' ? base.name : `${base.name} → ${revised.name}`,
    baseName: base.name,
    revisedName: revised.name,
    matchedBy,
    verdict,
    volumeMm3: { base: volBase, revised: volRevised, delta: volRevised - volBase },
    addedMm3: added,
    removedMm3: removed,
    commonMm3: common,
    bbox: { base: bboxBase, revised: bboxRevised, minDelta, maxDelta, extentDelta },
    faceCount: { base: facesBase, revised: facesRevised, delta: facesRevised - facesBase },
    edgeCount: { base: edgesBase, revised: edgesRevised, delta: edgesRevised - edgesBase },
    holeCount: { base: holesBase, revised: holesRevised, delta: holesRevised - holesBase },
    maxDeviationMm: (added <= volTol && removed <= volTol) ? 0 : deviation(base.shape, revised.shape),
  };
}

export interface ClassifyInput {
  addedMm3: number;
  removedMm3: number;
  volTol: number;
  volumeDelta: number;
  faceDelta: number;
  edgeDelta: number;
  holeDelta: number;
  extentDelta: [number, number, number];
  minDelta: [number, number, number];
}

/**
 * Verdict precedence — most structural answer first:
 *
 *  1. `topology-changed` — the BREP element counts differ (a face, edge, or
 *     hole appeared or vanished). A changed feature TREE is the strongest
 *     claim available and outranks any dimensional reading.
 *  2. `resized`         — same topology, but material was added or removed,
 *     or a bbox extent moved. The part is the same shape, differently sized.
 *  3. `moved`           — same topology and same extents, but the bbox sits
 *     somewhere else. Material "added"/"removed" here is the rigid
 *     displacement, not a design change.
 *  4. `identical`       — nothing moved beyond tolerance.
 */
export function classify(i: ClassifyInput): BodyVerdict {
  if (i.faceDelta !== 0 || i.edgeDelta !== 0 || i.holeDelta !== 0) return 'topology-changed';

  const extentChanged = i.extentDelta.some((d) => Math.abs(d) > ABS_TOL);
  if (extentChanged || Math.abs(i.volumeDelta) > i.volTol) return 'resized';

  const translated = i.minDelta.some((d) => Math.abs(d) > ABS_TOL);
  if (translated) return 'moved';

  // Same topology, same extents, same position, same volume — but the
  // booleans still disagree: the interior changed (e.g. an internal void
  // moved). Report it as resized rather than claiming identity.
  if (i.addedMm3 > i.volTol || i.removedMm3 > i.volTol) return 'resized';

  return 'identical';
}
