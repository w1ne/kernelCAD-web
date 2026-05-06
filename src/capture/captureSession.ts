import { createFeatureIdGenerator, type FeatureIdGenerator } from '../intent/featureId';
import type { FeatureRecord, ShapeTransform } from '../intent/featureRecord';
import type { FeatureKind, FeatureRef, Param, PlaneSpec } from '../intent/types';
import { Shape } from './proxy';
import { Sketch } from './sketch';
import { EDGE_QUERY_KEYS as EDGE_QUERY_KEYS_ARR } from '../backends/occt/queryKeys';
import { ParamTable, type SerializedParamTable } from '../runtime/paramTable';
import type { SoftWarning } from '../runtime/softWarning';
import { collectParamRefs } from '../runtime/resolveParams';
import { toParam } from '../runtime/editableHelpers';
import type { Editable } from '../runtime/paramRef';
import type { ShapeBackend } from '../backends/backend';
import { KernelError } from '../intent/kernelError';

export { validateFaceLabels } from './faceLabels';

/** Build an `inputs.face` FeatureRef from a FaceSelector. Mirrors the
 *  face-handling branches of `buildEdgeFeatureRef` but specialized to
 *  callers (hole/holes/cutout) that always want a face ref, never an
 *  edges ref. */
export function buildFaceInputRef(
  baseId: import('../intent/types').FeatureId,
  face: import('./proxy').FaceSelector | string,
): FeatureRef {
  // `{ face: <something> }` wrapper form
  if (typeof face === 'object' && face !== null && 'face' in face) {
    const faceVal = (face as { face: unknown }).face;
    if (typeof faceVal === 'string') {
      if (CANONICAL_FACES.has(faceVal)) {
        return {
          kind: 'face',
          featureId: baseId,
          ref: { kind: 'canonical', face: faceVal as 'top' },
        };
      }
      return {
        kind: 'face',
        featureId: baseId,
        ref: { kind: 'label', name: faceVal },
      };
    }
    return {
      kind: 'face',
      featureId: baseId,
      ref: { kind: 'query', query: faceVal as import('../backends/occt/edgeQueries').FaceQuery },
    };
  }
  // Bare FaceQuery object (no { face: ... } wrapper)
  return {
    kind: 'face',
    featureId: baseId,
    ref: { kind: 'query', query: face as import('../backends/occt/edgeQueries').FaceQuery },
  };
}

export interface FeatureSpec {
  kind: FeatureKind;
  params: Record<string, Param>;
  inputs: Record<string, FeatureRef>;
  metadata?: Record<string, unknown>;
}

/** Slice-3: input + result of `session.params.update`. See spec §E.6. */
export interface ParamUpdateEdit {
  name: string;
  value: number | boolean;
}

export interface ParamUpdateResult {
  /** The final shape after re-lower. */
  shape: ShapeBackend;
  /** Records re-lowered (their cached output became stale and was regenerated). */
  relowered: string[];
  /** Records skipped (their cached output reused; nothing they depend on changed). */
  skipped: string[];
  /** Soft warnings produced by this update call (gated-feature lineage refs etc.). */
  warnings: SoftWarning[];
}

export interface SerializedSession {
  schemaVersion?: number;
  params?: SerializedParamTable;
  records: readonly FeatureRecord[];
}

export class CaptureSession {
  private idGen: FeatureIdGenerator = createFeatureIdGenerator();
  private records: FeatureRecord[] = [];
  /** Slice-3: session-owned param table populated by `kcad.param()`/`kcad.params()`. */
  readonly paramTable: ParamTable = new ParamTable();
  /** Slice-3: append-only soft-warning log. Drained via `consumeWarnings()`. */
  readonly warnings: SoftWarning[] = [];
  /** Slice-3 Phase 4: current run's gated named features.
   *  Keyed by feature `metadata.name`; value is the param name that gated it. */
  readonly gatedFeatureNames: Map<string, string | undefined> = new Map();
  /** Slice-3: per-record cached lowered shape from the most recent build,
   *  populated by `proxy.ts` after `engine.run()` and reused by `params.update`
   *  to skip re-lowering records before the first affected one. */
  readonly cachedShapes: Map<string, ShapeBackend> = new Map();

  register(spec: FeatureSpec): FeatureRecord {
    const id = this.idGen.next(spec.kind);
    const r: FeatureRecord = {
      id,
      kind: spec.kind,
      params: spec.params,
      inputs: spec.inputs,
      transforms: [],
      suppressed: false,
      metadata: spec.metadata,
    };
    // Slice-3: populate metadata.paramRefs (the dependency index Phase 3
    // uses to find the first-affected record on `params.update`). Walks
    // params + metadata for any Param-shaped object with `paramRef` set.
    const refs = new Set<string>();
    for (const refName of collectParamRefs(r.params)) refs.add(refName);
    if (r.metadata !== undefined) {
      for (const refName of collectParamRefs(r.metadata)) refs.add(refName);
    }
    if (refs.size > 0) {
      r.metadata = { ...(r.metadata ?? {}), paramRefs: Array.from(refs) };
    }
    this.records.push(r);
    return r;
  }

  createShape(spec: FeatureSpec): Shape {
    const r = this.register(spec);
    return new Shape(r.id, this);
  }

  createSketch(spec: FeatureSpec): Sketch {
    const r = this.register(spec);
    return new Sketch(r.id, this);
  }

  appendTransform(id: string, t: ShapeTransform): void {
    // O(n) lookup is deliberate v0.1 simplicity; revisit if profiling shows it.
    const r = this.records.find(x => x.id === id);
    if (!r) throw new Error(`Feature '${id}' not registered`);
    r.transforms.push(t);
  }

  boolean(op: 'union' | 'difference' | 'intersection', base: Shape, cutters: Shape[]): Shape {
    // Validate all input shapes belong to this session.
    if (!this.records.some(r => r.id === base.id)) {
      throw new Error(`boolean: base shape '${base.id}' is not from this CaptureSession`);
    }
    for (let i = 0; i < cutters.length; i++) {
      if (!this.records.some(r => r.id === cutters[i].id)) {
        throw new Error(`boolean: cutter shape '${cutters[i].id}' is not from this CaptureSession`);
      }
    }
    const inputs: Record<string, FeatureRef> = {
      base: { kind: 'feature', id: base.id },
    };
    cutters.forEach((c, i) => {
      inputs[`cutter_${i}`] = { kind: 'feature', id: c.id };
    });
    const opLabel: Param = {
      expression: `'${op}'`, unit: 'unitless', evaluated: 0,
    };
    return this.createShape({
      kind: 'boolean',
      params: { op: opLabel },
      inputs,
    });
  }

  mirrorFeature(base: Shape, plane: PlaneSpec): Shape {
    if (!this.records.some(r => r.id === base.id)) {
      throw new Error(`mirror: base shape '${base.id}' is not from this CaptureSession`);
    }
    const inputs: Record<string, FeatureRef> = {
      base: { kind: 'feature', id: base.id },
    };
    return this.createShape({
      kind: 'mirror',
      params: {},
      inputs,
      metadata: { plane },
    });
  }

  edgeFeature(
    kind: 'fillet' | 'chamfer' | 'shell',
    base: Shape,
    valueParamName: 'radius' | 'distance' | 'thickness',
    value: Editable<number>,
    selector?: import('./proxy').EdgeSelector | { face: import('./proxy').FaceSelector | string },
  ): Shape {
    if (!this.records.some(r => r.id === base.id)) {
      throw new Error(`${kind}: base shape '${base.id}' is not from this CaptureSession`);
    }
    const inputs: Record<string, FeatureRef> = {
      base: { kind: 'feature', id: base.id },
    };

    if (selector !== undefined) {
      const ref = buildEdgeFeatureRef(base.id, selector);
      if (ref.key === 'face') inputs.face = ref.value;
      if (ref.key === 'edges') inputs.edges = ref.value;
    }

    return this.createShape({
      kind,
      params: { [valueParamName]: toParam(value, 'mm') },
      inputs,
    });
  }

  /**
   * Variable-radius / variable-distance edge feature (rc.11).
   * Each group's `edges` becomes a FeatureRef under `inputs.edge_group_${i}`;
   * the `radius` (or `distance`) is stored in `metadata.groups[i]`. The lowerer
   * resolves each group's edges via `pickEdges`-style dispatch and builds a
   * Replicad function-form RadiusConfig.
   */
  variableEdgeFeature(
    kind: 'fillet' | 'chamfer',
    base: Shape,
    valueKey: 'radius' | 'distance',
    groups: Array<{
      edges: import('./proxy').EdgeSelector;
      radius?: Editable<number>;
      distance?: Editable<number>;
    }>,
  ): Shape {
    if (!this.records.some(r => r.id === base.id)) {
      throw new Error(`${kind}: base shape '${base.id}' is not from this CaptureSession`);
    }
    const inputs: Record<string, FeatureRef> = {
      base: { kind: 'feature', id: base.id },
    };
    const metadataGroups: Array<{ radius?: number; distance?: number }> = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const ref = buildEdgeFeatureRef(base.id, g.edges);
      // The buildEdgeFeatureRef helper returns either { key: 'face', value }
      // (for canonical/label/query face wrappers) or { key: 'edges', value }
      // (for direct edge selectors). For variable-radius, we always store
      // under `edge_group_${i}` — the lowerer reads ref.kind to dispatch.
      inputs[`edge_group_${i}`] = ref.value;
      const value = g[valueKey];
      metadataGroups.push({ [valueKey]: value });
    }
    return this.createShape({
      kind,
      params: {
        // Empty params block — lowerer reads metadata.groups for radii/distances.
      },
      inputs,
      metadata: {
        variable: true,
        groups: metadataGroups,
      },
    });
  }

  getRecords(): readonly FeatureRecord[] {
    return this.records;
  }

  exportSession(): SerializedSession & { schemaVersion: 3; params: SerializedParamTable } {
    return {
      schemaVersion: 3,
      params: this.paramTable.serialize(),
      records: cloneJson(this.records),
    };
  }

  static importSession(data: SerializedSession): CaptureSession {
    const session = new CaptureSession();
    const schemaVersion = data.schemaVersion ?? 1;
    session.records = cloneJson(Array.from(data.records ?? []));
    session.paramTable.replaceWith(
      schemaVersion >= 3 ? ParamTable.deserialize(data.params) : new ParamTable(),
    );

    if (schemaVersion >= 3) {
      for (const record of session.records) {
        const refs = new Set<string>();
        for (const name of collectParamRefs(record.params)) refs.add(name);
        if (record.metadata !== undefined) {
          for (const name of collectParamRefs(record.metadata)) refs.add(name);
        }
        for (const name of refs) {
          if (!session.paramTable.has(name)) {
            throw new KernelError(
              'feature.invalid-args',
              `importSession: unknown param ref '${name}' in record '${record.id}'.`,
              record.id,
              `invalid-args.session.unknown-param-ref — unknown param ref '${name}' in record '${record.id}'`,
            );
          }
        }
      }
    }

    return session;
  }

  reset(): void {
    this.records = [];
    this.idGen.reset();
    this.paramTable.clear();
    this.warnings.length = 0;
    this.gatedFeatureNames.clear();
  }

  /** Slice-3: drain the warning log. Returns the accumulated warnings and
   *  clears the buffer. Used by tooling that wants a one-shot snapshot. */
  consumeWarnings(): SoftWarning[] {
    const out = this.warnings.slice();
    this.warnings.length = 0;
    return out;
  }

  /** Slice-3 namespace: edit-after-build operations.
   *  See spec §E.6, §F.1, §F.2. */
  readonly params = {
    list: (): import('../runtime/paramTable').ParamEntry[] => this.paramTable.list(),

    update: async (edits: ParamUpdateEdit[]): Promise<ParamUpdateResult> => this.runParamUpdate(edits),
  };

  /** Internal — implementation backing `params.update`. Validates atomically,
   *  applies edits, finds the first-affected record by index, re-lowers
   *  from there forward, reuses cached output for earlier records.
   *  See spec §E.6. */
  private async runParamUpdate(edits: ParamUpdateEdit[]): Promise<ParamUpdateResult> {
    // Step 1 — validate every edit BEFORE applying any (atomic).
    for (const edit of edits) {
      const entry = this.paramTable.get(edit.name); // throws unknown-name
      if (typeof edit.value !== entry.type) {
        throw new KernelError(
          'feature.invalid-args',
          `params.update: param '${edit.name}' is ${entry.type}, got ${typeof edit.value}.`,
          undefined,
          `invalid-args.param.type-mismatch — param '${edit.name}' is ${entry.type}, got ${typeof edit.value}`,
        );
      }
      if (entry.type === 'number' && entry.meta) {
        const v = edit.value as number;
        if (entry.meta.min !== undefined && v < entry.meta.min) {
          throw new KernelError(
            'feature.invalid-args',
            `params.update: param '${edit.name}' value ${v} below min ${entry.meta.min}.`,
            undefined,
            `invalid-args.param.value-out-of-range — param '${edit.name}' value ${v} below min ${entry.meta.min}`,
          );
        }
        if (entry.meta.max !== undefined && v > entry.meta.max) {
          throw new KernelError(
            'feature.invalid-args',
            `params.update: param '${edit.name}' value ${v} above max ${entry.meta.max}.`,
            undefined,
            `invalid-args.param.value-out-of-range — param '${edit.name}' value ${v} above max ${entry.meta.max}`,
          );
        }
      }
    }
    // Step 2 — apply edits atomically.
    const editedNames = new Set<string>();
    for (const edit of edits) {
      this.paramTable.set(edit.name, edit.value);
      editedNames.add(edit.name);
    }

    // Step 3 — find first affected record index. Records BEFORE it reuse
    // their cached lowered output; records AT-OR-AFTER re-lower fresh
    // (their inputs may have changed downstream of the edit).
    let firstAffected = -1;
    for (let i = 0; i < this.records.length; i++) {
      const refs = (this.records[i].metadata as { paramRefs?: string[] } | undefined)?.paramRefs ?? [];
      if (refs.some(n => editedNames.has(n))) {
        firstAffected = i;
        break;
      }
    }

    const relowered: string[] = [];
    const skipped: string[] = [];

    // Build the seedShapes map of cached outputs for records BEFORE firstAffected.
    const seedShapes = new Map<string, ShapeBackend>();
    if (firstAffected === -1) {
      // No record references any edited name — nothing to re-lower.
      // Still need to provide a shape — return last record's cached shape if any.
      for (const r of this.records) {
        skipped.push(r.id);
        const cached = this.cachedShapes.get(r.id);
        if (cached) seedShapes.set(r.id, cached);
      }
    } else {
      for (let i = 0; i < this.records.length; i++) {
        const r = this.records[i];
        if (i < firstAffected) {
          skipped.push(r.id);
          const cached = this.cachedShapes.get(r.id);
          if (cached) seedShapes.set(r.id, cached);
        } else {
          relowered.push(r.id);
        }
      }
    }

    // Step 4 — recompute. Use lazy import to avoid a top-level circular dep
    // (proxy.ts uses the same lazy-import trick).
    const { RecomputeEngine } = await import('../compute/recomputeEngine');
    const { OcctLowerer } = await import('../backends/occt/occtLowerer');
    const { initOcct } = await import('../backends/occt/occtBackend');
    await initOcct();
    const engine = new RecomputeEngine(new OcctLowerer());

    // Capture warnings emitted during this update call (Phase 4 wires
    // emissions; here we just snapshot before/after to compute the delta).
    const warningsBefore = this.warnings.length;
    const result = await engine.run(this.records, {
      paramTable: this.paramTable,
      seedShapes,
      warningSink: (warning) => this.warnings.push(warning),
      warningPhase: 'update',
      gatedFeatureNames: this.gatedFeatureNames,
    });
    const callWarnings = this.warnings.slice(warningsBefore);

    // Refresh the per-record cache with the latest lowered outputs.
    for (const [id, shape] of result.shapes) {
      this.cachedShapes.set(id, shape);
    }

    // Pick the final-shape: the last (chain-tail) record's lowered shape.
    const tailId = this.records.length > 0 ? this.records[this.records.length - 1].id : undefined;
    const tailShape = tailId ? result.shapes.get(tailId) : undefined;
    if (!tailShape) {
      throw new KernelError(
        'recompute.lowering.exception',
        'params.update: no shape produced for the chain tail; check upstream diagnostics.',
        tailId,
      );
    }

    return {
      shape: tailShape,
      relowered,
      skipped,
      warnings: callWarnings,
    };
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const CANONICAL_FACES = new Set(['top', 'bottom', 'left', 'right', 'front', 'back']);

const EDGE_QUERY_KEYS = new Set<string>(EDGE_QUERY_KEYS_ARR);

/**
 * Translate the user-facing EdgeSelector (or face wrapper) into either an
 * `inputs.face` or `inputs.edges` FeatureRef. The lowerer (Task 3) dispatches
 * on the resulting ref kind.
 *
 * Dispatch order:
 *   1. { face: <canonical> } → FaceRef.canonical (existing path; back-compat)
 *   2. { face: <other-string> } → FaceRef.label (resolved at lowering by Task 4)
 *   3. { face: <FaceQuery object> } → FaceRef.query
 *   4. EdgeSegment (object with `id` AND `midpoint`) → EdgeRef.segment
 *   5. EdgeSegment[] (array) → EdgeRef.segments
 *   6. Otherwise (object with EdgeQuery keys) → EdgeRef.query
 */
function buildEdgeFeatureRef(
  baseId: string,
  selector: import('./proxy').EdgeSelector | { face: import('./proxy').FaceSelector | string },
): { key: 'face' | 'edges'; value: FeatureRef } {
  // Case 1-3: { face: ... } wrapper. We detect this by: object with `face`
  // property and NOT having the EdgeSegment full-schema markers.
  if (typeof selector === 'object' && selector !== null && 'face' in selector &&
      !('id' in selector && 'midpoint' in selector && 'direction' in selector && 'curveType' in selector)) {
    const faceVal = (selector as { face: unknown }).face;
    if (typeof faceVal === 'string') {
      if (CANONICAL_FACES.has(faceVal)) {
        return {
          key: 'face',
          value: {
            kind: 'face',
            featureId: baseId,
            ref: { kind: 'canonical', face: faceVal as 'top' },
          },
        };
      }
      // Non-canonical string → label
      return {
        key: 'face',
        value: {
          kind: 'face',
          featureId: baseId,
          ref: { kind: 'label', name: faceVal },
        },
      };
    }
    // Object form → FaceQuery
    return {
      key: 'face',
      value: {
        kind: 'face',
        featureId: baseId,
        ref: { kind: 'query', query: faceVal as import('../backends/occt/edgeQueries').FaceQuery },
      },
    };
  }
  // Case 4: EdgeSegment (object with id + midpoint + direction + curveType — full schema)
  if (typeof selector === 'object' && selector !== null &&
      'id' in selector && 'midpoint' in selector && 'direction' in selector && 'curveType' in selector) {
    return {
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: baseId,
        ref: { kind: 'segment', segmentId: (selector as { id: string }).id },
      },
    };
  }
  // Case 5: EdgeSegment[]
  if (Array.isArray(selector)) {
    const segmentIds = selector.map(s => s.id);
    return {
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: baseId,
        ref: { kind: 'segments', segmentIds },
      },
    };
  }
  // Case 6: EdgeQuery — verify all keys are in the whitelist. If any keys are
  // unknown we still build a query ref so the lowerer can diagnose with the
  // `feature.edge-feature.invalid-query` code; that keeps the error path on
  // the lowering side where diagnostics are aggregated.
  if (typeof selector === 'object' && selector !== null) {
    const keys = Object.keys(selector);
    if (keys.length > 0 && keys.every(k => EDGE_QUERY_KEYS.has(k))) {
      return {
        key: 'edges',
        value: {
          kind: 'edge',
          featureId: baseId,
          ref: { kind: 'query', query: selector as import('../backends/occt/edgeQueries').EdgeQuery },
        },
      };
    }
    // Unknown shape — store as a query so the lowerer can diagnose
    // `feature.edge-feature.invalid-query` against it.
    return {
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: baseId,
        ref: { kind: 'query', query: selector as import('../backends/occt/edgeQueries').EdgeQuery },
      },
    };
  }
  // Empty or non-object selector — fall through to the existing default.
  return {
    key: 'edges',
    value: {
      kind: 'edge',
      featureId: baseId,
      ref: { kind: 'query', query: selector as unknown as import('../backends/occt/edgeQueries').EdgeQuery },
    },
  };
}
