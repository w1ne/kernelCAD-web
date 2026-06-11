// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { Scene } from './scene';

describe('Scene.toShape() removed in v0.6.0', () => {
  it('no longer exposes toShape on the prototype', () => {
    const proto = Scene.prototype as Record<string, unknown>;
    expect(proto.toShape).toBeUndefined();
  });
});
