import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { flattenPatternTool } from '../../../src/mcp/tools/flattenPattern';

describe('flatten_pattern MCP tool', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns a Region for a bent L-bracket', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
      const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
      return blank.bend({ atX: 50 }, 90, 3);
    `;
    const out = await flattenPatternTool({ code });
    expect(out.ok).toBe(true);
    expect(out.region?.bendLines.length).toBe(1);
    expect(out.region?.outer.length).toBeGreaterThanOrEqual(4);
  });

  it('returns diagnostics for 3+ bend chain', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(150, 0).lineTo(150, 60).lineTo(0, 60).close();
      const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
      return blank
        .bend({ atX: 40 }, 90, 3)
        .bend({ atX: 80 }, 90, 3)
        .bend({ atX: 120 }, 90, 3);
    `;
    const out = await flattenPatternTool({ code });
    expect(out.ok).toBe(false);
    expect(out.diagnostics.some(d => d.code === 'feature.flattenPattern.multi-bend-unsupported')).toBe(true);
  });

  it('returns invalid-args when neither file nor code is provided', async () => {
    const out = await flattenPatternTool({});
    expect(out.ok).toBe(false);
    expect(out.diagnostics[0].code).toBe('cli.invalid-args');
  });
});
