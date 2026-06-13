import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock both exporters — this is a routing layer, so we test that `target`
// selects the right handler and forwards the remaining params, not the
// exporters' own (unchanged) behavior.
vi.mock('./exportModel', () => ({ exportModelTool: vi.fn(async () => 'model') }));
vi.mock('./exportPart', () => ({ exportPartTool: vi.fn(async () => 'part') }));

import { exportTool, type ExportTarget } from './export';
import { exportModelTool } from './exportModel';
import { exportPartTool } from './exportPart';

const ROUTES: Array<[ExportTarget, ReturnType<typeof vi.fn>, string]> = [
  ['model', exportModelTool as never, 'model'],
  ['part', exportPartTool as never, 'part'],
];

describe('export dispatcher', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(ROUTES)('routes target:%s to its exporter and returns its result', async (target, handler, expected) => {
    const out = await exportTool({ target, code: 'SRC', extra: 7 });
    expect(out).toBe(expected);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('forwards target-specific params but strips `target` itself', async () => {
    await exportTool({ target: 'model', code: 'SRC', output_path: '/tmp/x.stl', format: 'stl' });
    const arg = (exportModelTool as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg).toEqual({ code: 'SRC', output_path: '/tmp/x.stl', format: 'stl' });
    expect(arg).not.toHaveProperty('target');
  });

  it('rejects an unknown target with an actionable error', async () => {
    await expect(exportTool({ target: 'nope' as ExportTarget })).rejects.toThrow(/Unknown export target: nope/);
  });

  it('does not cross-call the other exporter', async () => {
    await exportTool({ target: 'part', code: 'SRC' });
    expect(exportPartTool).toHaveBeenCalledTimes(1);
    expect(exportModelTool).not.toHaveBeenCalled();
  });
});
