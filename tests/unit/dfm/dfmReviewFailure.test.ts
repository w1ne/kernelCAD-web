// tests/unit/dfm/dfmReviewFailure.test.ts
//
// dfm_review: a failed analysis is never a passing review, and a failure in
// one process does not skip the other.

import { describe, it, expect, beforeAll, vi } from 'vitest';

vi.mock('../../../src/modeling/runtime/dfm/fdmCheck', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../src/modeling/runtime/dfm/fdmCheck')>();
  return { ...orig, checkFdmPrintability: vi.fn(() => { throw new Error('injected fdm failure'); }) };
});

import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { dfmReviewTool } from '../../../src/agent/mcp/tools/dfmReview';

describe('dfm_review failure isolation', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('reports ok:false when FDM throws, and still runs CNC', async () => {
    const r = await dfmReviewTool({ code: 'return box(40, 30, 10);' });
    expect(r.ok).toBe(false);
    expect(r.verdict).toBe('not-checked');
    expect(r.checks.find(c => c.id === 'fdm.analysis')?.status).toBe('not-checked');
    expect(r.checks.find(c => c.id === 'cnc.undercuts')?.status).toBe('pass');
    expect(r.checks.find(c => c.id === 'cnc.internal-corner-radius')?.status).toBe('pass');
    expect(r.diagnostics.some(d => d.code === 'feature.kernel-failed' && d.severity === 'error')).toBe(true);
  }, 60000);

  it('keeps a checked failure above an incomplete analysis in aggregate precedence', async () => {
    const code = `
      const stem = box(4, 10, 20).translate(10, 0, 0);
      const bar = box(24, 10, 4).translate(0, 0, 20);
      return stem.union(bar);
    `;
    const r = await dfmReviewTool({ code });
    expect(r.ok).toBe(false);
    expect(r.verdict).toBe('fail');
    expect(r.checks.find(c => c.id === 'fdm.analysis')?.status).toBe('not-checked');
    expect(r.checks.find(c => c.id === 'cnc.undercuts')?.status).toBe('fail');
  }, 60000);

  it('passes when only the unaffected process is requested', async () => {
    const r = await dfmReviewTool({ code: 'return box(40, 30, 10);', processes: ['cnc'] });
    expect(r.ok).toBe(true);
    expect(r.verdict).toBe('pass');
  }, 60000);
});
