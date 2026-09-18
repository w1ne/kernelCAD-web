// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/capture/rotateSketchCommands.ts
//
// In-plane rotation of a captured `SketchCommand[]` — the helper behind
// `Sketch.loft({ twistDeg, planes[].rotationDeg })` section placement.
//
// Rotation is CCW by `angleDeg` about `center` (default `[0, 0]`, the
// sketch-local origin). Points are rotated affinely; direction vectors
// (hermite tangents / curvatures, spline tangent constraints) are rotated
// without the center term. Scalars that encode a magnitude or sign rather
// than a position (`sagitta`, `bulge`, `radius`, `tension`, NURBS `degree` /
// `weights` / `knots`) are left numerically unchanged. Rotated coordinates
// are rebuilt as concrete numeric records (`{ expression, unit, evaluated }`)
// because by lowering time the dispatcher has already resolved symbolic
// params and a rotated coordinate is not expressible as a ParamRef
// expression. Scalars carried inside tangent entities (`tangentCircle` /
// `tangentLine` radius) have no rotation component and pass through
// unchanged, including any live `paramRef`.
//
// The input array and its records are never mutated; a new array is returned.

import type { Param } from '../intent/types';
import type { SketchCommand } from './sketchCommand';
import type { TangentEntitySpec, TangentNearSpec } from './tangency';
import { toParam } from '../runtime/editableHelpers';

export function rotateSketchCommands(
  commands: SketchCommand[],
  angleDeg: number,
  center: [number, number] = [0, 0],
): SketchCommand[] {
  if (!Number.isFinite(angleDeg)) {
    throw new Error(`rotateSketchCommands: angleDeg must be finite (got ${angleDeg}).`);
  }
  if (!Number.isFinite(center[0]) || !Number.isFinite(center[1])) {
    throw new Error(
      `rotateSketchCommands: center must be a pair of finite numbers (got [${center[0]}, ${center[1]}]).`,
    );
  }
  const [cx, cy] = center;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Affine point rotation (CCW) about `center`.
  const rotatePoint = (px: number, py: number): [number, number] => [
    cx + cos * (px - cx) - sin * (py - cy),
    cy + sin * (px - cx) + cos * (py - cy),
  ];
  // Direction-vector rotation — no center translation.
  const rotateVec = (vx: number, vy: number): [number, number] => [
    cos * vx - sin * vy,
    sin * vx + cos * vy,
  ];
  const pointParam = (p: Param, q: Param): [Param, Param] => {
    const [x, y] = rotatePoint(p.evaluated, q.evaluated);
    return [toParam(x, p.unit), toParam(y, q.unit)];
  };
  const vecParam = (p: Param, q: Param): [Param, Param] => {
    const [x, y] = rotateVec(p.evaluated, q.evaluated);
    return [toParam(x, p.unit), toParam(y, q.unit)];
  };

  const rotateEntity = (e: TangentEntitySpec): TangentEntitySpec => {
    if (e.kind === 'line') {
      const [x1, y1] = pointParam(e.x1, e.y1);
      const [x2, y2] = pointParam(e.x2, e.y2);
      return { ...e, x1, y1, x2, y2 };
    }
    const [ecx, ecy] = pointParam(e.cx, e.cy);
    return { ...e, cx: ecx, cy: ecy };
  };
  const rotateNear = (n: TangentNearSpec | undefined): TangentNearSpec | undefined => {
    if (n === undefined) return undefined;
    const [x, y] = pointParam(n.x, n.y);
    return { ...n, x, y };
  };

  return commands.map((cmd): SketchCommand => {
    switch (cmd.kind) {
      case 'moveTo':
      case 'lineTo':
      case 'tangentArc':
      case 'smoothSpline': {
        const [x, y] = pointParam(cmd.x, cmd.y);
        return { ...cmd, x, y };
      }
      case 'threePointsArc': {
        const [x, y] = pointParam(cmd.x, cmd.y);
        const [midX, midY] = pointParam(cmd.midX, cmd.midY);
        return { ...cmd, x, y, midX, midY };
      }
      case 'sagittaArc': {
        const [x, y] = pointParam(cmd.x, cmd.y);
        return { ...cmd, x, y, sagitta: toParam(cmd.sagitta.evaluated, cmd.sagitta.unit) };
      }
      case 'bulgeArc': {
        const [x, y] = pointParam(cmd.x, cmd.y);
        return { ...cmd, x, y, bulge: toParam(cmd.bulge.evaluated, cmd.bulge.unit) };
      }
      case 'radiusArc': {
        const [x, y] = pointParam(cmd.x, cmd.y);
        return { ...cmd, x, y, radius: toParam(cmd.radius.evaluated, cmd.radius.unit) };
      }
      case 'spline': {
        const points = cmd.points.map(p => {
          const [x, y] = pointParam(p.x, p.y);
          return { x, y };
        });
        const out: Extract<SketchCommand, { kind: 'spline' }> = { ...cmd, points };
        if (cmd.tension !== undefined) out.tension = toParam(cmd.tension.evaluated, cmd.tension.unit);
        if (cmd.startTangent !== undefined) {
          const [x, y] = vecParam(cmd.startTangent.x, cmd.startTangent.y);
          out.startTangent = { x, y };
        }
        if (cmd.endTangent !== undefined) {
          const [x, y] = vecParam(cmd.endTangent.x, cmd.endTangent.y);
          out.endTangent = { x, y };
        }
        return out;
      }
      case 'nurbsSegment': {
        const controlPoints = cmd.controlPoints.map(p => {
          const [x, y] = pointParam(p.x, p.y);
          return { x, y };
        });
        const out: Extract<SketchCommand, { kind: 'nurbsSegment' }> = {
          ...cmd,
          controlPoints,
          degree: toParam(cmd.degree.evaluated, cmd.degree.unit),
        };
        if (cmd.weights !== undefined) {
          out.weights = cmd.weights.map(w => toParam(w.evaluated, w.unit));
        }
        if (cmd.knots !== undefined) {
          out.knots = cmd.knots.map(k => toParam(k.evaluated, k.unit));
        }
        return out;
      }
      case 'hermiteG2_2d': {
        const [ax, ay] = pointParam(cmd.ax, cmd.ay);
        const [bx, by] = pointParam(cmd.bx, cmd.by);
        const [atx, aty] = vecParam(cmd.atx, cmd.aty);
        const [btx, bty] = vecParam(cmd.btx, cmd.bty);
        const [acx, acy] = cmd.acx !== undefined && cmd.acy !== undefined
          ? vecParam(cmd.acx, cmd.acy)
          : [undefined, undefined];
        const [bcx, bcy] = cmd.bcx !== undefined && cmd.bcy !== undefined
          ? vecParam(cmd.bcx, cmd.bcy)
          : [undefined, undefined];
        return { ...cmd, ax, ay, bx, by, atx, aty, btx, bty, acx, acy, bcx, bcy };
      }
      case 'tangentCircle':
        return { ...cmd, entities: cmd.entities.map(rotateEntity), near: rotateNear(cmd.near) };
      case 'tangentLine':
        return { ...cmd, a: rotateEntity(cmd.a), b: rotateEntity(cmd.b), near: rotateNear(cmd.near) };
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
