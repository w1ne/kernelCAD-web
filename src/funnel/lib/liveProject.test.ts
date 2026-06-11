// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { shouldApplyProjectUpdate } from './liveProject';

describe('shouldApplyProjectUpdate', () => {
  it('applies when incoming version is newer', () => {
    expect(shouldApplyProjectUpdate(2, 3)).toBe(true);
  });
  it('drops stale or duplicate events', () => {
    expect(shouldApplyProjectUpdate(3, 3)).toBe(false);
    expect(shouldApplyProjectUpdate(3, 2)).toBe(false);
  });
  it('applies when either side has no version (legacy rows)', () => {
    expect(shouldApplyProjectUpdate(null, 1)).toBe(true);
    expect(shouldApplyProjectUpdate(2, null)).toBe(true);
  });
});
