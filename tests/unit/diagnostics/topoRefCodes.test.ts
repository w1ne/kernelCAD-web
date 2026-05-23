import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_REGISTRY, HINT_TEMPLATES } from '../../../src/shared/diagnostics/registry';

describe('F-foundation diagnostic registry entries', () => {
  it('registers feature.face-ref.snapshot-fallback-used at info severity', () => {
    expect(DIAGNOSTIC_REGISTRY['feature.face-ref.snapshot-fallback-used']).toBeDefined();
    expect(DIAGNOSTIC_REGISTRY['feature.face-ref.snapshot-fallback-used'].defaultSeverity).toBe('info');
    expect(DIAGNOSTIC_REGISTRY['feature.face-ref.snapshot-fallback-used'].group).toBe('feature');
  });

  it('snapshot-fallback-used hint template names the recovery (re-emit list_faces / list_edges)', () => {
    const t = HINT_TEMPLATES['feature.face-ref.snapshot-fallback-used'].template;
    expect(t).toMatch(/snapshot/i);
    expect(t).toMatch(/re-?emit|update the ref/i);
  });

  it('not-resolvable hint template matches the F-spec §3.6 form (cites nearest candidate refs)', () => {
    const t = HINT_TEMPLATES['feature.face-ref.not-resolvable'].template;
    expect(t).toMatch(/nearest|candidate/i);
  });

  it('ambiguous-after-split hint template cites picking from candidate refs', () => {
    const t = HINT_TEMPLATES['feature.face-ref.ambiguous-after-split'].template;
    expect(t).toMatch(/pick one|candidate/i);
  });
});
