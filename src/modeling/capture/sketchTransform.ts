// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/sketchTransform.ts
//
// `Sketch.translate` / `Sketch.rotate` / `Sketch.scale`: a similarity
// transform (move, turn, uniform resize) of a captured sketch's command list.
//
// Like `reflectSketchCommands`, the mapping is SYMBOLIC. A point maps to
//
//   x' = cx + dx + a·(x − cx) − b·(y − cy)
//   y' = cy + dy + b·(x − cx) + a·(y − cy)
//
// with a = k·cos θ and b = k·sin θ, built as ParamRef expressions. A ParamRef
// coordinate, delta, centre or scale factor therefore stays live and the
// dispatcher re-evaluates it at lower time; plain numbers fold back to plain
// numbers. The rotation angle is the one exception: the expression language
// has no sin/cos, so the angle must be a plain number.
//
// A similarity keeps handedness and maps circles to circles, so every arc
// stays an exact arc on the same side of its chord: lengths that encode an arc
// (sagitta, radius, tangent-circle radius) scale by k and a bulge factor is
// unchanged.
import type { FeatureId, Param } from '../../shared/intent/types';
import { isValidEditableNumber } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { isParamRef, type Editable, type ParamRefExpr } from '../../shared/runtime/paramRef';
import { currentValue, paramExpr, paramFromExpr, toParam } from '../../shared/runtime/editableHelpers';
import type { SketchCommand } from '../../shared/capture/sketchCommand';
import { mapSmoothSplineTangents } from '../../shared/capture/smoothSplineTangents';
import type { TangentEntitySpec, TangentNearSpec } from '../../shared/capture/tangency';
import type { CaptureSession } from './captureSession';
import type { Sketch } from './sketch';

type EditablePair = [Editable<number>, Editable<number>];

/** Point / direction / length maps shared by the command handlers. */
interface SimilarityMap {
  point: (x: Param, y: Param) => [Param, Param];
  /** Direction or derivative vector: turned and scaled, never shifted. */
  vec: (x: Param, y: Param) => [Param, Param];
  /** Signed length that encodes an arc (sagitta, radius): scaled only. */
  length: (p: Param) => Param;
}

const lit = (value: number): ParamRefExpr => ({ kind: 'lit', value });
const isLit = (e: ParamRefExpr, value: number): boolean => e.kind === 'lit' && e.value === value;

// Identity-aware constructors: `1·x`, `0·x`, `x + 0` and `x − 0` collapse even
// when `x` is symbolic, so a translate of a param()-driven sketch records
// `(w + dx)` rather than `((0 + dx) + ((1 * (w - 0)) - (0 * (y - 0))))`.
function add(left: ParamRefExpr, right: ParamRefExpr): ParamRefExpr {
  if (isLit(left, 0)) return right;
  if (isLit(right, 0)) return left;
  return { kind: 'binop', op: '+', left, right };
}
function sub(left: ParamRefExpr, right: ParamRefExpr): ParamRefExpr {
  if (isLit(right, 0)) return left;
  if (isLit(left, 0)) return { kind: 'neg', expr: right };
  return { kind: 'binop', op: '-', left, right };
}
function mul(left: ParamRefExpr, right: ParamRefExpr): ParamRefExpr {
  if (isLit(left, 0) || isLit(right, 0)) return lit(0);
  if (isLit(left, 1)) return right;
  if (isLit(right, 1)) return left;
  return { kind: 'binop', op: '*', left, right };
}

interface SimilaritySpec {
  /** Matrix terms a = k·cos θ, b = k·sin θ. */
  a: ParamRefExpr;
  b: ParamRefExpr;
  /** Multiplier for arc lengths: k, always positive. */
  k: ParamRefExpr;
  center: [ParamRefExpr, ParamRefExpr];
  delta: [ParamRefExpr, ParamRefExpr];
}

function similarityMap(spec: SimilaritySpec): SimilarityMap {
  const { a, b, k, center: [cx, cy], delta: [dx, dy] } = spec;
  return {
    point: (x, y) => {
      const rx = sub(paramExpr(x), cx);
      const ry = sub(paramExpr(y), cy);
      return [
        paramFromExpr(add(add(cx, dx), sub(mul(a, rx), mul(b, ry))), x.unit),
        paramFromExpr(add(add(cy, dy), add(mul(b, rx), mul(a, ry))), y.unit),
      ];
    },
    vec: (x, y) => {
      const vx = paramExpr(x);
      const vy = paramExpr(y);
      return [
        paramFromExpr(sub(mul(a, vx), mul(b, vy)), x.unit),
        paramFromExpr(add(mul(b, vx), mul(a, vy)), y.unit),
      ];
    },
    length: (p) => paramFromExpr(mul(k, paramExpr(p)), p.unit),
  };
}

function mapEntity(e: TangentEntitySpec, m: SimilarityMap): TangentEntitySpec {
  if (e.kind === 'line') {
    const [x1, y1] = m.point(e.x1, e.y1);
    const [x2, y2] = m.point(e.x2, e.y2);
    return { ...e, x1, y1, x2, y2 };
  }
  const [cx, cy] = m.point(e.cx, e.cy);
  return { ...e, cx, cy, r: m.length(e.r) };
}

function mapNear(n: TangentNearSpec | undefined, m: SimilarityMap): TangentNearSpec | undefined {
  if (n === undefined) return undefined;
  const [x, y] = m.point(n.x, n.y);
  return { ...n, x, y };
}

function mapXY<T extends { x: Param; y: Param }>(p: T, m: SimilarityMap, kind: 'point' | 'vec'): T {
  const [x, y] = m[kind](p.x, p.y);
  return { ...p, x, y };
}

function mapOptionalVec(
  x: Param | undefined,
  y: Param | undefined,
  m: SimilarityMap,
): [Param | undefined, Param | undefined] {
  return x !== undefined && y !== undefined ? m.vec(x, y) : [x, y];
}

type CommandOf<K extends SketchCommand['kind']> = Extract<SketchCommand, { kind: K }>;

function mapHermite(cmd: CommandOf<'hermiteG2_2d'>, m: SimilarityMap): SketchCommand {
  // Tangents and curvatures are the first and second derivative of the
  // quintic at each end, so they transform as vectors.
  const [ax, ay] = m.point(cmd.ax, cmd.ay);
  const [bx, by] = m.point(cmd.bx, cmd.by);
  const [atx, aty] = m.vec(cmd.atx, cmd.aty);
  const [btx, bty] = m.vec(cmd.btx, cmd.bty);
  const [acx, acy] = mapOptionalVec(cmd.acx, cmd.acy, m);
  const [bcx, bcy] = mapOptionalVec(cmd.bcx, cmd.bcy, m);
  return { ...cmd, ax, ay, bx, by, atx, aty, btx, bty, acx, acy, bcx, bcy };
}

function mapSpline(cmd: CommandOf<'spline'>, m: SimilarityMap): SketchCommand {
  return {
    ...cmd,
    points: cmd.points.map((p) => mapXY(p, m, 'point')),
    ...(cmd.startTangent ? { startTangent: mapXY(cmd.startTangent, m, 'vec') } : {}),
    ...(cmd.endTangent ? { endTangent: mapXY(cmd.endTangent, m, 'vec') } : {}),
  };
}

/** One handler per command kind. The record is exhaustive over
 *  `SketchCommand['kind']`, so a new kind cannot silently skip the transform. */
type Mapper<K extends SketchCommand['kind']> = (
  cmd: CommandOf<K>,
  m: SimilarityMap,
  prev: SketchCommand | undefined,
) => SketchCommand;

const MAPPERS: { [K in SketchCommand['kind']]: Mapper<K> } = {
  moveTo: (cmd, m) => mapXY(cmd, m, 'point'),
  lineTo: (cmd, m) => mapXY(cmd, m, 'point'),
  // tangentArc inherits its start tangent from the previous segment, which is
  // transformed too.
  tangentArc: (cmd, m) => mapXY(cmd, m, 'point'),
  // The free tangents of a smoothSpline default to the sketch +X direction,
  // so the mapped direction is written into the command.
  smoothSpline: (cmd, m, prev) => ({ ...mapXY(cmd, m, 'point'), ...mapSmoothSplineTangents(cmd, prev, m.vec) }),
  threePointsArc: (cmd, m) => {
    const [midX, midY] = m.point(cmd.midX, cmd.midY);
    return { ...mapXY(cmd, m, 'point'), midX, midY };
  },
  sagittaArc: (cmd, m) => ({ ...mapXY(cmd, m, 'point'), sagitta: m.length(cmd.sagitta) }),
  // A bulge factor is tan(angle / 4): a ratio, unchanged by a similarity.
  bulgeArc: (cmd, m) => mapXY(cmd, m, 'point'),
  radiusArc: (cmd, m) => ({ ...mapXY(cmd, m, 'point'), radius: m.length(cmd.radius) }),
  spline: mapSpline,
  // Degree, weights and knots are invariant under an affine map.
  nurbsSegment: (cmd, m) => ({ ...cmd, controlPoints: cmd.controlPoints.map((p) => mapXY(p, m, 'point')) }),
  hermiteG2_2d: mapHermite,
  tangentCircle: (cmd, m) => ({
    ...cmd,
    entities: cmd.entities.map((e) => mapEntity(e, m)),
    ...(cmd.radius ? { radius: m.length(cmd.radius) } : {}),
    near: mapNear(cmd.near, m),
  }),
  tangentLine: (cmd, m) => ({ ...cmd, a: mapEntity(cmd.a, m), b: mapEntity(cmd.b, m), near: mapNear(cmd.near, m) }),
  close: (cmd) => cmd,
};

function mapCommand(cmd: SketchCommand, m: SimilarityMap, prev: SketchCommand | undefined): SketchCommand {
  return (MAPPERS[cmd.kind] as Mapper<SketchCommand['kind']>)(cmd as never, m, prev);
}

const editableExpr = (v: Editable<number>): ParamRefExpr => paramExpr(toParam(v, 'mm'));
const ORIGIN: [ParamRefExpr, ParamRefExpr] = [lit(0), lit(0)];

/** cos and sin of `angleDeg`, exact at every quarter turn (cos 90° is 0, not 6e-17). */
function cosSin(angleDeg: number): [number, number] {
  const quarter = (((angleDeg / 90) % 4) + 4) % 4;
  if (Number.isInteger(quarter)) return ([[1, 0], [0, 1], [-1, 0], [0, -1]] as const)[quarter] as [number, number];
  const rad = (angleDeg * Math.PI) / 180;
  return [Math.cos(rad), Math.sin(rad)];
}

type TransformName = 'translate' | 'rotate' | 'scale';

const SIGNATURE: Record<TransformName, string> = {
  translate: 'Sketch.translate(dx, dy)',
  rotate: 'Sketch.rotate(angleDeg, center?)',
  scale: 'Sketch.scale(factor, center?)',
};
const EXAMPLE: Record<TransformName, string> = {
  translate: 'path().circle(0, 0, 3).translate(10, 10)',
  rotate: 'profile.rotate(45, [20, 10])',
  scale: 'profile.scale(1.5, [20, 10])',
};

function requireEditable(name: TransformName, path: string, value: unknown, id: FeatureId): void {
  if (!isValidEditableNumber(value)) {
    invalidArgs({
      api: SIGNATURE[name], path, got: value, showType: true,
      requires: 'a finite number or a numeric param()', unit: 'mm',
      example: EXAMPLE[name], featureId: id,
    });
  }
}

function centerExprs(
  name: TransformName,
  center: unknown,
  id: FeatureId,
): [ParamRefExpr, ParamRefExpr] {
  if (center === undefined || center === null) return ORIGIN;
  if (!Array.isArray(center) || center.length !== 2 || !center.every(isValidEditableNumber)) {
    invalidArgs({
      api: SIGNATURE[name], path: 'center', got: center, showType: !Array.isArray(center),
      requires: 'an [x, y] pair of finite numbers or numeric param() values; omit it for the sketch origin',
      unit: 'mm', example: EXAMPLE[name], featureId: id,
    });
  }
  const [cx, cy] = center as EditablePair;
  return [editableExpr(cx), editableExpr(cy)];
}

/** Commands of sketch `id`, or a refusal when it carries no path commands
 *  (text and face-bound projected sketches are not built from a command list). */
function pathCommands(name: TransformName, id: FeatureId, session: CaptureSession): SketchCommand[] {
  const record = session.getRecords().find((r) => r.id === id);
  const commands = (record?.metadata as { commands?: SketchCommand[] } | undefined)?.commands;
  if (!Array.isArray(commands) || commands.length === 0) {
    invalidArgs({
      api: SIGNATURE[name], path: 'sketch',
      gotText: 'a sketch without path commands (sketch.text or a projected face-bound sketch)',
      requires:
        'a profile from path(), reflect, offset, a sketch boolean, sectionSketch, faceSketch, silhouette or a DXF/SVG import; '
        + 'place text with the position and rotation options of sketch.text, and transform other cases as a solid after the extrude',
      example: EXAMPLE[name], featureId: id,
    });
  }
  return commands;
}

function emit(
  name: TransformName,
  id: FeatureId,
  session: CaptureSession,
  spec: SimilaritySpec,
): Sketch {
  const map = similarityMap(spec);
  const commands = pathCommands(name, id, session).map((cmd, i, all) => mapCommand(cmd, map, all[i - 1]));
  return session.createSketch({
    kind: 'sketch',
    inputs: { source: { kind: 'feature', id } },
    params: {},
    metadata: { commands },
  });
}

/** Move the profile of sketch `id` by `(dx, dy)` mm. */
export function translateSketchOf(id: FeatureId, session: CaptureSession, dx: unknown, dy: unknown): Sketch {
  requireEditable('translate', 'dx', dx, id);
  requireEditable('translate', 'dy', dy, id);
  return emit('translate', id, session, {
    a: lit(1), b: lit(0), k: lit(1), center: ORIGIN,
    delta: [editableExpr(dx as Editable<number>), editableExpr(dy as Editable<number>)],
  });
}

/** Turn the profile of sketch `id` counter-clockwise by `angleDeg` about `center`. */
export function rotateSketchOf(id: FeatureId, session: CaptureSession, angleDeg: unknown, center: unknown): Sketch {
  if (typeof angleDeg !== 'number' || !Number.isFinite(angleDeg)) {
    invalidArgs({
      api: SIGNATURE.rotate, path: 'angleDeg', got: isParamRef(angleDeg) ? undefined : angleDeg,
      ...(isParamRef(angleDeg) ? { gotText: `a param() value (${angleDeg.$param})` } : { showType: true }),
      requires:
        'a finite plain number: a sketch rotation angle cannot be a param(), because parameter expressions have no sin/cos. '
        + 'For a param()-driven angle, extrude the sketch and use Shape.rotate',
      unit: 'deg', example: EXAMPLE.rotate, featureId: id,
    });
  }
  const [cos, sin] = cosSin(angleDeg);
  return emit('rotate', id, session, {
    a: lit(cos), b: lit(sin), k: lit(1), center: centerExprs('rotate', center, id), delta: ORIGIN,
  });
}

/** Resize the profile of sketch `id` uniformly by `factor` about `center`. */
export function scaleSketchOf(id: FeatureId, session: CaptureSession, factor: unknown, center: unknown): Sketch {
  const valid = isValidEditableNumber(factor)
    && currentValue(factor as Editable<number>, session.paramTable) > 0;
  if (!valid) {
    invalidArgs({
      api: SIGNATURE.scale, path: 'factor', got: isParamRef(factor) ? undefined : factor,
      ...(isParamRef(factor)
        ? { gotText: `${currentValue(factor as Editable<number>, session.paramTable)} (from ${factor.$param})` }
        : { showType: typeof factor !== 'number' }),
      requires: 'a finite number > 0 or a numeric param(); 1 keeps the size, 2 doubles every length. Use reflect to mirror',
      unit: 'ratio', example: EXAMPLE.scale, featureId: id,
    });
  }
  const k = paramExpr(toParam(factor as Editable<number>, 'unitless'));
  return emit('scale', id, session, {
    a: k,
    b: lit(0),
    // A symbolic factor could later be edited below zero. A point then maps
    // through the centre (a half turn, same handedness), so arc lengths take
    // the magnitude and every arc keeps its side.
    k: k.kind === 'lit' ? k : { kind: 'abs', expr: k },
    center: centerExprs('scale', center, id),
    delta: ORIGIN,
  });
}
