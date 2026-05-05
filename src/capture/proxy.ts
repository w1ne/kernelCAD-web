import type { FeatureId, PlaneSpec, FeatureRef } from '../intent/types';
import { isValidVec3, isValidScaleSpec, isValidPlaneSpec, formatScalarForError } from '../intent/types';
import { KernelError } from '../intent/kernelError';
import type { CaptureSession } from './captureSession';
import { buildFaceInputRef } from './captureSession';
import type { EdgeQuery, FaceQuery, EdgeSegment } from '../backends/occt/edgeQueries';
import {
  validateHoleOpts, validateHolesOpts, serializeHoleParams, serializeHolesParams,
  type HoleOpts, type HolesOpts,
} from '../intent/holeValidation';
import {
  validateCutoutOpts, validateCutoutProfile, serializeCutoutParams,
  type CutoutOpts,
} from '../intent/cutoutValidation';

type CanonicalFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

export type EdgeSelector =
  | EdgeQuery
  | EdgeSegment
  | EdgeSegment[]
  | { face: CanonicalFace | string }
  | undefined;

export type FaceSelector =
  | FaceQuery
  | { face: CanonicalFace | string };

/**
 * IMPORTANT — drift sentinel contract:
 * Adding a public method to `Sketch`, `PathBuilder`, or `Shape` requires
 * also updating `src/mcp/tools/listApi.ts` (in `SKETCH_METHODS`,
 * `PATH_BUILDER_METHODS`, or `SHAPE_METHODS` respectively). The drift
 * sentinel test at `tests/integration/mcp/listApi.driftSentinel.test.ts`
 * fails CI when `Object.getOwnPropertyNames(<Class>.prototype)` doesn't
 * match the advertised array. This guards agent discoverability — methods
 * not in `list_api` are invisible to MCP clients.
 */
export class Shape {
  readonly id: FeatureId;
  private session: CaptureSession;

  // Lazy lowered backend — cached per-Shape so consecutive selectEdges /
  // selectEdge calls don't re-run RecomputeEngine.run() against the full
  // record list. Invalidated by record-count growth (capture is append-only,
  // so length growth is the only signal we need today).
  private _loweredBackend?: import('../backends/occt/occtBackend').OcctBackend;
  private _loweredAtRecordCount?: number;
  private _loweredAtTransformCount?: number;

  constructor(id: FeatureId, session: CaptureSession) {
    this.id = id;
    this.session = session;
  }

  translate(x: number, y: number, z: number): Shape {
    if (!isValidVec3([x, y, z])) {
      throw new KernelError(
        'feature.invalid-args',
        `Translate vector must be three finite numbers; got [${x}, ${y}, ${z}].`,
        this.id,
        'Pass three finite numbers (x, y, z) to .translate().',
      );
    }
    this.session.appendTransform(this.id, { op: 'translate', x, y, z });
    return this;
  }

  rotate(axis: [number, number, number], degrees: number, pivot?: [number, number, number]): Shape {
    if (!isValidVec3(axis) || typeof degrees !== 'number' || !Number.isFinite(degrees)) {
      throw new KernelError(
        'feature.invalid-args',
        `Rotate axis must be a finite Vec3 and degrees must be a finite number; got axis=${formatScalarForError(axis)}, degrees=${formatScalarForError(degrees)}.`,
        this.id,
        'Pass a finite Vec3 axis and a finite number of degrees to .rotate(axis, degrees, pivot?).',
      );
    }
    if (pivot !== undefined && !isValidVec3(pivot)) {
      throw new KernelError(
        'feature.invalid-args',
        `Rotate pivot (when provided) must be a finite Vec3; got ${formatScalarForError(pivot)}.`,
        this.id,
        'Pass a finite Vec3 as the pivot, or omit it.',
      );
    }
    this.session.appendTransform(this.id, { op: 'rotateAxis', axis, degrees, pivot });
    return this;
  }

  scale(sx: number, sy?: number, sz?: number): Shape {
    const scaleSpec = (sy !== undefined || sz !== undefined)
      ? [sx, sy ?? sx, sz ?? sx] as [number, number, number]
      : sx;
    if (!isValidScaleSpec(scaleSpec)) {
      throw new KernelError(
        'feature.invalid-args',
        `Scale factor must be a positive finite number, or a Vec3 of three positive finite numbers; got ${formatScalarForError(scaleSpec)}.`,
        this.id,
        'Pass a positive finite number (uniform) or three positive finite numbers (per-axis) to .scale().',
      );
    }
    this.session.appendTransform(this.id, {
      op: 'scale',
      sx,
      sy: sy ?? sx,
      sz: sz ?? sx,
    });
    return this;
  }

  reflect(plane: PlaneSpec): Shape {
    if (!isValidPlaneSpec(plane)) {
      throw new KernelError(
        'feature.invalid-args',
        `Reflect plane must be 'xy' | 'xz' | 'yz' or { plane: '<cardinal>', offset?: number }; got ${formatScalarForError(plane)}.`,
        this.id,
        "Pass 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset?: number } to .reflect().",
      );
    }
    this.session.appendTransform(this.id, { op: 'reflect', plane });
    return this;
  }

  mirror(plane: PlaneSpec): Shape {
    if (!isValidPlaneSpec(plane)) {
      throw new KernelError(
        'feature.invalid-args',
        `Mirror plane must be 'xy' | 'xz' | 'yz' or { plane: '<cardinal>', offset?: number }; got ${formatScalarForError(plane)}.`,
        this.id,
        "Pass 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset?: number } to .mirror().",
      );
    }
    return this.session.mirrorFeature(this, plane);
  }

  subtract(...others: Shape[]): Shape {
    return this.session.boolean('difference', this, others);
  }

  union(...others: Shape[]): Shape {
    return this.session.boolean('union', this, others);
  }

  intersect(...others: Shape[]): Shape {
    return this.session.boolean('intersection', this, others);
  }

  // Single-radius form (rc.6 — unchanged).
  fillet(radius: number, edges?: EdgeSelector): Shape;
  // Variable-radius form (rc.11).
  fillet(groups: Array<{ edges: EdgeSelector; radius: number }>): Shape;
  fillet(
    radiusOrGroups: number | Array<{ edges: EdgeSelector; radius: number }>,
    edges?: EdgeSelector,
  ): Shape {
    if (typeof radiusOrGroups === 'number') {
      return this.session.edgeFeature('fillet', this, 'radius', radiusOrGroups, edges);
    }
    return this.session.variableEdgeFeature('fillet', this, 'radius', radiusOrGroups);
  }

  // Single-distance form (rc.6 — unchanged).
  chamfer(distance: number, edges?: EdgeSelector): Shape;
  // Variable-distance form (rc.11).
  chamfer(groups: Array<{ edges: EdgeSelector; distance: number }>): Shape;
  chamfer(
    distanceOrGroups: number | Array<{ edges: EdgeSelector; distance: number }>,
    edges?: EdgeSelector,
  ): Shape {
    if (typeof distanceOrGroups === 'number') {
      return this.session.edgeFeature('chamfer', this, 'distance', distanceOrGroups, edges);
    }
    return this.session.variableEdgeFeature('chamfer', this, 'distance', distanceOrGroups);
  }

  shell(thickness: number, opts: { face: FaceSelector | CanonicalFace | string }): Shape {
    return this.session.edgeFeature('shell', this, 'thickness', thickness, { face: opts.face });
  }

  /**
   * Drill a single hole through this Shape. Position is face-local 2D
   * (`u`, `v` in mm). Use `depth: 'through'` to clip at the back face.
   * Optional `counterbore` (wider shoulder) or `countersink` (cone) — the
   * two are mutually exclusive on a single hole.
   *
   * Created face refs (resolvable downstream as `{ face: '<name>' }`):
   *   `wall` (always), `floor` (blind), `wall-back` (through),
   *   `counterbore-wall` / `counterbore-floor` (with cb),
   *   `countersink-cone` (with csk).
   */
  hole(face: FaceSelector | CanonicalFace | string, opts: HoleOpts): Shape {
    validateHoleOpts(opts, this.id);
    const faceSel = normalizeFaceSelector(face);
    const { params, metadata } = serializeHoleParams(faceSel, opts);
    if (opts.name !== undefined) {
      assertFeatureNameUniqueOnChain(this.session.getRecords(), this.id, opts.name);
    } else {
      metadata.ordinal = nextOrdinalForKindOnChain(this.session.getRecords(), this.id, 'hole');
    }
    const inputs: Record<string, FeatureRef> = {
      target: { kind: 'feature', id: this.id },
      face: buildFaceInputRef(this.id, faceSel),
    };
    return this.session.createShape({
      kind: 'hole',
      inputs,
      params,
      metadata,
    });
  }

  /**
   * Drill N holes in a single feature record. All holes share diameter,
   * depth, and optional counterbore/countersink. Use `.hole()` chained
   * calls if you need mixed specs.
   *
   * The bare `'wall'` selector on the result resolves to *all* bore walls
   * collectively — `.fillet(0.2, { face: 'wall' })` rounds every lip in one
   * call. Indexed access (e.g. `holes[0].wall`) is slice-2.
   */
  holes(face: FaceSelector | CanonicalFace | string, opts: HolesOpts): Shape {
    validateHolesOpts(opts, this.id);
    const faceSel = normalizeFaceSelector(face);
    const { params, metadata } = serializeHolesParams(faceSel, opts);
    if (opts.name !== undefined) {
      assertFeatureNameUniqueOnChain(this.session.getRecords(), this.id, opts.name);
    } else {
      metadata.ordinal = nextOrdinalForKindOnChain(this.session.getRecords(), this.id, 'holes');
    }
    const inputs: Record<string, FeatureRef> = {
      target: { kind: 'feature', id: this.id },
      face: buildFaceInputRef(this.id, faceSel),
    };
    return this.session.createShape({
      kind: 'holes',
      inputs,
      params,
      metadata,
    });
  }

  /**
   * Sketch-driven subtractive extrude. Useful for irregular shapes hole()
   * can't express (slots, D-shapes, keyhole pockets). Profile coords are
   * in face-local 2D; direction is always *into* the body.
   *
   * Pass a closed `Sketch` or a bare `PathBuilder` (auto-closed). Created
   * face refs: `wall` (always), `floor` (blind), `wall-back` (through).
   */
  cutout(profile: import('./sketch').PathBuilder | import('./sketch').Sketch, opts: CutoutOpts): Shape {
    validateCutoutOpts(opts, this.id);
    // Auto-close a bare PathBuilder. Duck-type on `.close` to avoid pulling
    // PathBuilder/Sketch class identifiers from sketch.ts (which imports Shape
    // from this module — would create a top-level circular dep).
    const isPathBuilder = typeof (profile as { close?: unknown }).close === 'function';
    const sketch: import('./sketch').Sketch = isPathBuilder
      ? (profile as import('./sketch').PathBuilder).close()
      : (profile as import('./sketch').Sketch);
    const sketchRecord = this.session.getRecords().find(r => r.id === sketch.id);
    const commands = (sketchRecord?.metadata as { commands?: import('./sketch').SketchCommand[] })?.commands ?? [];
    validateCutoutProfile(commands, this.id);
    const faceSel = normalizeFaceSelector(opts.face);
    const { params, metadata } = serializeCutoutParams(faceSel, opts);
    if (opts.name !== undefined) {
      assertFeatureNameUniqueOnChain(this.session.getRecords(), this.id, opts.name);
    } else {
      metadata.ordinal = nextOrdinalForKindOnChain(this.session.getRecords(), this.id, 'cutout');
    }
    const inputs: Record<string, FeatureRef> = {
      target: { kind: 'feature', id: this.id },
      profile: { kind: 'feature', id: sketch.id },
      face: buildFaceInputRef(this.id, faceSel),
    };
    return this.session.createShape({
      kind: 'cutout',
      inputs,
      params,
      metadata,
    });
  }

  /**
   * Lower this Shape eagerly — runs recompute against the records up to and
   * including this Shape, returns the resulting OcctBackend so script-runtime
   * helpers like `selectEdges` can introspect the lowered geometry.
   *
   * Most agents won't call this directly. It's invoked implicitly when an
   * agent calls `selectEdges(myShape, ...)` from a `.kcad.ts` script.
   */
  async lower(): Promise<import('../backends/occt/occtBackend').OcctBackend> {
    const records = this.session.getRecords();
    // C1 fix: cache invalidates on either record-count growth OR a transform
    // appended to THIS shape. `appendTransform` mutates `record.transforms`
    // in place — `records.length` is unchanged after Shape.translate/rotate/scale.
    // Without the transform-count check, the cache returns the un-transformed
    // backend after a transform, producing silent incorrect results.
    const ownRecord = records.find(r => r.id === this.id);
    const transformCount = ownRecord?.transforms.length ?? 0;
    if (
      this._loweredBackend &&
      this._loweredAtRecordCount === records.length &&
      this._loweredAtTransformCount === transformCount
    ) {
      return this._loweredBackend;
    }
    const { RecomputeEngine } = await import('../compute/recomputeEngine');
    const { OcctLowerer } = await import('../backends/occt/occtLowerer');
    const { OcctBackend, initOcct } = await import('../backends/occt/occtBackend');
    await initOcct();
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(records as readonly import('../intent/featureRecord').FeatureRecord[]);
    const shape = r.shapes.get(this.id);
    if (!shape) {
      throw new Error(`Shape.lower(): shape '${this.id}' not lowered (check upstream diagnostics).`);
    }
    if (!(shape instanceof OcctBackend)) {
      throw new Error(`Shape.lower(): shape '${this.id}' is not an OcctBackend.`);
    }
    this._loweredBackend = shape;
    this._loweredAtRecordCount = records.length;
    this._loweredAtTransformCount = transformCount;
    return shape;
  }
}

/** Wrap a bare canonical-face / label string into the `{ face: <s> }`
 *  FaceSelector shape so hole/holes/cutout can accept either form. */
function normalizeFaceSelector(face: FaceSelector | CanonicalFace | string): FaceSelector {
  return typeof face === 'string' ? { face } : face;
}

/** Walk records back from `targetId` via `inputs.target` (slice-2 chain
 *  semantics). Returns records in chain order (oldest first). */
function chainRecordsFrom(
  records: ReadonlyArray<{ id: string; kind: string; inputs?: Record<string, { kind: string; id?: string }>; metadata?: Record<string, unknown> }>,
  targetId: string,
): typeof records[number][] {
  const byId = new Map<string, typeof records[number]>();
  for (const r of records) byId.set(r.id, r);
  const out: typeof records[number][] = [];
  let cur: string | undefined = targetId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const r = byId.get(cur);
    if (!r) break;
    out.unshift(r);
    const target = r.inputs?.target;
    cur = target && target.kind === 'feature' ? target.id : undefined;
  }
  return out;
}

/** Throw `feature.invalid-args` if any prior feature in the chain ending
 *  at `targetId` already used the given `name`. */
function assertFeatureNameUniqueOnChain(
  records: ReadonlyArray<{ id: string; kind: string; inputs?: Record<string, { kind: string; id?: string }>; metadata?: Record<string, unknown> }>,
  targetId: string,
  name: string,
): void {
  const chain = chainRecordsFrom(records, targetId);
  for (const r of chain) {
    const prev = (r.metadata as { name?: unknown } | undefined)?.name;
    if (typeof prev === 'string' && prev === name) {
      throw new KernelError(
        'feature.invalid-args',
        `feature name '${name}' is already used in this chain.`,
        undefined,
        `Feature name '${name}' already used in this chain. Names must be unique per chain; for variations use suffixes ('${name}-front', '${name}-back').`,
      );
    }
  }
}

/** 1-based ordinal among unnamed features of the given `kind` in the chain
 *  ending at `targetId`. */
function nextOrdinalForKindOnChain(
  records: ReadonlyArray<{ id: string; kind: string; inputs?: Record<string, { kind: string; id?: string }>; metadata?: Record<string, unknown> }>,
  targetId: string,
  kind: string,
): number {
  const chain = chainRecordsFrom(records, targetId);
  let count = 0;
  for (const r of chain) {
    if (r.kind !== kind) continue;
    const meta = r.metadata as { name?: unknown } | undefined;
    if (typeof meta?.name === 'string') continue;  // named features don't consume an ordinal slot
    count++;
  }
  return count + 1;
}
