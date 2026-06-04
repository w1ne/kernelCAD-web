import { describe, it, expect } from 'vitest';
import { verdictsFromOracles } from './verdictsFromOracles';

describe('verdictsFromOracles', () => {
  it('maps an interference pair to a verdict carrying margin (mm³) and locus (partA∩partB)', () => {
    // Real CLI shape: overlap data lives in `pairs`; `diagnostics` is empty.
    const evaluateResult = { ok: true, diagnostics: [], featureCount: 3 };
    const interferenceResult = { ok: false, pairs: [{ partA: 'shade', partB: 'beam', volumeMm3: 42 }], diagnostics: [] };
    const verdicts = verdictsFromOracles(evaluateResult, interferenceResult);
    const interference = verdicts.find((v) => v.gate === 'interference');
    expect(interference).toBeDefined();
    expect(interference!.ok).toBe(false);
    expect(interference!.margin).toBe(42);
    expect(interference!.locus).toBe('shade∩beam');
    expect(interference!.code).toBe('interference.overlap');
  });

  it('surfaces interference diagnostics when failing with no pair detail (CLI exception)', () => {
    const evaluateResult = { ok: true, diagnostics: [], featureCount: 1 };
    const interferenceResult = { ok: false, pairs: [], diagnostics: [{ code: 'cli.interference-exception', message: 'boom' }] };
    const verdicts = verdictsFromOracles(evaluateResult, interferenceResult);
    const interference = verdicts.find((v) => v.gate === 'interference');
    expect(interference!.ok).toBe(false);
    expect(interference!.code).toBe('cli.interference-exception');
  });
  it('carries featureId as locus on evaluate verdicts when present', () => {
    const evaluateResult = { ok: false, diagnostics: [{ code: 'feature.fillet.no-edges', message: 'Fillet selected no edges.', featureId: 'fillet-1' }], featureCount: 2 };
    const interferenceResult = { ok: true, pairs: [], diagnostics: [] };
    const verdicts = verdictsFromOracles(evaluateResult, interferenceResult);
    const evaluate = verdicts.find((v) => v.code === 'feature.fillet.no-edges');
    expect(evaluate).toBeDefined();
    expect(evaluate!.ok).toBe(false);
    expect(evaluate!.locus).toBe('fillet-1');
  });
  it('produces an all-ok report when both oracles pass', () => {
    const evaluateResult = { ok: true, diagnostics: [], featureCount: 1 };
    const interferenceResult = { ok: true, pairs: [], diagnostics: [] };
    const verdicts = verdictsFromOracles(evaluateResult, interferenceResult);
    expect(verdicts.every((v) => v.ok)).toBe(true);
  });
});
