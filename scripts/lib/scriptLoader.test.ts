import { describe, it, expect } from 'vitest';
import { loadScriptFeatures } from './scriptLoader';
import { resolve } from 'node:path';

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
});
