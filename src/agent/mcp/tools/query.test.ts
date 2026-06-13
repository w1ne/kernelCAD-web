import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./evaluateQuery', () => ({ evaluateQueryTool: vi.fn(async () => 'evaluate') }));
vi.mock('./resolveTopoRef', () => ({ resolveTopoRefTool: vi.fn(async () => 'resolve') }));
vi.mock('./getFaceLineage', () => ({ getFaceLineageTool: vi.fn(async () => 'lineage') }));

import { queryTool, type QueryMode } from './query';
import { evaluateQueryTool } from './evaluateQuery';
import { resolveTopoRefTool } from './resolveTopoRef';
import { getFaceLineageTool } from './getFaceLineage';

describe('query dispatcher', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['evaluate', 'resolve', 'lineage'] as QueryMode[])(
    "routes mode:'%s' to its handler",
    async (mode) => {
      const out = await queryTool({ mode, code: 'SRC' });
      expect(out).toBe(mode);
    },
  );

  it("defaults to 'evaluate' when mode is omitted", async () => {
    const out = await queryTool({ query: '@kcq[face(createdBy("x"))]', code: 'SRC' });
    expect(out).toBe('evaluate');
    expect(evaluateQueryTool).toHaveBeenCalledTimes(1);
    expect(resolveTopoRefTool).not.toHaveBeenCalled();
    expect(getFaceLineageTool).not.toHaveBeenCalled();
  });

  it('forwards params but strips `mode`', async () => {
    await queryTool({ mode: 'resolve', ref: '@kc[a/face/top]', code: 'SRC' });
    const arg = (resolveTopoRefTool as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg).toEqual({ ref: '@kc[a/face/top]', code: 'SRC' });
    expect(arg).not.toHaveProperty('mode');
  });

  it('rejects an unknown mode', async () => {
    await expect(queryTool({ mode: 'nope' as QueryMode })).rejects.toThrow(/Unknown query mode: nope/);
  });
});
