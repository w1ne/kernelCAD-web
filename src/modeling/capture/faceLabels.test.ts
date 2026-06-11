// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { validateFaceLabels } from './faceLabels';
import { KernelError } from '../../shared/intent/kernelError';

describe('validateFaceLabels — F-foundation uniqueness tightening', () => {
  it('accepts a single ref-safe label key mapping to a canonical face', () => {
    expect(validateFaceLabels({ lid: 'top' }, 'extrude')).toEqual({ lid: 'top' });
  });

  it('rejects a label key containing a dot (reserved separator)', () => {
    expect(() => validateFaceLabels({ 'top.bottom': 'top' }, 'extrude')).toThrow(KernelError);
  });

  it('rejects a label key containing a slash', () => {
    expect(() => validateFaceLabels({ 'top/bottom': 'top' }, 'extrude')).toThrow(KernelError);
  });

  it('rejects a label key containing bracket characters', () => {
    expect(() => validateFaceLabels({ 'lid[0]': 'top' }, 'extrude')).toThrow(KernelError);
  });

  it('rejects a label key containing @ or #', () => {
    expect(() => validateFaceLabels({ '@lid': 'top' }, 'extrude')).toThrow(KernelError);
    expect(() => validateFaceLabels({ 'lid#normal': 'top' }, 'extrude')).toThrow(KernelError);
  });

  it('rejects a label key starting with a digit', () => {
    expect(() => validateFaceLabels({ '1lid': 'top' }, 'extrude')).toThrow(KernelError);
  });

  it('preserves existing FaceQuery acceptance for ref-safe keys', () => {
    const q = { kind: 'face-by-normal', normal: [0, 0, 1] };
    expect(validateFaceLabels({ lid: q }, 'extrude')).toEqual({ lid: q });
  });
});
