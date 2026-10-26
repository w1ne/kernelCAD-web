// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// 'full' catalog fasteners carry modeled threads, sockets and chamfers. Fit
// and clash checks must still read a bolt in its clearance hole, and a bolt
// in its nut, as clean: they measure the nominal envelope (analysisBody).
import { beforeAll, describe, expect, it } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { OcctBackend, analysisBodyOf, initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import type { SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { detectInterferences } from '../../../src/modeling/runtime/detectInterferences';
import { planStack, resolvePart } from '../../../src/modeling/parts/familyTable';
import { fastenerSolid } from '../../../src/modeling/parts/fastenerGeometry';

const SLOW = 240_000;

// Two 6 mm bars clamped by an M5 stack through 5.5 mm clearance holes.
const BOLTED_JOINT = `
const gripMm = 12, barT = 6, edge = 12, seat = 8 + gripMm;
const top = box(44, 22, barT, true).translate(-edge, 0, seat - barT / 2)
  .hole('top', { u: edge, v: 0, diameter: 5.5, depth: 'through' });
const bottom = box(44, 22, barT, true).translate(edge, 0, 8 + barT / 2)
  .hole('top', { u: -edge, v: 0, diameter: 5.5, depth: 'through' });
const stack = await lib.stack({ thread: 'M5', gripMm, mode: 'bolt' });
const a = assembly('joint');
a.part('upper-bar', top);
a.part('lower-bar', bottom);
a.part('screw', stack.screw.translate(0, 0, seat));
a.part('head-washer', stack.headWasher.translate(0, 0, seat));
a.part('tail-washer', stack.tailWasher.translate(0, 0, seat));
a.part('hex-nut', stack.nut.translate(0, 0, seat));
return a.model();
`;

function extents(shape: OcctBackend): number[] {
  const { min, max } = shape.boundingBox({ exact: true });
  return [...min, ...max];
}

describe("'full' fasteners in an assembly", () => {
  let scene: SceneBackend;
  beforeAll(async () => {
    const model = await buildModel({ fileName: 'joint.kcad.ts', code: BOLTED_JOINT });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    scene = model.rootShape as SceneBackend;
  }, SLOW);

  it('reads a full bolt in its clearance holes and its nut as clash-free', () => {
    const result = detectInterferences(scene, 0.01, new Set());
    expect(result.pairs).toEqual([]);
  });

  it('checks the threaded parts through their nominal envelopes', () => {
    const screw = scene.parts.find((p) => p.name === 'screw')!;
    const nut = scene.parts.find((p) => p.name === 'hex-nut')!;
    const plan = planStack({ thread: 'M5', gripMm: 12, mode: 'bolt' });
    const members = new Map(plan.members.map((m) => [m.role, m.part]));
    for (const [placed, part] of [[screw, members.get('screw')!], [nut, members.get('nut')!]] as const) {
      const body = analysisBodyOf(placed.shape) as OcctBackend;
      expect(body).not.toBe(placed.shape);
      expect(body.volume()).toBeCloseTo(fastenerSolid(part, 'envelope').volume(), 3);
      // The display solid is the threaded one, not the envelope.
      expect(Math.abs((placed.shape as OcctBackend).volume() - body.volume())).toBeGreaterThan(1);
    }
  });
});

describe("'full' versus 'envelope' solids", () => {
  beforeAll(async () => {
    await initOcct();
  });

  it.each([
    // Ratios: a modeled ISO thread keeps ~0.78 of a nominal-Ø rod; a
    // socket, chamfers and a dome take the rest.
    ['socket-head-cap-screw', 'M6', 30, 0.78, 0.88],
    ['hex-head-bolt', 'M8', 40, 0.8, 0.95],
    ['button-head-cap-screw', 'M5', 12, 0.62, 0.78],
    ['flat-head-countersunk', 'M6', 20, 0.78, 0.92],
    ['set-screw', 'M8', 12, 0.66, 0.8],
  ])('%s %s x%s keeps its envelope extents and loses socket and thread volume', (family, thread, lengthMm, lo, hi) => {
    const part = resolvePart({ family, thread, lengthMm });
    const full = fastenerSolid(part, 'full');
    const envelope = fastenerSolid(part, 'envelope');
    const ratio = full.volume() / envelope.volume();
    expect(ratio).toBeGreaterThan(lo);
    expect(ratio).toBeLessThan(hi);
    // Same axial extent and no growth past the envelope's footprint.
    const [fx0, fy0, fz0, fx1, fy1, fz1] = extents(full);
    const [ex0, ey0, ez0, ex1, ey1, ez1] = extents(envelope);
    expect(fz0).toBeCloseTo(ez0, 1);
    // A button head's socket opens through the dome apex (ISO 7380).
    expect(fz1).toBeLessThanOrEqual(ez1 + 0.01);
    expect(fz1).toBeGreaterThan(ez1 - 0.25);
    for (const [f, e] of [[fx0, ex0], [fy0, ey0]]) expect(f).toBeGreaterThanOrEqual(e - 0.05);
    for (const [f, e] of [[fx1, ex1], [fy1, ey1]]) expect(f).toBeLessThanOrEqual(e + 0.05);
  }, SLOW);

  it('gives an ISO 4032 nut more material than its nominal-bore envelope', () => {
    const part = resolvePart({ family: 'hex-nut', thread: 'M8' });
    expect(part.headHeightMm).toBe(6.8);
    const full = fastenerSolid(part, 'full');
    const envelope = fastenerSolid(part, 'envelope');
    const [, , z0, , , z1] = extents(full);
    expect(z0).toBeCloseTo(0, 2);
    expect(z1).toBeCloseTo(6.8, 2);
    // The thread fills part of the Ø8 bore; the face chamfers take a little.
    expect(full.volume()).toBeGreaterThan(envelope.volume());
    expect(full.volume()).toBeLessThan(envelope.volume() * 1.15);
  }, SLOW);
});

describe('bolt stack length: ISO 4032 nut and thread past the nut', () => {
  // Length = head washer + grip + tail washer + nut + protrusionPitches × P,
  // rounded up to a stocked length; the tip is measured from the nut's
  // outer face.
  function tipPastNut(plan: ReturnType<typeof planStack>): number {
    const screw = plan.members.find((m) => m.role === 'screw')!;
    const nut = plan.members.find((m) => m.role === 'nut')!;
    return nut.offsetZ - (screw.offsetZ - screw.part.lengthMm);
  }

  it('leaves at least two pitches out of the M5 lap-joint nut', () => {
    const plan = planStack({ thread: 'M5', gripMm: 12, mode: 'bolt' });
    // 1 + 12 + 1 + 4.7 + 1.6 = 20.3: an M5 x 20 would leave 1.3 mm.
    expect(plan.lengthMm).toBe(25);
    expect(tipPastNut(plan)).toBeGreaterThanOrEqual(1.6);
    expect(plan.protrusionMm).toBeCloseTo(tipPastNut(plan), 6);
  });

  it('needs an M8 x 35 for a 21.8 mm grip', () => {
    // 1.6 + 21.8 + 1.6 + 6.8 + 2.5 = 34.3 mm.
    const plan = planStack({ thread: 'M8', gripMm: 21.8, mode: 'bolt' });
    expect(plan.lengthMm).toBe(35);
    expect(plan.members.find((m) => m.role === 'nut')!.part.headHeightMm).toBe(6.8);
    expect(tipPastNut(plan)).toBeCloseTo(3.2, 6);
  });

  it('takes protrusionPitches as an option', () => {
    // Zero pitches: 1.6 + 21.8 + 1.6 + 6.8 = 31.8, still past M8 x 30.
    expect(planStack({ thread: 'M8', gripMm: 21.8, mode: 'bolt', protrusionPitches: 0 }).lengthMm).toBe(35);
    expect(planStack({ thread: 'M8', gripMm: 19, mode: 'bolt', protrusionPitches: 0 }).lengthMm).toBe(30);
    expect(planStack({ thread: 'M8', gripMm: 19, mode: 'bolt' }).lengthMm).toBe(35);
    expect(() => planStack({ thread: 'M5', gripMm: 12, mode: 'bolt', protrusionPitches: -1 })).toThrow(/protrusionPitches/);
  });

  it('refuses a grip no stocked length can reach instead of picking a short bolt', () => {
    // M2: 0.3 + 17.5 + 0.3 + 1.6 + 0.8 = 20.5 > 20 mm, the longest stocked.
    expect(() => planStack({ thread: 'M2', gripMm: 17.5, mode: 'bolt' })).toThrow(
      /needs a 20\.5 mm screw \(including 0\.8 mm of thread past the nut\), the longest stocked is 20 mm/,
    );
    const flush = planStack({ thread: 'M2', gripMm: 17.5, mode: 'bolt', protrusionPitches: 0 });
    expect(flush.lengthMm).toBe(20);
    expect(tipPastNut(flush)).toBeCloseTo(0.3, 6);
  });

  it('does not add protrusion to a screw-mode stack', () => {
    const plan = planStack({ thread: 'M5', gripMm: 12, mode: 'screw' });
    expect(plan.lengthMm).toBe(12);
    expect(plan.protrusionMm).toBeUndefined();
  });
});
