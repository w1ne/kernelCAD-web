// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { rewriteGlueFunction } from './occtGlueFunction';

describe('rewriteGlueFunction', () => {
  it('points every Function identifier at an alias taken at load', () => {
    const out = rewriteGlueFunction('var f=new Function("body","return 1");if(!(c instanceof Function))throw 0;g=new_(Function,a);');
    expect(out.startsWith('const __kernelcadGlueFunction = Function;')).toBe(true);
    expect(out.slice(out.indexOf('\n'))).not.toMatch(/(?<![\w.$"'])Function(?![\w$])/);
  });

  it('leaves names that only contain Function alone', () => {
    const out = rewriteGlueFunction('createNamedFunction(x); o.Function = 1; s = "Function"; makeLegalFunctionName(n);');
    expect(out).toContain('createNamedFunction(x)');
    expect(out).toContain('o.Function = 1');
    expect(out).toContain('"Function"');
    expect(out).toContain('makeLegalFunctionName(n)');
  });

  it('keeps behaviour: the rewritten code builds functions with the real constructor', () => {
    const run = new Function(rewriteGlueFunction('return new Function("a", "return a * 2")(21);'));
    expect(run()).toBe(42);
  });
});
