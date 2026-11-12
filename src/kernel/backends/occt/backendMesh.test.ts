// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { validateExportMeshToleranceOptions } from './backendMesh';

describe('export mesh tolerance validation', () => {
  it('rejects a positive angular tolerance that underflows when converted to radians', () => {
    const error = validateExportMeshToleranceOptions({ angularToleranceDeg: Number.MIN_VALUE });
    expect(error).toMatch(/angularToleranceDeg.*radian/i);
  });
});
