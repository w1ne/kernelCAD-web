// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadScriptFeatures } from './scriptLoader';

// `kernelcad render` and `render_preview` load the script through
// `loadScriptFeatures`. The modeling primitive has no `kinematic` namespace,
// so a script that calls `kinematic.*` threw `ReferenceError: kinematic is not
// defined` on the render path while `evaluate_script` accepted it.
describe('composition loadScriptFeatures', () => {
  it('gives the script the kinematic namespace', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'composed-script-loader-'));
    try {
      const path = join(dir, 'kinematic-global.kcad.ts');
      writeFileSync(path, `
        if (typeof kinematic.checkSweptCollision !== 'function') throw new Error('no checkSweptCollision');
        if (typeof kinematic.sweepTolerance !== 'function') throw new Error('no sweepTolerance');
        return box(10, 20, 30);
      `);
      const loaded = await loadScriptFeatures(path);
      expect(loaded.features.map((f) => f.kind)).toEqual(['box']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('loads kinematic cookbook 4, which calls kinematic.checkSweptCollision', async () => {
    const path = resolve(
      __dirname,
      '../agent/skills/kernelcad-kinematic/cookbook/04-scissor-jack-swept.kcad.ts',
    );
    const loaded = await loadScriptFeatures(path);
    expect(loaded.source).toContain('kinematic.checkSweptCollision');
    expect(loaded.session.assemblies.size).toBeGreaterThan(0);
    expect(loaded.features.length).toBeGreaterThan(0);
  }, 120_000);
});
