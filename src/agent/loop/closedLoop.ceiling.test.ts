// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { MAX_REPAIR_ATTEMPTS_CEILING } from './closedLoop';

describe('MAX_REPAIR_ATTEMPTS_CEILING', () => {
  it('is documented at 10 (default maxAttempts intentionally stays lower until W5)', () => {
    expect(MAX_REPAIR_ATTEMPTS_CEILING).toBe(10);
  });
});
