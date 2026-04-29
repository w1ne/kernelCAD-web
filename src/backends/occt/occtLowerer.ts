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
