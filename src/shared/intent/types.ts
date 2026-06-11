// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export type Vec3 = [number, number, number];
export type Vec2 = [number, number];
export type Mat4 = number[]; // 16 elements, column-major

/** Three named Param fields. Used for any Vec3 surface in the capture intent
 *  whose components may be ParamRefs. Mirrors the inline `{x, y, z}` triple
 *  that translate/rotate already use; promoted to a named contract so
 *  assembly + transforms share one shape. Lower time walks each field
 *  through the resolver.
 *
 *  Note: `Vec3Param` is intentionally a per-coord struct, not a Vec3 class
 *  with arithmetic methods. There is no `Vec3.add(other)` / `.scale(factor)`
 *  / `.normalize()`. To compose Vec3-shaped expressions, work per coord with
 *  the existing `ParamRef.add` / `.subtract` / `.multiply` / `.divide` /
 *  `.negate` methods — e.g. `worldOrigin = at + frame.origin` is built as
 *  `{ x: addParams(at.x, frame.origin.x), y: ..., z: ... }`. Vec3-level
 *  operations would require a parallel vector-expression algebra on top of
 *  the scalar `ParamRefExpr`; YAGNI today. */
export interface Vec3Param {
  x: Param;
  y: Param;
  z: Param;
}

/** Script-facing Vec3 input. Accepts:
 *  - a 3-tuple of `Editable<number>` (number or ParamRef per coord), OR
 *  - a `Vec3Param` (named struct). The Vec3Param branch lets agents pass
 *    `connector.worldOrigin` directly into another assembly input without
 *    rebuilding the tuple.
 *  A plain `[number, number, number]` is structurally compatible with the
 *  tuple branch, so existing examples keep working without edit. */
export type EditableVec3 =
  | [
      import('../runtime/paramRef').Editable<number>,
      import('../runtime/paramRef').Editable<number>,
      import('../runtime/paramRef').Editable<number>,
    ]
  | Vec3Param;

export type FeatureId = string;
export type RewriteId = string;
// Re-import for FeatureRef.surface discriminant.
import type { SurfaceId } from './surfaceRecord';

export interface ScriptLocation {
  file: string;
  line: number;
  column: number;
}

export type Unit = 'mm' | 'in' | 'm' | 'deg' | 'rad' | 'unitless';

export interface Param {
  expression: string;       // e.g. 'width / 2 + 5 mm'
  unit: Unit;
  evaluated: number;        // canonical: mm for length, deg for angle
  /**
   * Slice-3: when set, this Param is a symbolic reference into the session's
   * ParamTable. The dispatcher pre-resolves at lower time and refreshes
   * `evaluated` from the table. Plain string is the leaf-name shorthand
   * (back-compat); a ParamRefExpr is the full AST for derived expressions
   * like `param('r', 5).divide(2)`. Lowerers never see this field set — they
   * always operate on resolved Params.
   */
  paramRef?: string | import('../runtime/paramRef').ParamRefExpr;
}

// Single source of truth for the six axis-aligned canonical face names.
// Used by FaceRef (kind: 'canonical') and FaceLabelsMap (featureRecord.ts).
export type CanonicalFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

export type FaceRef =
  | { kind: 'canonical'; face: CanonicalFace }
  | { kind: 'tracked'; faceName: string }
  | { kind: 'created'; rewriteId: RewriteId; slot: string }
  | { kind: 'propagated'; rewriteId: RewriteId; source: FaceRef }
  | { kind: 'label'; name: string }
  | { kind: 'query'; query: import('./queryTypes').FaceQuery }
  // Q8 — Query DSL value (kc.q.face(...) etc). Serialized as the AST so
  // the FeatureRecord stays JSON-round-trippable; the lowerer dispatches
  // through the Q3 evaluator at consume time.
  | { kind: 'queryDsl'; queryAst: import('../../kernel/naming/query').QueryAst; queryTarget: import('../../kernel/naming/query').QueryKind | 'any'; lenient?: boolean };

export type EdgeRef =
  | { kind: 'tracked'; edgeName: string; selector: 'edge'|'start'|'end'|'midpoint' }
  | { kind: 'created'; rewriteId: RewriteId; slot: string;
      selector: 'edge'|'start'|'end'|'midpoint' }
  | { kind: 'propagated'; rewriteId: RewriteId; source: EdgeRef;
      selector: 'edge'|'start'|'end'|'midpoint' }
  | { kind: 'query'; query: import('./queryTypes').EdgeQuery }
  | { kind: 'segment'; segmentId: string }
  | { kind: 'segments'; segmentIds: string[] }
  // Q8 — Query DSL value (kc.q.edge(...) etc).
  | { kind: 'queryDsl'; queryAst: import('../../kernel/naming/query').QueryAst; queryTarget: import('../../kernel/naming/query').QueryKind | 'any'; lenient?: boolean };

export type VertexRef =
  | { kind: 'tracked'; vertexName: string }
  | { kind: 'created'; rewriteId: RewriteId; slot: string };

export type FeatureRef =
  | { kind: 'feature'; id: FeatureId }
  | { kind: 'face'; featureId: FeatureId; ref: FaceRef }
  | { kind: 'edge'; featureId: FeatureId; ref: EdgeRef }
  | { kind: 'vertex'; featureId: FeatureId; ref: VertexRef }
  // W1.3 NURBS: surface-typed input ref. Only consumed by the new
  // `surfaceThicken` / `surfaceToShape` lowerer cases; resolved upstream
  // of the existing face/edge ref paths.
  | { kind: 'surface'; surfaceId: SurfaceId };

export type { SurfaceId } from './surfaceRecord';

export type CardinalPlane = 'xy' | 'xz' | 'yz';
export type PlaneSpec = CardinalPlane | { plane: CardinalPlane; offset?: number };

export type SketchAxis = 'x' | 'y';
export type AxisSpec = SketchAxis | { axis: SketchAxis; offset?: number };

export function isValidAxisSpec(v: unknown): v is AxisSpec {
  if (v === 'x' || v === 'y') return true;
  if (typeof v === 'object' && v !== null) {
    const o = v as { axis?: unknown; offset?: unknown };
    if (o.axis !== 'x' && o.axis !== 'y') return false;
    // offset is optional; if present, must be finite
    if (o.offset === undefined) return true;
    return typeof o.offset === 'number' && Number.isFinite(o.offset);
  }
  return false;
}

export type FeatureKind =
  // primitives
  | 'box' | 'cylinder' | 'sphere' | 'torus'
  // 2D-to-3D
  | 'extrude' | 'revolve' | 'loft' | 'sweep'
  // boolean
  | 'boolean'
  // edge/face features (v0.2+)
  | 'fillet' | 'chamfer' | 'shell' | 'hole' | 'holes' | 'cutout' | 'draft' | 'pattern'
  // symmetric (v0.13+)
  | 'mirror'
  // imports (v0.3+)
  | 'importedMesh' | 'importedStep'
  // sketch (v0.2+)
  | 'sketch' | 'constrainedSketch'
  // assembly (v0.6+)
  | 'assemblyPart' | 'assemblyJoint' | 'assemblyConnect' | 'assemblyModel' | 'solvedAssembly'
  // assembly export (v0.6+) — Scene.toCompound() / Scene.toUnion()
  | 'assemblyExport'
  // specialty (v0.13+)
  | 'sheetMetal' | 'sheetMetalBend' | 'sdf' | 'sdfMaterialize'
  // W1.3 NURBS surfaces — escape paths from a `Surface` into the Shape pipeline.
  | 'surfaceThicken' | 'surfaceToShape'
  // Slice A: reference-image overlay node (capture-only, no OCCT output).
  | 'referenceImage'
  // W2: HDRI / IBL render-environment node (capture-only, no OCCT output).
  | 'renderEnvironment'
  // Camera-target override (capture-only, no OCCT output) — peer to
  // renderEnvironment. Lets the script aim the auto-fit camera at an
  // explicit (x, y, z) instead of the bbox centroid.
  | 'cameraTarget'
  // Animation-view declaration (capture-only, no OCCT output) — declares a
  // parameter sweep for offline MP4 capture (kinematic scrub demos).
  // scripts/captureAnimationView.mjs reads this record and produces an MP4
  // by sampling N frames across the sweep, leveraging the mesh-cache fast
  // path so each frame's recompute is ~5 ms warm.
  | 'animationView'
  // W3: capture-only print-prep (DFM gate) declaration, no OCCT output.
  | 'dfmSpec'
  // NURBS Slice B: 3D parametric curve (Geom_BSplineCurve under the hood)
  //   and multi-section sweep (BRepOffsetAPI_MakePipeShell).
  | 'curve3d'
  | 'variableSweep'
  // NURBS Slice C: Coons patch from 4 boundary curves (BRepOffsetAPI_MakeFilling
  //   per 2026-05-18 audit) and quintic Hermite transition curve (degree-5
  //   nurbsCurve via JS-side Bezier control-point math).
  | 'surfaceFromBoundary'
  | 'hermiteG2'
  // W3 — face authoring: emboss text onto a target face (raise or recess
  // via signed depth) and project a 2D closed curve onto a 3D face for
  // engraved logos / brand silhouettes. Open-wire projection (`asEdge:true`)
  // is captured but deferred at lower time pending OCCT binding for
  // `BRepProj_Projection`.
  | 'embossText'
  | 'projectCurve';

/**
 * Runtime guard for PlaneSpec. Returns true for cardinal strings
 * ('xy' | 'xz' | 'yz') and for offset-plane objects
 * `{ plane: CardinalPlane; offset: number }` where offset is finite.
 * Rejects everything else.
 */
export type ScaleSpec = number | [number, number, number];

export function isValidVec3(v: unknown): v is Vec3 {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
}

/** Scalar input validator that accepts a finite number or ParamRef<number>.
 *  Use at every capture-time entry point that takes an `Editable<number>`
 *  (primitive dimensions, feature scalar params) so degenerate inputs (objects,
 *  strings, NaN) are rejected with a clear `feature.invalid-args` rather than
 *  reaching OCCT — which can recurse / overflow on garbage `evaluated` payloads. */
export function isValidEditableNumber(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v !== 'object' || v === null) return false;
  const o = v as { _brand?: unknown; _type?: unknown };
  return o._brand === 'ParamRef' && o._type === 'number';
}

/** Vec3 input validator that accepts numbers or ParamRef<number> per coord.
 *  Use at every capture-time entry point that takes an EditableVec3 (assembly
 *  surfaces, transforms). Composes with `formatScalarForError` for diagnostics. */
export function isValidEditableVec3(v: unknown): v is EditableVec3 {
  // Vec3Param branch: object with x/y/z Param fields.
  if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
    const o = v as { x?: unknown; y?: unknown; z?: unknown };
    return isParamShape(o.x) && isParamShape(o.y) && isParamShape(o.z);
  }
  // Tuple branch: existing logic.
  if (!Array.isArray(v) || v.length !== 3) return false;
  for (const c of v) {
    if (typeof c === 'number') {
      if (!Number.isFinite(c)) return false;
      continue;
    }
    if (typeof c !== 'object' || c === null) return false;
    const o = c as { _brand?: unknown; _type?: unknown };
    if (o._brand !== 'ParamRef' || o._type !== 'number') return false;
  }
  return true;
}

function isParamShape(p: unknown): boolean {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as { evaluated?: unknown; unit?: unknown };
  return typeof o.evaluated === 'number'
      && Number.isFinite(o.evaluated)
      && typeof o.unit === 'string';
}

export function isValidScaleSpec(v: unknown): v is ScaleSpec {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0;
  if (Array.isArray(v) && v.length === 3) {
    return v.every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0);
  }
  return false;
}

export interface LinearPatternSpec {
  kind: 'linear';
  count: number;
  direction: Vec3;
  spacing: number;
}

export interface GridPatternAxisSpec {
  count: number;
  direction: Vec3;
  spacing: number;
}

export interface GridPatternSpec {
  kind: 'grid';
  x: GridPatternAxisSpec;
  y: GridPatternAxisSpec;
}

export interface CircularPatternSpec {
  kind: 'circular';
  count: number;
  axis: Vec3;
  angleDeg: number;
}

export type PatternSpec = LinearPatternSpec | CircularPatternSpec | GridPatternSpec;

/**
 * Format a scalar value for inclusion in an error message.
 *
 * JSON.stringify drops NaN/Infinity to "null" — the worst diagnostic
 * outcome. This helper preserves them as readable strings. Also handles
 * BigInt, Symbol, circular references, and other unrepresentable values
 * without throwing.
 */
export function formatScalarForError(v: unknown, _seen?: WeakSet<object>): string {
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return 'NaN';
    if (v === Infinity) return 'Infinity';
    if (v === -Infinity) return '-Infinity';
    return String(v);
  }
  if (typeof v === 'bigint') return `${v}n`;
  if (typeof v === 'symbol') return String(v);
  if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
    const seen = _seen ?? new WeakSet<object>();
    if (seen.has(v)) return '<circular>';
    seen.add(v);
    if (Array.isArray(v)) {
      return `[${v.map((x) => formatScalarForError(x, seen)).join(', ')}]`;
    }
    const entries = Object.entries(v).map(
      ([k, val]) => `${JSON.stringify(k)}: ${formatScalarForError(val, seen)}`,
    );
    return `{ ${entries.join(', ')} }`;
  }
  try {
    return JSON.stringify(v) ?? '<unrepresentable>';
  } catch {
    return '<unrepresentable>';
  }
}

export function isValidPlaneSpec(value: unknown): value is PlaneSpec {
  if (typeof value === 'string') {
    return value === 'xy' || value === 'xz' || value === 'yz';
  }
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    const plane = v['plane'];
    const offset = v['offset'];
    if (!(plane === 'xy' || plane === 'xz' || plane === 'yz')) return false;
    // offset is optional; if present it must be a finite number.
    if (offset !== undefined && !(typeof offset === 'number' && Number.isFinite(offset))) return false;
    return true;
  }
  return false;
}
