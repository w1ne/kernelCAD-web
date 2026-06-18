// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/demoPlayer/sectionParam.test.ts
//
// Unit tests for the demo-player `?section=<axis>:<pos>` / `?sectionflip=1`
// URL-param parser used by the headless render path.

import { describe, it, expect } from 'vitest';
import { parseSectionParam } from './sectionParam';

describe('parseSectionParam', () => {
  it('parses axis:position', () => {
    expect(parseSectionParam('z:10', null)).toEqual({ axis: 'z', position: 10, flip: false });
    expect(parseSectionParam('x:-2.5', '1')).toEqual({ axis: 'x', position: -2.5, flip: true });
  });

  it('rejects junk', () => {
    expect(parseSectionParam('w:1', null)).toBeNull();
    expect(parseSectionParam('z:abc', null)).toBeNull();
    expect(parseSectionParam(null, '1')).toBeNull();
  });
});
