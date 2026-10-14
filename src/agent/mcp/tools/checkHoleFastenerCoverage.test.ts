// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildModel } from '../../../modeling/buildModel';
import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import { checkHoleFastenerCoverageTool } from './checkHoleFastenerCoverage';
import { inspectionVerificationToolEntries } from '../registry/inspectionVerificationTools';
import { VERIFY_OUTPUT_SCHEMA } from '../verificationOutputSchema';
vi.mock('../../cli/commands/evaluate', () => ({ evaluateAndBuildScript: vi.fn() }));
const evaluate = vi.mocked(evaluateAndBuildScript);
beforeEach(() => evaluate.mockReset());
describe('hole-fastener coverage MCP adapter', () => {
  it('preserves evaluation diagnostics', async () => {
    evaluate.mockResolvedValue({ evaluation: { exitCode: 1, diagnostics: [{ message: 'bad source', code: 'feature.invalid-args' }] } } as never);
    expect(await checkHoleFastenerCoverageTool({ code: 'bad' })).toMatchObject({ ok: false, source: 'local', error: 'bad source', errorCode: 'feature.invalid-args' });
  });
  it('reports geometry and accepts only current selectors and nonempty reasons', async () => {
    const model = await buildModel({ code: 'return box(20,20,3).subtract(cylinder(4,2).translate(10,10,0));', fileName: 'tool.kcad.ts' });
    evaluate.mockResolvedValue({ model, evaluation: { exitCode: 0 } } as never);
    expect(await checkHoleFastenerCoverageTool({ code: 'source' })).toMatchObject({ ok: false, status: 'fail', counts: { holes: 1 } });
    expect(await checkHoleFastenerCoverageTool({ code: 'source', holeReasons: { '(root)/hole-1': 'vent' } })).toMatchObject({ ok: true, status: 'pass' });
    expect(await checkHoleFastenerCoverageTool({ code: 'source', holeReasons: { typo: 'vent' } })).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
  });
  it('catches evaluation exceptions and missing models', async () => {
    evaluate.mockRejectedValue(new Error('evaluation exploded'));
    expect(await checkHoleFastenerCoverageTool({ code: 'source' })).toMatchObject({ ok: false, error: 'evaluation exploded' });
    evaluate.mockResolvedValue({ evaluation: { exitCode: 0, diagnostics: [] } } as never);
    expect(await checkHoleFastenerCoverageTool({ code: 'source' })).toMatchObject({ ok: false, error: 'Script evaluation failed.' });
  });
  it('publishes the coverage maps and per-hole result schema through verify', () => {
    const definition = inspectionVerificationToolEntries.find(e => e.definition.name === 'verify')!.definition;
    const properties = definition.inputSchema.properties as Record<string, { enum?: string[]; additionalProperties?: unknown }>;
    expect(properties.check.enum).toContain('hole-fastener-coverage');
    expect(properties.holeReasons.additionalProperties).toMatchObject({ type: 'string', minLength: 1 });
    expect(properties.holeFits.additionalProperties).toMatchObject({ enum: ['clearance', 'tap'] });
    expect(VERIFY_OUTPUT_SCHEMA.properties).toHaveProperty('holes');
    expect(VERIFY_OUTPUT_SCHEMA.properties).toHaveProperty('uncertainties');
  });
});
