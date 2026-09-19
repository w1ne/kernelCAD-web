// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/mcp/edits/sourceEditUtils.test.ts
//
// Characterisation of the shared source-edit primitives before the
// complexity split: pins the scanner's line picks and the edit error strings.

import { describe, it, expect } from 'vitest';
import {
  findLastTopLevelReturnLine,
  insertStatementBeforeLastTopLevelReturn,
  replaceLastTopLevelReturn,
} from '../../../../src/agent/mcp/edits/sourceEditUtils';

describe('findLastTopLevelReturnLine', () => {
  const cases: Array<[string, string, number]> = [
    ['simple', 'const a = 1;\nreturn a;', 1],
    ['no return', 'const a = 1;\nconst b = 2;', -1],
    ['helper return skipped', 'function helper() { return 5; }\nconst w = helper();\nreturn box(w, 20, 5);', 2],
    ['multi-line return expression', 'const a = box(1,1,1);\nreturn a\n  .translate(5, 0, 0)\n  .fillet(2);', 1],
    ['return inside string ignored', 'const s = "return x";\nreturn s;', 1],
    ['return inside template ignored', 'const s = `return ${x}`;\nreturn s;', 1],
    ['return in line comment ignored', '// return 1\nreturn 2;', 1],
    ['return in block comment ignored', '/* return 1 */\nreturn 2;', 1],
    ['multi-line block comment', '/*\nreturn 1;\n*/\nreturn 2;', 3],
    ['return in brace skipped', 'const f = () => { return 3; };\nreturn f();', 1],
    ['identifier prefix ignored', 'const returned = 1;\nreturn returned;', 1],
    ['identifier suffix ignored', 'const x = myreturn;\nreturn x;', 1],
    ['last of two top-level returns', 'return 1;\nreturn 2;', 1],
    ['crlf source', 'const a = 1;\r\nreturn a;', 1],
    ['indented return', '\treturn a;', 0],
    ['nested return then top-level', 'if (a) {\n  return 1;\n}\nreturn 2;', 3],
  ];

  for (const [name, code, expected] of cases) {
    it(`${name} → ${expected}`, () => {
      expect(findLastTopLevelReturnLine(code)).toBe(expected);
    });
  }
});

describe('source-edit primitives', () => {
  it('insertStatementBeforeLastTopLevelReturn preserves indentation and line endings', () => {
    const r = insertStatementBeforeLastTopLevelReturn('const a = 1;\n  return a;\n', 'const b = 2;');
    expect(r).toEqual({ ok: true, new_code: 'const a = 1;\n  const b = 2;\n  return a;\n' });
  });

  it('insertStatementBeforeLastTopLevelReturn errors verbatim when no top-level return exists', () => {
    const r = insertStatementBeforeLastTopLevelReturn('const a = 1;', 'const b = 2;');
    expect(r).toEqual({ ok: false, error: 'no return statement found at top level — cannot place source edit.' });
  });

  it('replaceLastTopLevelReturn swaps the return line in place', () => {
    const r = replaceLastTopLevelReturn('const a = 1;\n  return a;', 'return a.model();');
    expect(r).toEqual({ ok: true, new_code: 'const a = 1;\n  return a.model();' });
  });

  it('replaceLastTopLevelReturn errors verbatim when no top-level return exists', () => {
    const r = replaceLastTopLevelReturn('const a = 1;', 'return a;');
    expect(r).toEqual({ ok: false, error: 'no return statement found at top level — cannot replace scene return.' });
  });
});
