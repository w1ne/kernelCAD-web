// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { setParamValue } from './setParamValue';

describe('setParamValue string literals', () => {
  const code = "const label = param('Label', 'KCAD', { maxLength: 24 });";

  it('keeps plain text single-quoted', () => {
    expect(setParamValue(code, 'Label', "it's").new_code)
      .toBe("const label = param('Label', 'it\\'s', { maxLength: 24 });");
  });

  it('never lets a value end the literal and become code', () => {
    const hostile = "\\'); globalThis.pwned = 1; ('";
    const next = setParamValue(code, 'Label', hostile).new_code!;
    const literal = next.slice(next.indexOf("'Label', ") + 9, next.indexOf(', { maxLength'));
    // The rewritten default parses back to exactly the input string.
    expect(new Function(`return ${literal};`)()).toBe(hostile);
  });

  it('escapes line breaks', () => {
    const next = setParamValue(code, 'Label', 'a\nb').new_code!;
    expect(next).toContain("'a\\nb'");
  });
});
