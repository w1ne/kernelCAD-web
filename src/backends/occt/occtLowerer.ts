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
    'shell',     // NEW
  ]);

  async lower(r: FeatureRecord, inputs: ResolvedInputs): Promise<LowerResult> {
    const diagnostics: CompilerDiagnostic[] = [];
    let shape: ShapeBackend;

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
        const edgesResult = pickEdges(r, base);
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
        const edgesResult = pickEdges(r, base);
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
        const faceResult = pickFace(r, base);
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
