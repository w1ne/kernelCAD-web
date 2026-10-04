// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { readStepOriginatingSystem, stampStepOriginatingSystem } from './stepHeader';

// The header OCCT 7.6 writes, line-wrapped exactly as it comes out.
const OCCT_STEP = [
  'ISO-10303-21;',
  'HEADER;',
  "FILE_DESCRIPTION(('Open CASCADE Model'),'2;1');",
  "FILE_NAME('Open CASCADE Shape Model','2026-09-28T03:31:27',('Author'),(",
  "    'Open CASCADE'),'Open CASCADE STEP processor 7.6','Open CASCADE 7.6'",
  "  ,'Unknown');",
  "FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));",
  'ENDSEC;',
  'DATA;',
  "#1 = PRODUCT('Open CASCADE 7.6','x','',(#2));",
  'ENDSEC;',
  'END-ISO-10303-21;',
  '',
].join('\n');

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

describe('stampStepOriginatingSystem', () => {
  it('replaces only FILE_NAME originating_system and keeps OCCT as the preprocessor', () => {
    const out = dec(stampStepOriginatingSystem(enc(OCCT_STEP), 'kernelCAD 1.2.3 (https://kernelcad.com)'));
    expect(readStepOriginatingSystem(enc(out))).toBe('kernelCAD 1.2.3 (https://kernelcad.com)');
    expect(out).toContain("'Open CASCADE STEP processor 7.6','kernelCAD 1.2.3 (https://kernelcad.com)'");
    expect(out).toContain(",'Unknown');");
    // DATA is byte-identical, including the same text as the old value.
    expect(out.slice(out.indexOf('ENDSEC;'))).toBe(OCCT_STEP.slice(OCCT_STEP.indexOf('ENDSEC;')));
  });

  it('reads the OCCT value before stamping', () => {
    expect(readStepOriginatingSystem(enc(OCCT_STEP))).toBe('Open CASCADE 7.6');
  });

  it('escapes quotes and handles quoted commas and parentheses in earlier arguments', () => {
    const tricky = OCCT_STEP.replace("'Open CASCADE Shape Model'", "'a, (b) ''c'''");
    const out = stampStepOriginatingSystem(enc(tricky), "it's");
    expect(readStepOriginatingSystem(out)).toBe("it's");
    expect(dec(out)).toContain("'a, (b) ''c'''");
  });

  it('is idempotent', () => {
    const once = stampStepOriginatingSystem(enc(OCCT_STEP), 'g');
    expect(dec(stampStepOriginatingSystem(once, 'g'))).toBe(dec(once));
  });

  it('returns non-STEP input unchanged', () => {
    const bytes = enc('solid x\nendsolid x\n');
    expect(stampStepOriginatingSystem(bytes, 'g')).toBe(bytes);
    expect(readStepOriginatingSystem(bytes)).toBeUndefined();
  });
});
