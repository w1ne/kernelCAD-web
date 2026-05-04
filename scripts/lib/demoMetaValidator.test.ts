import { describe, it, expect } from 'vitest';
import { validateDemoMeta } from './demoMetaValidator';

describe('validateDemoMeta', () => {
  const validBase = {
    taskId: 'donut',
    module: 'v0.21',
    capturedAt: '2026-05-04T00:00:00Z',
    durationMs: 21500,
    truncated: false,
    gitSha: 'abc123',
    heroArtifact: 'donut',
    catalogSource: 'memorable-builds-policy/v0.21',
    overrideApprovedBy: null,
  };

  it('passes a fully-valid catalog match', () => {
    expect(validateDemoMeta(validBase, 'v0.21')).toEqual([]);
  });

  it('rejects missing pre-existing fields (gitSha/capturedAt/taskId)', () => {
    for (const key of ['gitSha', 'capturedAt', 'taskId'] as const) {
      const meta = { ...validBase } as Record<string, unknown>;
      delete meta[key];
      const errs = validateDemoMeta(meta, 'v0.21');
      expect(errs.some((e) => e.includes(`missing key '${key}'`))).toBe(true);
    }
  });

  it('rejects missing heroArtifact', () => {
    const meta = { ...validBase } as Record<string, unknown>;
    delete meta.heroArtifact;
    const errs = validateDemoMeta(meta, 'v0.21');
    expect(errs.some((e) => e.includes("missing key 'heroArtifact'"))).toBe(true);
  });

  it('rejects missing catalogSource', () => {
    const meta = { ...validBase } as Record<string, unknown>;
    delete meta.catalogSource;
    const errs = validateDemoMeta(meta, 'v0.21');
    expect(errs.some((e) => e.includes("missing key 'catalogSource'"))).toBe(true);
  });

  it('rejects missing overrideApprovedBy (must be present even if null)', () => {
    const meta = { ...validBase } as Record<string, unknown>;
    delete meta.overrideApprovedBy;
    const errs = validateDemoMeta(meta, 'v0.21');
    expect(errs.some((e) => e.includes("missing key 'overrideApprovedBy'"))).toBe(true);
  });

  it('rejects denylisted heroArtifact (e.g. "box")', () => {
    const errs = validateDemoMeta({ ...validBase, heroArtifact: 'box' }, 'v0.21');
    expect(errs.some((e) => e.includes('denylisted'))).toBe(true);
  });

  it('rejects denylisted heroArtifact even with override set', () => {
    const errs = validateDemoMeta(
      { ...validBase, heroArtifact: 'bracket', overrideApprovedBy: 'controller' },
      'v0.21',
    );
    expect(errs.some((e) => e.includes('denylisted'))).toBe(true);
  });

  it('rejects heroArtifact that does not match the version catalog', () => {
    const errs = validateDemoMeta({ ...validBase, heroArtifact: 'espresso-cup' }, 'v0.21');
    expect(errs.some((e) => e.includes('does not match catalog for v0.21'))).toBe(true);
  });

  it('accepts heroArtifact off-catalog if overrideApprovedBy is set', () => {
    const errs = validateDemoMeta(
      { ...validBase, heroArtifact: 'custom-hero', overrideApprovedBy: 'controller: spike-day' },
      'v0.21',
    );
    expect(errs).toEqual([]);
  });

  it('rejects unknown module version (no catalog entry)', () => {
    const errs = validateDemoMeta(validBase, 'v9.9');
    expect(errs.some((e) => e.includes('no catalog entry for v9.9'))).toBe(true);
  });

  it('rejects non-string heroArtifact (e.g. number, object, boolean)', () => {
    const errsNum = validateDemoMeta({ ...validBase, heroArtifact: 42 as unknown as string }, 'v0.21');
    expect(errsNum.some((e) => e.includes('heroArtifact must be a string'))).toBe(true);

    const errsObj = validateDemoMeta({ ...validBase, heroArtifact: {} as unknown as string }, 'v0.21');
    expect(errsObj.some((e) => e.includes('heroArtifact must be a string'))).toBe(true);
  });

  it('grandfathered versions skip policy checks (no heroArtifact required for v0.1)', () => {
    const meta = {
      taskId: 'bracket-with-hole',
      module: 'v0.1',
      capturedAt: '2026-05-02T00:00:00Z',
      durationMs: 21500,
      truncated: false,
      gitSha: 'abc123',
      // No heroArtifact / catalogSource / overrideApprovedBy
    } as Record<string, unknown>;
    expect(validateDemoMeta(meta, 'v0.1')).toEqual([]);
  });

  it('grandfathered versions skip policy checks (no heroArtifact required for v0.2)', () => {
    const meta = {
      taskId: 'subtract-then-fillet-rim',
      module: 'v0.2',
      capturedAt: '2026-05-03T00:00:00Z',
      durationMs: 21500,
      truncated: false,
      gitSha: 'abc123',
    } as Record<string, unknown>;
    expect(validateDemoMeta(meta, 'v0.2')).toEqual([]);
  });

  it('grandfathered versions still require legacy fields (gitSha/capturedAt/taskId)', () => {
    const meta = {
      module: 'v0.1',
      durationMs: 21500,
      truncated: false,
      // Missing taskId, capturedAt, gitSha
    } as Record<string, unknown>;
    const errs = validateDemoMeta(meta, 'v0.1');
    expect(errs.some((e) => e.includes("missing key 'gitSha'"))).toBe(true);
    expect(errs.some((e) => e.includes("missing key 'capturedAt'"))).toBe(true);
    expect(errs.some((e) => e.includes("missing key 'taskId'"))).toBe(true);
  });
});
