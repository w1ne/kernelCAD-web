import { describe, it, expect } from 'vitest';
import { buildRepairPrompt } from './repairPrompt';
import type { GateVerdict } from './types';

describe('buildRepairPrompt', () => {
  it('(a) names the root cause first with margin, locus, and the keep-unchanged instruction', () => {
    const verdicts: GateVerdict[] = [
      { gate: 'evaluate', ok: false, code: 'feature.fillet.no-edges', message: 'Fillet selected no edges.', hint: 'Widen the edge query or reduce the radius.' },
      { gate: 'interference', ok: false, code: 'mechanism.interpenetration', message: 'Parts overlap.', hint: 'Move one part out of the other.', margin: 42, locus: 'shade∩beam' },
    ];
    const prompt = buildRepairPrompt(verdicts);
    const rootIdx = prompt.indexOf('mechanism.interpenetration');
    const otherIdx = prompt.indexOf('feature.fillet.no-edges');
    expect(rootIdx).toBeGreaterThanOrEqual(0);
    expect(otherIdx).toBeGreaterThanOrEqual(0);
    expect(rootIdx).toBeLessThan(otherIdx);
    expect(prompt).toContain('42');
    expect(prompt).toContain('shade∩beam');
    expect(prompt.toLowerCase()).toContain('keep the rest of the model unchanged');
    expect(prompt.toLowerCase()).toContain('return the full corrected script');
  });
  it('(b) is short and contains no prior-attempt transcript', () => {
    const verdicts: GateVerdict[] = [
      { gate: 'interference', ok: false, code: 'mechanism.interpenetration', message: 'Parts overlap.', margin: 42, locus: 'shade∩beam' },
      { gate: 'evaluate', ok: false, code: 'feature.fillet.no-edges', message: 'Fillet selected no edges.' },
    ];
    const prompt = buildRepairPrompt(verdicts);
    expect(prompt.length).toBeLessThan(1200);
    expect(prompt.toLowerCase()).not.toContain('attempt 1');
    expect(prompt.toLowerCase()).not.toContain('transcript');
  });
  it('(c) returns empty string when all verdicts pass', () => {
    const verdicts: GateVerdict[] = [{ gate: 'evaluate', ok: true, message: 'ok' }, { gate: 'interference', ok: true, message: 'ok' }];
    expect(buildRepairPrompt(verdicts)).toBe('');
  });
});
