// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateSeedCatalog, SEED_FAMILIES } from './generateSeedCatalog';
import { validateConnectorManifest } from '../src/shared/parts/connectorManifest';

describe('generateSeedCatalog', () => {
  it('declares the full family list', () => {
    expect(SEED_FAMILIES.map((f) => f.id)).toEqual(
      expect.arrayContaining([
        'socket-head-cap-screw',
        'button-head-cap-screw',
        'flat-head-countersunk',
        'hex-nut',
        'lock-nut',
        'flat-washer',
        'lock-washer',
        'heat-set-insert',
        'deep-groove-ball-bearing',
        'linear-shaft',
        'stepper-motor',
        'pin-header',
        'jst-xh',
      ]),
    );
  });

  it(
    'produces ~270 STEP entries when generation runs end-to-end (skip-step dry run)',
    async () => {
      const out = mkdtempSync(join(tmpdir(), 'kc-gen-test-'));
      try {
        const result = await generateSeedCatalog({ outDir: out, skipStep: true });
        expect(result.records.length).toBeGreaterThanOrEqual(250);
        expect(result.records.length).toBeLessThanOrEqual(290);
        // Every manifest validates.
        for (const m of result.manifests) {
          validateConnectorManifest(m);
        }
      } finally {
        rmSync(out, { recursive: true, force: true });
      }
    },
    120000,
  );
});
