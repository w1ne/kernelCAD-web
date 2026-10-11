// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pure ISO metric thread data: the ISO 261 pitch table, the 'M6x1' parser and
// the transverse thread section the modelled `threadedRod` sweeps.
import { describe, expect, it } from 'vitest';
import {
  externalThreadSection,
  externalThreadSectionArea,
  isoThreadInfo,
  type SectionStep,
} from '../../../src/modeling/threads';

describe('isoThreadInfo — ISO 261 pitch table and spec parser', () => {
  it.each([
    ['M2', 0.4], ['M2.5', 0.45], ['M3', 0.5], ['M4', 0.7], ['M5', 0.8], ['M6', 1], ['M8', 1.25],
    ['M10', 1.5], ['M12', 1.75], ['M14', 2], ['M16', 2], ['M18', 2.5], ['M20', 2.5], ['M22', 2.5], ['M24', 3],
  ])('%s takes the coarse pitch %s', (spec, pitch) => {
    const t = isoThreadInfo(spec);
    expect(t.pitch).toBe(pitch);
    expect(t.coarse).toBe(true);
    expect(t.standard).toBe(true);
    expect(t.spec).toBe(`${spec}x${pitch}`);
  });

  it('parses explicit pitches and normalises the designation', () => {
    expect(isoThreadInfo('M6x0.75')).toMatchObject({ diameter: 6, pitch: 0.75, coarse: false, standard: true, spec: 'M6x0.75' });
    expect(isoThreadInfo(' m8 × 1 ')).toMatchObject({ diameter: 8, pitch: 1, standard: true, spec: 'M8x1' });
    expect(isoThreadInfo('M6x1')).toMatchObject({ coarse: true });
    // A jar neck: any size with an explicit pitch, flagged non-standard.
    expect(isoThreadInfo('M70x4')).toMatchObject({ diameter: 70, pitch: 4, coarse: false, standard: false });
  });

  it('derives the ISO 68-1 basic diameters and the tap drill', () => {
    const t = isoThreadInfo('M6');
    expect(t.minorDiameter).toBeCloseTo(6 - 1.082532, 5);
    expect(t.pitchDiameter).toBeCloseTo(6 - 0.649519, 5);
    expect(t.tapDrill).toBe(5);
    expect(t.threadDepth).toBeCloseTo(0.541266, 5);
  });

  it('rejects unknown coarse sizes, over-coarse pitches and garbage with an example', () => {
    expect(() => isoThreadInfo('M9')).toThrow(/M9x<pitch>/);
    expect(() => isoThreadInfo('M6x3')).toThrow(/pitch ≤ diameter \/ 4/);
    expect(() => isoThreadInfo('6mm')).toThrow(/ISO metric designation/);
    expect(() => isoThreadInfo(6)).toThrow(/isoThread\('M6'\)/);
  });
});

/** Independent ISO 68-1 profile: radius at axial offset `s` from a ridge
 *  centre, for the basic external thread pulled in by clearance `c`. */
function rho(D: number, P: number, c: number, s: number): number {
  const H = (Math.sqrt(3) / 2) * P;
  const rMin = D / 2 - (5 / 8) * H;
  const flank = rMin + ((3 / 8) * P - c / Math.cos(Math.PI / 6) - Math.abs(s)) / Math.tan(Math.PI / 6);
  return Math.max(rMin, Math.min(D / 2 - c, flank));
}

/** Section radius at polar angle θ: s = −P·θ/2π, wrapped to one pitch. */
function rhoAt(D: number, P: number, c: number, theta: number): number {
  const wrapped = Math.atan2(Math.sin(theta), Math.cos(theta));
  return rho(D, P, c, (-P * wrapped) / (2 * Math.PI));
}

function stepEnd(st: SectionStep): [number, number] {
  return st.kind === 'moveTo' ? st.p : st.kind === 'arc' ? st.to : st.points[st.points.length - 1];
}

describe('externalThreadSection — transverse section of an ISO external thread', () => {
  it.each([['M3', 0], ['M6', 0], ['M6', 0.08], ['M64x4', 0.2]] as const)('%s (clearance %s) lies on the ISO profile, closes, and has the analytic area', (spec, c) => {
    const t = isoThreadInfo(spec);
    const steps = externalThreadSection(t, c);
    // Every vertex, arc midpoint and spline knot sits on the ISO profile.
    const onProfile = ([x, y]: [number, number]) =>
      expect(Math.hypot(x, y)).toBeCloseTo(rhoAt(t.diameter, t.pitch, c, Math.atan2(y, x)), 9);
    for (const st of steps) {
      if (st.kind === 'moveTo') onProfile(st.p);
      else if (st.kind === 'arc') { onProfile(st.to); onProfile(st.via); }
      else st.points.forEach(onProfile);
    }
    // Closed: the last flank ends where the crest arc started.
    const first = stepEnd(steps[0]);
    const last = stepEnd(steps[steps.length - 1]);
    expect(Math.hypot(first[0] - last[0], first[1] - last[1])).toBeLessThan(1e-9);
    // Area ½∮ρ² dθ, integrated numerically from the independent profile.
    const N = 200_000;
    let area = 0;
    for (let i = 0; i < N; i++) area += 0.5 * rhoAt(t.diameter, t.pitch, c, ((i + 0.5) / N) * 2 * Math.PI) ** 2 * (2 * Math.PI / N);
    expect(externalThreadSectionArea(t, c)).toBeCloseTo(area, 6);
  });

  it('puts the ridge centre (crest) on +X and the root opposite', () => {
    const t = isoThreadInfo('M6');
    const crest = externalThreadSection(t, 0)[1];
    expect(crest.kind).toBe('arc');
    if (crest.kind === 'arc') expect(crest.via).toEqual([3, 0]);
    const root = externalThreadSection(t, 0)[3];
    if (root.kind === 'arc') {
      expect(root.via[0]).toBeCloseTo(-t.minorDiameter / 2, 12);
      expect(root.via[1]).toBeCloseTo(0, 12);
    }
  });
});
