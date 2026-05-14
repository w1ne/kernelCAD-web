// tests/unit/capture/sketchText.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';

describe('sketch.text() capture surface', () => {
  beforeAll(async () => { await initOcct(); });

  it('captures a sketch record with metadata.textContent + textOpts + fontFamily', async () => {
    const code = `
      const s = sketch.text("HI", { size: 10 });
      return s.extrude(2);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(2);
    expect(result.records[0].kind).toBe('sketch');
    const meta = result.records[0].metadata as {
      textContent?: string;
      textOpts?: { size: { evaluated: number }; align?: string };
      fontFamily?: string;
    };
    expect(meta.textContent).toBe('HI');
    expect(meta.textOpts?.size.evaluated).toBe(10);
    expect(meta.fontFamily).toBeUndefined();
  });

  it('default opts: align=left, position=[0,0], rotation=0', async () => {
    const code = `return sketch.text("A", { size: 5 }).extrude(1);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const meta = result.records[0].metadata as {
      textOpts: {
        align?: string;
        position?: { x: { evaluated: number }; y: { evaluated: number } };
        rotation?: { evaluated: number };
      };
    };
    expect(meta.textOpts.align).toBe('left');
    expect(meta.textOpts.position?.x.evaluated).toBe(0);
    expect(meta.textOpts.position?.y.evaluated).toBe(0);
    expect(meta.textOpts.rotation?.evaluated).toBe(0);
  });

  it('rejects invalid align with feature.invalid-args at capture time', async () => {
    const code = `return sketch.text("A", { size: 5, align: 'middle' as any }).extrude(1);`;
    await expect(runScript({ code, fileName: 'test.kcad.ts' }))
      .rejects.toThrow(/feature\.invalid-args|align/i);
  });

  it('ParamRef-bound size records the paramRef name', async () => {
    const code = `
      const h = param('h', 12);
      return sketch.text("X", { size: h }).extrude(1);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const meta = result.records[0].metadata as {
      textOpts: { size: { evaluated: number; paramRef?: string } };
    };
    // At capture time, paramRef leaves carry evaluated=0; the recompute engine
    // pre-resolves before lowering. The capture-side contract is: paramRef
    // string is set so the dispatcher can substitute it.
    expect(meta.textOpts.size.paramRef).toBe('h');
    // The param table holds the default value of 12.
    expect(result.paramTable.get('h').value).toBe(12);
  });

  it('empty content yields sketch.text.empty-content', async () => {
    const code = `return sketch.text("", { size: 5 }).extrude(1);`;
    let caught: { code?: string } | undefined;
    try {
      await runScript({ code, fileName: 'test.kcad.ts' });
    } catch (e) {
      caught = e as { code?: string };
    }
    expect(caught?.code).toBe('sketch.text.empty-content');
  });

  it('whitespace-only content yields sketch.text.empty-content', async () => {
    const code = `return sketch.text("   \\t\\n  ", { size: 5 }).extrude(1);`;
    let caught: { code?: string } | undefined;
    try {
      await runScript({ code, fileName: 'test.kcad.ts' });
    } catch (e) {
      caught = e as { code?: string };
    }
    expect(caught?.code).toBe('sketch.text.empty-content');
  });
});
