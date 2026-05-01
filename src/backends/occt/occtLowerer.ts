import type {
  FeatureLowerer,
  BackendTarget,
  ResolvedInputs,
  LowerResult,
  ShapeBackend,
} from '../backend';
import type { FeatureRecord } from '../../intent/featureRecord';
import type { FeatureKind } from '../../intent/types';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import { OcctBackend } from './occtBackend';
import { pickEdges, pickFace } from './edgeSelection';

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
        shape = OcctBackend.box(x, y, z, centered);
        break;
      }
      case 'cylinder': {
        shape = OcctBackend.cylinder(r.params.h.evaluated, r.params.r.evaluated);
        break;
      }
      case 'sphere': {
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
                code: 'feature.loft.failed',
                featureId: r.id,
                severity: 'error',
                message: `loft missing input sketch_${i}.`,
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
        let acc = base;
        const cutters = Object.entries(inputs.byKey)
          .filter(([k]) => k.startsWith('cutter_'))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v);
        if (op === 'difference') {
          for (const c of cutters) acc = acc.subtract(c);
        } else if (op === 'union') {
          for (const c of cutters) acc = acc.union(c);
        } else if (op === 'intersection') {
          for (const c of cutters) acc = acc.intersect(c);
        } else {
          throw new Error(`Unknown boolean op: ${op}`);
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
        try {
          shape = base.fillet(edgesResult, radius);
        } catch (e) {
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
          shape = base.chamfer(edgesResult, distance);
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
          shape = base.shell(faceResult, thickness);
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
        case 'mirror':
          shape = shape.mirror(t.normal);
          break;
      }
    }

    return { shape, diagnostics };
  }
}
