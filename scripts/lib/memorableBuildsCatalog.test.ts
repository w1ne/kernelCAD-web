import { describe, it, expect } from 'vitest';
import {
  getCatalogForVersion,
  isCatalogSlug,
  GENERIC_PRIMITIVE_DENYLIST,
  ALL_VERSIONS,
} from './memorableBuildsCatalog';

describe('memorableBuildsCatalog', () => {
  it('exposes shortlists for v0.21 and every version v0.3 through v0.17 plus v1.0', () => {
    expect(ALL_VERSIONS).toEqual([
      'v0.21',
      'v0.3', 'v0.4', 'v0.5', 'v0.6', 'v0.7', 'v0.8', 'v0.9',
      'v0.10', 'v0.11', 'v0.12', 'v0.13', 'v0.14', 'v0.15', 'v0.16', 'v0.17',
      'v1.0',
    ]);
  });

  it('every version has at least 2 candidate slugs and exactly one recommended', () => {
    for (const version of ALL_VERSIONS) {
      const entry = getCatalogForVersion(version);
      expect(entry).toBeDefined();
      expect(entry!.candidates.length).toBeGreaterThanOrEqual(2);
      const recommended = entry!.candidates.filter((c) => c.recommended);
      expect(recommended.length).toBe(1);
    }
  });

  it('isCatalogSlug accepts ★ recommendations and backups for the matching version', () => {
    expect(isCatalogSlug('donut', 'v0.21')).toBe(true);
    expect(isCatalogSlug('apple-core', 'v0.21')).toBe(true);
    expect(isCatalogSlug('espresso-cup', 'v0.3')).toBe(true);
  });

  it('isCatalogSlug rejects slugs from the wrong version', () => {
    expect(isCatalogSlug('donut', 'v0.3')).toBe(false);
    expect(isCatalogSlug('espresso-cup', 'v0.21')).toBe(false);
  });

  it('isCatalogSlug rejects unknown slugs', () => {
    expect(isCatalogSlug('made-up-thing', 'v0.3')).toBe(false);
  });

  it('GENERIC_PRIMITIVE_DENYLIST contains the expected primitive names', () => {
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('box');
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('bracket');
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('plate');
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('cylinder');
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('cube');
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('sphere');
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('torus-only');
  });

  it('every catalog slug is kebab-case and has no leading/trailing dashes', () => {
    for (const version of ALL_VERSIONS) {
      const entry = getCatalogForVersion(version)!;
      for (const c of entry.candidates) {
        expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }
    }
  });
});
