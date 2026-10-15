// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { routeWires } from './routeWires';

const drawbot = JSON.parse(readFileSync(new URL('../../../../tests/fixtures/argon/handoff-drawbot.json', import.meta.url), 'utf8'));

describe('routeWires', () => {
  it('estimates direct and orthogonal route length and bends', () => {
    const result = routeWires({ wires: [
      { id: 'direct', from_pos_mm: [0, 0, 0], to_pos_mm: [3, 4, 0] },
      { id: 'orthogonal', from_pos_mm: [0, 0, 0], to_pos_mm: [3, 4, 0] },
    ] });
    expect(result.routes[0]).toMatchObject({ length_mm: 7, bend_count: 1 });
    expect(result.routes[1].length_mm).toBe(7);
    expect(result.routes.every(route => route.points_mm.every((point, index, points) => index === 0 || point.some((value, axis) => value !== points[index - 1][axis]) && point.filter((value, axis) => value !== points[index - 1][axis]).length === 1))).toBe(true);
  });

  it('routes around obstacles and includes the requested wire clearance', () => {
    const result = routeWires({
      wires: [{ from: 'U1.3V3', to: 'U2.VCC', from_pos_mm: [0, 0, 0], to_pos_mm: [10, 0, 0], diameter_mm: 1 }],
      obstacles: [{ id: 'board', min_mm: [4, -1, -1], max_mm: [6, 1, 2] }], clearance_mm: 1,
    });
    expect(result.routes[0].bend_count).toBeGreaterThan(0);
    expect(result.routes[0].length_mm).toBeGreaterThan(10);
    expect(result.routes[0].collisions).toEqual([]);
    expect(result.routes[0].clearance_violations).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('uses the Argon LabWired fixture and reports unresolved wire endpoints', () => {
    const result = routeWires({ handoff: drawbot });
    expect(result.routes.length).toBeGreaterThan(0);
    expect(result.unresolved_wire_count).toBeGreaterThan(0);
    expect(result.warnings.some(warning => warning.includes('J1.-'))).toBe(true);
    expect(result.routes.filter(route => route.route_found).every(route => Number.isFinite(route.length_mm))).toBe(true);
    expect(result.routes.filter(route => route.route_found).every(route => Number.isInteger(route.bend_count))).toBe(true);
    const firstPositionedPin = drawbot.parts.find(part => part.ref === 'A1').pins.find(pin => pin.name === '3V3').pos_mm;
    const routeFromPin = result.routes.find(route => route.from?.ref === 'A1' && route.from?.pin === '3V3');
    expect(routeFromPin?.points_mm[0].slice(0, 2)).toEqual(firstPositionedPin);
    expect(result.ok).toBe(false);
    expect(result.warnings.some(warning => warning.includes('Part M1') && warning.includes('clearance analysis is incomplete'))).toBe(true);
    expect(result.warnings.some(warning => warning.includes('2D handoff endpoints without board_surface_z_mm'))).toBe(true);
  });

  it('uses explicit wires in preference to handoff wires while retaining handoff obstacles', () => {
    const handoff = {
      schema: 'labwired-kernelcad-handoff/0.1',
      parts: [{ ref: 'case', position_mm: { value: [20, 20, 20] }, physical: { bbox_mm: [2, 2, 2] } }],
      wires: [{ from: { ref: 'A', pin: '1', pos_mm: [0, 0, 0] }, to: { ref: 'B', pin: '1', pos_mm: [5, 0, 0] } }],
    } as const;
    const result = routeWires({ handoff, wires: [{ id: 'explicit', from_pos_mm: [1, 0, 0], to_pos_mm: [6, 0, 0] }] });
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]).toMatchObject({ id: 'explicit', length_mm: 5 });
    expect(result.obstacles_used).toBe(1);
  });

  it('requires an explicit board surface Z to reconcile 2D handoff endpoints', () => {
    const handoff = {
      schema: 'labwired-kernelcad-handoff/0.1',
      parts: [{ ref: 'placed', position_mm: { value: [0, 0] }, rotation_deg: { value: 0 }, pins: [], physical: { bbox_mm: [2, 2, 2] } }],
      wires: [{ from: { ref: 'A', pin: '1', pos_mm: [5, 5] }, to: { ref: 'B', pin: '1', pos_mm: [10, 5] } }],
    } as const;
    const incomplete = routeWires({ handoff });
    expect(incomplete.ok).toBe(false);
    expect(incomplete.routes[0].points_mm[0]).toEqual([5, 5, 0]);
    expect(incomplete.warnings.some(warning => warning.includes('board_surface_z_mm'))).toBe(true);
    const reconciled = routeWires({ handoff, board_surface_z_mm: 1 });
    expect(reconciled.ok).toBe(true);
    expect(reconciled.routes[0].points_mm[0]).toEqual([5, 5, 1]);

    const belowBoard = routeWires({
      handoff: { ...handoff, wires: [{ from: { ref: 'A', pin: '1', pos_mm: [0, 0, -0.5] }, to: { ref: 'B', pin: '1', pos_mm: [5, 0, -0.5] } }] },
      board_surface_z_mm: 0,
      clearance_mm: 0,
    });
    expect(belowBoard.routes[0].route_found).toBe(true);
    expect(belowBoard.routes[0].collisions).toEqual([]);
    expect(belowBoard.routes[0].clearance_violations).toEqual([]);
  });

  it('keeps tilted XY-only part boxes resting on the board surface', () => {
    const handoff = {
      schema: 'labwired-kernelcad-handoff/0.1',
      parts: [{ ref: 'tilted', position_mm: { value: [0, 0] }, rotation_deg: { value: [45, 0, 0] }, pins: [], physical: { bbox_mm: [4, 4, 10] } }],
      wires: [{ from: { ref: 'P1', pin: '1', pos_mm: [0, 0, 4.5] }, to: { ref: 'P2', pin: '1', pos_mm: [5, 0, 4.5] } }],
    } as const;
    const result = routeWires({ handoff, board_surface_z_mm: 5, clearance_mm: 0 });
    expect(result.routes[0].route_found).toBe(true);
    expect(result.routes[0].collisions).toEqual([]);
  });

  it('reports physical collisions separately from clearance-envelope failures', () => {
    const result = routeWires({
      wires: [{ from_pos_mm: [-0.05, 0.5, 0.5], to_pos_mm: [3, 3, 0.5], diameter_mm: 0.2 }],
      clearance_mm: 0,
      obstacles: [{ id: 'nearby', min_mm: [0, 0, 0], max_mm: [1, 1, 1] }],
    });
    expect(result.ok).toBe(false);
    expect(result.routes[0].route_found).toBe(false);
    expect(result.routes[0].route_failure).toContain('clearance envelope');
    expect(result.routes[0].collisions).toEqual([]);
    expect(result.routes[0].clearance_violations).toEqual(['nearby']);
  });

  it('rejects overlong handoff coordinates instead of truncating them', () => {
    const handoff = {
      schema: 'labwired-kernelcad-handoff/0.1', parts: [],
      wires: [{ from: { ref: 'P1', pin: '1', pos_mm: [1, 2, 3, 4] }, to: { ref: 'P2', pin: '1', pos_mm: [5, 6] } }],
    } as unknown as Parameters<typeof routeWires>[0]['handoff'];
    expect(() => routeWires({ handoff })).toThrow(/exactly 2 or 3 finite coordinates/);
  });

  it('uses fallback handoff pin coordinates as absolute board XY', () => {
    const handoff = {
      schema: 'labwired-kernelcad-handoff/0.1',
      parts: [{ ref: 'A1', position_mm: { value: [100, 200, 50] }, rotation_deg: { value: 90 }, pins: [{ name: '3V3', pos_mm: [5, 6] }], physical: { bbox_mm: [2, 2, 1] } }],
      wires: [{ from: { ref: 'A1', pin: '3V3' }, to: { ref: 'P2', pin: '1', pos_mm: [10, 6] } }],
    } as const;
    const result = routeWires({ handoff, board_surface_z_mm: 12 });
    expect(result.routes[0].points_mm[0]).toEqual([5, 6, 12]);
    expect(result.routes[0].points_mm.at(-1)).toEqual([10, 6, 12]);
    expect(result.ok).toBe(true);
  });

  it('routes from a pin inside its owning part clearance envelope', () => {
    const handoff = {
      schema: 'labwired-kernelcad-handoff/0.1',
      parts: [{ ref: 'U1', position_mm: { value: [0, 0, 0] }, rotation_deg: { value: 0 }, pins: [{ name: '1', pos_mm: [0, 0, 0] }], physical: { bbox_mm: [4, 4, 4] } }],
      wires: [{ from: { ref: 'U1', pin: '1' }, to: { ref: 'P1', pin: '1', pos_mm: [10, 0, 0] } }],
    } as const;
    const result = routeWires({ handoff, clearance_mm: 0 });
    expect(result.routes[0].route_found).toBe(true);
    expect(result.routes[0].points_mm[0]).toEqual([0, 0, 0]);
    expect(result.routes[0].collisions).not.toContain('U1');
    expect(result.routes[0].clearance_violations).not.toContain('U1');
  });

  it('routes between pins in one owner by exiting and re-entering its box', () => {
    const result = routeWires({
      wires: [{ from: { ref: 'U1', pin: '1' }, to: { ref: 'U1', pin: '2' }, from_pos_mm: [0, 0, 0], to_pos_mm: [1, 0, 0] }],
      obstacles: [{ id: 'U1', min_mm: [-2, -2, -2], max_mm: [2, 2, 2] }],
      clearance_mm: 0,
    });
    expect(result.routes[0].route_found).toBe(true);
    expect(result.routes[0].length_mm).toBeGreaterThan(1);
    expect(result.routes[0].points_mm.some(point => point.some((coordinate, axis) => coordinate < [-2, -2, -2][axis] || coordinate > [2, 2, 2][axis]))).toBe(true);
    expect(result.routes[0].collisions).toEqual([]);
    expect(result.routes[0].clearance_violations).toEqual([]);
  });

  it('routes around an endpoint owner after granting endpoint access', () => {
    const handoff = {
      schema: 'labwired-kernelcad-handoff/0.1',
      parts: [{ ref: 'U1', position_mm: { value: [0, 0, 0] }, rotation_deg: { value: 0 }, pins: [{ name: '1', pos_mm: [0, 0, 0] }], physical: { bbox_mm: [4, 4, 4] } }],
      wires: [{ from: { ref: 'U1', pin: '1' }, to: { ref: 'P1', pin: '1', pos_mm: [10, 0, 0] } }],
    } as const;
    const result = routeWires({ handoff, obstacles: [{ id: 'blocker', min_mm: [5, -1, -1], max_mm: [6, 1, 1] }], clearance_mm: 0 });
    expect(result.routes[0].route_found).toBe(true);
    expect(result.routes[0].collisions).not.toContain('U1');
    expect(result.routes[0].clearance_violations).not.toContain('U1');
  });

  it('keeps endpoint owner boxes in pathfinding obstacles to prevent re-entry', () => {
    const handoff = {
      schema: 'labwired-kernelcad-handoff/0.1',
      parts: [{ ref: 'U1', position_mm: { value: [0, 0, 0] }, rotation_deg: { value: 0 }, pins: [{ name: '1', pos_mm: [0, 0, 0] }], physical: { bbox_mm: [4, 4, 4] } }],
      wires: [{ from: { ref: 'U1', pin: '1' }, to: { ref: 'P1', pin: '1', pos_mm: [10, 0, 0] } }],
    } as const;
    // The blocker forces a detour. The path must stay outside U1 after
    // leaving the pin instead of cutting back through its interior.
    const result = routeWires({
      handoff,
      obstacles: [{ id: 'blocker', min_mm: [5, -1, -1], max_mm: [6, 1, 1] }],
      clearance_mm: 0,
    });
    expect(result.routes[0].route_found).toBe(true);
    expect(result.routes[0].collisions).not.toContain('U1');
    expect(result.routes[0].clearance_violations).not.toContain('U1');
  });

  it('transforms part boxes by rotation and XYZ placement', () => {
    const handoff = {
      schema: 'labwired-kernelcad-handoff/0.1',
      parts: [{ ref: 'rotated', position_mm: { value: [10, 20, 30] }, rotation_deg: { value: [0, 0, 90] }, pins: [], physical: { bbox_mm: [4, 2, 6] } }],
      wires: [{ from: { ref: 'P1', pin: '1', pos_mm: [10, 20, 30] }, to: { ref: 'P2', pin: '1', pos_mm: [20, 20, 30] } }],
    } as const;
    const result = routeWires({ handoff, clearance_mm: 0, bend_radius_mm: 1 });
    expect(result.routes[0].collisions).toContain('rotated');
    expect(result.ok).toBe(false);
  });

  it('finds a clear orthogonal path around multiple obstacles', () => {
    const result = routeWires({
      wires: [{ from_pos_mm: [0, 0, 0], to_pos_mm: [10, 0, 0], diameter_mm: 0.1 }],
      clearance_mm: 0,
      obstacles: [
        { id: 'left', min_mm: [2, -1, -1], max_mm: [4, 1, 1] },
        { id: 'right', min_mm: [6, -1, -1], max_mm: [8, 1, 1] },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.routes[0].collisions).toEqual([]);
    expect(result.routes[0].bend_count).toBeGreaterThan(0);
  });

  it('rejects malformed explicit obstacle bounds', () => {
    expect(() => routeWires({
      wires: [{ from_pos_mm: [0, 0, 0], to_pos_mm: [1, 1, 1] }],
      obstacles: [{ id: 'bad', min_mm: [2, 0, 0], max_mm: [1, 1, 1] }],
    })).toThrow(/min_mm must be less than or equal to max_mm/);
    expect(() => routeWires({
      wires: [{ from_pos_mm: [0, 0, 0], to_pos_mm: [1, 1, 1] }],
      obstacles: [{ id: 'bad', min_mm: [0, Number.NaN, 0], max_mm: [1, 1, 1] }],
    })).toThrow(/finite 3D/);
  });

  it('fails explicitly when endpoint placement leaves no collision-free route', () => {
    const result = routeWires({
      wires: [{ from_pos_mm: [1, 1, 1], to_pos_mm: [10, 10, 10] }],
      obstacles: [{ id: 'endpoint', min_mm: [0, 0, 0], max_mm: [2, 2, 2] }],
    });
    expect(result.ok).toBe(false);
    expect(result.routes[0]).toMatchObject({ route_found: false, points_mm: [], length_mm: null, bend_count: null });
    expect(result.routes[0].route_failure).toContain('endpoint lies within the clearance envelope');
  });

  it('returns a bounded graph failure for excessive obstacle counts', () => {
    const obstacles = Array.from({ length: 20 }, (_, index) => ({
      id: `box-${index}`,
      min_mm: [index * 10 + 100, index * 10 + 100, index * 10 + 100] as [number, number, number],
      max_mm: [index * 10 + 101, index * 10 + 101, index * 10 + 101] as [number, number, number],
    }));
    const result = routeWires({ wires: [{ from_pos_mm: [0, 0, 0], to_pos_mm: [1, 1, 1] }], obstacles, clearance_mm: 0 });
    expect(result.ok).toBe(false);
    expect(result.routes[0].route_found).toBe(false);
    expect(result.routes[0].route_failure).toContain('visibility graph would exceed');
  });

  it('deduplicates overlapping obstacle coordinates before applying the graph bound', () => {
    const obstacles = Array.from({ length: 300 }, (_, index) => ({
      id: `duplicate-${index}`,
      min_mm: [50, 50, 50] as [number, number, number],
      max_mm: [51, 51, 51] as [number, number, number],
    }));
    const result = routeWires({ wires: [{ from_pos_mm: [0, 0, 0], to_pos_mm: [10, 0, 0] }], obstacles, clearance_mm: 0 });
    expect(result.routes[0].route_found).toBe(true);
    expect(result.routes[0].route_failure).toBeUndefined();
    expect(result.ok).toBe(true);
  });

  it('reports endpoint collisions against a part box', () => {
    const result = routeWires({ wires: [{ from_pos_mm: [1, 1, 1], to_pos_mm: [10, 1, 1] }], obstacles: [{ id: 'part', min_mm: [0, 0, 0], max_mm: [2, 2, 2] }] });
    expect(result.ok).toBe(false);
    expect(result.routes[0].collisions).toContain('part');
  });
});
