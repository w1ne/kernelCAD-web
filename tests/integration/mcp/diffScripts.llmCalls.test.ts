// tests/integration/mcp/diffScripts.llmCalls.test.ts
//
// LLM-style calls to `diff_scripts`, made through the public registry exactly
// as a ChatGPT / Claude client sends them: the schema's own example, the
// snake_case and before/after argument names models reach for, a multi-body
// `return [a, b]` script, and the genuinely-invalid calls that must come back
// as coded diagnostics naming the argument.
import { describe, it, expect, beforeAll } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import type { DiffScriptsOutput } from '../../../src/agent/mcp/tools/diffScripts';

const BEFORE = `const t = param('t', 5);\nreturn box(60, 20, t);`;
const AFTER = `const t = param('t', 8);\nreturn box(60, 20, t);`;

async function call(args: Record<string, unknown>): Promise<DiffScriptsOutput> {
  return (await callMcpTool('diff_scripts', args)) as DiffScriptsOutput;
}

function expectRootGrew(r: DiffScriptsOutput): void {
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.parts.changed).toHaveLength(1);
  expect(r.parts.changed[0].volumeMm3.delta).toBeCloseTo(60 * 20 * 3, 3);
  expect(r.params.changed.map((p) => p.name)).toEqual(['t']);
}

describe('diff_scripts — LLM-style calls', () => {
  beforeAll(async () => { await initOcct(); });

  it('the documented example call ({ baseCode, code }) succeeds', async () => {
    expectRootGrew(await call({ baseCode: BEFORE, code: AFTER }));
  });

  it.each([
    ['base_code / revised_code', { base_code: BEFORE, revised_code: AFTER }],
    ['old_code / new_code', { old_code: BEFORE, new_code: AFTER }],
    ['before / after', { before: BEFORE, after: AFTER }],
    ['baseline / code', { baseline: BEFORE, code: AFTER }],
  ])('accepts the %s argument names', async (_label, args) => {
    expectRootGrew(await call(args));
  });

  it('diffs every body of a `return [a, b]` script, not just the last one', async () => {
    const r = await call({
      baseCode: 'return [box(10, 10, 10), sphere(3).translate(20, 0, 0)];',
      code: 'return [box(10, 10, 12), sphere(3).translate(20, 0, 0)];',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.base.partCount).toBe(2);
    expect(r.parts.changed.map((p) => p.name)).toEqual(['part-1']);
    expect(r.parts.changed[0].volumeMm3.delta).toBeCloseTo(200, 3);
    expect(r.parts.unchanged).toEqual(['part-2']);
  });

  it('names the missing side, the argument and a working example', async () => {
    const r = await call({ code: AFTER });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.side).toBe('base');
    expect(r.errorCode).toBe('cli.invalid-args');
    expect(r.error).toContain("'baseCode'");
    expect(r.error).toContain('Example: diff_scripts({ baseCode:');
  });

  it('rejects a non-string source with the argument and the bad value', async () => {
    const r = await call({ baseCode: BEFORE, code: { source: AFTER } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.side).toBe('revised');
    expect(r.errorCode).toBe('cli.invalid-args');
    expect(r.error).toContain("argument 'code' must be a string");
    expect(r.error).toContain('"source"');
  });
});
