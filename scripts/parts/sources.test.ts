// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/sources.test.ts

import { describe, it, expect } from 'vitest';
import { SOURCES } from './sources';
import { isPartCategory } from '../../src/shared/parts/taxonomy';

const ADAPTERS = new Set(['step-passthrough', 'step-parts', 'github-glob']);
const LICENSE_CLASSES = new Set(['permissive', 'share-alike', 'fetch-only']);
const REDISTRIBUTION = new Set(['mirror', 'fetch-only']);

describe('SOURCES registry', () => {
  it('is non-empty', () => {
    expect(SOURCES.length).toBeGreaterThan(0);
  });

  it('every entry has the required fields with valid values', () => {
    for (const s of SOURCES) {
      expect(typeof s.id, s.id).toBe('string');
      expect(s.id.length, s.id).toBeGreaterThan(0);
      expect(typeof s.repo, s.id).toBe('string');
      expect(s.repo.length, s.id).toBeGreaterThan(0);
      expect(typeof s.commit, s.id).toBe('string');
      expect(s.commit.length, s.id).toBeGreaterThan(0);
      expect(typeof s.license, s.id).toBe('string');
      expect(s.license.length, s.id).toBeGreaterThan(0);
      expect(typeof s.attribution, s.id).toBe('string');
      expect(s.attribution.length, s.id).toBeGreaterThan(0);
      expect(ADAPTERS.has(s.adapter), `${s.id} adapter=${s.adapter}`).toBe(true);
      expect(LICENSE_CLASSES.has(s.licenseClass), `${s.id} licenseClass`).toBe(true);
      expect(REDISTRIBUTION.has(s.redistribution), `${s.id} redistribution`).toBe(true);
      expect(Array.isArray(s.include), s.id).toBe(true);
      expect(s.include.length, s.id).toBeGreaterThan(0);
    }
  });

  it('has unique ids', () => {
    const ids = SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every mirror entry is permissive or share-alike (never fetch-only)", () => {
    for (const s of SOURCES) {
      if (s.redistribution === 'mirror') {
        expect(s.licenseClass, s.id).not.toBe('fetch-only');
        expect(['permissive', 'share-alike']).toContain(s.licenseClass);
      }
    }
  });

  it('every share-alike entry sits behind a legal hold', () => {
    for (const s of SOURCES) {
      if (s.licenseClass === 'share-alike') {
        expect(s.legalHold, s.id).toBe(true);
      }
    }
  });

  it('categoryMap values (when present) are valid taxonomy categories', () => {
    for (const s of SOURCES) {
      if (!s.categoryMap) continue;
      for (const [dir, cat] of Object.entries(s.categoryMap)) {
        expect(isPartCategory(cat), `${s.id}.${dir} -> ${cat}`).toBe(true);
      }
    }
  });

  it('pins a 40-char SHA for every entry (or flags a branch fallback)', () => {
    for (const s of SOURCES) {
      const isSha = /^[0-9a-f]{40}$/.test(s.commit);
      const isBranch = /^[a-z][\w.\-/]*$/i.test(s.commit);
      expect(isSha || isBranch, `${s.id} commit=${s.commit}`).toBe(true);
    }
  });
});
