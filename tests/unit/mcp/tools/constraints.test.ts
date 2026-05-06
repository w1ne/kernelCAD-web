import { describe, expect, it } from 'vitest';
import type { ConstraintType, SketchEntity } from '../../../../src/lib/constraints/types';
import {
  addConstraintTool,
  listConstraintsTool,
  solveSketchTool,
  SUPPORTED_CONSTRAINT_TYPES,
} from '../../../../src/mcp/tools/constraints';

function entity<T extends SketchEntity>(entities: SketchEntity[], id: string): T {
  const found = entities.find(e => e.id === id);
  if (!found) throw new Error(`Missing entity ${id}`);
  return found as T;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function angleDeg(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}

function pointLineDistance(
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.abs(dy * point.x - dx * point.y + b.x * a.y - b.y * a.x) / Math.hypot(dx, dy);
}

describe('MCP constraint tools', () => {
  it('solves a distance constraint and returns serializable entities', async () => {
    const result = await solveSketchTool({
      entities: [
        { id: 'p1', type: 'POINT', x: 0, y: 0, fixed: true },
        { id: 'p2', type: 'POINT', x: 10, y: 0, fixed: false },
      ],
      constraints: [
        { id: 'c1', type: 'DISTANCE', entities: ['p1', 'p2'], value: 20 },
      ],
    });

    expect(result.ok).toBe(true);
    expect(entity<{ x: number; type: 'POINT' }>(result.entities, 'p2').x).toBeCloseTo(20, 3);
    expect(result.constraints).toHaveLength(1);
  });

  it('solves concentric circles and symmetric point pairs', async () => {
    const result = await solveSketchTool({
      entities: [
        { id: 'center_a', type: 'POINT', x: 0, y: 0, fixed: true },
        { id: 'center_b', type: 'POINT', x: 5, y: 0, fixed: false },
        { id: 'circle_a', type: 'CIRCLE', center: 'center_a', radius: 5 },
        { id: 'circle_b', type: 'CIRCLE', center: 'center_b', radius: 2 },
        { id: 'axis_a', type: 'POINT', x: 0, y: -10, fixed: true },
        { id: 'axis_b', type: 'POINT', x: 0, y: 10, fixed: true },
        { id: 'axis', type: 'LINE', p1: 'axis_a', p2: 'axis_b' },
        { id: 'left', type: 'POINT', x: -4, y: 3, fixed: true },
        { id: 'right', type: 'POINT', x: 7, y: 2, fixed: false },
      ],
      constraints: [
        { id: 'concentric', type: 'CONCENTRIC', entities: ['circle_a', 'circle_b'] },
        { id: 'symmetric', type: 'SYMMETRIC', entities: ['left', 'right', 'axis'] },
      ],
    });

    expect(result.ok).toBe(true);
    const centerB = entity<{ x: number; y: number; type: 'POINT' }>(result.entities, 'center_b');
    const right = entity<{ x: number; y: number; type: 'POINT' }>(result.entities, 'right');
    expect(centerB.x).toBeCloseTo(0, 3);
    expect(centerB.y).toBeCloseTo(0, 3);
    expect(right.x).toBeCloseTo(4, 3);
    expect(right.y).toBeCloseTo(3, 3);
  });

  it('rejects duplicate entity ids before solving', async () => {
    const result = await solveSketchTool({
      entities: [
        { id: 'p1', type: 'POINT', x: 0, y: 0, fixed: true },
        { id: 'p1', type: 'POINT', x: 10, y: 0, fixed: false },
      ],
      constraints: [],
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Duplicate entity id');
  });

  it('rejects constraints that reference missing entities', async () => {
    const result = await solveSketchTool({
      entities: [{ id: 'p1', type: 'POINT', x: 0, y: 0, fixed: true }],
      constraints: [{ id: 'c1', type: 'DISTANCE', entities: ['p1', 'p2'], value: 10 }],
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('references missing entity "p2"');
  });

  it('returns validation errors for malformed list inputs instead of throwing', async () => {
    await expect(solveSketchTool({
      entities: { id: 'p1' } as unknown as SketchEntity[],
      constraints: [] as const,
    })).resolves.toMatchObject({
      ok: false,
      errors: ['entities must be an array.'],
    });

    await expect(addConstraintTool({
      constraints: { id: 'c1' } as unknown as [],
      constraint: { id: 'c2', type: 'HORIZONTAL', entities: ['p1', 'p2'] },
    })).resolves.toMatchObject({
      ok: false,
      errors: ['constraints must be an array.'],
    });
  });

  it('adds valid constraints without mutating the input list', async () => {
    const existing = [{ id: 'c1', type: 'HORIZONTAL' as const, entities: ['p1', 'p2'] }];
    const result = await addConstraintTool({
      constraints: existing,
      constraint: { id: 'c2', type: 'VERTICAL', entities: ['p3', 'p4'] },
    });

    expect(result.ok).toBe(true);
    expect(result.constraints.map(c => c.id)).toEqual(['c1', 'c2']);
    expect(existing).toHaveLength(1);
  });

  it('rejects invalid add-constraint arity and unknown types', async () => {
    await expect(addConstraintTool({
      constraints: [],
      constraint: { id: 'bad', type: 'DISTANCE', entities: ['p1'] },
    })).resolves.toMatchObject({ ok: false });

    await expect(addConstraintTool({
      constraints: [],
      constraint: { id: 'bad', type: 'LOCKED' as ConstraintType, entities: ['p1'] },
    })).resolves.toMatchObject({ ok: false });
  });

  it('lists the complete supported constraint vocabulary', async () => {
    const result = await listConstraintsTool({
      constraints: [{ id: 'c1', type: 'ANGLE', entities: ['l1'], value: 45 }],
    });

    expect(result.ok).toBe(true);
    expect(result.supportedTypes).toEqual(SUPPORTED_CONSTRAINT_TYPES);
    expect(result.supportedTypes).toEqual([
      'COINCIDENT',
      'DISTANCE',
      'HORIZONTAL',
      'VERTICAL',
      'PARALLEL',
      'PERPENDICULAR',
      'EQUAL_LENGTH',
      'TANGENT',
      'RADIUS',
      'ANGLE',
      'CONCENTRIC',
      'SYMMETRIC',
    ]);
    expect(result.constraints).toHaveLength(1);
  });

  it('adds, lists, and solves the rocket-keychain constraint vocabulary', async () => {
    let constraints: Array<{ id: string; type: ConstraintType; entities: string[]; value?: number }> = [];

    for (const constraint of [
      { id: 'sym', type: 'SYMMETRIC' as const, entities: ['left', 'right', 'axis'] },
      { id: 'rings', type: 'CONCENTRIC' as const, entities: ['outer_window', 'inner_window'] },
      { id: 'fin_angle', type: 'ANGLE' as const, entities: ['fin'], value: -32 },
      { id: 'tangent', type: 'TANGENT' as const, entities: ['skin', 'nose_line'] },
      { id: 'section', type: 'DISTANCE' as const, entities: ['axis_top', 'window_center'], value: 46 },
    ]) {
      const added = await addConstraintTool({ constraints, constraint });
      expect(added.ok).toBe(true);
      constraints = added.constraints;
    }

    const listed = await listConstraintsTool({ constraints });
    expect(listed.supportedTypes).toEqual(SUPPORTED_CONSTRAINT_TYPES);
    expect(listed.constraints.map(c => c.type)).toEqual(['SYMMETRIC', 'CONCENTRIC', 'ANGLE', 'TANGENT', 'DISTANCE']);

    const solved = await solveSketchTool({
      entities: [
        { id: 'axis_bottom', type: 'POINT', x: 0, y: -55, fixed: true },
        { id: 'axis_top', type: 'POINT', x: 0, y: 70, fixed: true },
        { id: 'axis', type: 'LINE', p1: 'axis_bottom', p2: 'axis_top' },
        { id: 'left', type: 'POINT', x: -24, y: 34, fixed: true },
        { id: 'right', type: 'POINT', x: 14, y: 31, fixed: false },
        { id: 'window_center', type: 'POINT', x: 7, y: 24, fixed: false },
        { id: 'inner_window_center', type: 'POINT', x: 9, y: 21, fixed: false },
        { id: 'outer_window', type: 'CIRCLE', center: 'window_center', radius: 8 },
        { id: 'inner_window', type: 'CIRCLE', center: 'inner_window_center', radius: 4 },
        { id: 'fin_root', type: 'POINT', x: 22, y: -22, fixed: true },
        { id: 'fin_tip', type: 'POINT', x: 30, y: -46, fixed: false },
        { id: 'fin', type: 'LINE', p1: 'fin_root', p2: 'fin_tip' },
        { id: 'skin_center', type: 'POINT', x: -19, y: 34, fixed: false },
        { id: 'skin', type: 'CIRCLE', center: 'skin_center', radius: 10 },
        { id: 'nose', type: 'POINT', x: 0, y: 58, fixed: true },
        { id: 'left_shoulder', type: 'POINT', x: -24, y: 34, fixed: true },
        { id: 'nose_line', type: 'LINE', p1: 'left_shoulder', p2: 'nose' },
      ],
      constraints,
    });

    expect(solved.ok).toBe(true);
    const right = entity<{ x: number; y: number; type: 'POINT' }>(solved.entities, 'right');
    const windowCenter = entity<{ x: number; y: number; type: 'POINT' }>(solved.entities, 'window_center');
    const innerWindowCenter = entity<{ x: number; y: number; type: 'POINT' }>(solved.entities, 'inner_window_center');
    const axisTop = entity<{ x: number; y: number; type: 'POINT' }>(solved.entities, 'axis_top');
    const finRoot = entity<{ x: number; y: number; type: 'POINT' }>(solved.entities, 'fin_root');
    const finTip = entity<{ x: number; y: number; type: 'POINT' }>(solved.entities, 'fin_tip');
    const skinCenter = entity<{ x: number; y: number; type: 'POINT' }>(solved.entities, 'skin_center');
    const leftShoulder = entity<{ x: number; y: number; type: 'POINT' }>(solved.entities, 'left_shoulder');
    const nose = entity<{ x: number; y: number; type: 'POINT' }>(solved.entities, 'nose');

    expect(right.x).toBeCloseTo(24, 2);
    expect(distance(axisTop, windowCenter)).toBeCloseTo(46, 1);
    expect(innerWindowCenter.x).toBeCloseTo(windowCenter.x, 2);
    expect(innerWindowCenter.y).toBeCloseTo(windowCenter.y, 2);
    expect(angleDeg(finRoot, finTip)).toBeCloseTo(-32, 1);
    expect(pointLineDistance(skinCenter, leftShoulder, nose)).toBeCloseTo(10, 1);
  });
});
