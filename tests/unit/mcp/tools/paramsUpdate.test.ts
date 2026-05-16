import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../../src/mcp/activeSession';
import { evaluateScriptTool } from '../../../../src/mcp/tools/evaluateScript';
import { paramsListTool } from '../../../../src/mcp/tools/paramsList';
import { paramsUpdateTool } from '../../../../src/mcp/tools/paramsUpdate';

describe('paramsUpdateTool', () => {
  beforeAll(async () => { await initOcct(); });
  beforeEach(() => { clearActiveMcpSession(); });

  it('updates active session params atomically and returns a serialized shape preview', async () => {
    const evalResult = await evaluateScriptTool({
      code: `
        const w = param('plateW', 60, { min: 40, max: 100 });
        const boltDia = param('boltDia', 5, { min: 1, max: 20 });
        return box(w, 40, 5).hole('top', { u: 0, v: 0, diameter: boltDia, depth: 'through' });
      `,
    });
    expect(evalResult.ok).toBe(true);

    const result = await paramsUpdateTool({
      edits: [{ name: 'boltDia', value: 10 }],
    });

    expect(result.shape.featureId).toMatch(/^hole_/);
    expect(result.shape.volume).toBeGreaterThan(0);
    expect(result.relowered.some(id => id.startsWith('hole_'))).toBe(true);
    expect(result.skipped.some(id => id.startsWith('box_'))).toBe(true);
    expect(result.warnings).toEqual([]);

    const list = await paramsListTool({});
    expect(list.params.find(p => p.name === 'boltDia')?.value).toBe(10);
  });

  it('surfaces validation errors without mutating earlier edits in the same call', async () => {
    const evalResult = await evaluateScriptTool({
      code: `
        const w = param('plateW', 60, { min: 40, max: 100 });
        const boltDia = param('boltDia', 5, { min: 1, max: 20 });
        return box(w, 40, 5).hole('top', { u: 0, v: 0, diameter: boltDia, depth: 'through' });
      `,
    });
    expect(evalResult.ok).toBe(true);

    const result = await paramsUpdateTool({
      edits: [
        { name: 'boltDia', value: 10 },
        { name: 'plateW', value: 200 },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('feature.invalid-args');
    expect(result.errorHint).toContain('invalid-args.param.value-out-of-range');

    const list = await paramsListTool({});
    expect(list.params.find(p => p.name === 'boltDia')?.value).toBe(5);
    expect(list.params.find(p => p.name === 'plateW')?.value).toBe(60);
  });
});
