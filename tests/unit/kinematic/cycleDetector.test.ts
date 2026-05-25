// tests/unit/kinematic/cycleDetector.test.ts
//
// Closed-loop classifier for the kinematic dispatcher (v1 rejects parallel /
// closed-loop chains per D4; only open serial chains run through the IK
// solvers).

import { describe, it, expect } from 'vitest';
import { cycleDetector } from '../../../src/kinematic/cycleDetector';
import { buildSpherical6DOF } from './fixtures/spherical6DOF';
import { buildClosedLoop4Bar } from './fixtures/closedLoop4Bar';

describe('cycleDetector', () => {
  it('reports no cycle on an open 6-DOF serial chain', () => {
    const { arm } = buildSpherical6DOF();
    const r = cycleDetector(arm);
    expect(r.hasCycle).toBe(false);
    expect(r.cycleNodes).toEqual([]);
  });

  it('reports a cycle on a 4-bar closed-loop linkage and names the offending joints', () => {
    const { arm } = buildClosedLoop4Bar();
    const r = cycleDetector(arm);
    expect(r.hasCycle).toBe(true);
    // The two joints that share the `coupler` child both contribute to the
    // closure — the detector reports the parts and joints that participate.
    expect(r.cycleNodes.length).toBeGreaterThan(0);
    const named = r.cycleNodes.join(',');
    expect(named).toMatch(/crank.*ToCoupler/);
  });
});
