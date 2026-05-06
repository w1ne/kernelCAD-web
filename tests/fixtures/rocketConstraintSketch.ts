import type { Constraint, SketchEntity, SolverState } from '../../src/lib/constraints/types';

export interface PointLike {
  x: number;
  y: number;
}

export const rocketConstraintEntities: SketchEntity[] = [
  { id: 'axis_bottom', type: 'POINT', x: 0, y: -55, fixed: true },
  { id: 'axis_top', type: 'POINT', x: 0, y: 70, fixed: true },
  { id: 'axis', type: 'LINE', p1: 'axis_bottom', p2: 'axis_top' },
  { id: 'nose', type: 'POINT', x: 0, y: 58, fixed: true },
  { id: 'left_shoulder', type: 'POINT', x: -24, y: 34, fixed: true },
  { id: 'right_shoulder', type: 'POINT', x: 17, y: 28, fixed: false },
  { id: 'left_fin_tip', type: 'POINT', x: -54.2, y: -42.1, fixed: true },
  { id: 'left_fin_root', type: 'POINT', x: -22, y: -22, fixed: true },
  { id: 'right_fin_tip', type: 'POINT', x: 30, y: -46, fixed: false },
  { id: 'right_fin_root', type: 'POINT', x: 18, y: -19, fixed: false },
  { id: 'left_fin_edge', type: 'LINE', p1: 'left_fin_root', p2: 'left_fin_tip' },
  { id: 'right_fin_edge', type: 'LINE', p1: 'right_fin_root', p2: 'right_fin_tip' },
  { id: 'window_center', type: 'POINT', x: 7, y: 24, fixed: false },
  { id: 'outer_window', type: 'CIRCLE', center: 'window_center', radius: 8 },
  { id: 'inner_window_center', type: 'POINT', x: 11, y: 20, fixed: false },
  { id: 'inner_window', type: 'CIRCLE', center: 'inner_window_center', radius: 4 },
  { id: 'skin_center', type: 'POINT', x: -19, y: 34, fixed: false },
  { id: 'nose_skin', type: 'CIRCLE', center: 'skin_center', radius: 10 },
  { id: 'nose_tangent', type: 'LINE', p1: 'left_shoulder', p2: 'nose' },
];

export const rocketConstraintList: Constraint[] = [
  { id: 'right_shoulder_sym', type: 'SYMMETRIC', entities: ['left_shoulder', 'right_shoulder', 'axis'] },
  { id: 'right_fin_tip_sym', type: 'SYMMETRIC', entities: ['left_fin_tip', 'right_fin_tip', 'axis'] },
  { id: 'right_fin_root_sym', type: 'SYMMETRIC', entities: ['left_fin_root', 'right_fin_root', 'axis'] },
  { id: 'window_distance_from_nose', type: 'DISTANCE', entities: ['axis_top', 'window_center'], value: 46 },
  { id: 'window_rings', type: 'CONCENTRIC', entities: ['outer_window', 'inner_window'] },
  { id: 'fin_angle', type: 'ANGLE', entities: ['right_fin_edge'], value: -32 },
  { id: 'nose_tangent_skin', type: 'TANGENT', entities: ['nose_skin', 'nose_tangent'] },
];

export function cloneRocketConstraintEntities(): SketchEntity[] {
  return rocketConstraintEntities.map((entity) => ({ ...entity }));
}

export function cloneRocketConstraintList(): Constraint[] {
  return rocketConstraintList.map((constraint) => ({
    ...constraint,
    entities: [...constraint.entities],
  }));
}

export function createRocketConstraintState(): SolverState {
  return {
    entities: new Map(cloneRocketConstraintEntities().map((entity) => [entity.id, entity])),
    constraints: cloneRocketConstraintList(),
  };
}

export function pointDistance(a: PointLike, b: PointLike): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function lineAngleDeg(a: PointLike, b: PointLike): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}

export function pointLineDistance(point: PointLike, a: PointLike, b: PointLike): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.abs(dy * point.x - dx * point.y + b.x * a.y - b.y * a.x) / Math.hypot(dx, dy);
}
