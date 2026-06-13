// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import * as namingApi from './index';

describe('src/kernel/naming barrel — F-foundation surface', () => {
  it('exports parseTopoRef + formatTopoRef', () => {
    expect(typeof namingApi.parseTopoRef).toBe('function');
    expect(typeof namingApi.formatTopoRef).toBe('function');
  });

  it('exports resolveTopoRef', () => {
    expect(typeof namingApi.resolveTopoRef).toBe('function');
  });

  it('exports assertTopoRefSafeName + TOPO_REF_NAME_REGEX + RESERVED_TOPO_REF_CHARS', () => {
    expect(typeof namingApi.assertTopoRefSafeName).toBe('function');
    expect(namingApi.TOPO_REF_NAME_REGEX).toBeInstanceOf(RegExp);
    expect(Array.isArray(namingApi.RESERVED_TOPO_REF_CHARS)).toBe(true);
  });

  it('re-exports the existing lineage helpers so callers can stay within the barrel', () => {
    expect(typeof namingApi.findLineageMatches).toBe('function');
    expect(typeof namingApi.findByGeometrySnapshot).toBe('function');
  });

  it('exposes OcctBackend as a type re-export', () => {
    // Type-only re-exports cannot be probed at runtime — this assertion exists
    // so the test file imports the symbol via the barrel and tsc verifies it.
    type Backend = import('./index').OcctBackend;
    const _check: Backend | undefined = undefined;
    expect(_check).toBeUndefined();
  });
});
