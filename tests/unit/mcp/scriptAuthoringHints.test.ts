// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Authoring-contract regressions from the agent benchmark:
//   - a script with no `return` evaluated "OK" and exported the last shape,
//     contradicting the skill's return rule → coded warning script.no-return
//     on evaluate (full and dry run) and on export;
//   - `holes(face, …)` written as a free function (as the skill's routing
//     table showed it) died with a bare ReferenceError → the hint now says it
//     is a Shape method;
//   - the skills cite `lookup_cookbook(<id>)` but the tool only took `query`
//     → `id` resolves the snippet exactly.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { lookupCookbookTool } from '../../../src/agent/mcp/tools/lookupCookbook';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { SHAPE_METHODS } from '../../../src/agent/mcp/tools/listApi';
import { SHAPE_METHOD_HINT_EXAMPLES } from '../../../src/modeling/runtime/shapeMethodHintExamples';
import { Shape } from '../../../src/modeling/capture/proxy';

/** Count the top-level comma-separated arguments of the call in `example`. */
function topLevelArgCount(example: string, method: string): number {
  const start = example.indexOf(`.${method}(`) + method.length + 2;
  let depth = 0;
  let n = 1;
  for (let i = start; i < example.length; i++) {
    const c = example[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) { if (depth === 0) return n; depth--; }
    else if (c === ',' && depth === 0) n++;
  }
  throw new Error(`unbalanced call in ${example}`);
}

/** Positional parameters in a list_api signature: (a, b?, opts?) => … */
function signatureParams(sig: string): { min: number; max: number } {
  const inner = sig.slice(1, sig.indexOf(') =>'));
  if (inner.startsWith('...')) return { min: 1, max: Infinity };
  let depth = 0;
  const parts: string[] = [];
  let cur = '';
  for (const c of inner) {
    if ('([{<'.includes(c)) depth++;
    if (')]}>'.includes(c)) depth--;
    if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return { min: parts.filter((p) => !/^\w+\?/.test(p)).length, max: parts.length };
}

const NO_RETURN = `const a = box(10, 10, 10);
const b = a.subtract(cylinder(20, 2).translate(5, 5, -1));`;

describe('script authoring hints', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('evaluate_script warns script.no-return (still ok, compatibility kept)', async () => {
    const r = await evaluateScriptTool({ code: NO_RETURN });
    expect(r.ok).toBe(true);
    const d = r.diagnostics.find((x) => x.code === 'script.no-return');
    expect(d?.severity).toBe('warn');
    expect(d?.hint).toMatch(/return/);
    const dry = await evaluateScriptTool({ code: NO_RETURN, dryRun: true });
    expect(dry.diagnostics.some((x) => x.code === 'script.no-return')).toBe(true);
  }, 60_000);

  it('a script that returns its shape gets no script.no-return', async () => {
    const r = await evaluateScriptTool({ code: `${NO_RETURN}\nreturn b;` });
    expect(r.diagnostics.some((x) => x.code === 'script.no-return')).toBe(false);
  }, 60_000);

  it('export of a no-return script carries the warning', async () => {
    const r = await runAndExport({ code: NO_RETURN, fileName: 'nr.kcad.ts', format: 'stl' });
    expect(r.bytes.length).toBeGreaterThan(0);
    expect(r.diagnostics.some((x) => x.code === 'script.no-return')).toBe(true);
  }, 60_000);

  it('a Shape method called as a free function names the method form', async () => {
    const r = await evaluateScriptTool({
      code: "const plate = box(20, 20, 5);\nreturn holes({ byNormal: 'Z' }, { positions: [{ u: 0, v: 0 }], diameter: 3, depth: 'through' });",
    });
    expect(r.ok).toBe(false);
    const d = r.diagnostics[0];
    expect(d.code).toBe('cli.script-exception');
    expect(d.message).toMatch(/holes is a Shape method/);
    expect(d.hint).toContain('body.holes(');
  }, 60_000);

  it('fillet called as a free function shows the radius-first signature', async () => {
    const r = await evaluateScriptTool({ code: "let plate = box(20, 20, 5);\nreturn fillet({ byNormal: 'Z' }, 1);" });
    const d = r.diagnostics[0];
    expect(d.message).toMatch(/fillet is a Shape method/);
    expect(d.hint).toContain('plate.fillet(2,');
    expect(d.hint).not.toContain('byNormal');
  }, 60_000);

  it('every free-function hint example matches its list_api signature and evaluates', async () => {
    const byName = new Map(SHAPE_METHODS.map((e) => [e.name, e]));
    const proto = Shape.prototype as unknown as Record<string, unknown>;
    for (const [method, example] of Object.entries(SHAPE_METHOD_HINT_EXAMPLES)) {
      expect(typeof proto[method], method).toBe('function');
      const entry = byName.get(method);
      expect(entry, `${method} is in list_api SHAPE_METHODS`).toBeDefined();
      const { min, max } = signatureParams(entry!.signature);
      const n = topLevelArgCount(example, method);
      expect(n, `${example} vs ${entry!.signature}`).toBeGreaterThanOrEqual(min);
      expect(n, `${example} vs ${entry!.signature}`).toBeLessThanOrEqual(max);
      const r = await evaluateScriptTool({ code: `let plate = box(40, 30, 10);\n${example};\nreturn plate;` });
      const errs = r.diagnostics.filter((x) => x.severity === 'error');
      expect(errs, `${example}: ${JSON.stringify(errs)}`).toEqual([]);
    }
    // A method without a worked example gets the bare form, never a made-up argument list.
    const r = await evaluateScriptTool({ code: 'let plate = box(20, 20, 5);\nreturn embossText({});' });
    expect(r.diagnostics[0].hint).toContain('body.embossText(...)');
  }, 300_000);

  it('an unknown free name keeps the plain ReferenceError', async () => {
    const r = await evaluateScriptTool({ code: 'return notAThing(1);' });
    expect(r.diagnostics[0].message).toBe('ReferenceError: notAThing is not defined');
  }, 60_000);

  it('lookup_cookbook accepts { id } as the skills cite it', async () => {
    const exact = await lookupCookbookTool({ id: 'clearance-hole-through-plate' });
    expect(exact.ok).toBe(true);
    expect(exact.hits?.map((h) => h.id)).toEqual(['clearance-hole-through-plate']);
    const fuzzy = await lookupCookbookTool({ id: 'clearance-hole-plate' });
    expect(fuzzy.ok).toBe(true);
    expect(fuzzy.hits?.[0].id).toBe('clearance-hole-through-plate');
    const none = await lookupCookbookTool({});
    expect(none.ok).toBe(false);
  });
});
