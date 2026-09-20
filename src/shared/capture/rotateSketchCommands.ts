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
//
// The per-command switch is split into small kind-group handlers so the
// dispatcher and each handler stay inside the complexity / max-lines ratchet.

import type { Param } from '../intent/types';
import type { SketchCommand } from './sketchCommand';
import type { TangentEntitySpec, TangentNearSpec } from './tangency';
import { toParam } from '../runtime/editableHelpers';

/** The two coordinate transforms shared by every handler. */
type Rotators = {
  pointParam: (p: Param, q: Param) => [Param, Param];
  vecParam: (p: Param, q: Param) => [Param, Param];
};

type PointOnlyCommand = Extract<
  SketchCommand,
  { kind: 'moveTo' | 'lineTo' | 'tangentArc' | 'smoothSpline' }
>;
type ArcCommand = Extract<
  SketchCommand,
  { kind: 'threePointsArc' | 'sagittaArc' | 'bulgeArc' | 'radiusArc' }
>;
type NurbsCommand = Extract<
  SketchCommand,
  { kind: 'spline' | 'nurbsSegment' | 'hermiteG2_2d' }
>;
type TangencyCommand = Extract<
  SketchCommand,
  { kind: 'tangentCircle' | 'tangentLine' | 'close' }
>;

const POINT_ONLY_KINDS: ReadonlySet<SketchCommand['kind']> = new Set([
  'moveTo', 'lineTo', 'tangentArc', 'smoothSpline',
]);
const ARC_KINDS: ReadonlySet<SketchCommand['kind']> = new Set([
  'threePointsArc', 'sagittaArc', 'bulgeArc', 'radiusArc',
]);
const NURBS_KINDS: ReadonlySet<SketchCommand['kind']> = new Set([
  'spline', 'nurbsSegment', 'hermiteG2_2d',
]);

function isPointOnlyCommand(cmd: SketchCommand): cmd is PointOnlyCommand {
  return POINT_ONLY_KINDS.has(cmd.kind);
}
function isArcCommand(cmd: SketchCommand): cmd is ArcCommand {
  return ARC_KINDS.has(cmd.kind);
}
function isNurbsCommand(cmd: SketchCommand): cmd is NurbsCommand {
  return NURBS_KINDS.has(cmd.kind);
}

/** Build the point / direction rotators for one call. */
function createRotators(angleDeg: number, center: [number, number]): Rotators {
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

  return {
    pointParam: (p, q) => {
      const [x, y] = rotatePoint(p.evaluated, q.evaluated);
      return [toParam(x, p.unit), toParam(y, q.unit)];
    },
    vecParam: (p, q) => {
      const [x, y] = rotateVec(p.evaluated, q.evaluated);
      return [toParam(x, p.unit), toParam(y, q.unit)];
    },
  };
}

function rotateEntity(e: TangentEntitySpec, r: Rotators): TangentEntitySpec {
  if (e.kind === 'line') {
    const [x1, y1] = r.pointParam(e.x1, e.y1);
    const [x2, y2] = r.pointParam(e.x2, e.y2);
    return { ...e, x1, y1, x2, y2 };
  }
  const [cx, cy] = r.pointParam(e.cx, e.cy);
  return { ...e, cx, cy };
}

function rotateNear(n: TangentNearSpec | undefined, r: Rotators): TangentNearSpec | undefined {
  if (n === undefined) return undefined;
  const [x, y] = r.pointParam(n.x, n.y);
  return { ...n, x, y };
}

function rotatePointOnlyCommand(cmd: PointOnlyCommand, r: Rotators): SketchCommand {
  const [x, y] = r.pointParam(cmd.x, cmd.y);
  return { ...cmd, x, y };
}

function rotateArcCommand(cmd: ArcCommand, r: Rotators): SketchCommand {
  const [x, y] = r.pointParam(cmd.x, cmd.y);
  if (cmd.kind === 'threePointsArc') {
    const [midX, midY] = r.pointParam(cmd.midX, cmd.midY);
    return { ...cmd, x, y, midX, midY };
  }
  if (cmd.kind === 'sagittaArc') {
    return { ...cmd, x, y, sagitta: toParam(cmd.sagitta.evaluated, cmd.sagitta.unit) };
  }
  if (cmd.kind === 'bulgeArc') {
    return { ...cmd, x, y, bulge: toParam(cmd.bulge.evaluated, cmd.bulge.unit) };
  }
  return { ...cmd, x, y, radius: toParam(cmd.radius.evaluated, cmd.radius.unit) };
}

function rotateSplineCommand(
  cmd: Extract<NurbsCommand, { kind: 'spline' }>,
  r: Rotators,
): SketchCommand {
  const points = cmd.points.map((p) => {
    const [x, y] = r.pointParam(p.x, p.y);
    return { x, y };
  });
  const out: Extract<SketchCommand, { kind: 'spline' }> = { ...cmd, points };
  if (cmd.tension !== undefined) out.tension = toParam(cmd.tension.evaluated, cmd.tension.unit);
  if (cmd.startTangent !== undefined) {
    const [x, y] = r.vecParam(cmd.startTangent.x, cmd.startTangent.y);
    out.startTangent = { x, y };
  }
  if (cmd.endTangent !== undefined) {
    const [x, y] = r.vecParam(cmd.endTangent.x, cmd.endTangent.y);
    out.endTangent = { x, y };
  }
  return out;
}

function rotateNurbsSegmentCommand(
  cmd: Extract<NurbsCommand, { kind: 'nurbsSegment' }>,
  r: Rotators,
): SketchCommand {
  const controlPoints = cmd.controlPoints.map((p) => {
    const [x, y] = r.pointParam(p.x, p.y);
    return { x, y };
  });
  const out: Extract<SketchCommand, { kind: 'nurbsSegment' }> = {
    ...cmd,
    controlPoints,
    degree: toParam(cmd.degree.evaluated, cmd.degree.unit),
  };
  if (cmd.weights !== undefined) {
    out.weights = cmd.weights.map((w) => toParam(w.evaluated, w.unit));
  }
  if (cmd.knots !== undefined) {
    out.knots = cmd.knots.map((k) => toParam(k.evaluated, k.unit));
  }
  return out;
}

function rotateHermiteG2Command(
  cmd: Extract<NurbsCommand, { kind: 'hermiteG2_2d' }>,
  r: Rotators,
): SketchCommand {
  const [ax, ay] = r.pointParam(cmd.ax, cmd.ay);
  const [bx, by] = r.pointParam(cmd.bx, cmd.by);
  const [atx, aty] = r.vecParam(cmd.atx, cmd.aty);
  const [btx, bty] = r.vecParam(cmd.btx, cmd.bty);
  const [acx, acy] = cmd.acx !== undefined && cmd.acy !== undefined
    ? r.vecParam(cmd.acx, cmd.acy)
    : [undefined, undefined];
  const [bcx, bcy] = cmd.bcx !== undefined && cmd.bcy !== undefined
    ? r.vecParam(cmd.bcx, cmd.bcy)
    : [undefined, undefined];
  return { ...cmd, ax, ay, bx, by, atx, aty, btx, bty, acx, acy, bcx, bcy };
}

function rotateNurbsCommand(cmd: NurbsCommand, r: Rotators): SketchCommand {
  if (cmd.kind === 'spline') return rotateSplineCommand(cmd, r);
  if (cmd.kind === 'nurbsSegment') return rotateNurbsSegmentCommand(cmd, r);
  return rotateHermiteG2Command(cmd, r);
}

function rotateTangencyCommand(cmd: TangencyCommand, r: Rotators): SketchCommand {
  if (cmd.kind === 'close') return cmd;
  if (cmd.kind === 'tangentCircle') {
    return {
      ...cmd,
      entities: cmd.entities.map((e) => rotateEntity(e, r)),
      near: rotateNear(cmd.near, r),
    };
  }
  return {
    ...cmd,
    a: rotateEntity(cmd.a, r),
    b: rotateEntity(cmd.b, r),
    near: rotateNear(cmd.near, r),
  };
}

/** Rotate one command by kind group. */
function rotateCommand(cmd: SketchCommand, r: Rotators): SketchCommand {
  if (isPointOnlyCommand(cmd)) return rotatePointOnlyCommand(cmd, r);
  if (isArcCommand(cmd)) return rotateArcCommand(cmd, r);
  if (isNurbsCommand(cmd)) return rotateNurbsCommand(cmd, r);
  return rotateTangencyCommand(cmd, r);
}

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
  const rotators = createRotators(angleDeg, center);
  return commands.map((cmd) => rotateCommand(cmd, rotators));
}
