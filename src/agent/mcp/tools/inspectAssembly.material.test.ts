// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { summarizePartMaterial } from './inspectAssembly';

describe('assembly part material inventory', () => {
  it('reports explicitly assigned engineering material', () => {
    expect(summarizePartMaterial({ name: 'insert', material: 'aluminum-6061' }))
      .toEqual({ name: 'insert', material: 'aluminum-6061' });
  });

  it('omits an unassigned material instead of guessing', () => {
    expect(summarizePartMaterial({ name: 'housing', material: undefined }))
      .toEqual({ name: 'housing' });
  });
});
