import { describe, expect, it } from 'vitest';
import { demoDisplayName } from './demoDisplayName';

describe('demoDisplayName', () => {
  it('uses the task id when task capture is available', () => {
    expect(demoDisplayName({ task: 'bracket-holes', heroArtifact: 'donut', scriptPath: 'solution.kcad.ts' }))
      .toBe('bracket-holes');
  });

  it('uses hero artifact instead of leaking solution.kcad.ts for script captures', () => {
    expect(demoDisplayName({ heroArtifact: 'service-panel-plate', scriptPath: 'docs/demo/solution.kcad.ts' }))
      .toBe('service-panel-plate');
  });

  it('falls back to script basename only when no product label exists', () => {
    expect(demoDisplayName({ scriptPath: 'docs/demo/custom-part.kcad.ts' })).toBe('custom-part');
  });
});
