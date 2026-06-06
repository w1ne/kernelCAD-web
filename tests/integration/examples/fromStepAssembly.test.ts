import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';

// Small vendor STEP fixture already in the repo (8.9 KB).
const FIXTURE = `${process.cwd()}/examples/robot-arm/so100/parts/Passive_Horn.step`;

describe('fromSTEP shapes inside assemblies', () => {
  it('transformed imported shape survives asm.part + solvedModel', async () => {
    const code = `
      const s = (await lib.fromSTEP('${FIXTURE}'))
        .rotate([0, 0, 1], 90).translate(0, -12.5, -16.5);
      const asm = assembly('t');
      const p = asm.part('imported', s);
      p.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
      return asm.solvedModel({});
    `;
    const result = await evaluateScript({ code, file: 'examples/t.kcad.ts' });

    expect(result.diagnostics).toEqual([]);
    expect(result.exitCode).toBe(0);
  });
});
