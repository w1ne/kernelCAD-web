// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Recovery helpers for history-aware booleans (FIX-10).
 *
 * OCCT's exact boolean occasionally returns a result it knows is suspect: the
 * builder reports `IsDone()==false` / `HasErrors()`, or it finishes with
 * warnings and an INVALID solid (a cylinder tangent to a box face, two faces
 * a few nanometres from coplanar). The usual cure is the fuzzy boolean
 * (`SetFuzzyValue`) — OCCT treats sub-shapes closer than the fuzz as
 * coincident — and, when the fuzzy result is still invalid, a ShapeFix pass.
 *
 * Everything here is kernel-only (no diagnostics construction); the caller
 * records which strategy succeeded so the lowerer can surface it.
 */

import type { getOC } from 'replicad';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OC = any;

/** Strategy that produced a boolean result. `exact` is the historical call. */
export type BooleanStrategy = 'exact' | 'fuzzy' | 'fuzzy-coarse' | 'fuzzy-glue';

export interface BooleanAttemptPlan {
  strategy: BooleanStrategy;
  /** Fuzzy value in model units (mm); 0 for the exact attempt. */
  fuzzy: number;
  /** Glue mode — only ever used for fuse, where coincident faces are the
   *  failure mode it exists for. Cut/common with glue can silently return the
   *  unmodified body, so it is never offered for them. */
  glue: boolean;
}

/** Lower/upper bounds on the fuzzy value (mm). The lower bound keeps it above
 *  OCCT's Precision::Confusion (1e-7); the upper bound keeps a fuzzy boolean
 *  from welding features that are genuinely apart (a 0.05 mm slot stays a
 *  slot). */
const FUZZY_MIN = 1e-6;
const FUZZY_MAX = 1e-2;
/** Fuzzy value per unit of operand bbox diagonal. */
const FUZZY_PER_DIAGONAL = 1e-5;

/** Fuzzy value scaled to the operands: 1e-5 × bbox diagonal, bounded. */
export function scaledFuzzyValue(diagonal: number): number {
  if (!Number.isFinite(diagonal) || diagonal <= 0) return FUZZY_MIN;
  return Math.min(FUZZY_MAX, Math.max(FUZZY_MIN, diagonal * FUZZY_PER_DIAGONAL));
}

/** Retry ladder after the exact attempt. */
export function recoveryPlans(op: 'cut' | 'fuse' | 'intersect', diagonal: number): BooleanAttemptPlan[] {
  const fuzzy = scaledFuzzyValue(diagonal);
  const plans: BooleanAttemptPlan[] = [
    { strategy: 'fuzzy', fuzzy, glue: false },
    { strategy: 'fuzzy-coarse', fuzzy: Math.min(FUZZY_MAX, fuzzy * 10), glue: false },
  ];
  if (op === 'fuse') plans.push({ strategy: 'fuzzy-glue', fuzzy, glue: true });
  return plans;
}

/** Diagonal of the combined axis-aligned bounding box of `shapes`. */
export function combinedDiagonal(oc: ReturnType<typeof getOC>, shapes: readonly unknown[]): number {
  const o = oc as OC;
  const box = new o.Bnd_Box_1();
  try {
    for (const s of shapes) o.BRepBndLib.Add(s, box, false);
    if (box.IsVoid()) return 0;
    const a = box.CornerMin();
    const b = box.CornerMax();
    const d = Math.hypot(b.X() - a.X(), b.Y() - a.Y(), b.Z() - a.Z());
    a.delete();
    b.delete();
    return d;
  } finally {
    box.delete();
  }
}

/** Absolute volume of a shape; NaN when OCCT cannot integrate it. */
export function volumeOf(oc: ReturnType<typeof getOC>, shape: unknown): number {
  const o = oc as OC;
  const props = new o.GProp_GProps_1();
  try {
    o.BRepGProp.VolumeProperties_1(shape, props, false, false, false);
    return Math.abs(props.Mass());
  } catch {
    return Number.NaN;
  } finally {
    props.delete();
  }
}

/** BRepCheck validity (topology + geometry). */
export function isValidShape(oc: ReturnType<typeof getOC>, shape: unknown): boolean {
  const o = oc as OC;
  let analyzer: OC;
  try {
    analyzer = new o.BRepCheck_Analyzer(shape, true, false);
    return Boolean(analyzer.IsValid_2());
  } catch {
    return false;
  } finally {
    analyzer?.delete();
  }
}

/**
 * Volume bounds a correct boolean result must respect. A fuzzy/glue result
 * outside them is the wrong answer even if BRepCheck accepts it (glue on a
 * tangent cutter happily returns the uncut body).
 */
export function plausibleBooleanVolume(
  op: 'cut' | 'fuse' | 'intersect',
  result: number,
  inputs: readonly number[],
): boolean {
  if (!Number.isFinite(result) || result < 0) return false;
  if (inputs.some((v) => !Number.isFinite(v))) return true; // cannot judge — accept
  const largest = Math.max(...inputs);
  const tol = Math.max(1e-6, largest * 1e-4);
  if (op === 'fuse') {
    const sum = inputs.reduce((a, b) => a + b, 0);
    return result <= sum + tol && result >= largest - tol;
  }
  if (op === 'cut') return result <= inputs[0] + tol;
  return result <= Math.min(...inputs) + tol;
}

/** Shape fingerprint for re-matching sub-shapes across a ShapeFix pass:
 *  centre of mass + mass (area for faces, length for edges). */
interface SubshapeProps {
  hash: string;
  cx: number;
  cy: number;
  cz: number;
  mass: number;
}

function subshapeProps(
  oc: ReturnType<typeof getOC>,
  shape: unknown,
  kind: 'face' | 'edge',
  hashOf: (s: unknown) => string,
): SubshapeProps[] {
  const o = oc as OC;
  const typeEnum = kind === 'face' ? o.TopAbs_ShapeEnum.TopAbs_FACE : o.TopAbs_ShapeEnum.TopAbs_EDGE;
  const explorer = new o.TopExp_Explorer_2(shape, typeEnum, o.TopAbs_ShapeEnum.TopAbs_SHAPE);
  const out: SubshapeProps[] = [];
  try {
    while (explorer.More()) {
      const sub = explorer.Current();
      const props = new o.GProp_GProps_1();
      try {
        if (kind === 'face') o.BRepGProp.SurfaceProperties_1(sub, props, false, false);
        else o.BRepGProp.LinearProperties(sub, props, false, false);
        const c = props.CentreOfMass();
        out.push({ hash: hashOf(sub), cx: c.X(), cy: c.Y(), cz: c.Z(), mass: props.Mass() });
        c.delete();
      } catch {
        out.push({ hash: hashOf(sub), cx: NaN, cy: NaN, cz: NaN, mass: NaN });
      } finally {
        props.delete();
      }
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return out;
}

/**
 * Map sub-shape hashes of `before` that vanished in `after` onto the
 * geometrically matching new sub-shape of `after` (same centre of mass and
 * mass within `tol`). Hashes present in both are left out (identity).
 */
export function rematchSubshapes(
  oc: ReturnType<typeof getOC>,
  before: unknown,
  after: unknown,
  kind: 'face' | 'edge',
  hashOf: (s: unknown) => string,
  tol: number,
): Map<string, string> {
  const a = subshapeProps(oc, before, kind, hashOf);
  const b = subshapeProps(oc, after, kind, hashOf);
  const afterHashes = new Set(b.map((p) => p.hash));
  const beforeHashes = new Set(a.map((p) => p.hash));
  const fresh = b.filter((p) => !beforeHashes.has(p.hash));
  const remap = new Map<string, string>();
  for (const p of a) {
    if (afterHashes.has(p.hash)) continue;
    const match = fresh.find((q) =>
      Math.abs(q.cx - p.cx) <= tol && Math.abs(q.cy - p.cy) <= tol && Math.abs(q.cz - p.cz) <= tol &&
      Math.abs(q.mass - p.mass) <= Math.max(tol, Math.abs(p.mass) * 1e-3));
    if (match) remap.set(p.hash, match.hash);
  }
  return remap;
}

/** Run ShapeFix_Shape over `shape`. Returns the fixed shape, or undefined
 *  when ShapeFix throws. */
export function shapeFix(oc: ReturnType<typeof getOC>, shape: unknown, precision: number): unknown {
  const o = oc as OC;
  const fixer = new o.ShapeFix_Shape_2(shape);
  const progress = new o.Message_ProgressRange_1();
  try {
    fixer.SetPrecision(precision);
    fixer.SetMaxTolerance(Math.max(precision * 10, 1e-3));
    fixer.Perform(progress);
    return fixer.Shape();
  } catch {
    return undefined;
  } finally {
    progress.delete();
    fixer.delete();
  }
}

/** Minimal view of a boolean result for {@link booleanRecoveryDiagnostic}. */
export interface RecoveredBooleanInfo {
  strategy?: BooleanStrategy;
  fuzzyValue?: number;
  shapeFixed?: boolean;
  exactFailure?: string;
}

/**
 * Info diagnostic that makes a recovered boolean observable. Returns
 * undefined for the exact (or unrecorded) strategy.
 */
export function booleanRecoveryDiagnostic(
  featureId: string,
  opLabel: string,
  result: RecoveredBooleanInfo,
): CompilerDiagnostic | undefined {
  if (result.strategy === undefined || result.strategy === 'exact') return undefined;
  const fuzz = result.fuzzyValue !== undefined ? ` with fuzzy value ${result.fuzzyValue.toPrecision(3)} mm` : '';
  const fixed = result.shapeFixed ? ' and a ShapeFix pass' : '';
  return {
    target: 'export-occt',
    code: 'feature.boolean.recovered',
    featureId,
    severity: 'info',
    message:
      `${opLabel}: the exact boolean was rejected (${result.exactFailure ?? 'kernel failure'}); ` +
      `recovered by the '${result.strategy}' strategy${fuzz}${fixed}.`,
    hint:
      'No action needed — the result is a valid solid. For an exact boolean, separate the operands or overlap them clearly instead of letting faces coincide or touch tangentially.',
    details: {
      strategy: result.strategy,
      ...(result.fuzzyValue !== undefined ? { fuzzyValue: result.fuzzyValue } : {}),
      shapeFixed: result.shapeFixed === true,
    },
  };
}
