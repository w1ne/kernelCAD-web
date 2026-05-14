import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { getBendTableTool } from '../../../src/mcp/tools/getBendTable';

describe('get_bend_table MCP tool', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns one row per bend with computed BA', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
      const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
      return blank.bend({ atX: 50 }, 90, 3);
    `;
    const out = await getBendTableTool({ code });
    expect(out.ok).toBe(true);
    expect(out.rootSheetMetal).toEqual({ thickness: 2, kFactor: 0.38 });
    expect(out.bends.length).toBe(1);
    expect(out.bends[0].angle).toBe(90);
    expect(out.bends[0].radius).toBe(3);
    // BA = (pi/2) * (0.38 * 2 + 3) = (pi/2) * 3.76
    expect(out.bends[0].bendAllowance).toBeCloseTo((Math.PI / 2) * 3.76, 9);
  });

  it('returns invalid-args when neither file nor code is provided', async () => {
    const out = await getBendTableTool({});
    expect(out.ok).toBe(false);
    expect(out.diagnostics[0].code).toBe('cli.invalid-args');
  });

  it('returns invalid-args when script has no sheetMetal record', async () => {
    const out = await getBendTableTool({ code: `return box(10, 10, 10);` });
    expect(out.ok).toBe(false);
    expect(out.diagnostics.some(d => d.code === 'feature.invalid-args')).toBe(true);
  });
});
