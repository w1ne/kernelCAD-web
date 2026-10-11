// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildModel } from '../../../modeling/buildModel';
import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import { checkFastenerInstallationTool } from './checkFastenerInstallation';
import { inspectionVerificationToolEntries } from '../registry/inspectionVerificationTools';
vi.mock('../../cli/commands/evaluate', () => ({ evaluateAndBuildScript: vi.fn() }));
const evaluate = vi.mocked(evaluateAndBuildScript);
beforeEach(() => evaluate.mockReset());
describe('fastener installation MCP adapter', () => {
  it('returns evaluation failures without green coverage', async () => {
    evaluate.mockResolvedValue({ evaluation: { exitCode: 1, diagnostics: [{ message: 'bad source', code: 'feature.invalid-args' }] } } as never);
    expect(await checkFastenerInstallationTool({ code: 'bad', fasteners: [] })).toMatchObject({ ok: false, error: 'bad source' });
  });
  it('does not turn an undefined station list into automatic green coverage', async () => {
    const model = await buildModel({ code: "const a=assembly('a');a.part('plate',box(10,10,2));return a.model();", fileName: 'test.kcad.ts' });
    evaluate.mockResolvedValue({ model, evaluation: { exitCode: 0 } } as never);
    expect(await checkFastenerInstallationTool({ code: 'source', fasteners: [] })).toMatchObject({ ok: false, status: 'no-coverage', counts: { requested: 0 } });
    expect(await checkFastenerInstallationTool({ code: 'source' } as never)).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
  });
  it('unknown assembly or missing target parts stays partial', async () => {
    const model = await buildModel({ code: "const a=assembly('a');a.part('plate',box(10,10,2));return a.model();", fileName: 'test.kcad.ts' });
    evaluate.mockResolvedValue({ model, evaluation: { exitCode: 0 } } as never);
    const output = await checkFastenerInstallationTool({ code: 'source', assembly: 'missing', fasteners: [{ part: 'screw', against: ['plate'] }] });
    expect(output).toMatchObject({ ok: false, status: 'partial', counts: { unknown: 1 } });
  });
  it('publishes explicit station fields and non-certification limits through verify', () => {
    const definition = inspectionVerificationToolEntries.find(e => e.definition.name === 'verify')!.definition;
    const properties = definition.inputSchema.properties as Record<string, { enum?: string[]; items?: { required?: string[] } }>;
    expect(properties.check.enum).toContain('fastener-installation');
    expect(properties.fasteners.items!.required).toEqual(['part','against']);
    expect(properties).toHaveProperty('toleranceMm');
    expect(properties).toHaveProperty('angleToleranceDeg');
    expect(definition.description).toMatch(/zero coverage cannot pass/);
  });
});
