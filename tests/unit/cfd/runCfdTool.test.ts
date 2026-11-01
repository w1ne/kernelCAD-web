// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// run_cfd / cfd_summary without a solver: the missing-OpenFOAM diagnostic,
// argument errors, and the shape.cfdStudy declaration.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCfdTool } from '../../../src/agent/mcp/tools/runCfd';
import { cfdSummaryTool } from '../../../src/agent/mcp/tools/cfdSummary';
import { resolveCfdArgs, inlineCfdFields } from '../../../src/agent/mcp/tools/runCfdArgs';
import { cfdRunInput } from '../../../src/agent/cli/commands/cfd';
import { detectCfdToolchain } from '../../../src/kernel/cfd/toolchain';
import { findCfdStudies, selectCfdStudy } from '../../../src/modeling/runtime/cfd/findCfdStudies';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics/registry';

const PIPE = 'return cylinder(200, 7).rotate([0, 1, 0], 90).subtract(cylinder(200, 5).rotate([0, 1, 0], 90));';

describe('missing OpenFOAM', () => {
  const saved = { mode: process.env.KERNELCAD_OPENFOAM, image: process.env.KERNELCAD_OPENFOAM_IMAGE };
  beforeEach(() => {
    // Force the Docker route at an image that cannot exist: "not installed"
    // on every host, with or without OpenFOAM or Docker.
    process.env.KERNELCAD_OPENFOAM = 'docker';
    process.env.KERNELCAD_OPENFOAM_IMAGE = 'kernelcad-test/no-such-openfoam:0';
  });
  afterEach(() => {
    if (saved.mode === undefined) delete process.env.KERNELCAD_OPENFOAM; else process.env.KERNELCAD_OPENFOAM = saved.mode;
    if (saved.image === undefined) delete process.env.KERNELCAD_OPENFOAM_IMAGE; else process.env.KERNELCAD_OPENFOAM_IMAGE = saved.image;
  });

  it('reports cfd.solver.unavailable with the install command, never a pass or a crash', async () => {
    const tc = await detectCfdToolchain();
    expect(tc.ok).toBe(false);
    const r = await runCfdTool({ code: PIPE, flow: 'internal', inlet: { atX: 0 }, outlet: { atX: 200 }, velocity: 0.002 });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('cfd.solver.unavailable');
    expect(r.error).toMatch(/not a pass/);
    expect(r.toolchain?.hint).toMatch(/docker pull opencfd\/openfoam-run:2406/);
    expect(r.diagnostics?.[0]).toMatchObject({ code: 'cfd.solver.unavailable', severity: 'error' });
    expect(DIAGNOSTIC_REGISTRY['cfd.solver.unavailable'].group).toBe('cfd');
  });

  it('cfd_summary says how to install it and lists the fluid presets', async () => {
    const s = await cfdSummaryTool({});
    expect(s.ok).toBe(true);
    expect(s.toolchain.available).toBe(false);
    expect(s.toolchain.hint).toMatch(/openfoam2406-default/);
    expect(s.fluids.water).toEqual({ rho: 998.2, nu: 1.004e-6 });
  });
});

describe('run_cfd arguments', () => {
  it('reads snake_case and camelCase fields and validates them with the shared validator', () => {
    const fields = inlineCfdFields({ flow: 'internal', inlet: { atX: 0 }, outlets: [{ atX: 1 }], flow_rate_lpm: 2, mesh_size: 'fine' });
    expect(fields).toEqual({ flow: 'internal', inlet: { atX: 0 }, outlet: [{ atX: 1 }], flowRateLpm: 2, meshSize: 'fine' });
    const ok = resolveCfdArgs(undefined, fields);
    expect(ok.kind).toBe('ok');
    const bad = resolveCfdArgs(undefined, { flow: 'internal', inlet: { atX: 0 }, outlet: { atX: 1 }, velocity: -2 });
    expect(bad.kind).toBe('error');
    if (bad.kind === 'error') {
      expect(bad.errorCode).toBe('feature.invalid-args');
      expect(bad.error).toMatch(/run_cfd: velocity — got -2; requires a positive speed \(m\/s\)/);
    }
  });

  it('lets call fields override a declared study (flow rate replaces velocity)', () => {
    const declared = resolveCfdArgs(undefined, { flow: 'internal', inlet: { atX: 0 }, outlet: { atX: 1 }, velocity: 1, iterations: 100 });
    if (declared.kind !== 'ok') throw new Error('expected ok');
    const merged = resolveCfdArgs(declared.metadata, { flowRateLpm: 0.5 });
    expect(merged.kind === 'ok' && merged.metadata).toMatchObject({ flowRateLpm: 0.5, iterations: 100 });
    expect(merged.kind === 'ok' && merged.metadata.velocity).toBeUndefined();
  });

  it('maps CLI flags onto the tool input', () => {
    const input = cfdRunInput('m.kcad.ts', { flow: 'internal', inlet: '{"atX":0}', outlet: '[{"atX":60}]', flowRateLpm: '0.3', meshSize: 'fine', cores: '2', preview: false });
    expect(input).toEqual({ file: 'm.kcad.ts', flow: 'internal', inlet: { atX: 0 }, outlet: [{ atX: 60 }], flow_rate_lpm: 0.3, mesh_size: 'fine', cores: 2, preview: false });
  });
});

describe('shape.cfdStudy declaration', () => {
  it('registers a virtual record bound to its shape', async () => {
    const run = await runScript({
      code: `const pipe = cylinder(200, 7).rotate([0, 1, 0], 90).subtract(cylinder(200, 5).rotate([0, 1, 0], 90));
pipe.cfdStudy({ name: 'hp', flow: 'internal', inlet: { atX: 0 }, outlet: { atX: 200 }, velocity: 0.002 });
return pipe;`,
      fileName: '<cfd-capture>',
    });
    const studies = findCfdStudies(run.records);
    expect(studies).toHaveLength(1);
    expect(studies[0].metadata).toMatchObject({ name: 'hp', flow: 'internal', virtual: true, fluid: { name: 'water' } });
    expect(run.records.some(r => r.id === studies[0].shapeId && r.kind !== 'cfdStudy')).toBe(true);
    expect(selectCfdStudy(studies, 'nope')).toBeUndefined();
  });

  it('throws feature.invalid-args at capture for a malformed study', async () => {
    await expect(runScript({ code: `const b = box(1, 1, 1); b.cfdStudy({ flow: 'external' }); return b;`, fileName: '<cfd-bad>' }))
      .rejects.toThrow(/cfdStudy\(spec\): velocity/);
  });
});
