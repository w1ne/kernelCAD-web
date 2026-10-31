// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { commentRanges } from './commentRanges';
import { loadSnippets } from './index';

/** The TypeScript parser's comment trivia: the reference the scanner replaced. */
function tsCommentRanges(src: string): { pos: number; end: number }[] {
  const sf = ts.createSourceFile('x.ts', src, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const byPos = new Map<number, { pos: number; end: number }>();
  const visit = (node: ts.Node): void => {
    if (ts.isJSDoc(node)) return;
    const children = node.getChildren(sf);
    if (children.length > 0) { for (const c of children) visit(c); return; }
    for (const r of ts.getLeadingCommentRanges(src, node.pos) ?? []) byPos.set(r.pos, { pos: r.pos, end: r.end });
    for (const r of ts.getTrailingCommentRanges(src, node.end) ?? []) byPos.set(r.pos, { pos: r.pos, end: r.end });
  };
  visit(sf);
  return [...byPos.values()].sort((a, b) => a.pos - b.pos);
}

describe('commentRanges', () => {
  it('finds line and block comments, skipping strings, templates and regexes', () => {
    const src = [
      "const url = 'https://x.com//a'; // one",
      'const t = `a // b ${ {k: `x // y`}.k } // c`; /* two */',
      'const re = /a\\/\\/b[/]/g, q = 4 / 2 / 1; // three',
      'if (x) return /\\/\\//.test(s);',
    ].join('\n');
    const texts = commentRanges(src).map((r) => src.slice(r.pos, r.end));
    expect(texts).toEqual(['// one', '/* two */', '// three']);
  });

  it('matches the TypeScript parser on every cookbook snippet', () => {
    for (const s of loadSnippets()) {
      expect(commentRanges(s.body), s.id).toEqual(tsCommentRanges(s.body));
    }
  });
});
