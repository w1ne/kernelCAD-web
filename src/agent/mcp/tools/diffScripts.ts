// src/agent/mcp/tools/diffScripts.ts
//
// MCP `diff_scripts` — structured geometric delta between two versions of a
// kernelCAD script (a baseline and a revision). Built for the agent
// iteration loop: after editing a `.kcad.ts` source, diff it against the
// saved baseline to see exactly WHAT changed physically — per-part
// added/removed/renamed/changed (volume + bbox deltas), total
// interference-volume delta, mate-graph changes, and param changes —
// instead of inferring the delta from renders or prose.
//
// Reuse map (no new geometry machinery):
// - script run + lowering: `runMcpScript` + `RecomputeEngine` (the same
//   prelude `evaluate_query` / `checkInterference` use),
// - per-part world-frame stats: `sceneToWorldFrameParts` + the same
//   `volume()` / `boundingBox({ exact: true })` calls as `list_part_stats`,
//   so part numbers match that tool exactly,
// - interference: `detectInterferences` (the same primitive behind
//   `kernelcad interference` and the mechanism-validity gate),
// - mates: `arm.__mates()` (the `list_mates` accessor),
// - params: `session.params.list()` (the `params_list` accessor).
//
// Read-only: never touches the active MCP session and never writes to disk.

import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../../kernel/backends/sceneBackend';
import { sceneToWorldFrameParts } from '../../../kernel/backends/occt/sceneToWorldFrame';
import {
  detectInterferences,
  type InterferencePair,
} from '../../../modeling/runtime/detectInterferences';
import { resolveRootId } from '../../../modeling/buildModel';
import { Scene } from '../../../modeling/validation/scene';
import type { Assembly } from '../../../modeling/capture/assembly';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { runMcpScript } from '../runMcpScript';

export interface DiffScriptsInput {
  /** Baseline script — path on disk. One of baseFile / baseCode is required. */
  baseFile?: string;
  /** Baseline script — inline source. */
  baseCode?: string;
  /** Revised script — path on disk. One of file / code is required. */
  file?: string;
  /** Revised script — inline source. */
  code?: string;
}

/** Pseudo-part name used for a script that returns a single Shape instead of
 *  an assembly-built Scene. */
export const ROOT_PART_NAME = '(root)';

/** Treat an intersection below this volume as "touching", matching the
 *  `kernelcad interference` CLI default. */
const INTERFERENCE_EPSILON_MM3 = 0.01;

/** Absolute tolerance (mm / mm³) below which a numeric delta is noise. */
const ABS_TOL = 1e-6;

export interface DiffPartStats {
  name: string;
  volumeMm3: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

export interface DiffChangedPart {
  name: string;
  volumeMm3: { base: number; revised: number; delta: number };
  bbox: {
    base: DiffPartStats['bbox'];
    revised: DiffPartStats['bbox'];
  };
}

export interface DiffRenamedPart {
  from: string;
  to: string;
  volumeMm3: number;
}

export interface DiffMateSummary {
  name: string;
  type: string;
  a: string;
  b: string;
  pose?: unknown;
  limitsDeg?: unknown;
  limitsMm?: unknown;
}

export interface DiffParamSummary {
  name: string;
  type: 'number' | 'boolean';
  value: number | boolean;
  min?: number;
  max?: number;
}

export interface DiffSideHeader {
  featureCount: number;
  partCount: number;
  isAssembly: boolean;
}

export type DiffScriptsOutput =
  | {
      ok: true;
      base: DiffSideHeader;
      revised: DiffSideHeader;
      parts: {
        added: DiffPartStats[];
        removed: DiffPartStats[];
        /** Heuristic: a removed/added pair with matching volume and bbox
         *  extents is reported as a rename instead. */
        renamed: DiffRenamedPart[];
        changed: DiffChangedPart[];
        unchanged: string[];
      };
      interference: {
        baseTotalMm3: number;
        revisedTotalMm3: number;
        deltaMm3: number;
        basePairs: InterferencePair[];
        revisedPairs: InterferencePair[];
      };
      mates: {
        added: DiffMateSummary[];
        removed: DiffMateSummary[];
        changed: { name: string; base: DiffMateSummary; revised: DiffMateSummary }[];
      };
      params: {
        added: DiffParamSummary[];
        removed: DiffParamSummary[];
        changed: { name: string; base: DiffParamSummary; revised: DiffParamSummary }[];
      };
    }
  | {
      ok: false;
      /** Which script failed to evaluate, when the failure is side-specific. */
      side?: 'base' | 'revised';
      error: string;
      errorCode?: string;
      diagnostics?: CompilerDiagnostic[];
    };

interface SideSummary {
  featureCount: number;
  isAssembly: boolean;
  parts: DiffPartStats[];
  interferencePairs: InterferencePair[];
  interferenceTotalMm3: number;
  mates: DiffMateSummary[];
  params: DiffParamSummary[];
}

type SideResult =
  | { ok: true; side: SideSummary }
  | { ok: false; error: string; errorCode?: string; diagnostics?: CompilerDiagnostic[] };

export async function diffScriptsTool(input: DiffScriptsInput): Promise<DiffScriptsOutput> {
  if (input.baseFile === undefined && input.baseCode === undefined) {
    return {
      ok: false,
      side: 'base',
      error: 'diff_scripts: must provide either { baseFile } or { baseCode } for the baseline script.',
      errorCode: 'cli.invalid-args',
    };
  }
  if (input.file === undefined && input.code === undefined) {
    return {
      ok: false,
      side: 'revised',
      error: 'diff_scripts: must provide either { file } or { code } for the revised script.',
      errorCode: 'cli.invalid-args',
    };
  }

  const base = await evaluateSide({ file: input.baseFile, code: input.baseCode });
  if (!base.ok) return { ...base, side: 'base' };
  const revised = await evaluateSide({ file: input.file, code: input.code });
  if (!revised.ok) return { ...revised, side: 'revised' };

  const b = base.side;
  const r = revised.side;

  return {
    ok: true,
    base: { featureCount: b.featureCount, partCount: b.parts.length, isAssembly: b.isAssembly },
    revised: { featureCount: r.featureCount, partCount: r.parts.length, isAssembly: r.isAssembly },
    parts: diffParts(b.parts, r.parts),
    interference: {
      baseTotalMm3: b.interferenceTotalMm3,
      revisedTotalMm3: r.interferenceTotalMm3,
      deltaMm3: r.interferenceTotalMm3 - b.interferenceTotalMm3,
      basePairs: b.interferencePairs,
      revisedPairs: r.interferencePairs,
    },
    mates: diffByName(b.mates, r.mates),
    params: diffByName(b.params, r.params),
  };
}

// ----- Per-side evaluation ---------------------------------------------------

async function evaluateSide(input: { file?: string; code?: string }): Promise<SideResult> {
  const script = await runMcpScript(input);
  if (!script.ok) {
    return { ok: false, error: script.error, ...(script.errorCode !== undefined ? { errorCode: script.errorCode } : {}) };
  }
  const { run } = script;
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const result = await engine.run(run.records, { paramTable: run.paramTable });
  const fatal = result.diagnostics.find((d) => d.severity === 'error');
  if (fatal !== undefined) {
    return {
      ok: false,
      error: fatal.message,
      errorCode: fatal.code,
      diagnostics: withNextActions(result.diagnostics),
    };
  }

  const params: DiffParamSummary[] = run.session.params.list().map((entry) => ({
    name: entry.name,
    type: entry.type,
    value: entry.value,
    ...(entry.meta?.min !== undefined ? { min: entry.meta.min } : {}),
    ...(entry.meta?.max !== undefined ? { max: entry.meta.max } : {}),
  }));

  const ret = run.returnValue;
  if (ret instanceof Scene) {
    const sourceId = ret.__sourceFeatureId();
    const lowered = sourceId !== undefined ? result.shapes.get(sourceId) : undefined;
    if (!lowered || !isSceneBackend(lowered)) {
      return {
        ok: false,
        error: 'diff_scripts: the assembly scene did not lower successfully.',
        errorCode: 'recompute.input.missing',
        diagnostics: withNextActions(result.diagnostics),
      };
    }
    // Same stats calls as `list_part_stats` so the numbers line up exactly.
    const parts: DiffPartStats[] = sceneToWorldFrameParts(lowered).map((p) => ({
      name: p.name,
      volumeMm3: p.shape.volume(),
      bbox: toBbox(p.shape.boundingBox({ exact: true })),
    }));
    const inter = detectInterferences(lowered, INTERFERENCE_EPSILON_MM3, new Set());
    const arm = (run.session.assemblies as Map<string, Assembly>).get(ret.assemblyName);
    const mates: DiffMateSummary[] = (arm?.__mates() ?? []).map((m) => ({
      name: m.name,
      type: m.type,
      a: m.a,
      b: m.b,
      ...(m.pose !== undefined ? { pose: m.pose } : {}),
      ...(m.limitsDeg !== undefined ? { limitsDeg: m.limitsDeg } : {}),
      ...(m.limitsMm !== undefined ? { limitsMm: m.limitsMm } : {}),
    }));
    return {
      ok: true,
      side: {
        featureCount: run.records.length,
        isAssembly: true,
        parts,
        interferencePairs: inter.pairs,
        interferenceTotalMm3: inter.pairs.reduce((sum, p) => sum + p.volumeMm3, 0),
        mates,
        params,
      },
    };
  }

  // Single-shape (non-assembly) script: report the root return value as one
  // pseudo-part so dimension/volume drift is still visible in the diff.
  const tailId = run.records.length > 0 ? run.records[run.records.length - 1].id : undefined;
  const rootId = resolveRootId(ret, tailId);
  const rootShape = rootId !== undefined ? result.shapes.get(rootId) : undefined;
  const parts: DiffPartStats[] = [];
  if (rootShape instanceof OcctBackend) {
    try {
      parts.push({
        name: ROOT_PART_NAME,
        volumeMm3: rootShape.volume(),
        bbox: toBbox(rootShape.boundingBox({ exact: true })),
      });
    } catch {
      // Non-solid return (sketch/region/curve) — leave the parts list empty;
      // the feature-count header still carries the structural signal.
    }
  }
  return {
    ok: true,
    side: {
      featureCount: run.records.length,
      isAssembly: false,
      parts,
      interferencePairs: [],
      interferenceTotalMm3: 0,
      mates: [],
      params,
    },
  };
}

function toBbox(bb: { min: ArrayLike<number>; max: ArrayLike<number> }): DiffPartStats['bbox'] {
  return {
    min: [bb.min[0], bb.min[1], bb.min[2]],
    max: [bb.max[0], bb.max[1], bb.max[2]],
  };
}

// ----- Diff computation ------------------------------------------------------

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(ABS_TOL, 1e-9 * Math.max(Math.abs(a), Math.abs(b)));
}

function bboxesEqual(a: DiffPartStats['bbox'], b: DiffPartStats['bbox']): boolean {
  for (let i = 0; i < 3; i++) {
    if (!nearlyEqual(a.min[i], b.min[i]) || !nearlyEqual(a.max[i], b.max[i])) return false;
  }
  return true;
}

function bboxExtents(b: DiffPartStats['bbox']): [number, number, number] {
  return [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
}

/** Rename heuristic: a removed/added pair is the same body under a new name
 *  when volumes match (rel 1e-6) and bbox EXTENTS match (translation-safe).
 *  Only unambiguous 1:1 matches are claimed; ambiguous candidates stay in
 *  added/removed. */
function looksLikeSameBody(a: DiffPartStats, b: DiffPartStats): boolean {
  const volTol = Math.max(ABS_TOL, 1e-6 * Math.max(a.volumeMm3, b.volumeMm3));
  if (Math.abs(a.volumeMm3 - b.volumeMm3) > volTol) return false;
  const ea = bboxExtents(a.bbox);
  const eb = bboxExtents(b.bbox);
  return ea.every((v, i) => nearlyEqual(v, eb[i]));
}

function diffParts(base: DiffPartStats[], revised: DiffPartStats[]) {
  const baseByName = new Map(base.map((p) => [p.name, p]));
  const revisedByName = new Map(revised.map((p) => [p.name, p]));

  let added = revised.filter((p) => !baseByName.has(p.name));
  let removed = base.filter((p) => !revisedByName.has(p.name));
  const changed: DiffChangedPart[] = [];
  const unchanged: string[] = [];

  for (const b of base) {
    const r = revisedByName.get(b.name);
    if (r === undefined) continue;
    if (nearlyEqual(b.volumeMm3, r.volumeMm3) && bboxesEqual(b.bbox, r.bbox)) {
      unchanged.push(b.name);
    } else {
      changed.push({
        name: b.name,
        volumeMm3: { base: b.volumeMm3, revised: r.volumeMm3, delta: r.volumeMm3 - b.volumeMm3 },
        bbox: { base: b.bbox, revised: r.bbox },
      });
    }
  }

  const renamed: DiffRenamedPart[] = [];
  for (const rem of [...removed]) {
    const candidates = added.filter((a) => looksLikeSameBody(rem, a));
    if (candidates.length !== 1) continue;
    const match = candidates[0];
    // The added part must not equally match another removed part.
    const reverse = removed.filter((x) => looksLikeSameBody(x, match));
    if (reverse.length !== 1) continue;
    renamed.push({ from: rem.name, to: match.name, volumeMm3: match.volumeMm3 });
    removed = removed.filter((x) => x.name !== rem.name);
    added = added.filter((x) => x.name !== match.name);
  }

  return { added, removed, renamed, changed, unchanged };
}

/** Generic name-keyed diff for mates and params. Entries compare by their
 *  full JSON value (key order is construction-stable on both sides). */
function diffByName<T extends { name: string }>(
  base: T[],
  revised: T[],
): { added: T[]; removed: T[]; changed: { name: string; base: T; revised: T }[] } {
  const baseByName = new Map(base.map((e) => [e.name, e]));
  const revisedByName = new Map(revised.map((e) => [e.name, e]));
  const added = revised.filter((e) => !baseByName.has(e.name));
  const removed = base.filter((e) => !revisedByName.has(e.name));
  const changed: { name: string; base: T; revised: T }[] = [];
  for (const b of base) {
    const r = revisedByName.get(b.name);
    if (r === undefined) continue;
    if (JSON.stringify(b) !== JSON.stringify(r)) {
      changed.push({ name: b.name, base: b, revised: r });
    }
  }
  return { added, removed, changed };
}
