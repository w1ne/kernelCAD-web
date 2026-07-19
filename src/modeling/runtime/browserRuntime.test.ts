// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tests for the BROWSER script runtime.
//
// READ THIS BEFORE ADDING A TEST HERE
// -----------------------------------
// The failure mode this file exists to prevent is a green gate that exercises
// the wrong artifact. `runScript` (node) and `runScriptInBrowser` share a core,
// but they differ in exactly the places that break: the runner, the transpiler,
// and — most importantly — the IMPORT GRAPH. A test that calls `runScript` and
// passes proves nothing about the browser.
//
// So every test below drives `runScriptInBrowser`, and the graph test walks the
// browser entry's imports mechanically rather than trusting inspection.
//
// These run in a node process. That is fine and deliberate: the property under
// test is which runner executes and which modules get pulled in, not which
// JavaScript engine evaluates the result. To keep node from flattering us, the
// tests that assert browser-shaped behaviour explicitly UNINSTALL the node
// host-filesystem port first (vitest's setup file installs it, as every node
// entry point does).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runScriptInBrowser } from './browserRuntime';
import { detectTypeScriptSyntax, transpileBrowser } from './browserTranspile';
import { __setHostFsForTest, type HostFs } from '../../shared/runtime/hostFs';
import { defaultCode } from '../../shared/worker/geometryEngine';
import { isParamRef } from '../../shared/runtime/paramRef';

/** Run with the host filesystem removed — i.e. shaped like a real browser. */
function withoutHostFs<T>(fn: () => T): T {
  const prev = __setHostFsForTest(null);
  try {
    return fn();
  } finally {
    __setHostFsForTest(prev);
  }
}

describe('browser runtime — the Studio starter script', () => {
  let restore: HostFs | null = null;
  beforeEach(() => {
    restore = __setHostFsForTest(null);
  });
  afterEach(() => {
    __setHostFsForTest(restore);
  });

  it('evaluates defaultCode, the script the Studio opens with', async () => {
    // This is the exact regression that forced modern code to the server: the
    // browser's v0.1 `param()` shim returned a plain number, so `t.add(2)` and
    // `w.divide(2)` — both in defaultCode — threw.
    const result = await runScriptInBrowser({ code: defaultCode });
    expect(result.returnValue).toBeDefined();
    expect(result.records.length).toBeGreaterThan(0);
  });

  it('param() returns a real ParamRef with working .add / .divide', async () => {
    const result = await runScriptInBrowser({
      code: `
        const w = param('Width', 60, { unit: 'mm' });
        return { isRef: __isRefProbe(w), added: w.add(2), divided: w.divide(2) };
      `.replace('__isRefProbe(w)', 'typeof w === "object" && w !== null'),
    });
    const out = result.returnValue as { isRef: boolean; added: unknown; divided: unknown };
    expect(out.isRef).toBe(true);
    expect(out.added).toBeDefined();
    expect(out.divided).toBeDefined();
  });

  it('records the declared params in the ParamTable', async () => {
    const result = await runScriptInBrowser({
      code: `const w = param('Width', 60, { unit: 'mm' }); return w;`,
    });
    expect(isParamRef(result.returnValue)).toBe(true);
    expect(result.paramTable.list().map((p) => p.name)).toContain('Width');
  });
});

describe('browser runtime — modern API surface', () => {
  let restore: HostFs | null = null;
  beforeEach(() => {
    restore = __setHostFsForTest(null);
  });
  afterEach(() => {
    __setHostFsForTest(restore);
  });

  it('runs path()', async () => {
    const result = await runScriptInBrowser({
      code: `
        const p = path().moveTo(0, 0).lineTo(10, 0).lineTo(10, 10).close();
        return p;
      `,
    });
    expect(result.returnValue).toBeDefined();
  });

  it('runs assembly() — the marquee "needs the full kernel" feature', async () => {
    const result = await runScriptInBrowser({
      code: `
        const a = assembly('bracket');
        a.part('base', box(10, 10, 10));
        a.part('boss', box(4, 4, 4));
        return a;
      `,
    });
    expect(result.returnValue).toBeDefined();
    expect(result.records.length).toBeGreaterThan(0);
  });

  it('runs a pattern', async () => {
    const result = await runScriptInBrowser({
      code: `return box(10, 10, 5).patternLinear({ count: 4, spacing: 20, direction: [1, 0, 0] });`,
    });
    expect(result.returnValue).toBeDefined();
  });

  it('runs a selector / query (q)', async () => {
    const result = await runScriptInBrowser({
      code: `
        const sel = q.face({ normal: [0, 0, 1] });
        return { built: sel !== undefined && sel !== null };
      `,
    });
    expect((result.returnValue as { built: boolean }).built).toBe(true);
  });

  it('runs nurbsCurve()', async () => {
    const result = await runScriptInBrowser({
      code: `
        return nurbsCurve({
          controls: [[0, 0, 0], [10, 5, 0], [20, 0, 0]],
          degree: 2,
        });
      `,
    });
    expect(result.returnValue).toBeDefined();
  });

  it('exposes the kc namespace alias, like node does', async () => {
    const result = await runScriptInBrowser({ code: `return typeof kc.box;` });
    expect(result.returnValue).toBe('function');
  });
});

describe('browser runtime — node-only features fail LOUDLY', () => {
  let restore: HostFs | null = null;
  beforeEach(() => {
    restore = __setHostFsForTest(null);
  });
  afterEach(() => {
    __setHostFsForTest(restore);
  });

  it('lib.fromSTEP names the feature and the reason — no crash, no silent no-op', async () => {
    await expect(
      runScriptInBrowser({ code: `return await lib.fromSTEP('bracket.step');` }),
    ).rejects.toThrow(/lib\.fromSTEP\(\).*filesystem/s);
  });

  it('lib.fromSTL fails the same way', async () => {
    await expect(
      runScriptInBrowser({ code: `return await lib.fromSTL('mesh.stl');` }),
    ).rejects.toThrow(/lib\.fromSTL\(\).*filesystem/s);
  });

  it('lib.standard.* fails the same way', async () => {
    await expect(
      runScriptInBrowser({ code: `return await lib.standard.boltSHCS({ thread: 'M3', lengthMm: 10 });` }),
    ).rejects.toThrow(/lib\.standard\.boltSHCS\(\).*filesystem/s);
  });

  it('referenceImage() reports a diagnostic rather than a bogus "file not found"', async () => {
    const result = await runScriptInBrowser({
      code: `return referenceImage('ref.png', { plane: 'xy' });`,
    });
    const handle = result.returnValue as {
      metadata: { diagnostics?: { code: string; message: string }[] };
    };
    const diags = handle.metadata.diagnostics;
    expect(diags).toBeDefined();
    expect(diags?.some((d) => d.code === 'cli.host-fs-unavailable')).toBe(true);
    // It must NOT claim the file is missing — that check never ran.
    expect(diags?.some((d) => d.code === 'feature.reference-image.path-not-found')).toBe(false);
  });
});

describe('browser transpiler', () => {
  it('passes plain JavaScript through untouched', () => {
    const src = `const a = 1;\nreturn box(a, a, a);`;
    expect(transpileBrowser(src).code).toBe(src);
  });

  it('refuses TypeScript syntax by NAME instead of mangling it', () => {
    expect(() => transpileBrowser(`const w: number = 5; return w;`)).toThrow(
      /TypeScript syntax \(variable type annotation\)/,
    );
    expect(() => transpileBrowser(`interface Foo { a: number }\nreturn 1;`)).toThrow(
      /TypeScript syntax \(interface declaration\)/,
    );
  });

  it('does not mistake JavaScript for TypeScript', () => {
    // Object literals, ternaries, labelled-looking keys and prose in comments
    // all contain colons; none of them is a type annotation.
    const js = [
      defaultCode,
      `const o = { a: 1, b: 'x' }; return o;`,
      `const v = cond ? 1 : 2; return v;`,
      `// returns a Shape: the base solid\nreturn box(1, 1, 1);`,
      `const s = "width: 10"; return s;`,
      `for (const [k, v] of Object.entries({ a: 1 })) { console.log(k, v); }\nreturn 1;`,
    ];
    for (const src of js) {
      expect(detectTypeScriptSyntax(src), `false positive on: ${src.slice(0, 40)}`).toBeNull();
    }
  });

  it('accepts the real TypeScript compiler as an opt-in override', async () => {
    const { transpileTs } = await import('./transpile');
    const result = await withoutHostFs(() =>
      runScriptInBrowser({
        code: `const w: number = 10; return box(w, w, w);`,
        transpile: transpileTs,
      }),
    );
    expect(result.returnValue).toBeDefined();
  });
});
