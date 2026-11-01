// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Result parsers on logs captured from real OpenFOAM v2406 runs
// (tests/fixtures/cfd): the Poiseuille pipe and the Re 50 sphere.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lastValue, parseCheckMesh, parseDatTable, parseSolverLog, parseVtkPolyData } from '../../../src/kernel/cfd/parsers';
import { convergenceVerdict, decimate, drift, massBalance, pressureDrop, tailStats } from '../../../src/kernel/cfd/results';
import { planeSvg } from '../../../src/kernel/cfd/preview';

const fx = (name: string): string => readFileSync(new URL(`../../fixtures/cfd/${name}`, import.meta.url), 'utf8');

describe('parseSolverLog', () => {
  it('reads residuals per iteration and the SIMPLE convergence line', () => {
    const log = parseSolverLog(fx('pipe.log.simpleFoam'));
    expect(log.samples.length).toBe(5);
    expect(log.samples[0]).toEqual({ iteration: 1, initial: expect.objectContaining({ Ux: 1, p: expect.any(Number) }) });
    expect(Object.keys(log.samples[0].initial).sort()).toEqual(['Ux', 'Uy', 'Uz', 'p']);
    expect(log.convergedAt).toBe(51);
    expect(log.finished).toBe(true);
    expect(log.failure).toBeUndefined();
    expect(log.version).toBe('2406');
  });

  it('keeps the FIRST p residual of an iteration (non-orthogonal correctors solve p twice)', () => {
    const log = parseSolverLog(fx('pipe.log.simpleFoam'));
    const last = log.samples[log.samples.length - 1];
    expect(last.initial.p).toBeCloseTo(2.8327198e-6, 12);
  });

  it('does not mistake the FPE-trapping banner for a crash, but flags a real one', () => {
    expect(parseSolverLog('trapFpe: Floating point exception trapping enabled (FOAM_SIGFPE).\nEnd\n').failure).toBeUndefined();
    const crashed = parseSolverLog('Time = 7\n\nsmoothSolver:  Solving for Ux, Initial residual = nan, Final residual = nan, No Iterations 1000\n#0  Foam::sigFpe::sigHandler(int) at ??:?\n');
    expect(crashed.failure).toMatch(/non-finite Ux residual at iteration 7/);
    expect(crashed.finished).toBe(false);
  });
});

describe('parseCheckMesh', () => {
  it('reads cell counts, quality maxima and the patch table', () => {
    const m = parseCheckMesh(fx('pipe.log.checkMesh'));
    expect(m).toMatchObject({ cells: 45241, points: 48504, faces: 138694, ok: true, failedChecks: 0 });
    expect(m.maxNonOrthogonality).toBeCloseTo(30.76, 1);
    expect(m.maxSkewness).toBeGreaterThan(0);
    expect(m.patchFaces).toEqual({ inlet: 161, outlet: 161, walls: 11240 });
  });

  it('flags failed checks', () => {
    const m = parseCheckMesh('    cells:            10\n ***Number of severely non-orthogonal (> 70 degrees) faces: 3.\n\nFailed 1 mesh checks.\n');
    expect(m.ok).toBe(false);
    expect(m.failedChecks).toBe(1);
  });
});

describe('function-object tables', () => {
  it('reads the inlet pressure history (kinematic) and its last value', () => {
    const text = fx('pipe.inlet_p.dat');
    const rows = parseDatTable(text);
    expect(rows[0][0]).toBe(1);
    expect(lastValue(text)).toBeCloseTo(1.32900636e-4, 12);
    // Hagen-Poiseuille cross-check: 0.1327 Pa against 0.1277 Pa (D = 10 mm).
    expect((lastValue(text) as number) * 998.2).toBeCloseTo(0.1327, 4);
  });

  it('reads the force table columns (total, pressure, viscous)', () => {
    const rows = parseDatTable(fx('sphere.force.dat'));
    const r = rows[rows.length - 1];
    expect(r.length).toBe(10);
    expect(r[1]).toBeCloseTo(r[4] + r[7], 12);
    const cd = (2 * r[1]) / (1.205 * 0.07555 ** 2 * Math.PI * 0.005 ** 2);
    expect(cd).toBeGreaterThan(1.5);
    expect(cd).toBeLessThan(1.7);
  });
});

describe('derived results', () => {
  const flows = [
    { patch: 'inlet', flowM3s: -1e-6, massFlowKgs: -1e-3, pressurePa: 50 },
    { patch: 'outlet_1', flowM3s: 6e-7, massFlowKgs: 6e-4, pressurePa: 0 },
    { patch: 'outlet_2', flowM3s: 4e-7, massFlowKgs: 4e-4, pressurePa: 10 },
  ];

  it('balances mass and takes a flow-weighted outlet pressure', () => {
    expect(massBalance(flows)).toMatchObject({ inflowKgs: 1e-3, outflowKgs: 1e-3 });
    expect(massBalance(flows).imbalance).toBeLessThan(1e-12);
    expect(pressureDrop(flows)).toBeCloseTo(50 - 4, 9);
  });

  it('measures drift and the tail band of a monitored history', () => {
    const steady = Array.from({ length: 100 }, () => 1);
    expect(drift(steady)).toBe(0);
    expect(tailStats(steady)).toEqual({ mean: 1, band: 0 });
    const oscillating = Array.from({ length: 100 }, (_, i) => 1 + 0.05 * Math.sin(i));
    expect(tailStats(oscillating)!.band).toBeGreaterThan(0.09);
  });

  it('decimates residual history but keeps the last sample', () => {
    const samples = Array.from({ length: 1000 }, (_, i) => ({ iteration: i + 1, initial: { p: 1 / (i + 1) } }));
    const d = decimate(samples, 50);
    expect(d.length).toBe(50);
    expect(d[d.length - 1].iteration).toBe(1000);
  });
});

describe('convergence verdict', () => {
  const sample = (iteration: number, r: number) => ({ iteration, initial: { Ux: r, p: r } });
  const base = { target: 1e-4, maxIterations: 400, massImbalance: 0 };

  it('converged when SIMPLE met residualControl and the monitor is steady', () => {
    const v = convergenceVerdict({ ...base, log: { samples: [sample(51, 5e-5)], convergedAt: 51, finished: true }, drift: 0 });
    expect(v).toMatchObject({ verdict: 'converged', criterion: 'residuals' });
  });

  it('not converged when the monitor still drifts at the iteration cap', () => {
    const v = convergenceVerdict({ ...base, log: { samples: [sample(400, 1e-3)], finished: true }, drift: 0.05 });
    expect(v.verdict).toBe('not-converged');
    expect(v.reason).toMatch(/still changed 5\.0%/);
  });

  it('accepts steady monitors over a residual plateau, and says so', () => {
    const samples = Array.from({ length: 600 }, (_, i) => sample(i + 1, 0.014));
    const v = convergenceVerdict({ ...base, log: { samples, finished: true }, drift: 0.001, band: 0.005, massImbalance: 1e-4 });
    expect(v).toMatchObject({ verdict: 'converged', criterion: 'monitors' });
    expect(v.reason).toMatch(/residuals plateaued at 1\.40e-2/);
    // ... but not when the monitor band is wide or the run is short.
    expect(convergenceVerdict({ ...base, log: { samples, finished: true }, drift: 0.001, band: 0.04, massImbalance: 1e-4 }).verdict).toBe('not-converged');
    expect(convergenceVerdict({ ...base, log: { samples: samples.slice(0, 100), finished: true }, drift: 0.001, band: 0.005, massImbalance: 1e-4 }).verdict).toBe('not-converged');
  });

  it('diverged on a solver failure or residuals above 1', () => {
    expect(convergenceVerdict({ ...base, log: { samples: [sample(3, 1)], finished: false, failure: 'floating point exception' } }).verdict).toBe('diverged');
    expect(convergenceVerdict({ ...base, log: { samples: [sample(3, 4)], finished: true } }).verdict).toBe('diverged');
    expect(convergenceVerdict({ ...base, log: { samples: [], finished: false } }).verdict).toBe('diverged');
  });
});

describe('mid-plane preview', () => {
  const vtk = [
    '# vtk DataFile Version 2.0', 'plane', 'ASCII', 'DATASET POLYDATA',
    'POINTS 6 float', '0 0 0 0.01 0 0 0.02 0 0', '0 0 0.002 0.01 0 0.002 0.02 0 0.002',
    'POLYGONS 2 10', '4 0 1 4 3 4 1 2', '5 4',
    'CELL_DATA 2', 'FIELD FieldData 2', 'p 1 2 float', '1 2', 'U 3 2 float', '0.5 0 0 1 0 0',
  ].join('\n');

  it('parses legacy VTK polydata with a token-stream polygon list', () => {
    const plane = parseVtkPolyData(vtk);
    expect(plane.points.length).toBe(6);
    expect(plane.polygons).toEqual([[0, 1, 4, 3], [1, 2, 5, 4]]);
    expect(plane.cellFields.U.values).toEqual([0.5, 0, 0, 1, 0, 0]);
    expect(plane.cellFields.p.components).toBe(1);
  });

  it('draws |U| with a labelled scale and states any stretch', () => {
    const { svg, maxSpeed, stretch } = planeSvg(parseVtkPolyData(vtk), { title: 't', normal: [0, 1, 0] });
    expect(maxSpeed).toBe(1);
    expect(stretch).toBeCloseTo(2, 6);
    expect(svg).toMatch(/1\.00 m\/s/);
    expect(svg).toMatch(/Z stretched 2\.0x for legibility/);
    expect(svg.match(/<polygon /g)?.length).toBe(2);
  });
});
