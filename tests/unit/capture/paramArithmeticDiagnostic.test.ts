// tests/unit/capture/paramArithmeticDiagnostic.test.ts
//
// The #439 trap: JS arithmetic / string templating on a ParamRef used to
// flow into geometry as "[object Object]4" or NaN and only fail deep in
// primitive validation with a generic message. Two layers now catch it:
//   1. Inside a script run a numeric ParamRef now coerces to its current
//      value (the param is recorded as coerced); outside a run it throws.
//   2. assertEditableNumber emits a targeted repair hint when residue of
//      the pattern (an "[object Object]" string, a stray string, NaN, or a
//      non-numeric ParamRef) still lands in a dimension slot.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';

async function runAndCatch(code: string): Promise<unknown> {
  try {
    await runScript({ code, fileName: 'trap.kcad.ts' });
  } catch (e) {
    return e;
  }
  return undefined;
}

describe('ParamRef JS-arithmetic trap diagnostics (capture-time)', () => {
  beforeAll(async () => { await initOcct(); });

  it('the original #439 repro — param + number — now builds and records the param as coerced', async () => {
    const run = await runScript({ code: `const w = param('fingerWidth', 18); return cylinder(w + 4, 5);`, fileName: 'trap.kcad.ts' });
    expect([...run.session.coercedParams]).toEqual(['fingerWidth']);
    const cyl = run.records.find((r) => r.kind === 'cylinder');
    expect(JSON.stringify(cyl?.params)).toContain('22');
  });

  it('a literal "[object Object]" string in a dimension slot gets the js-arithmetic hint', async () => {
    // Residual path: the garbage string was built outside a ParamRef coercion
    // (e.g. serialized upstream) and lands in a dimension argument.
    const caught = await runAndCatch(
      `const h = '[object Object]4'; return cylinder(h, 5);`,
    );
    expect(caught).toBeDefined();
    expect(String(caught)).toMatch(/requires a finite number/);
    const hint = (caught as { hint?: string }).hint ?? '';
    expect(hint).toMatch(/js-arithmetic/);
    expect(hint).toMatch(/\.add\(n\), \.subtract\(n\), \.multiply\(n\), \.divide\(n\)/);
  });

  it('any other string in a dimension slot gets the string-dimension hint', async () => {
    const caught = await runAndCatch(`return box('42', 10, 10);`);
    expect(caught).toBeDefined();
    const hint = (caught as { hint?: string }).hint ?? '';
    expect(hint).toMatch(/string-dimension/);
    expect(hint).toMatch(/must be numbers, not strings/);
  });

  it('NaN in a dimension slot names JS-arithmetic-on-ParamRef as the likely cause', async () => {
    const caught = await runAndCatch(`return box(NaN, 10, 10);`);
    expect(caught).toBeDefined();
    const hint = (caught as { hint?: string }).hint ?? '';
    expect(hint).toMatch(/js-arithmetic/);
    expect(hint).toMatch(/NaN here often means JS arithmetic/);
  });

  it('a boolean ParamRef in a numeric slot gets the type-mismatch hint', async () => {
    const caught = await runAndCatch(
      `const flag = param('addLid', true); return box(flag, 10, 10);`,
    );
    expect(caught).toBeDefined();
    const hint = (caught as { hint?: string }).hint ?? '';
    expect(hint).toMatch(/type-mismatch/);
    expect(hint).toMatch(/NUMERIC param/);
  });

  it('non-trap invalid args keep the generic positional-signature hint', async () => {
    const caught = await runAndCatch(`return cylinder({ radius: 5, height: 10 });`);
    expect(caught).toBeDefined();
    const hint = (caught as { hint?: string }).hint ?? '';
    expect(hint).toMatch(/POSITIONAL arguments/);
  });

  it('the documented fix — .add(4) — builds cleanly and stays symbolic', async () => {
    const result = await runScript({
      code: `const w = param('fingerWidth', 18); return cylinder(w.add(4), 5);`,
      fileName: 'fix.kcad.ts',
    });
    expect(result.records).toHaveLength(1);
    const params = result.records[0].params as { h: { paramRef?: unknown } };
    // Composed expression stored as AST → re-evaluates on param updates.
    expect(typeof params.h.paramRef).toBe('object');
  });
});
