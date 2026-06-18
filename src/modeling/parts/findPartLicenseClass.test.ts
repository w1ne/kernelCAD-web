// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/findPartLicenseClass.test.ts
//
// find_part licenseClass filter. loadCatalog is mocked so the record set is
// controlled (a record with NO licenseClass must be treated as 'permissive').
// The real queryCatalog runs over the mocked records, so existing query/filter
// behavior is exercised end-to-end alongside the new filter.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { PartRecord } from '../../shared/parts/types';

function rec(
  id: string,
  licenseClass?: PartRecord['licenseClass'],
): PartRecord {
  return {
    id,
    name: id,
    category: 'fastener',
    family: 'fam',
    tags: ['widget'],
    attributes: {},
    sha256: 'x',
    source: 'local-catalog',
    license: 'MIT',
    connectors: [],
    ...(licenseClass !== undefined ? { licenseClass } : {}),
  };
}

const MOCK_RECORDS: PartRecord[] = [
  rec('permissive-explicit', 'permissive'),
  rec('share-alike-one', 'share-alike'),
  rec('fetch-only-one', 'fetch-only'),
  rec('no-license-class'), // implicit permissive
];

vi.mock('./catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./catalog')>();
  return {
    ...actual,
    loadCatalog: () => ({ dir: '/mock', records: MOCK_RECORDS }),
  };
});

import { findPartHost } from './findPart';

describe('findPart licenseClass filter', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    process.env.KERNELCAD_PARTS_BASE_URL = 'off';
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('"permissive" includes explicit + no-licenseClass records, excludes others', async () => {
    const r = await findPartHost('widget', {
      source: 'local',
      licenseClass: 'permissive',
    });
    const ids = r.results.map((x) => x.id).sort();
    expect(ids).toEqual(['no-license-class', 'permissive-explicit']);
  });

  it('"share-alike" matches only share-alike records', async () => {
    const r = await findPartHost('widget', {
      source: 'local',
      licenseClass: 'share-alike',
    });
    expect(r.results.map((x) => x.id)).toEqual(['share-alike-one']);
  });

  it('"fetch-only" matches only fetch-only records', async () => {
    const r = await findPartHost('widget', {
      source: 'local',
      licenseClass: 'fetch-only',
    });
    expect(r.results.map((x) => x.id)).toEqual(['fetch-only-one']);
  });

  it('no licenseClass filter returns all matches; existing filters still apply', async () => {
    const all = await findPartHost('widget', { source: 'local' });
    expect(all.results.length).toBe(4);
    const narrowed = await findPartHost('widget', {
      source: 'local',
      category: 'nonexistent',
    });
    expect(narrowed.results.length).toBe(0);
  });
});
