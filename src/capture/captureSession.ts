import { createFeatureIdGenerator, type FeatureIdGenerator } from '../intent/featureId';
import type { FeatureRecord, ShapeTransform } from '../intent/featureRecord';
import type { FeatureKind, FeatureRef, Param } from '../intent/types';
import { Shape } from './proxy';
import { Sketch } from './sketch';
import { EDGE_QUERY_KEYS as EDGE_QUERY_KEYS_ARR } from '../backends/occt/queryKeys';

export interface FeatureSpec {
  kind: FeatureKind;
  params: Record<string, Param>;
  inputs: Record<string, FeatureRef>;
  metadata?: Record<string, unknown>;
}

export class CaptureSession {
  private idGen: FeatureIdGenerator = createFeatureIdGenerator();
  private records: FeatureRecord[] = [];

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

  edgeFeature(
    kind: 'fillet' | 'chamfer' | 'shell',
    base: Shape,
    valueParamName: 'radius' | 'distance' | 'thickness',
    value: number,
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

    const valueParam: Param = {
      expression: String(value), unit: 'mm', evaluated: value,
    };
    return this.createShape({
      kind,
      params: { [valueParamName]: valueParam },
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
    groups: Array<{ edges: import('./proxy').EdgeSelector; radius?: number; distance?: number }>,
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

  reset(): void {
    this.records = [];
    this.idGen.reset();
  }
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
