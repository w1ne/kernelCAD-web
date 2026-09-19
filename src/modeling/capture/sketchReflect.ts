// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/sketchReflect.ts
import type { AxisSpec, Param } from '../../shared/intent/types';
import { type ParamRefExpr } from '../../shared/runtime/paramRef';
import { paramExpr, paramFromExpr, toParam } from '../../shared/runtime/editableHelpers';
import type { SketchCommand } from '../../shared/capture/sketchCommand';
import type { TangentEntitySpec, TangentNearSpec } from '../../shared/capture/tangency';

/**
 * Reflect a captured sketch's command list across an axis. Pure mapping: the
 * source commands are unchanged and a new list is returned.
 *
 * Reflection is affine, so it stays SYMBOLIC: a ParamRef coordinate
 * reflects to a ParamRef expression (`-y`, `2·offset − y`) that the
 * dispatcher re-evaluates at lower time, and a ParamRef offset is carried
 * the same way. Plain numbers fold back to plain numbers, so a numeric
 * sketch reflects to exactly the record it always did.
 */
export function reflectSketchCommands(commands: SketchCommand[], axis: AxisSpec): SketchCommand[] {
  const offsetExpr: ParamRefExpr | undefined =
    typeof axis === 'object' ? paramExpr(toParam(axis.offset ?? 0, 'mm')) : undefined;
  const mirrorExpr = (e: ParamRefExpr): ParamRefExpr =>
    offsetExpr === undefined
      ? { kind: 'neg', expr: e }
      : {
          kind: 'binop',
          op: '-',
          left: { kind: 'binop', op: '*', left: { kind: 'lit', value: 2 }, right: offsetExpr },
          right: e,
        };
  const axisLetter = typeof axis === 'object' ? axis.axis : axis;

  const reflectXY = (x: Param, y: Param): [Param, Param] => {
    if (axisLetter === 'x') {
      return [paramFromExpr(paramExpr(x), x.unit), paramFromExpr(mirrorExpr(paramExpr(y)), y.unit)];
    }
    return [paramFromExpr(mirrorExpr(paramExpr(x)), x.unit), paramFromExpr(paramExpr(y), y.unit)];
  };

  const negateScalar = (p: Param): Param =>
    paramFromExpr({ kind: 'neg', expr: paramExpr(p) }, p.unit);

  // Vector (direction-only) reflection. Same axis as the coordinate
  // reflection above but WITHOUT the offset shift — used for derivatives
  // (tangent, curvature) which carry no absolute-position component.
  const reflectVec = (vx: Param, vy: Param): [Param, Param] => {
    if (axisLetter === 'x') {
      return [paramFromExpr(paramExpr(vx), vx.unit), negateScalar(vy)];
    }
    return [negateScalar(vx), paramFromExpr(paramExpr(vy), vy.unit)];
  };

  // Arc sign-flip: reflection inverts winding. For arcs whose direction is
  // encoded as a sign on a scalar (sagitta, bulge, radius), negate the sign.
  // tangentArc has no explicit direction parameter — the tangent is inherited
  // from the prior segment, which will also be reflected, so no flip needed.
  // threePointsArc is fully determined by three reflected points — no flip needed.
  // Tangency entities reflect like any other geometry, with one twist: a
  // mirror reverses handedness, so a solution that was on the RIGHT of a
  // directed line is on the LEFT of the mirrored line. `side: 'outside'`
  // is defined relative to that direction, so reflecting the endpoints AND
  // swapping from/to restores the original left/right relationship and
  // keeps the qualifier meaning what the author wrote. Circle qualifiers
  // (inside/outside the circle) are mirror-invariant and need no fix-up.
  const reflectEntity = (e: TangentEntitySpec): TangentEntitySpec => {
    if (e.kind === 'line') {
      const [x1, y1] = reflectXY(e.x1, e.y1);
      const [x2, y2] = reflectXY(e.x2, e.y2);
      return { ...e, x1: x2, y1: y2, x2: x1, y2: y1 };
    }
    const [cx, cy] = reflectXY(e.cx, e.cy);
    return { ...e, cx, cy };
  };
  const reflectNear = (n: TangentNearSpec | undefined): TangentNearSpec | undefined => {
    if (!n) return undefined;
    const [x, y] = reflectXY(n.x, n.y);
    return { x, y };
  };

  return commands.map(cmd => {
    switch (cmd.kind) {
      case 'moveTo': {
        const [x, y] = reflectXY(cmd.x, cmd.y);
        return { ...cmd, x, y };
      }
      case 'lineTo': {
        const [x, y] = reflectXY(cmd.x, cmd.y);
        return { ...cmd, x, y };
      }
      case 'tangentArc': {
        const [x, y] = reflectXY(cmd.x, cmd.y);
        return { ...cmd, x, y };
      }
      case 'threePointsArc': {
        const [x, y] = reflectXY(cmd.x, cmd.y);
        const [midX, midY] = reflectXY(cmd.midX, cmd.midY);
        return { ...cmd, x, y, midX, midY };
      }
      case 'sagittaArc': {
        const [x, y] = reflectXY(cmd.x, cmd.y);
        return { ...cmd, x, y, sagitta: negateScalar(cmd.sagitta) };
      }
      case 'bulgeArc': {
        const [x, y] = reflectXY(cmd.x, cmd.y);
        return { ...cmd, x, y, bulge: negateScalar(cmd.bulge) };
      }
      case 'radiusArc': {
        const [x, y] = reflectXY(cmd.x, cmd.y);
        return { ...cmd, x, y, radius: negateScalar(cmd.radius) };
      }
      case 'smoothSpline': {
        // smoothSpline inherits its start tangent from the prior segment
        // (which is also reflected here), so we only flip the endpoint.
        // The end tangent is auto-chosen by replicad; reflection of the
        // surrounding context picks the correct mirrored tangent.
        const [x, y] = reflectXY(cmd.x, cmd.y);
        return { ...cmd, x, y };
      }
      case 'spline': {
        // Reflect every waypoint; tension is a scalar magnitude (no flip).
        const newPoints = cmd.points.map(p => {
          const [x, y] = reflectXY(p.x, p.y);
          return { x, y };
        });
        return { ...cmd, points: newPoints };
      }
      case 'nurbsSegment': {
        // Reflect every control point; degree, weights, and knots are
        // invariant under coordinate reflection.
        const newControls = cmd.controlPoints.map(p => {
          const [x, y] = reflectXY(p.x, p.y);
          return { x, y };
        });
        return { ...cmd, controlPoints: newControls };
      }
      case 'hermiteG2_2d': {
        // Reflect endpoints with the affine offset; reflect tangents and
        // curvatures as pure direction vectors (no offset shift).
        const [ax, ay] = reflectXY(cmd.ax, cmd.ay);
        const [bx, by] = reflectXY(cmd.bx, cmd.by);
        const [atx, aty] = reflectVec(cmd.atx, cmd.aty);
        const [btx, bty] = reflectVec(cmd.btx, cmd.bty);
        const [acx, acy] = cmd.acx !== undefined && cmd.acy !== undefined
          ? reflectVec(cmd.acx, cmd.acy)
          : [undefined, undefined];
        const [bcx, bcy] = cmd.bcx !== undefined && cmd.bcy !== undefined
          ? reflectVec(cmd.bcx, cmd.bcy)
          : [undefined, undefined];
        return {
          ...cmd,
          ax, ay, bx, by,
          atx, aty, btx, bty,
          acx, acy, bcx, bcy,
        };
      }
      case 'tangentCircle':
        return { ...cmd, entities: cmd.entities.map(reflectEntity), near: reflectNear(cmd.near) };
      case 'tangentLine':
        return { ...cmd, a: reflectEntity(cmd.a), b: reflectEntity(cmd.b), near: reflectNear(cmd.near) };
      case 'close':
        return cmd;
      default: {
        // exhaustiveness guard
        const _exhaustive: never = cmd;
        return _exhaustive;
      }
    }
  });
}
