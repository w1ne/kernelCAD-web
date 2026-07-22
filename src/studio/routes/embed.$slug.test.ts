// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { embedPresentationMode } from './embed.$slug';

describe('embedPresentationMode', () => {
  it('keeps the default embed model-only', () => {
    expect(embedPresentationMode(undefined)).toBe('viewer');
    expect(embedPresentationMode('anything-else')).toBe('viewer');
  });

  it('selects the read-only Studio shell only when requested', () => {
    expect(embedPresentationMode('studio')).toBe('studio');
  });
});
