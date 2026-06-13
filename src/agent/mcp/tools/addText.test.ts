import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock both authoring tools — this is a routing layer, so we test that `mode`
// selects the right handler and forwards the remaining params, not the tools'
// own (unchanged) behavior.
vi.mock('./addSketchText', () => ({ addSketchTextTool: vi.fn(async () => 'sketch') }));
vi.mock('./embossText', () => ({ embossTextTool: vi.fn(async () => 'emboss') }));

import { addTextTool, type TextMode } from './addText';
import { addSketchTextTool } from './addSketchText';
import { embossTextTool } from './embossText';

const ROUTES: Array<[TextMode, ReturnType<typeof vi.fn>, string]> = [
  ['sketch', addSketchTextTool as never, 'sketch'],
  ['emboss', embossTextTool as never, 'emboss'],
];

describe('add_text dispatcher', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(ROUTES)('routes mode:%s to its handler and returns its result', async (mode, handler, expected) => {
    const out = await addTextTool({ mode, code: 'SRC', extra: 7 });
    expect(out).toBe(expected);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('forwards mode-specific params but strips `mode` itself', async () => {
    await addTextTool({ mode: 'sketch', code: 'SRC', content: 'CE', size: 4 });
    const arg = (addSketchTextTool as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg).toEqual({ code: 'SRC', content: 'CE', size: 4 });
    expect(arg).not.toHaveProperty('mode');
  });

  it('rejects an unknown mode with an actionable error', async () => {
    await expect(addTextTool({ mode: 'nope' as TextMode })).rejects.toThrow(/Unknown add_text mode: nope/);
  });

  it('does not cross-call the other handler', async () => {
    await addTextTool({ mode: 'emboss', code: 'SRC' });
    expect(embossTextTool).toHaveBeenCalledTimes(1);
    expect(addSketchTextTool).not.toHaveBeenCalled();
  });
});
