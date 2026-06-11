// Tests for fetch-time connector synthesis from a STEP inspection report.

import { describe, it, expect } from 'vitest';
import { synthesizeConnectorsFromReport } from './synthesizeConnectors';
import type { StepInspectReport } from '../../agent/inspect/inspectStep';

// A motor-plate-like solid: 40×40×5 mm with four corner mounting holes and a
// central bore (the largest-diameter hole).
const REPORT: StepInspectReport = {
  file: 'mount.step',
  solidCount: 1,
  solids: [
    {
      index: 0,
      name: null,
      bboxExact: { min: [-20, -20, 0], max: [20, 20, 5] },
      volumeMm3: 7000,
      faceCount: 18,
      holes: [
        { axisOrigin: [-15, -15, 5], axisDirection: [0, 0, -1], diameterMm: 3.2, depthMm: 5, kind: 'through', faceCount: 1 },
        { axisOrigin: [15, -15, 5], axisDirection: [0, 0, -1], diameterMm: 3.2, depthMm: 5, kind: 'through', faceCount: 1 },
        { axisOrigin: [-15, 15, 5], axisDirection: [0, 0, -1], diameterMm: 3.2, depthMm: 5, kind: 'through', faceCount: 1 },
        { axisOrigin: [15, 15, 5], axisDirection: [0, 0, -1], diameterMm: 3.2, depthMm: 5, kind: 'through', faceCount: 1 },
        { axisOrigin: [0, 0, 5], axisDirection: [0, 0, -1], diameterMm: 8, depthMm: 5, kind: 'through', faceCount: 1 },
      ],
    },
  ],
};

describe('synthesizeConnectorsFromReport', () => {
  it('emits bbox faces, a distinct central bore, and one bolt-holes-N per fastener hole', () => {
    const c = synthesizeConnectorsFromReport(REPORT, 'mount');
    const names = c.map((x) => x.name);
    expect(names).toContain('mating-face');
    expect(names).toContain('top-face');
    expect(names).toContain('bore');
    // 4 corner fastener holes; the Ø8 centre is the bore, NOT a 5th bolt hole.
    expect(names.filter((n) => n.startsWith('bolt-holes-'))).toHaveLength(4);
  });

  it('collapses coaxial hole segments (counterbore/seam splits) into one bolt hole', () => {
    // Two Ø3.2 segments on the same (x, y) axis at different z — one physical hole.
    const report: StepInspectReport = {
      file: 'plate.step',
      solidCount: 1,
      solids: [
        {
          index: 0,
          name: null,
          bboxExact: { min: [-10, -10, 0], max: [10, 10, 6] },
          volumeMm3: 2000,
          faceCount: 10,
          holes: [
            { axisOrigin: [5, 5, 6], axisDirection: [0, 0, -1], diameterMm: 6, depthMm: 2, kind: 'blind', faceCount: 1 },
            { axisOrigin: [5, 5, 4], axisDirection: [0, 0, -1], diameterMm: 3.2, depthMm: 4, kind: 'through', faceCount: 1 },
          ],
        },
      ],
    };
    const c = synthesizeConnectorsFromReport(report, 'plate');
    // One axis line → at most one bolt-hole (plus the bore alias), never two.
    expect(c.filter((x) => x.name.startsWith('bolt-holes-')).length).toBeLessThanOrEqual(1);
  });

  it('places mating-face at bbox min-Z and top-face at max-Z', () => {
    const c = synthesizeConnectorsFromReport(REPORT, 'mount');
    expect(c.find((x) => x.name === 'mating-face')!.origin).toEqual([0, 0, 0]);
    expect(c.find((x) => x.name === 'top-face')!.origin).toEqual([0, 0, 5]);
  });

  it('binds bore to the largest-diameter hole (the Ø8 centre, not a Ø3.2 corner)', () => {
    const bore = synthesizeConnectorsFromReport(REPORT, 'mount').find((x) => x.name === 'bore')!;
    expect(bore.origin).toEqual([0, 0, 5]);
  });

  it('numbers bolt holes deterministically by (x, y)', () => {
    const a = synthesizeConnectorsFromReport(REPORT, 'mount');
    const b = synthesizeConnectorsFromReport(REPORT, 'mount');
    const names = (r: typeof a) => r.filter((x) => x.name.startsWith('bolt-holes-')).map((x) => `${x.name}@${x.origin.join(',')}`);
    expect(names(a)).toEqual(names(b)); // stable across re-fetch
    expect(a.find((x) => x.name === 'bolt-holes-1')!.origin).toEqual([-15, -15, 5]);
  });

  it('returns nothing for an empty report', () => {
    expect(synthesizeConnectorsFromReport({ file: 'e.step', solidCount: 0, solids: [] }, 'e')).toEqual([]);
  });
});
