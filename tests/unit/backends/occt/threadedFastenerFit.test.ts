// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A bolt with a swept ISO V-thread in a nut cut by hole({ thread }), placed in
// phase. At nominal clearance the parts must not interfere: through the public
// `verify({ check: 'dfm' })` clearance gate the exact BREP minimum distance
// between them equals the thread clearance. The control on the same bolt — a
// nut whose thread is cosmetic (a plain minor-diameter bore) — must be reported
// as overlapping, so the gate is known to see a clash here.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { callMcpTool } from '../../../../src/agent/mcp/toolRegistry';
import { isoExternalRidgeProfile, isoMinorRadius } from '../../../../src/kernel/backends/occt/isoThread';

const D = 3;
const P = 0.5;
const CLEARANCE = 0.05;
const NUT_H = 1;

function fastenerScript(modeled: boolean): string {
  const pts = isoExternalRidgeProfile(D, P);
  const chain = pts.slice(1).map(([x, y]) => `.lineTo(${x}, ${y})`).join('');
  return `
    const rMinor = ${isoMinorRadius(D, P)};
    const ridge = path().moveTo(${pts[0][0]}, ${pts[0][1]})${chain}.close()
      .sweep(helix({ radius: rMinor, pitch: ${P}, turns: 6 }), { spine: 'helix' });
    const bolt = cylinder(${7 * P}, rMinor).union(ridge);
    const nut = box(8, 8, ${NUT_H}).translate(-4, -4, 0).hole({ atZ: ${NUT_H}, byNormal: 'Z' }, {
      u: 0, v: 0, diameter: ${D}, depth: 'through',
      thread: { pitch: ${P}, modeled: ${modeled}, clearance: ${CLEARANCE} },
    });
    dfmSpec({ minClearance: ${CLEARANCE * 0.8} });
    const arm = assembly('fit');
    arm.part('bolt', bolt);
    // Top face on a whole pitch (z = 4·P) puts the nut thread in phase with the bolt.
    arm.part('nut', nut, { at: [0, 0, ${4 * P - NUT_H}] });
    return arm.model();
  `;
}

interface DfmOut {
  clearance: Array<{ a: string; b: string; distanceMm: number; status: string; exact: boolean }>;
}

describe('threaded bolt in threaded nut', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('keeps exactly the thread clearance between the parts (zero interference)', async () => {
    const out = (await callMcpTool('verify', { check: 'dfm', code: fastenerScript(true) })) as DfmOut;
    const pair = out.clearance.find((p) => p.a !== p.b)!;
    expect(pair.exact).toBe(true);
    expect(pair.status).toBe('ok');
    expect(pair.distanceMm).toBeCloseTo(CLEARANCE, 3);
  }, 180_000);

  it('reports the cosmetic-thread control as overlapping', async () => {
    const out = (await callMcpTool('verify', { check: 'dfm', code: fastenerScript(false) })) as DfmOut;
    const pair = out.clearance.find((p) => p.a !== p.b)!;
    expect(pair.status).toBe('interfering');
  }, 180_000);
});
