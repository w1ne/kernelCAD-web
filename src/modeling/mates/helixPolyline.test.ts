// src/modeling/mates/helixPolyline.test.ts
//
// P11 Slice 3 — helixPolylineRouted spirals a coil along a wrap-routed
// centerline. A 2-point centerline must reproduce the straight
// helixPolyline exactly (back-compat); a multi-waypoint centerline must
// bend through its waypoints with endpoints landing exactly on the ends.

import { describe, it, expect } from 'vitest';
import { helixPolyline, helixPolylineRouted } from './helixPolyline';

const dist = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('helixPolylineRouted', () => {
  it('reduces to the straight helix for a 2-point centerline', () => {
    const a: [number, number, number] = [0, 0, 0];
    const b: [number, number, number] = [100, 0, 0];
    const straight = helixPolyline(a, b, 6, 8);
    const routed = helixPolylineRouted([a, b], 6, 8);
    expect(routed.length).toBe(straight.length);
    for (let i = 0; i < straight.length; i++) {
      expect(dist(routed[i], straight[i])).toBeLessThan(1e-9);
    }
  });

  it('bends through an interior waypoint (routed path hugs the kink)', () => {
    const a: [number, number, number] = [0, 0, 0];
    const w: [number, number, number] = [50, 0, 40]; // lifted waypoint
    const b: [number, number, number] = [100, 0, 0];
    const routed = helixPolylineRouted([a, w, b], 6, 8);
    // Some sample near the middle of the coil must sit near the waypoint
    // height (the straight a→b chord stays at z≈0, so z≈40 proves routing).
    const maxZ = Math.max(...routed.map((p) => p[2]));
    expect(maxZ).toBeGreaterThan(30);
    // The straight helix would never reach that height.
    const straightMaxZ = Math.max(...helixPolyline(a, b, 6, 8).map((p) => p[2]));
    expect(straightMaxZ).toBeLessThan(10);
  });

  it('lands exactly on the first and last centerline points', () => {
    const a: [number, number, number] = [3, -2, 1];
    const w: [number, number, number] = [40, 5, 30];
    const b: [number, number, number] = [90, 0, 2];
    const routed = helixPolylineRouted([a, w, b], 8, 7);
    expect(dist(routed[0], a)).toBeLessThan(1e-9);
    expect(dist(routed[routed.length - 1], b)).toBeLessThan(1e-9);
    // No NaN anywhere.
    for (const p of routed) {
      expect(Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2])).toBe(true);
    }
  });

  it('drops duplicate consecutive waypoints without throwing', () => {
    const a: [number, number, number] = [0, 0, 0];
    const b: [number, number, number] = [100, 0, 0];
    const routed = helixPolylineRouted([a, a, [50, 0, 0], b, b], 5, 6);
    expect(routed.length).toBeGreaterThan(2);
    expect(dist(routed[0], a)).toBeLessThan(1e-9);
    expect(dist(routed[routed.length - 1], b)).toBeLessThan(1e-9);
  });
});
