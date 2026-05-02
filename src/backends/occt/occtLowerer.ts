import type {
  FeatureLowerer,
  BackendTarget,
  ResolvedInputs,
  LowerResult,
  ShapeBackend,
} from '../backend';
import type { FeatureRecord } from '../../intent/featureRecord';
import type { FeatureKind, PlaneSpec } from '../../intent/types';
import { isValidPlaneSpec } from '../../intent/types';
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
  const codePrefix = `feature.${kind}` as const;

  if (groups.length === 0) {
    diagnostics.push({
      target: 'export-occt',
      code: `${codePrefix}.empty-groups`,
      featureId: feature.id,
      severity: 'error',
      message: kind === 'fillet'
        ? `variable-radius fillet has no groups.`
        : `variable-distance chamfer has no groups.`,
    });
    return { ok: false, diagnostics };
  }

  // N3 fix: runtime-narrow inputs.base to a 'feature' ref before extracting id.
  const baseRef = feature.inputs.base as import('../../intent/types').FeatureRef | undefined;
  if (!baseRef || (baseRef as { kind?: string }).kind !== 'feature') {
    diagnostics.push({
      target: 'export-occt',
      code: `${codePrefix}.no-base`,
      featureId: feature.id,
      severity: 'error',
      message: `${kind} input 'base' must be a feature ref; got ${JSON.stringify(baseRef)}.`,
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
        code: `${codePrefix}.invalid-group`,
        featureId: feature.id,
        severity: 'error',
        message: `${kind} group ${i} has invalid ${valueKey} ${value}; must be a positive finite number.`,
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
            code: `${codePrefix}.invalid-edge-ref`,
            featureId: feature.id,
            severity: 'error',
            message: `${kind} group ${i} edge_group_${i} ref kind '${ref.kind}' is not supported (expected 'edge' or 'face').`,
          });
          return { ok: false, diagnostics };
        }
        default: {
          // Exhaustiveness guard: catches any future FeatureRef kinds added to the union.
          const _exhaustive: never = ref;
          diagnostics.push({
            target: 'export-occt',
            code: `${codePrefix}.invalid-edge-ref`,
            featureId: feature.id,
            severity: 'error',
            message: `${kind} group ${i} edge_group_${i} ref kind '${(_exhaustive as { kind?: string }).kind ?? '<unknown>'}' is not supported (expected 'edge' or 'face').`,
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
      diagnostics.push({
        target: 'export-occt',
        code: `${codePrefix}.invalid-group`,
        featureId: feature.id,
        severity: 'error',
        message: `${kind} group ${i} edge resolution failed: ${edgesResult.error.message}`,
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
      code: `${codePrefix}.failed`,
      featureId: feature.id,
      severity: 'error',
      message: kind === 'fillet'
        ? `OCCT variable fillet failed: ${msg}`
        : `OCCT variable chamfer failed: ${msg}`,
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
            code: 'feature.sketch.bad-commands',
            featureId: r.id,
            severity: 'error',
            message: `sketch requires metadata.commands: SketchCommand[].`,
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        try {
          shape = OcctBackend.fromSketchCommands(commands as import('../../capture/sketch').SketchCommand[]);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // Narrow degenerate-arc cases (radiusArc-only for now) to a specific code
          // so whyDidThisFail can give a more actionable hint.
          const code = msg.startsWith('radiusArc:') ? 'feature.sketch.degenerate-arc' : 'feature.sketch.failed';
          diagnostics.push({
            target: 'export-occt',
            code,
            featureId: r.id,
            severity: 'error',
            message: `sketch construction failed: ${msg}`,
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
              code: 'feature.extrude.bad-points',
              featureId: r.id,
              severity: 'error',
              message: `extrude polygon requires metadata.points: [number, number][] with at least 3 points.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          try {
            shape = OcctBackend.extrudePolygon(points as [number, number][], depth);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.extrude.failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT extrude failed: ${msg}`,
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
              code: 'feature.extrude.bad-params',
              featureId: r.id,
              severity: 'error',
              message: `extrude rounded-rect requires width, height, and radius params (depth always required).`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          try {
            shape = OcctBackend.extrudeRoundedRect(width, height, radius, depth);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.extrude.failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT extrude failed: ${msg}`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else if (profileKind === 'sketch') {
          const depth = r.params.depth.evaluated;
          const sketchInput = inputs.byKey.sketch as OcctBackend | undefined;
          if (!sketchInput) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.extrude.bad-sketch',
              featureId: r.id,
              severity: 'error',
              message: `extrude with profile='sketch' requires an input named 'sketch'.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          try {
            shape = OcctBackend.extrudeFromSketch(sketchInput, depth);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.extrude.failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT extrude failed: ${msg}`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else {
          return {
            shape: undefined as unknown as ShapeBackend,
            diagnostics: [
              {
                target: this.target,
                code: 'feature.extrude.unsupported-profile',
                featureId: r.id,
                severity: 'error',
                message: `Profile kind '${profileKind}' not supported in v0.1`,
              },
            ],
          };
        }
        break;
      }
      case 'revolve': {
        const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
        if (profileKind === 'rect') {
          shape = OcctBackend.revolveRect(
            r.params.w.evaluated,
            r.params.h.evaluated,
            r.params.offsetX.evaluated,
            r.params.angleDeg.evaluated,
          );
        } else if (profileKind === 'sketch') {
          const sketchInput = inputs.byKey.sketch as OcctBackend | undefined;
          if (!sketchInput) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.revolve.bad-sketch',
              featureId: r.id,
              severity: 'error',
              message: `revolve with profile='sketch' requires an input named 'sketch'.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          const commands = sketchInput.getSketchCommands();
          if (!commands) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.revolve.bad-sketch',
              featureId: r.id,
              severity: 'error',
              message: `revolve sketch input has no command history.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          // Empty profile: only moveTo + close (or even less). No segments means
          // no area to revolve.
          const segmentCount = commands.filter(c => c.kind === 'lineTo' || c.kind === 'tangentArc').length;
          if (segmentCount === 0) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.revolve.empty-profile',
              featureId: r.id,
              severity: 'error',
              message: `revolve profile has no line/arc segments — area is zero.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          // Axis-cross check: any point with x < 0 means the profile spans the
          // rotation axis, which yields a self-intersecting revolve.
          const crossing = commands.find(c => (c.kind === 'moveTo' || c.kind === 'lineTo' || c.kind === 'tangentArc') && c.x < 0);
          if (crossing) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.revolve.crosses-axis',
              featureId: r.id,
              severity: 'error',
              message: `revolve profile point (x=${(crossing as { x: number }).x}) crosses rotation axis. All points must satisfy x >= 0.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          try {
            shape = OcctBackend.revolveFromSketch(sketchInput);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.revolve.failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT revolve failed: ${msg}`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else {
          return {
            shape: undefined as unknown as ShapeBackend,
            diagnostics: [
              {
                target: this.target,
                code: 'feature.revolve.unsupported-profile',
                featureId: r.id,
                severity: 'error',
                message: `Profile kind '${profileKind}' not supported in v0.1`,
              },
            ],
          };
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
              code: 'feature.sweep.bad-sketch',
              featureId: r.id,
              severity: 'error',
              message: `sweep with profile='sketch' requires an input named 'sketch'.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          const rail = (r.metadata as { rail?: unknown } | undefined)?.rail;
          if (!Array.isArray(rail) || rail.length < 2) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.sweep.invalid-rail',
              featureId: r.id,
              severity: 'error',
              message: `sweep rail must be an array of at least 2 points; got ${Array.isArray(rail) ? `length ${rail.length}` : 'non-array'}.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          if (rail.length > 5000) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.sweep.invalid-rail',
              featureId: r.id,
              severity: 'error',
              message: `sweep rail has ${rail.length} points (cap is 5000). For helices, reduce \`pointsPerTurn\` or \`turns\`. For polylines, simplify the path.`,
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
                code: 'feature.sweep.invalid-rail',
                featureId: r.id,
                severity: 'error',
                message: `sweep rail point at index ${i} must be a [x, y, z] tuple of finite numbers; got ${JSON.stringify(p)}.`,
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
            // Discriminate sweep failures into specific codes for actionable
            // agent feedback. The `SWEEP_MULTI_FACE_PROFILE:` prefix comes
            // from `liftSketchToFace`; the regexes match probable Replicad/OCCT
            // error wording for the other two cases. Unmatched cases fall
            // through to the generic `feature.sweep.failed`.
            let code: string;
            if (msg.startsWith('SWEEP_MULTI_FACE_PROFILE:')) {
              code = 'feature.sweep.multi-face-profile';
            } else if (/curvature|too small|profile.*radius/i.test(msg)) {
              code = 'feature.sweep.profile-too-large';
            } else if (/self.intersect|self-intersection/i.test(msg)) {
              code = 'feature.sweep.spine-self-intersection';
            } else {
              code = 'feature.sweep.failed';
            }
            diagnostics.push({
              target: 'export-occt',
              code,
              featureId: r.id,
              severity: 'error',
              message: `OCCT sweep failed: ${msg}`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else {
          return {
            shape: undefined as unknown as ShapeBackend,
            diagnostics: [
              {
                target: this.target,
                code: 'feature.sweep.unsupported-profile',
                featureId: r.id,
                severity: 'error',
                message: `Profile kind '${profileKind}' not supported for sweep.`,
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
              code: 'feature.loft.empty-sections',
              featureId: r.id,
              severity: 'error',
              message: `loft needs at least 2 sketches (sectionCount=${sectionCount}).`,
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
                code: 'feature.loft.bad-sketch',
                featureId: r.id,
                severity: 'error',
                message: `loft missing input sketch_${i} — upstream sketch did not lower successfully.`,
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
                code: 'feature.loft.invalid-planes',
                featureId: r.id,
                severity: 'error',
                message: `loft planes length ${meta.planes.length} does not match section count ${sectionCount}.`,
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
              code: 'feature.loft.failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT loft failed: ${msg}`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else {
          return {
            shape: undefined as unknown as ShapeBackend,
            diagnostics: [
              {
                target: this.target,
                code: 'feature.loft.failed',
                featureId: r.id,
                severity: 'error',
                message: `loft profile kind '${profileKind}' not supported.`,
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
            code: 'feature.fillet.no-base',
            featureId: r.id,
            severity: 'error',
            message: `fillet requires an input named 'base'.`,
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
            code: 'feature.fillet.no-radius',
            featureId: r.id,
            severity: 'error',
            message: `fillet requires a 'radius' parameter.`,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sharpEdges = (edgesResult as import('replicad').Edge[]).filter((e) => {
          const d = computeDihedralPublic(shapeForDihedral, e);
          // null means the dihedral could not be computed (e.g., edge has only one adjacent
          // face, or the isSameEdge scan found no match). Treat as non-sharp so OCCT
          // doesn't receive a potentially-smooth edge it can't handle.
          if (d === null) return false;
          return d.angleDeg < 180 - SMOOTH_THRESHOLD;
        });
        if (sharpEdges.length === 0) {
          // No sharp edges remain — the fillet is already satisfied; return shape unchanged.
          shape = base;
          break;
        }
        try {
          // Convert replicad Edge[] → EdgeRefForFilleting[] by hashing each
          // edge's underlying TopoDS_Edge handle.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const edgeRefs: EdgeRefForFilleting[] = sharpEdges.map((e: any) => ({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hash: ((e.wrapped ?? e._wrapped ?? e) as any).HashCode(2147483647).toString(16),
          }));
          const filletResult = filletWithHistory(base, edgeRefs, radius);
          const newMap = mergeEdgeFeatureHistory(base.historyMap, filletResult);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wrapped = replicad.cast(filletResult.shape as any) as replicad.Shape3D;
          shape = new OcctBackend(wrapped, undefined, newMap);
        } catch (e) {
          if (!(e instanceof Error) && r.inputs.face !== undefined) {
            // Non-JS exception (WASM/OCCT C++ exception pointer) thrown during Build,
            // AND the selection was face-based. This occurs when selected edges are
            // G1-smooth (e.g., the boundary between a flat face and a fillet cylinder
            // after a prior fillet) and OCCT cannot apply another fillet to them.
            // Treat as a no-op: the shape is returned unchanged, which matches the
            // user intent of "the face is already fully rounded."
            shape = base;
            break;
          }
          const msg = e instanceof Error ? e.message : String(e);
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.fillet.failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT fillet failed: ${msg}`,
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
            code: 'feature.chamfer.no-base',
            featureId: r.id,
            severity: 'error',
            message: `chamfer requires an input named 'base'.`,
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
            code: 'feature.chamfer.no-distance',
            featureId: r.id,
            severity: 'error',
            message: `chamfer requires a 'distance' parameter.`,
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
            code: 'feature.chamfer.failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT chamfer failed: ${msg}`,
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
            code: 'feature.shell.no-base',
            featureId: r.id,
            severity: 'error',
            message: `shell requires an input named 'base'.`,
          });
          throw new Error('shell: no base shape');
        }
        const thickness = r.params.thickness?.evaluated;
        if (thickness === undefined) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.shell.no-thickness',
            featureId: r.id,
            severity: 'error',
            message: `shell requires a 'thickness' parameter.`,
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
            code: 'feature.shell.failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT shell failed: ${msg}`,
          });
          return { shape: base, diagnostics };
        }
        break;
      }
      case 'mirror': {
        const base = inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.mirror.no-base',
            featureId: r.id,
            severity: 'error',
            message: `mirror requires an input named 'base'.`,
          });
          throw new Error('mirror: no base shape');
        }
        const meta = r.metadata as { plane?: PlaneSpec } | undefined;
        const plane = meta?.plane;
        if (!isValidPlaneSpec(plane)) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.mirror.invalid-plane',
            featureId: r.id,
            severity: 'error',
            message: `mirror requires a valid plane spec; got ${JSON.stringify(plane)}.`,
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
            code: 'feature.mirror.failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT mirror union failed: ${msg}`,
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
      default:
        return {
          shape: undefined as unknown as ShapeBackend,
          diagnostics: [
            {
              target: this.target,
              code: `feature.${r.kind}.unsupported-in-v0.1`,
              featureId: r.id,
              severity: 'error',
              message: `Feature kind '${r.kind}' is not supported in v0.1.`,
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
          shape = shape.translate(t.x, t.y, t.z);
          break;
        case 'rotateAxis':
          shape = shape.rotate(t.axis, t.degrees, t.pivot);
          break;
        case 'scale':
          shape = shape.scale([t.sx, t.sy, t.sz]);
          break;
        case 'reflect':
          if (!isValidPlaneSpec(t.plane)) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.transform.invalid-plane',
              featureId: r.id,
              severity: 'error',
              message: `reflect transform has invalid plane spec: ${JSON.stringify(t.plane)}.`,
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
