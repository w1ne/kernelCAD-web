// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// review_cad contradiction: a butt hinge whose leaves share 1.13 mm³ (knuckle
// tessellation) was classified contact-noise / actionable: false in
// interferenceSummary, yet the pose envelope emitted three blocking
// assembly.pose-envelope.interference errors and ok: false, while evaluate's
// mechanism check passed it. One rule now (isActionableOverlap): face contact
// is non-blocking everywhere; a real overlap (this one is 0.31 mm thick)
// blocks everywhere.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

const HINGE = `// Butt hinge: two 40 x 27 x 2 leaves, 5 knuckles' worth simplified to 3 (A-B-A),
// Ø3 pin in Ø3.2 knuckle bores, revolute about the X axis.
const len = 40, leafW = 27, t = 2;
const kOD = 6, kID = 3.2, pinD = 3, axGap = 0.4;
const tube = (x0: number, x1: number) =>
  cylinder(x1 - x0, kOD / 2).subtract(cylinder(x1 - x0 + 2, kID / 2).translate(0, 0, -1)).rotateY(90).translate(x0, 0, 0);
const seg = len / 3;
// Leaf A: plate on -Y, outer knuckles
let leafA = box(len, leafW, t).translate(0, -leafW - 2, -t / 2);
leafA = union(leafA, tube(0, seg - axGap / 2), tube(2 * seg + axGap / 2, len));
// Leaf B: plate on +Y, middle knuckle
let leafB = box(len, leafW, t).translate(0, 2, -t / 2);
leafB = union(leafB, tube(seg + axGap / 2, 2 * seg - axGap / 2));
// The leaf plate must not hit the other leaf's knuckles: notch each plate where the other's knuckles sit
leafA = leafA.subtract(box(seg + axGap, 4, t + 2).translate(seg - axGap / 2, -4, -t / 2 - 1));
leafB = leafB.subtract(box(seg + axGap / 2, 4, t + 2).translate(-1, 1.5, -t / 2 - 1));
leafB = leafB.subtract(box(seg + 1, 4, t + 2).translate(2 * seg - axGap / 2, 1.5, -t / 2 - 1));
const pin = cylinder(len, pinD / 2).rotateY(90);

const arm = assembly('hinge');
arm.part('leafA', leafA, { material: 'steel' })
  .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] })
  .connector('pinSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
arm.part('leafB', leafB, { material: 'steel' })
  .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
arm.part('pin', pin, { material: 'steel' })
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
arm.mate('hinge', 'leafA.axis', 'leafB.axis', 'revolute', { limitsDeg: [-90, 90] });
arm.mate('pin-fixed', 'leafA.pinSeat', 'pin.seat', 'fastened');
return arm.model();
`;

const CLASH = `
  const rig = assembly('clash');
  rig.part('p', box(10, 10, 10)).connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  rig.part('q', box(10, 10, 10).translate(5, 0, 0)).connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  rig.mate('m', 'p.c', 'q.c', 'revolute', { limitsDeg: [-30, 30] });
  return rig.model();
`;

describe('review_cad: contact-noise classification and blocking use one rule', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('the hinge leaf overlap (1.13 mm³, 0.31 mm thick) gets one verdict: actionable in the summary AND blocking in the pose envelope', async () => {
    const r = await reviewCadTool({ code: HINGE });
    const summary = r.interferenceSummary!;
    expect(summary.rawCount).toBeGreaterThan(0);
    expect(summary.actionableCount).toBe(summary.rawCount);
    expect(summary.pairs.every((p) => p.actionable)).toBe(true);
    expect(r.diagnostics.some((d) => d.severity === 'error' && d.code === 'assembly.interference.overlap')).toBe(true);
    expect(r.diagnostics.some((d) => d.severity === 'error' && d.code === 'assembly.pose-envelope.interference')).toBe(true);
    expect(r.ok).toBe(false);
  }, 180000);

  it('a real overlap is actionable in the summary AND blocking', async () => {
    const r = await reviewCadTool({ code: CLASH });
    expect(r.interferenceSummary!.actionableCount).toBeGreaterThan(0);
    expect(r.diagnostics.some((d) => d.severity === 'error' && /interference/.test(d.code))).toBe(true);
    expect(r.ok).toBe(false);
  }, 180000);
});
