// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { SourceMapLookup } from './sourceMapLookup';

// Real transpiler output, not a hand-written mapping — the decoder has to
// agree with the compiler the script runtime actually uses.
function transpiledMapOf(source: string): string | undefined {
  return ts.transpileModule(source, {
    fileName: 'model.kcad.ts',
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      sourceMap: true,
      isolatedModules: true,
    },
  }).sourceMapText;
}

describe('SourceMapLookup', () => {
  it('maps a generated position back to the original statement', () => {
    const source = [
      'const width: number = 40;',
      'const base = box(width, 30, 20);',
      'return base.fillet(2);',
    ].join('\n');
    const lookup = SourceMapLookup.fromJson(transpiledMapOf(source));
    expect(lookup).toBeDefined();

    // Type annotations are erased, so generated line 1 is shorter than the
    // original — the mapping, not the raw column, is what tells the truth.
    expect(lookup!.lookup(2, 14)?.line).toBe(2);
    expect(lookup!.lookup(3, 13)?.line).toBe(3);
  });

  it('returns undefined for absent or unparseable map text', () => {
    expect(SourceMapLookup.fromJson(undefined)).toBeUndefined();
    expect(SourceMapLookup.fromJson('')).toBeUndefined();
    expect(SourceMapLookup.fromJson('{not json')).toBeUndefined();
    expect(SourceMapLookup.fromJson('{"version":3}')).toBeUndefined();
  });

  it('returns undefined for a generated line with no mappings', () => {
    const lookup = SourceMapLookup.fromJson(transpiledMapOf('return box(1, 1, 1);'));
    expect(lookup!.lookup(99, 1)).toBeUndefined();
  });
});
