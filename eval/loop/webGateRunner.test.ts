// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';

vi.mock('../oracle/kernelcad-client.js', () => ({ evaluateScript: vi.fn() }));
vi.mock('../oracle/interference.js', () => ({ runInterference: vi.fn() }));

import { evaluateScript } from '../oracle/kernelcad-client.js';
import { runInterference } from '../oracle/interference.js';
import { createWebGateRunner } from './webGateRunner.js';

const mockEval = vi.mocked(evaluateScript);
const mockInterf = vi.mocked(runInterference);

describe('createWebGateRunner', () => {
  it('reports ok when evaluate ok and no interference pairs', async () => {
    mockEval.mockResolvedValue({ ok: true, diagnostics: [], featureCount: 3 });
    mockInterf.mockResolvedValue({ ok: true, noSceneToCheck: false, partCount: 2, comparisonCount: 1, epsilonMm3: 0.01, pairs: [], diagnostics: [] });
    const report = await createWebGateRunner().run('/tmp/x.kcad.ts');
    expect(report.ok).toBe(true);
    expect(report.verdicts.find((v) => v.gate === 'evaluate')?.ok).toBe(true);
    expect(report.verdicts.find((v) => v.gate === 'interference')?.ok).toBe(true);
  });

  it('maps evaluate diagnostics to failing evaluate verdicts', async () => {
    mockEval.mockResolvedValue({ ok: false, diagnostics: [{ code: 'mechanism.interpenetration', message: 'parts overlap', hint: 'reduce length' }] });
    mockInterf.mockResolvedValue({ ok: true, noSceneToCheck: false, partCount: 0, comparisonCount: 0, epsilonMm3: 0.01, pairs: [], diagnostics: [] });
    const report = await createWebGateRunner().run('/tmp/x.kcad.ts');
    expect(report.ok).toBe(false);
    const evalVerdict = report.verdicts.find((v) => v.code === 'mechanism.interpenetration');
    expect(evalVerdict).toBeDefined();
    expect(evalVerdict?.gate).toBe('evaluate');
    expect(evalVerdict?.ok).toBe(false);
    expect(evalVerdict?.hint).toBe('reduce length');
  });

  it('maps interference pairs to verdicts with locus and margin', async () => {
    mockEval.mockResolvedValue({ ok: true, diagnostics: [] });
    mockInterf.mockResolvedValue({ ok: false, noSceneToCheck: false, partCount: 2, comparisonCount: 1, epsilonMm3: 0.01, pairs: [{ partA: 'arm', partB: 'base', volumeMm3: 12.5 }], diagnostics: [{ code: 'interference.overlap', message: 'arm overlaps base' }] });
    const report = await createWebGateRunner().run('/tmp/x.kcad.ts');
    expect(report.ok).toBe(false);
    const interfVerdict = report.verdicts.find((v) => v.gate === 'interference' && !v.ok);
    expect(interfVerdict).toBeDefined();
    expect(interfVerdict?.locus).toBe('arm∩base');
    expect(interfVerdict?.margin).toBe(12.5);
  });
});
