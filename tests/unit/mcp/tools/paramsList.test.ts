import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../../src/agent/mcp/activeSession';
import { evaluateScriptTool } from '../../../../src/agent/mcp/tools/evaluateScript';
import { paramsListTool } from '../../../../src/agent/mcp/tools/paramsList';

describe('paramsListTool', () => {
  beforeAll(async () => { await initOcct(); });
  beforeEach(() => { clearActiveMcpSession(); });

  it('lists params declared on the active evaluated session', async () => {
    const evalResult = await evaluateScriptTool({
      code: `
        const boltDia = param('boltDia', 5, { min: 1, max: 20, description: 'bolt diameter' });
        const addCablePort = param('addCablePort', true);
        return box(60, 40, 5).hole('top', { u: 0, v: 0, diameter: boltDia, depth: 'through', enabled: addCablePort });
      `,
    });
    expect(evalResult.ok).toBe(true);

    const result = await paramsListTool({});

    expect(result.params).toEqual([
      {
        name: 'boltDia',
        type: 'number',
        value: 5,
        defaultValue: 5,
        min: 1,
        max: 20,
        description: 'bolt diameter',
      },
      {
        name: 'addCablePort',
        type: 'boolean',
        value: true,
        defaultValue: true,
      },
    ]);
  });

  it('returns an empty list when no session has been evaluated', async () => {
    const result = await paramsListTool({});
    expect(result.params).toEqual([]);
  });

  it('lists choice and string params with choices/kind metadata', async () => {
    const evalResult = await evaluateScriptTool({
      code: `
        const screw = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });
        const label = param('Label', 'KCAD', { maxLength: 24 });
        const diameters: Record<string, number> = { M3: 3.4, M4: 4.5, M5: 5.5 };
        return box(60, 40, 5)
          .hole('top', { u: 0, v: 0, diameter: diameters[screw.value], depth: 'through' });
      `,
    });
    expect(evalResult.ok).toBe(true);

    const result = await paramsListTool({});

    expect(result.params).toEqual([
      {
        name: 'Screw',
        type: 'choice',
        value: 'M4',
        defaultValue: 'M4',
        choices: ['M3', 'M4', 'M5'],
      },
      {
        name: 'Label',
        type: 'string',
        value: 'KCAD',
        defaultValue: 'KCAD',
      },
    ]);
  });
});
