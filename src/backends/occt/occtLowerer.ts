import type {
  FeatureLowerer,
  BackendTarget,
  ResolvedInputs,
  LowerResult,
  ShapeBackend,
} from '../backend';
import type { FeatureRecord } from '../../intent/featureRecord';
import type { FeatureKind, PatternSpec, PlaneSpec, Vec3, Vec3Param } from '../../intent/types';
import { isValidPlaneSpec } from '../../intent/types';
import { KernelError } from '../../intent/kernelError';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import { OcctBackend } from './occtBackend';
import { pickEdges, pickFace } from './edgeSelection';
import { computeDihedralPublic } from './edgeQueries';
import * as replicad from 'replicad';
import {
  cutWithHistory,
  fuseWithHistory,
  intersectWithHistory,
  mergeBooleanHistory,
} from './historyAwareBooleans';
import {
  filletWithHistory,
  chamferWithHistory,
  shellWithHistory,
  mergeEdgeFeatureHistory,
  type EdgeRefForFilleting,
} from './historyAwareEdgeFeatures';
import { propagateTransformHistory } from '../../naming/evolutionRecord';
import type { HistoryMap, FaceLineage } from '../../naming/evolutionRecord';

// ---------------------------------------------------------------------------
// Shared helpers: Vec3Param resolution + axis normalization
// ---------------------------------------------------------------------------

/** Read a Vec3Param to a numeric Vec3 by picking the `evaluated` field of each
 *  component. The recompute engine pre-resolves every Param-shaped node in the
 *  record (params + metadata + transforms) against the live ParamTable before
 *  invoking the lowerer, so `evaluated` already reflects the current value
 *  for any ParamRef-bearing component. Lowerers therefore never touch the
 *  ParamTable directly — they only read `.evaluated`. */
function readVec3Param(v: Vec3Param): [number, number, number] {
  return [v.x.evaluated, v.y.evaluated, v.z.evaluated];
}

/** Normalize an axis vector to unit length. Throws `feature.invalid-args` with
 *  hint `invalid-args.axis.zero` when the resolved vector is zero or contains
 *  non-finite components. The throw lets a ParamRef edit that produces a
 *  zero-axis surface as a structured diagnostic via the dispatcher's
 *  exception path rather than producing a silently-broken transform. */
export function normalizeAxis(v: [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len === 0 || !Number.isFinite(len)) {
    throw new KernelError(
      'feature.invalid-args',
      `axis must be non-zero; resolved to [${v[0]}, ${v[1]}, ${v[2]}].`,
      undefined,
      'invalid-args.axis.zero — provide a non-zero direction; ParamRefs may have resolved to zero.',
    );
  }
  return [v[0] / len, v[1] / len, v[2] / len];
}

// ---------------------------------------------------------------------------
// Shared helper: variable-radius fillet / variable-distance chamfer
// ---------------------------------------------------------------------------

type VariableEdgeKind = 'fillet' | 'chamfer';

type ApplyVariableEdgeFeatureResult =
  | { ok: true; shape: OcctBackend; diagnostics: CompilerDiagnostic[] }
  | { ok: false; diagnostics: CompilerDiagnostic[] };

/**
 * Apply a variable-radius fillet or variable-distance chamfer.
 *
 * Both forms share the same plumbing: per-group synthetic FeatureRecord
 * construction, edge resolution via pickEdges, validation of the per-group
 * scalar (radius for fillet, distance for chamfer), and backend dispatch
 * to the corresponding *Variable method.
 *
 * Callers are the `case 'fillet':` and `case 'chamfer':` arms of the lower
 * function; both pass `kind` to disambiguate the value key, the backend
 * method, and the diagnostic-code prefix.
 *
 * Returns either `{ shape, diagnostics }` (success) or `{ diagnostics }`
 * (failure — caller falls through to its own error handling).
 */
export function applyVariableEdgeFeature(
  kind: VariableEdgeKind,
  base: OcctBackend,
  feature: FeatureRecord,
  allRecords: readonly FeatureRecord[] | undefined,
): ApplyVariableEdgeFeatureResult {
  const diagnostics: CompilerDiagnostic[] = [];

  const meta = feature.metadata as {
    variable?: boolean;
    groups?: Array<{ radius?: number; distance?: number }>;
  } | undefined;

  const groups = meta?.groups ?? [];
  const valueKey: 'radius' | 'distance' = kind === 'fillet' ? 'radius' : 'distance';

  if (groups.length === 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: feature.id,
      severity: 'error',
      message: kind === 'fillet'
        ? `variable-radius fillet has no groups.`
        : `variable-distance chamfer has no groups.`,
      hint: kind === 'fillet'
        ? 'Pass [{ edges: ..., radius: ... }, ...] with one entry per intended blend region.'
        : 'Pass [{ edges: ..., distance: ... }, ...] with one entry per intended bevel region.',
    });
    return { ok: false, diagnostics };
  }

  // N3 fix: runtime-narrow inputs.base to a 'feature' ref before extracting id.
  const baseRef = feature.inputs.base as import('../../intent/types').FeatureRef | undefined;
  if (!baseRef || (baseRef as { kind?: string }).kind !== 'feature') {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: feature.id,
      severity: 'error',
      message: `${kind} input 'base' must be a feature ref; got ${JSON.stringify(baseRef)}.`,
      hint: 'Chain the variable-radius/distance feature onto a solid shape.',
    });
    return { ok: false, diagnostics };
  }
  const narrowedBase: import('../../intent/types').FeatureRef = baseRef as { kind: 'feature'; id: import('../../intent/types').FeatureId };

  // Per-group resolution loop. Build a synthetic one-input FeatureRecord
  // per group so we can reuse pickEdges' canonical/label/query/segments
  // dispatch — same behavior as single-radius edge selection.
  const filletGroups: Array<{ edges: import('replicad').Edge[]; radius: number }> = [];
  const chamferGroups: Array<{ edges: import('replicad').Edge[]; distance: number }> = [];

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const value = g[valueKey];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: feature.id,
        severity: 'error',
        message: `${kind} group ${i} has invalid ${valueKey} ${value}; must be a positive finite number.`,
        hint: `Each group needs a positive finite ${valueKey}.`,
      });
      return { ok: false, diagnostics };
    }

    // I1 fix: replace silent-drop conditional spreads with an explicit kind switch.
    const ref = feature.inputs[`edge_group_${i}`] as import('../../intent/types').FeatureRef | undefined;
    const synthInputs: Record<string, import('../../intent/types').FeatureRef> = {
      base: narrowedBase,
    };
    if (ref) {
      switch (ref.kind) {
        case 'edge':
          synthInputs.edges = ref;
          break;
        case 'face':
          synthInputs.face = ref;
          break;
        case 'feature':
        case 'vertex': {
          // Unexpected ref kind for an edge_group input.
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: feature.id,
            severity: 'error',
            message: `${kind} group ${i} edge_group_${i} ref kind '${ref.kind}' is not supported (expected 'edge' or 'face').`,
            hint: 'Use an EdgeSelector or canonical face name in the edge_group slot.',
          });
          return { ok: false, diagnostics };
        }
        default: {
          // Exhaustiveness guard: catches any future FeatureRef kinds added to the union.
          const _exhaustive: never = ref;
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: feature.id,
            severity: 'error',
            message: `${kind} group ${i} edge_group_${i} ref kind '${(_exhaustive as { kind?: string }).kind ?? '<unknown>'}' is not supported (expected 'edge' or 'face').`,
            hint: 'Use an EdgeSelector or canonical face name in the edge_group slot.',
          });
          return { ok: false, diagnostics };
        }
      }
    }

    // Synthesize a one-input record so pickEdges can resolve it.
    const synth: FeatureRecord = {
      id: feature.id,
      kind: feature.kind,
      params: {},
      inputs: synthInputs,
      transforms: [],
      suppressed: false,
    };

    const edgesResult = pickEdges(synth, base, allRecords);
    if ('error' in edgesResult) {
      // Forward the underlying selection diagnostic verbatim — its code
      // (feature.face-ref.* / feature.selection.*) is more specific than a
      // generic invalid-args.
      diagnostics.push({
        ...edgesResult.error,
        message: `${kind} group ${i}: ${edgesResult.error.message}`,
      });
      return { ok: false, diagnostics };
    }

    if (kind === 'fillet') {
      filletGroups.push({ edges: edgesResult, radius: value });
    } else {
      chamferGroups.push({ edges: edgesResult, distance: value });
    }
  }

  let shape: OcctBackend;
  try {
    shape = kind === 'fillet'
      ? base.filletVariable(filletGroups)
      : base.chamferVariable(chamferGroups);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: feature.id,
      severity: 'error',
      message: kind === 'fillet'
        ? `OCCT variable fillet failed: ${msg}`
        : `OCCT variable chamfer failed: ${msg}`,
      hint: kind === 'fillet'
        ? 'OCCT could not apply that variable fillet — try smaller per-group radii or a coarser group split.'
        : 'OCCT could not apply that variable chamfer — try smaller per-group distances or a coarser group split.',
    });
    return { ok: false, diagnostics };
  }

  return { ok: true, shape, diagnostics };
}

/**
 * Lowers `FeatureRecord`s to `OcctBackend` shapes.
 *
 * Owns dispatch from the intent IR (`box`, `cylinder`, `sphere`, `extrude`,
 * `revolve`, `boolean`) to OCCT primitives, then applies any post-hoc
 * `record.transforms` in order. Boolean ops walk `inputs.byKey`: `base` is
 * the LHS, all keys starting with `cutter_` (lexicographically sorted) are
 * the operand sequence applied in left-to-right order.
 *
 * Operations not supported in v0.1 produce a single error `CompilerDiagnostic`
 * rather than throwing, so callers can collect diagnostics for a whole tree.
 */
export class OcctLowerer implements FeatureLowerer {
  readonly target: BackendTarget = 'export-occt';
  readonly supports: ReadonlySet<FeatureKind> = new Set<FeatureKind>([
    'box',
    'cylinder',
    'sphere',
    'extrude',
    'revolve',
    'boolean',
    'fillet',
    'chamfer',
    'shell',
    'sketch',    // NEW
    'sweep',     // NEW (v0.13.0-rc.8)
    'loft',      // NEW (v0.13.0-rc.10)
    'mirror',    // NEW (v0.13.0-rc.13)
    'pattern',
    'assemblyPart',
    'assemblyJoint',
    'assemblyConnect',
    'assemblyModel',
  ]);

  async lower(r: FeatureRecord, inputs: ResolvedInputs): Promise<LowerResult> {
    const diagnostics: CompilerDiagnostic[] = [];
    let shape: ShapeBackend;

    // Record table for label-resolution path; threaded through pickEdges/pickFace.
    const allRecords = inputs.records;

    switch (r.kind) {
      case 'box': {
        const x = r.params.x.evaluated;
        const y = r.params.y.evaluated;
        const z = r.params.z.evaluated;
        const centered = (r.params.centered?.evaluated ?? 0) > 0.5;
        const rawBox = OcctBackend.box(x, y, z, centered);
        const boxSeedMap: HistoryMap = new Map();
        const boxFaceNames = ['top', 'bottom', 'left', 'right', 'front', 'back'] as const;
        for (const name of boxFaceNames) {
          try {
            const hash = rawBox.findCanonicalFaceHash(name);
            const lineage: FaceLineage = { rootHash: hash, canonicalName: name, rootFeatureId: r.id };
            boxSeedMap.set(hash, lineage);
          } catch {
            // defensive: shouldn't happen for box, but skip silently if it does
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const boxWrapped = (rawBox as OcctBackend).getReplicadShape() as any;
        shape = new OcctBackend(boxWrapped, 'box', boxSeedMap);
        break;
      }
      case 'cylinder': {
        const rawCyl = OcctBackend.cylinder(r.params.h.evaluated, r.params.r.evaluated);
        const cylSeedMap: HistoryMap = new Map();
        const cylinderFaceNames = ['top', 'bottom'] as const;
        for (const name of cylinderFaceNames) {
          try {
            const hash = rawCyl.findCanonicalFaceHash(name);
            cylSeedMap.set(hash, { rootHash: hash, canonicalName: name, rootFeatureId: r.id });
          } catch {
            // defensive: skip if face not found
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cylWrapped = (rawCyl as OcctBackend).getReplicadShape() as any;
        shape = new OcctBackend(cylWrapped, 'cylinder', cylSeedMap);
        break;
      }
      case 'sphere': {
        // Sphere has no canonical planar face names — leave historyMap undefined.
        // Falls back to the legacy !base.kind path in edgeSelection (correct behaviour).
        shape = OcctBackend.sphere(r.params.r.evaluated);
        break;
      }
      case 'sketch': {
        const commands = (r.metadata as { commands?: unknown } | undefined)?.commands;
        if (!Array.isArray(commands) || commands.length === 0) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `sketch requires metadata.commands: SketchCommand[].`,
            hint: 'Construct sketches via path().moveTo(...).lineTo(...).close().',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        try {
          shape = OcctBackend.fromSketchCommands(commands as import('../../capture/sketch').SketchCommand[]);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // Narrow degenerate-arc cases (radiusArc-only for now) to the kept
          // specific code; everything else collapses into the generic
          // kernel-failed bucket.
          const isDegenerateArc = msg.startsWith('radiusArc:');
          const code = isDegenerateArc ? 'feature.sketch.degenerate-arc' : 'feature.kernel-failed';
          const hint = isDegenerateArc
            ? 'The arc segment is degenerate. Try a larger radius, different endpoints, or another arc constructor (threePointsArc/sagittaArc).'
            : 'Sketch construction failed — read the diagnostic message for the underlying error.';
          diagnostics.push({
            target: 'export-occt',
            code,
            featureId: r.id,
            severity: 'error',
            message: `sketch construction failed: ${msg}`,
            hint,
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        break;
      }
      case 'extrude': {
        // Profile kind is a quoted string in IR (e.g. "'rect'", "'circle'").
        const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
        if (profileKind === 'rect') {
          const height = r.params.height.evaluated;
          shape = OcctBackend.extrudeRect(
            r.params.w.evaluated,
            r.params.h.evaluated,
            height,
          );
        } else if (profileKind === 'circle') {
          const height = r.params.height.evaluated;
          shape = OcctBackend.extrudeCircle(r.params.r.evaluated, height);
        } else if (profileKind === 'polygon') {
          const depth = r.params.depth.evaluated;
          const points = (r.metadata as { points?: unknown } | undefined)?.points;
          if (!Array.isArray(points) || points.length < 3 ||
              !points.every(p => Array.isArray(p) && p.length === 2 &&
                                  typeof p[0] === 'number' && typeof p[1] === 'number')) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `extrude polygon requires metadata.points: [number, number][] with at least 3 points.`,
              hint: 'Pass at least 3 [x, y] number pairs as the polygon points.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          try {
            shape = OcctBackend.extrudePolygon(points as [number, number][], depth);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT extrude failed: ${msg}`,
              hint: 'OCCT could not extrude — check for self-intersecting profile, inconsistent polygon winding, or rounded-rect radius exceeding half of width/height.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else if (profileKind === 'rounded-rect') {
          const width = r.params.width?.evaluated;
          const height = r.params.height?.evaluated;
          const radius = r.params.radius?.evaluated;
          const depth = r.params.depth?.evaluated;
          if (width === undefined || height === undefined || radius === undefined || depth === undefined) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `extrude rounded-rect requires width, height, radius, and depth params (positive finite numbers).`,
              hint: 'Pass width, height, radius, and depth as positive finite numbers.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          try {
            shape = OcctBackend.extrudeRoundedRect(width, height, radius, depth);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT extrude failed: ${msg}`,
              hint: 'OCCT could not extrude — check for self-intersecting profile, inconsistent polygon winding, or rounded-rect radius exceeding half of width/height.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else if (profileKind === 'sketch') {
          const depth = r.params.depth.evaluated;
          const sketchInput = inputs.byKey.sketch as OcctBackend | undefined;
          if (!sketchInput) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `extrude with profile='sketch' requires an input named 'sketch'.`,
              hint: 'Chain extrude from a path()...close() sketch.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          try {
            shape = OcctBackend.extrudeFromSketch(sketchInput, depth);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT extrude failed: ${msg}`,
              hint: 'OCCT could not extrude — check for self-intersecting profile, inconsistent polygon winding, or rounded-rect radius exceeding half of width/height.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else {
          return {
            shape: undefined as unknown as ShapeBackend,
            diagnostics: [
              {
                target: this.target,
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `extrude profile kind '${profileKind}' not supported. Use 'rect', 'circle', 'polygon', 'rounded-rect', or 'sketch'.`,
                hint: "Use a supported profile kind: 'rect', 'circle', 'polygon', 'rounded-rect', or 'sketch'.",
              },
            ],
          };
        }
        break;
      }
      case 'revolve': {
        const sketchInput = inputs.byKey.sketch as OcctBackend | undefined;
        if (!sketchInput) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `revolve requires an input named 'sketch'.`,
            hint: 'Chain revolve from a path()...close() sketch.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const commands = sketchInput.getSketchCommands();
        if (!commands) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `revolve sketch input has no command history.`,
            hint: 'Chain revolve from a path()...close() sketch (the sketch must carry its command history).',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        // Empty profile: only moveTo + close (or even less). No segments means
        // no area to revolve.
        const segmentCount = commands.filter(c => c.kind === 'lineTo' || c.kind === 'tangentArc').length;
        if (segmentCount === 0) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `revolve profile has no line/arc segments — area is zero.`,
            hint: 'Add at least one lineTo or arc segment to the path before close.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        // Axis-cross check: any point with x < 0 means the profile spans the
        // rotation axis, which yields a self-intersecting revolve.
        const crossing = commands.find(c => (c.kind === 'moveTo' || c.kind === 'lineTo' || c.kind === 'tangentArc') && c.x.evaluated < 0);
        if (crossing) {
          const xv = (crossing as { x: { evaluated: number } }).x.evaluated;
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.revolve.crosses-axis',
            featureId: r.id,
            severity: 'error',
            message: `revolve profile point (x=${xv}) crosses rotation axis. All points must satisfy x >= 0.`,
            hint: 'A revolve profile must stay on one side of the rotation axis. Clamp all path coordinates to x >= 0.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        try {
          shape = OcctBackend.revolveFromSketch(sketchInput);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT revolve failed: ${msg}`,
            hint: 'OCCT could not revolve — the profile may self-intersect or be degenerate.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        break;
      }
      case 'sweep': {
        const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
        if (profileKind === 'sketch') {
          const sketchInput = inputs.byKey.sketch as OcctBackend | undefined;
          if (!sketchInput) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `sweep with profile='sketch' requires an input named 'sketch'.`,
              hint: 'Chain sweep from a path()...close() sketch.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          const rail = (r.metadata as { rail?: unknown } | undefined)?.rail;
          if (!Array.isArray(rail) || rail.length < 2) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `sweep rail must be an array of at least 2 points; got ${Array.isArray(rail) ? `length ${rail.length}` : 'non-array'}.`,
              hint: 'Pass a rail array of [x, y, z] tuples (≥2 points). Use helix(...) for helical rails.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          if (rail.length > 5000) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `sweep rail has ${rail.length} points (cap is 5000). For helices, reduce \`pointsPerTurn\` or \`turns\`. For polylines, simplify the path.`,
              hint: 'Reduce rail point count to ≤ 5000. For helices, lower pointsPerTurn or turns.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          // Validate every entry is [number, number, number] of finite numbers.
          for (let i = 0; i < rail.length; i++) {
            const p = rail[i];
            if (!Array.isArray(p) || p.length !== 3 ||
                !p.every(n => typeof n === 'number' && Number.isFinite(n))) {
              diagnostics.push({
                target: 'export-occt',
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `sweep rail point at index ${i} must be a [x, y, z] tuple of finite numbers; got ${JSON.stringify(p)}.`,
                hint: 'Each rail point must be a [x, y, z] tuple of finite numbers.',
              });
              return { shape: undefined as unknown as ShapeBackend, diagnostics };
            }
          }
          const frenet = (r.params.frenet?.evaluated ?? 0) > 0.5;
          try {
            shape = OcctBackend.sweepFromSketch(
              sketchInput,
              rail as [number, number, number][],
              { frenet },
            );
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            // All sweep failure modes (multi-face profile, profile too large,
            // spine self-intersection, generic) collapse into kernel-failed.
            // The message preserves the underlying cause string from OCCT/
            // Replicad; the hint is generic to the sweep recovery class.
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT sweep failed: ${msg}`,
              hint: 'OCCT could not sweep — common causes: profile larger than rail curvature, sharp corners causing self-intersection, multi-face profile, or non-planar profile.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else {
          return {
            shape: undefined as unknown as ShapeBackend,
            diagnostics: [
              {
                target: this.target,
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `sweep profile kind '${profileKind}' not supported. Use 'sketch'.`,
                hint: "Use profileKind 'sketch' for sweep.",
              },
            ],
          };
        }
        break;
      }
      case 'loft': {
        const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
        if (profileKind === 'sketch') {
          const sectionCount = r.params.sectionCount?.evaluated ?? 0;
          if (sectionCount < 2) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `loft needs at least 2 sketches (sectionCount=${sectionCount}).`,
              hint: 'Pass at least 2 sketches; e.g. s1.loft(s2).',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          // Collect sketch_0 through sketch_{N-1} from inputs.byKey
          const sketches: OcctBackend[] = [];
          for (let i = 0; i < sectionCount; i++) {
            const s = inputs.byKey[`sketch_${i}`] as OcctBackend | undefined;
            if (!s) {
              diagnostics.push({
                target: 'export-occt',
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `loft missing input sketch_${i} — upstream sketch did not lower successfully.`,
                hint: 'Loft requires every upstream sketch input to lower successfully — check upstream sketch diagnostics first.',
              });
              return { shape: undefined as unknown as ShapeBackend, diagnostics };
            }
            sketches.push(s);
          }
          // Resolve planes: explicit metadata.planes wins; else z-stack with spacing.
          const meta = r.metadata as {
            planes?: Array<{ plane: 'XY' | 'YZ' | 'XZ'; origin: [number, number, number] }>;
            startPoint?: [number, number, number];
            endPoint?: [number, number, number];
          } | undefined;
          let planes: Array<{ plane: 'XY' | 'YZ' | 'XZ'; origin: [number, number, number] }>;
          if (Array.isArray(meta?.planes)) {
            if (meta.planes.length !== sectionCount) {
              diagnostics.push({
                target: 'export-occt',
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `loft planes length ${meta.planes.length} does not match section count ${sectionCount}.`,
                hint: 'If you pass opts.planes, its length must equal the section count. Or omit planes and use opts.spacing.',
              });
              return { shape: undefined as unknown as ShapeBackend, diagnostics };
            }
            planes = meta.planes;
          } else {
            const spacing = r.params.spacing?.evaluated ?? 10;
            planes = sketches.map((_, i) => ({
              plane: 'XY' as const,
              origin: [0, 0, i * spacing] as [number, number, number],
            }));
          }
          const ruled = (r.params.ruled?.evaluated ?? 0) > 0.5;
          try {
            shape = OcctBackend.loftFromSketches(sketches, planes, {
              ruled,
              startPoint: meta?.startPoint,
              endPoint: meta?.endPoint,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT loft failed: ${msg}`,
              hint: 'OCCT could not loft these sections — try ruled: true for sharp transitions, or use sections with similar vertex counts and orientation.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else {
          return {
            shape: undefined as unknown as ShapeBackend,
            diagnostics: [
              {
                target: this.target,
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `loft profile kind '${profileKind}' not supported. Use 'sketch'.`,
                hint: "Use profileKind 'sketch' for loft.",
              },
            ],
          };
        }
        break;
      }
      case 'boolean': {
        // Op expression is a quoted string in IR (e.g. "'difference'").
        const op = String(r.params.op.expression).replace(/'/g, '');
        const base = inputs.byKey['base'];
        if (!base) throw new Error(`Boolean ${r.id} missing 'base' input`);
        let acc: OcctBackend = base as OcctBackend;
        const cutters = Object.entries(inputs.byKey)
          .filter(([k]) => k.startsWith('cutter_'))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v as OcctBackend);
        const opFn =
          op === 'difference' ? cutWithHistory :
          op === 'union' ? fuseWithHistory :
          op === 'intersection' ? intersectWithHistory :
          null;
        if (!opFn) throw new Error(`Unknown boolean op: ${op}`);
        for (const c of cutters) {
          const result = opFn(acc, c);
          const newMap = mergeBooleanHistory(acc.historyMap, c.historyMap, result);
          // Wrap the result TopoDS_Shape back into a Replicad Shape3D using
          // replicad.cast(), which downcasts the raw shape to the correct
          // OCCT subtype (Solid or Compound) and wraps it in the matching
          // Replicad class. The cast result is AnyShape; boolean ops always
          // yield a 3D solid or compound, so the cast to Shape3D is safe.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wrapped = replicad.cast(result.shape as any) as replicad.Shape3D;
          acc = new OcctBackend(wrapped, undefined, newMap);
        }
        shape = acc;
        break;
      }
      case 'fillet': {
        const base = inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `fillet requires an input named 'base'.`,
            hint: 'Chain fillet onto a solid shape, e.g. box(10, 10, 10).fillet(1).',
          });
          throw new Error('fillet: no base shape');
        }
        // rc.12: variable-radius form is delegated to applyVariableEdgeFeature.
        const meta = r.metadata as { variable?: boolean } | undefined;
        if (meta?.variable === true) {
          const result = applyVariableEdgeFeature('fillet', base, r, allRecords);
          diagnostics.push(...result.diagnostics);
          if (!result.ok) {
            return { shape: base, diagnostics };
          }
          shape = result.shape;
          break;
        }
        const radius = r.params.radius?.evaluated;
        if (radius === undefined) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `fillet requires a 'radius' parameter.`,
            hint: 'Pass a positive finite number as the first argument, e.g. .fillet(2).',
          });
          throw new Error('fillet: no radius');
        }
        const edgesResult = pickEdges(r, base, allRecords);
        if ('error' in edgesResult) {
          diagnostics.push(edgesResult.error);
          return { shape: base, diagnostics };
        }
        // Filter to sharp edges only — BRepFilletAPI_MakeFillet requires convex/concave
        // (non-smooth) edges. Smooth edges (G1, dihedral ≈ 180°) will cause OCCT to throw.
        // If all edges are already smooth (e.g., iterating a fillet on a face that was already
        // filleted), treat as a no-op success so the user intent ("round this face") is met.
        const shapeForDihedral = base.getReplicadShape() as unknown as { faces: import('replicad').Face[] };
        const SMOOTH_THRESHOLD = 5; // degrees; edges with dihedral > (180 - threshold) are smooth
        let nullCount = 0;
        const sharpEdges = (edgesResult as import('replicad').Edge[]).filter((e) => {
          const d = computeDihedralPublic(shapeForDihedral, e);
          // null means the dihedral could not be computed — either the edge has only one
          // adjacent face, isSameEdge found no match, or normalAt threw a non-Error C++
          // exception (typical for cylinder cap edges sitting on the parametric U-seam
          // of a CYLINDRE/CONE/SPHERE face). Track and inspect after the filter.
          if (d === null) {
            nullCount++;
            return false;
          }
          return d.angleDeg < 180 - SMOOTH_THRESHOLD;
        });
        let edgesForFillet: import('replicad').Edge[];
        if (sharpEdges.length === 0) {
          if (nullCount === 0) {
            // Genuinely all G1-smooth — fillet already satisfied, return shape unchanged.
            shape = base;
            break;
          }
          // All edges had unknown dihedral (e.g., cylinder cap edges on the
          // parametric seam where normalAt throws). OCCT can fillet circular
          // cap edges directly — trust it with the original edge set. The
          // non-Error catch below handles any genuine OCCT rejection cleanly.
          edgesForFillet = edgesResult as import('replicad').Edge[];
        } else {
          edgesForFillet = sharpEdges;
        }
        try {
          // Convert replicad Edge[] → EdgeRefForFilleting[] by hashing each
          // edge's underlying TopoDS_Edge handle.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const edgeRefs: EdgeRefForFilleting[] = edgesForFillet.map((e: any) => ({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hash: ((e.wrapped ?? e._wrapped ?? e) as any).HashCode(2147483647).toString(16),
          }));
          const filletResult = filletWithHistory(base, edgeRefs, radius);
          const newMap = mergeEdgeFeatureHistory(base.historyMap, filletResult);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wrapped = replicad.cast(filletResult.shape as any) as replicad.Shape3D;
          shape = new OcctBackend(wrapped, undefined, newMap);
        } catch (e) {
          if (!(e instanceof Error)) {
            // Non-JS exception (WASM/OCCT C++ exception pointer) thrown during Build.
            // String(e) on a raw WASM pointer leaks an unhelpful integer ("8479736"),
            // so we never include it in the diagnostic message regardless of path.
            if (r.inputs.face !== undefined) {
              // Pre-existing silent no-op: face-based fillet on already-G1-smooth
              // boundary (the fillet-of-fillet case) — the user intent of
              // "the face is already fully rounded" is met by returning unchanged.
              shape = base;
              break;
            }
            // Edge-based or default selection: OCCT genuinely rejected. Emit a
            // clean diagnostic without leaking the raw pointer.
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: 'OCCT fillet failed (non-Error C++ exception during Build)',
              hint: 'OCCT could not apply that fillet — try a smaller radius, a different edge selection, or check whether the target edges are already G1-smooth.',
            });
            return { shape: base, diagnostics };
          }
          const msg = e.message;
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT fillet failed: ${msg}`,
            hint: 'OCCT could not apply that fillet — try a smaller radius (typically less than half of the smallest face dimension).',
          });
          return { shape: base, diagnostics };
        }
        break;
      }
      case 'chamfer': {
        const base = inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `chamfer requires an input named 'base'.`,
            hint: 'Chain chamfer onto a solid shape, e.g. box(10, 10, 10).chamfer(1).',
          });
          throw new Error('chamfer: no base shape');
        }
        // rc.12: variable-distance form is delegated to applyVariableEdgeFeature.
        const meta = r.metadata as { variable?: boolean } | undefined;
        if (meta?.variable === true) {
          const result = applyVariableEdgeFeature('chamfer', base, r, allRecords);
          diagnostics.push(...result.diagnostics);
          if (!result.ok) {
            return { shape: base, diagnostics };
          }
          shape = result.shape;
          break;
        }
        const distance = r.params.distance?.evaluated;
        if (distance === undefined) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `chamfer requires a 'distance' parameter.`,
            hint: 'Pass a positive finite number as the first argument, e.g. .chamfer(2).',
          });
          throw new Error('chamfer: no distance');
        }
        const edgesResult = pickEdges(r, base, allRecords);
        if ('error' in edgesResult) {
          diagnostics.push(edgesResult.error);
          return { shape: base, diagnostics };
        }
        try {
          // Convert replicad Edge[] → EdgeRefForFilleting[] by hashing each
          // edge's underlying TopoDS_Edge handle.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const edgeRefs: EdgeRefForFilleting[] = edgesResult.map((e: any) => ({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hash: ((e.wrapped ?? e._wrapped ?? e) as any).HashCode(2147483647).toString(16),
          }));
          const chamferResult = chamferWithHistory(base, edgeRefs, distance);
          const newMap = mergeEdgeFeatureHistory(base.historyMap, chamferResult);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wrapped = replicad.cast(chamferResult.shape as any) as replicad.Shape3D;
          shape = new OcctBackend(wrapped, undefined, newMap);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT chamfer failed: ${msg}`,
            hint: 'OCCT could not apply that chamfer — try a smaller distance (typically less than half of the smallest face dimension).',
          });
          return { shape: base, diagnostics };
        }
        break;
      }
      case 'shell': {
        const base = inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `shell requires an input named 'base'.`,
            hint: 'Chain shell onto a solid shape.',
          });
          throw new Error('shell: no base shape');
        }
        const thickness = r.params.thickness?.evaluated;
        if (thickness === undefined) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `shell requires a 'thickness' parameter.`,
            hint: 'Pass a positive finite number as the first argument, e.g. .shell(1, { face: \'top\' }).',
          });
          throw new Error('shell: no thickness');
        }
        const faceResult = pickFace(r, base, allRecords);
        if ('error' in faceResult) {
          diagnostics.push(faceResult.error);
          return { shape: base, diagnostics };
        }
        try {
          // Convert replicad Face → { hash: FaceHash } by hashing the
          // underlying TopoDS_Face handle.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const faceHash = ((faceResult as any).wrapped ?? (faceResult as any)._wrapped ?? faceResult as any).HashCode(2147483647).toString(16);
          const shellResult = shellWithHistory(base, [{ hash: faceHash }], thickness);
          const newMap = mergeEdgeFeatureHistory(base.historyMap, shellResult);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wrapped = replicad.cast(shellResult.shape as any) as replicad.Shape3D;
          shape = new OcctBackend(wrapped, undefined, newMap);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT shell failed: ${msg}`,
            hint: 'OCCT could not shell that solid — try a thinner wall or a different open face. Thickness must be smaller than the shape\'s minimum thickness.',
          });
          return { shape: base, diagnostics };
        }
        break;
      }
      case 'hole': {
        const target = inputs.byKey.target as OcctBackend | undefined;
        if (!target) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `hole requires an input named 'target'.`,
            hint: 'Chain .hole() onto a solid shape, e.g. box(20, 20, 20).hole("top", { u: 0, v: 0, diameter: 4, depth: 5 }).',
          });
          throw new Error('hole: no target shape');
        }
        const { lowerHole } = await import('./holeLowerer');
        const res = lowerHole(r, target, allRecords);
        diagnostics.push(...res.diagnostics);
        if (res.diagnostics.some(d => d.severity === 'error')) {
          return { shape: target, diagnostics };
        }
        shape = res.backend;
        break;
      }
      case 'holes': {
        const target = inputs.byKey.target as OcctBackend | undefined;
        if (!target) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `holes requires an input named 'target'.`,
            hint: 'Chain .holes() onto a solid shape with at least one position.',
          });
          throw new Error('holes: no target shape');
        }
        const { lowerHoles } = await import('./holeLowerer');
        const res = lowerHoles(r, target, allRecords);
        diagnostics.push(...res.diagnostics);
        if (res.diagnostics.some(d => d.severity === 'error')) {
          return { shape: target, diagnostics };
        }
        shape = res.backend;
        break;
      }
      case 'cutout': {
        const target = inputs.byKey.target as OcctBackend | undefined;
        if (!target) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `cutout requires an input named 'target'.`,
            hint: 'Chain .cutout() onto a solid shape, passing a closed sketch profile.',
          });
          throw new Error('cutout: no target shape');
        }
        const profile = inputs.byKey.profile as OcctBackend | undefined;
        const { lowerCutout } = await import('./cutoutLowerer');
        const res = lowerCutout(r, target, profile, allRecords);
        diagnostics.push(...res.diagnostics);
        if (res.diagnostics.some(d => d.severity === 'error')) {
          return { shape: target, diagnostics };
        }
        shape = res.backend;
        break;
      }
      case 'mirror': {
        const base = inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `mirror requires an input named 'base'.`,
            hint: "Chain mirror onto a solid shape, e.g. box(10,10,10).mirror({ plane: 'yz' }).",
          });
          throw new Error('mirror: no base shape');
        }
        const meta = r.metadata as { plane?: PlaneSpec } | undefined;
        const plane = meta?.plane;
        if (!isValidPlaneSpec(plane)) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `mirror requires a valid plane spec; got ${JSON.stringify(plane)}.`,
            hint: "Pass 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset: <number> }.",
          });
          return { shape: base, diagnostics };
        }
        const mirrorInputHashes = base.faceHashes();
        const mirrorInputMap = base.historyMap;
        try {
          shape = base.mirror(plane);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT mirror union failed: ${msg}`,
            hint: 'OCCT rejected the mirror union — translate the source away from the mirror plane, or use { plane, offset }.',
          });
          return { shape: base, diagnostics };
        }
        // Mirror is a union internally; face count may change if faces on the
        // mirror plane merge. Only propagate historyMap when face count matches.
        if (mirrorInputMap !== undefined) {
          const mirrorOutputBackend = shape as OcctBackend;
          const mirrorOutputHashes = mirrorOutputBackend.faceHashes();
          if (mirrorOutputHashes.length === mirrorInputHashes.length) {
            const newMap = propagateTransformHistory(mirrorInputMap, mirrorInputHashes, mirrorOutputHashes);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const wrapped = (mirrorOutputBackend.getReplicadShape() as any);
            shape = new OcctBackend(wrapped, undefined, newMap);
          }
          // else: face count mismatch due to mirror-plane face merging — leave shape
          // without historyMap; resolver will return face-ref-not-resolvable.
        }
        break;
      }
      case 'pattern': {
        const base = inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `pattern base input is missing or failed.`,
            hint: 'Pattern features must reference a successfully lowered base shape.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const pattern = (r.metadata as { pattern?: PatternSpec } | undefined)?.pattern;
        if (!pattern) {
          diagnostics.push({
            target: this.target,
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: 'pattern feature is missing pattern metadata.',
            hint: 'Create patterns through .patternLinear(...) or .patternCircular(...).',
          });
          return { shape: base, diagnostics };
        }

        shape = base.clone();
        if (pattern.kind === 'grid') {
          for (let x = 0; x < pattern.x.count; x++) {
            for (let y = 0; y < pattern.y.count; y++) {
              if (x === 0 && y === 0) continue;
              const instance = base.clone().translate(
                pattern.x.direction[0] * pattern.x.spacing * x + pattern.y.direction[0] * pattern.y.spacing * y,
                pattern.x.direction[1] * pattern.x.spacing * x + pattern.y.direction[1] * pattern.y.spacing * y,
                pattern.x.direction[2] * pattern.x.spacing * x + pattern.y.direction[2] * pattern.y.spacing * y,
              );
              shape = shape.union(instance);
            }
          }
          break;
        }

        for (let i = 1; i < pattern.count; i++) {
          let instance: OcctBackend;
          if (pattern.kind === 'linear') {
            instance = base.clone().translate(
              pattern.direction[0] * pattern.spacing * i,
              pattern.direction[1] * pattern.spacing * i,
              pattern.direction[2] * pattern.spacing * i,
            );
          } else {
            instance = base.clone().rotate(pattern.axis, (pattern.angleDeg / pattern.count) * i);
          }
          shape = shape.union(instance);
        }
        break;
      }
      case 'assemblyPart': {
        const base = inputs.byKey.shape as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly part shape input is missing or failed.`,
            hint: 'Assembly parts must wrap a successfully lowered source shape.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        shape = base.clone();
        const at = (r.metadata as { at?: Vec3Param } | undefined)?.at;
        if (at !== undefined) {
          const [tx, ty, tz] = readVec3Param(at);
          shape = shape.translate(tx, ty, tz);
        }
        break;
      }
      case 'assemblyJoint': {
        const partA = inputs.byKey.a as OcctBackend | undefined;
        if (!partA) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly joint input 'a' is missing or failed.`,
            hint: 'Assembly joints must reference successfully lowered assembly parts.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        // Resolve metadata Vec3Params even though the visible joint shape is
        // currently a passthrough. Reading `origin` exercises the
        // pre-resolved values; calling `normalizeAxis` validates that an
        // axis ParamRef hasn't been edited to zero. Both throws surface as
        // structured diagnostics via the dispatcher's exception path.
        const jointMeta = r.metadata as { origin?: Vec3Param; axis?: Vec3Param } | undefined;
        if (jointMeta?.origin !== undefined) {
          readVec3Param(jointMeta.origin);
        }
        if (jointMeta?.axis !== undefined) {
          normalizeAxis(readVec3Param(jointMeta.axis));
        }
        shape = partA.clone();
        break;
      }
      case 'assemblyConnect': {
        const partA = inputs.byKey.a as OcctBackend | undefined;
        if (!partA) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly connect input 'a' is missing or failed.`,
            hint: 'Assembly connect records must reference successfully lowered assembly parts.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        shape = partA.clone();
        break;
      }
      case 'assemblyModel': {
        const partEntries = Object.entries(inputs.byKey)
          .filter(([key]) => key.startsWith('part_'))
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
        if (partEntries.length === 0) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly model has no part inputs.`,
            hint: 'Call assembly.part(...) at least once before assembly.model().',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const [, firstPart] = partEntries[0];
        shape = (firstPart as OcctBackend).clone();
        for (const [, part] of partEntries.slice(1)) {
          shape = shape.union((part as OcctBackend).clone());
        }
        break;
      }
      default:
        return {
          shape: undefined as unknown as ShapeBackend,
          diagnostics: [
            {
              target: this.target,
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `Feature kind '${r.kind}' is not supported.`,
              hint: 'Use a documented feature kind.',
            },
          ],
        };
    }

    // Apply post-hoc transforms in declared order.
    for (const t of r.transforms) {
      const inputBackend = shape as OcctBackend;
      const inputHashes = inputBackend.faceHashes();
      const inputMap = inputBackend.historyMap;
      switch (t.op) {
        case 'translate':
          shape = shape.translate(t.vec.x.evaluated, t.vec.y.evaluated, t.vec.z.evaluated);
          break;
        case 'rotateAxis': {
          const ax: Vec3 = [t.axis.x.evaluated, t.axis.y.evaluated, t.axis.z.evaluated];
          const pv: Vec3 | undefined = t.pivot
            ? [t.pivot.x.evaluated, t.pivot.y.evaluated, t.pivot.z.evaluated]
            : undefined;
          shape = shape.rotate(ax, t.degrees.evaluated, pv);
          break;
        }
        case 'scale':
          shape = shape.scale([t.sx, t.sy, t.sz]);
          break;
        case 'reflect':
          if (!isValidPlaneSpec(t.plane)) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `reflect transform has invalid plane spec: ${JSON.stringify(t.plane)}.`,
              hint: "Reflect plane must be 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset?: number }.",
            });
            break; // skip applying the transform; preserve the prior shape
          }
          shape = (shape as OcctBackend).reflect(t.plane);
          break;
      }
      // Propagate historyMap if input had one. All four transform ops (translate,
      // rotateAxis, scale, reflect) preserve topology (face count invariant).
      if (inputMap !== undefined) {
        const outputBackend = shape as OcctBackend;
        const outputHashes = outputBackend.faceHashes();
        if (outputHashes.length === inputHashes.length) {
          const newMap = propagateTransformHistory(inputMap, inputHashes, outputHashes);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wrapped = (outputBackend.getReplicadShape() as any);
          shape = new OcctBackend(wrapped, undefined, newMap);
        }
        // else: defensive path — face count mismatch (unexpected for these ops).
        // Leave shape without historyMap; resolver returns face-ref-not-resolvable.
      }
    }

    return { shape, diagnostics };
  }
}
