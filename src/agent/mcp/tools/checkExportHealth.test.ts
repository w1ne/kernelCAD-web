// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { checkExportHealthTool } from './checkExportHealth';

describe('check_export_health tool', () => {
  it('returns a local error when the script captures no assembly', async () => {
    const result = await checkExportHealthTool({ code: 'box(1, 1, 1);' });
    expect(result.ok).toBe(false);
    expect(result.source).toBe('local');
    if ('error' in result) expect(result.error.length).toBeGreaterThan(0);
  });
});
