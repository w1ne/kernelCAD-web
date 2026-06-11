// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { GeometryResult } from '../../../shared/worker/geometryEngine';
import { sectionPartKey } from './sectionParts';

describe('sectionPartKey', () => {
  it('prefers assemblyPartName, then item name, then positional fallback', () => {
    const withPart: GeometryResult = { faces: [], assemblyPartName: 'servo_left' };
    const bare: GeometryResult = { faces: [] };
    expect(sectionPartKey(withPart, 'ignored', 0)).toBe('servo_left');
    expect(sectionPartKey(bare, 'drum', 1)).toBe('drum');
    expect(sectionPartKey(bare, null, 2)).toBe('shape-3');
    expect(sectionPartKey(bare, undefined, 0)).toBe('shape-1');
  });
});
