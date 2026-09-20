// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CaptureSession } from './capture/captureSession';
import { Shape } from './capture/proxy';
import type { SurfaceProxy } from './capture/surfaceProxy';
import type { Curve3D } from './capture/curveProxy';
import type { Sketch } from './capture/sketch';
import type { Vec3 } from '../shared/intent/types';
import { KernelError } from '../shared/intent/kernelError';
import { solveHermiteG2 } from '../kernel/geometry/hermiteG2';
import { bridgeCurves } from './capture/bridgeCurves';
import {
  isRectangularGrid,
  describeGridShape,
  validateNurbsControls,
  validateNurbsDegree,
} from './apiSupport';
import type { KernelCadApi } from './api';

export function makeNurbsSurfaceMethods(
  session: CaptureSession,
): Pick<KernelCadApi, 'nurbsSurface' | 'surfaceFromCurves' | 'nurbsCurve' | 'spline3d'> {
  return {
    nurbsSurface(opts) {
      validateNurbsControls(opts.controls);
      validateNurbsDegree(opts.controls, opts.degree);
      if (opts.weights && !isRectangularGrid(opts.weights as unknown[][])) {
        throw new KernelError(
          'feature.nurbs.degenerate-controls',
          `nurbsSurface: weights grid must be the same rectangular shape as controls; got ${describeGridShape(opts.weights)}.`,
          undefined,
          'nurbs.degenerate-controls — weights grid must match controls shape.',
        );
      }
      return session.addNurbsSurface({
        kind: 'nurbsSurface',
        controls: opts.controls,
        weights: opts.weights,
        degree: opts.degree,
        knots: opts.knots,
        periodic: opts.periodic,
      });
    },

    surfaceFromCurves(sections) {
      if (!Array.isArray(sections) || sections.length < 2) {
        throw new KernelError(
          'feature.invalid-args',
          `surfaceFromCurves: need at least 2 sections; got ${sections?.length ?? 0}.`,
          undefined,
          'invalid-args.surfaceFromCurves.sections — pass at least 2 Sketch sections.',
        );
      }
      return session.addSurfaceFromCurves(sections.map(s => s.id));
    },

    nurbsCurve(controlPoints, opts) {
      const degree = opts?.degree ?? 3;
      return session.addCurve3D({
        metadata: {
          controlPoints,
          degree,
          ...(opts?.weights !== undefined ? { weights: opts.weights } : {}),
          ...(opts?.knots !== undefined ? { knots: opts.knots } : {}),
          closed: opts?.closed ?? false,
        },
      });
    },

    spline3d(points, opts) {
      // Catmull-Rom-to-cubic-Bezier conversion. The standard formula maps
      // four interpolation points (P0, P1, P2, P3) to four Bezier control
      // points (B0..B3) for the cubic segment connecting P1 and P2:
      //
      //   B0 = P1
      //   B1 = P1 + (P2 - P0) * (1 - τ) / 6
      //   B2 = P2 - (P3 - P1) * (1 - τ) / 6
      //   B3 = P2
      //
      // where τ ∈ [0, 1] is the tension (0 = standard Catmull-Rom, 1 =
      // straight-line; our default 0.5 is the canonical "centripetal" value).
      //
      // We then concatenate every Bezier segment into a single clamped
      // uniform cubic B-spline. For N input points we get (N - 1) segments
      // and (N - 1) * 3 + 1 control points (each adjacent pair of segments
      // shares one endpoint).
      //
      // Endpoint handling: we duplicate the first and last points (Phantom
      // Point approach) to define tangents at the ends — this preserves the
      // C1 property of Catmull-Rom interpolation at the boundary.
      if (!Array.isArray(points) || points.length < 2) {
        throw new KernelError(
          'feature.invalid-args',
          `spline3d: need at least 2 points; got ${points?.length ?? 0}.`,
          undefined,
          'invalid-args.spline3d.points — pass at least 2 Vec3 points to interpolate.',
        );
      }
      const tension = opts?.tension ?? 0.5;
      const scale = (1 - tension) / 6;

      // Extend with phantom endpoints (mirror across first/last actual point).
      const subt = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
      const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
      const scl = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

      const p0 = points[0];
      const pN = points[points.length - 1];
      const phantom0 = subt(p0, subt(points[1], p0));            // p0 - (p1 - p0)
      const phantomN = add(pN, subt(pN, points[points.length - 2])); // pN + (pN - p(N-1))
      const extended: Vec3[] = [phantom0, ...points, phantomN];

      // Build control net: every segment contributes 3 control points
      // (B0..B2); the final B3 of the last segment caps the net.
      const controlNet: Vec3[] = [];
      for (let i = 1; i < extended.length - 2; i++) {
        const P0 = extended[i - 1];
        const P1 = extended[i];
        const P2 = extended[i + 1];
        const P3 = extended[i + 2];
        const B0 = P1;
        const B1 = add(P1, scl(subt(P2, P0), scale));
        const B2 = subt(P2, scl(subt(P3, P1), scale));
        if (i === 1) controlNet.push(B0);
        // Each segment contributes B1, B2, and B3 (= P2). The next segment's
        // B0 IS this segment's B3, so we never push the shared endpoint twice.
        controlNet.push(B1, B2, P2);
      }

      return session.addCurve3D({
        metadata: {
          controlPoints: controlNet,
          degree: 3,
          closed: opts?.closed ?? false,
        },
      });
    },
  };
}

export function makeCurveMethods(
  session: CaptureSession,
): Pick<KernelCadApi, 'hermiteG2' | 'curveBridge' | 'surfaceIntersection'> {
  return {
    hermiteG2(a, b) {
      const controlPoints = solveHermiteG2(a, b);
      return session.addCurve3D({
        metadata: {
          controlPoints,
          degree: 5,
          closed: false,
        },
      });
    },

    curveBridge(a, b, opts) {
      return bridgeCurves(session, a, b, opts);
    },

    async surfaceIntersection(a, b) {
      const { sectionShapes, edgeToCurve3DMetadata } = await import(
        './backends/occt/surfaceIntersection'
      );
      const { OcctBackend } = await import('../kernel/backends/occt/occtBackend');
      type OcctShape = InstanceType<typeof OcctBackend>;
      const lowerOperand = async (op: Shape | SurfaceProxy, label: string): Promise<OcctShape> => {
        if (op instanceof Shape) {
          const lowered = await op.lower();
          if (!(lowered instanceof OcctBackend)) {
            throw new KernelError(
              'feature.kernel-failed',
              `surfaceIntersection: ${label} did not lower to an OcctBackend.`,
              op.id,
              'kernel-failed — check upstream diagnostics on this operand.',
            );
          }
          return lowered;
        }
        const shell = op.toShape();
        const lowered = await shell.lower();
        if (!(lowered instanceof OcctBackend)) {
          throw new KernelError(
            'feature.kernel-failed',
            `surfaceIntersection: ${label} surface did not lower to an OcctBackend.`,
            op.id,
            'kernel-failed — check upstream diagnostics on this operand.',
          );
        }
        return lowered;
      };
      const shapeA = await lowerOperand(a, 'a');
      const shapeB = await lowerOperand(b, 'b');
      const wrappedA = (shapeA.getReplicadShape() as { wrapped: unknown }).wrapped;
      const wrappedB = (shapeB.getReplicadShape() as { wrapped: unknown }).wrapped;
      let edges;
      try {
        edges = sectionShapes(wrappedA, wrappedB);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new KernelError(
          'feature.kernel-failed',
          `surfaceIntersection: BRepAlgoAPI_Section failed: ${msg}`,
          undefined,
          'kernel-failed — verify both operands lower to valid solids or faces.',
        );
      }
      if (edges.length === 0) {
        throw new KernelError(
          'feature.surface-intersection.none',
          'surfaceIntersection: the two operands do not intersect.',
          undefined,
          'surface-intersection.none — translate one operand so the faces cut, then retry.',
        );
      }
      return edges.map((edge) =>
        session.addCurve3D({ metadata: edgeToCurve3DMetadata(edge) }),
      );
    },
  };
}

export function makeSweepMethods(
  session: CaptureSession,
): Pick<KernelCadApi, 'variableSweep' | 'surfaceFromBoundary' | 'sew'> {
  return {
    variableSweep(spine, sections, opts) {
      // Resolve spine to a FeatureId. Accepts: Curve3D, Sketch, or Vec3[].
      let spineId: import('../shared/intent/types').FeatureId;
      if (Array.isArray(spine)) {
        // Auto-convert Vec3[] to a nurbsCurve.
        if (spine.length < 2) {
          throw new KernelError(
            'feature.invalid-args',
            `variableSweep: spine Vec3[] needs at least 2 points; got ${spine.length}.`,
            undefined,
            'invalid-args.variableSweep.spine — pass at least 2 points or a Curve3D.',
          );
        }
        const curve = session.addCurve3D({
          metadata: {
            controlPoints: spine,
            degree: Math.min(3, spine.length - 1),
            closed: false,
          },
        });
        spineId = curve.id;
      } else if (typeof spine === 'object' && spine !== null && 'sample' in spine) {
        // Curve3D
        spineId = (spine as Curve3D).id;
      } else if (typeof spine === 'object' && spine !== null && 'id' in spine) {
        // Sketch (handled by the lowerer via its lifted wire).
        spineId = (spine as Sketch).id;
      } else {
        throw new KernelError(
          'feature.invalid-args',
          `variableSweep: spine must be a Curve3D, Sketch, or Vec3[]; got ${typeof spine}.`,
          undefined,
          'invalid-args.variableSweep.spine — pass a Curve3D (nurbsCurve/spline3d), a Sketch (path().…close()), or a Vec3[].',
        );
      }

      if (!Array.isArray(sections) || sections.length < 2) {
        throw new KernelError(
          'feature.invalid-args',
          `variableSweep: need at least 2 sections; got ${sections?.length ?? 0}.`,
          undefined,
          'invalid-args.variableSweep.sections — pass at least 2 { t, profile } sections.',
        );
      }

      const sweepId = session.addVariableSweep({
        spineId,
        sections: sections.map((s) => ({ t: s.t, profileId: s.profile.id })),
        ...(opts?.closed !== undefined ? { closed: opts.closed } : {}),
        ...(opts?.continuity !== undefined ? { continuity: opts.continuity } : {}),
      });

      // Return a Shape proxy pointing at the new variableSweep record so
      // the agent can chain .fillet() / .union() / etc.
      return new Shape(sweepId, session);
    },

    surfaceFromBoundary(curves, opts) {
      // 1. Curve-count gate. Producing a SurfaceProxy here would force the
      //    caller into a wrong-arity contract, so we throw KernelError up
      //    front (matches the surfaceFromCurves pattern).
      if (!Array.isArray(curves) || curves.length < 4) {
        throw new KernelError(
          'feature.surface-from-boundary.too-few-curves',
          `surfaceFromBoundary: need 4 boundary curves; got ${curves?.length ?? 0}.`,
          undefined,
          'surface-from-boundary.too-few-curves — pass an array of 4 Curve3D refs in walk order (bottom, right, top, left).',
        );
      }
      if (curves.length > 4) {
        throw new KernelError(
          'feature.surface-from-boundary.too-many-curves',
          `surfaceFromBoundary: need exactly 4 boundary curves; got ${curves.length}.`,
          undefined,
          'surface-from-boundary.too-many-curves — if the loop has more than 4 sides, split the patch into adjacent quads.',
        );
      }
      // 2. Continuity normalisation: a single grade applies to all 4 edges;
      //    an array must be length 4.
      const contIn = opts?.continuity;
      let contArr: ['C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2'];
      if (contIn === undefined) {
        contArr = ['C0', 'C0', 'C0', 'C0'];
      } else if (Array.isArray(contIn)) {
        if (contIn.length !== 4) {
          throw new KernelError(
            'feature.invalid-args',
            `surfaceFromBoundary: continuity array must be length 4; got ${contIn.length}.`,
            undefined,
            'invalid-args.surfaceFromBoundary.continuity — pass a single grade or an array of 4 grades (one per edge).',
          );
        }
        contArr = [contIn[0], contIn[1], contIn[2], contIn[3]];
      } else {
        contArr = [contIn, contIn, contIn, contIn];
      }
      return session.addSurfaceFromBoundary({
        curveIds: [curves[0].id, curves[1].id, curves[2].id, curves[3].id],
        continuity: contArr,
        ...(opts?.sampling !== undefined ? { sampling: opts.sampling } : {}),
      });
    },

    sew(surfaces, opts) {
      if (!Array.isArray(surfaces) || surfaces.length < 1) {
        throw new KernelError(
          'feature.invalid-args',
          `sew: need at least 1 surface; got ${Array.isArray(surfaces) ? surfaces.length : String(surfaces)}.`,
          undefined,
          'invalid-args.sew.surfaces — pass an array of at least 1 Surface returned by nurbsSurface() / surfaceFromCurves() / surfaceFromBoundary().',
        );
      }
      const inputs: Record<string, import('../shared/intent/types').FeatureRef> = {};
      for (let i = 0; i < surfaces.length; i++) {
        inputs[`surface_${i}`] = { kind: 'surface', surfaceId: surfaces[i].id };
      }
      const tolerance = opts?.tolerance ?? 1e-6;
      const requireClosed = opts?.requireClosed ?? false;
      return session.createShape({
        kind: 'surfaceSew',
        inputs,
        params: {
          tolerance: { expression: String(tolerance), unit: 'mm', evaluated: tolerance },
        },
        metadata: { requireClosed },
      });
    },
  };
}
