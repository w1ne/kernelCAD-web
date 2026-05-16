import { describe, it, expect } from 'vitest';
import { loadScriptFeatures } from './scriptLoader';
import { resolve } from 'node:path';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { meshFeaturesPerFeature } from '../../src/capture/featureMeshing';

describe('loadScriptFeatures', () => {
  it('extracts ordered feature list from bracket-with-hole.kcad.ts', async () => {
    const path = resolve(__dirname, '../../examples/bracket-with-hole.kcad.ts');
    const result = await loadScriptFeatures(path);
    expect(result.features.length).toBeGreaterThanOrEqual(3);
    // Expect at least one box, one cylinder, and a boolean/fillet
    const kinds = result.features.map((f) => f.kind);
    expect(kinds).toContain('box');
    expect(kinds).toContain('cylinder');
  });

  it('returns the script source verbatim alongside features', async () => {
    const path = resolve(__dirname, '../../examples/bracket-with-hole.kcad.ts');
    const result = await loadScriptFeatures(path);
    expect(result.source).toContain('box');
    expect(result.source.length).toBeGreaterThan(50);
  });

  it('keeps the ParamTable needed to mesh parametric demo scripts', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'script-loader-'));
    const path = join(dir, 'parametric.kcad.ts');
    writeFileSync(path, `
      const w = param('plateW', 60, { min: 40, max: 100 });
      const t = param('plateT', 5, { min: 2, max: 10 });
      return box(w, 40, t);
    `);

    const result = await loadScriptFeatures(path);
    const { features, failedFeatureIds } = await meshFeaturesPerFeature(
      result.features.map((f) => f.record),
      result.paramTable,
    );

    expect(failedFeatureIds).toEqual([]);
    expect(features).toHaveLength(result.features.length);
    rmSync(dir, { recursive: true, force: true });
  });
});
