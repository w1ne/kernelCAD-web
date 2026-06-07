// desktop-3axis-mates hero (v0.6) — BREP interference sweep.
//
// Split out of desktop3axisMates.test.ts for CI shard balance (per-file
// vitest sharding). See that file's header for the hero's full
// description; this file hosts the industry-standard clash-detection
// check at the default articulation.

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PATH = 'examples/robot-arm/desktop-3axis-mates.kcad.ts';
const EXAMPLE_ABSOLUTE = resolvePath(__dirname, '../../..', EXAMPLE_PATH);

describe('desktop-3axis-mates hero (v0.6)', () => {
  it('reports zero interferences at default poses', async () => {
    // Industry-standard clash detection (BREP common-volume) over the
    // 16-part mate-driven assembly. The v0.6 hero ships with all parts
    // verified non-interfering at the default articulation
    // (baseYawDeg=20°, shoulderPitchDeg=35°, elbowPitchDeg=-55°).
    const code = await readFile(EXAMPLE_ABSOLUTE, 'utf8');
    const result = await checkInterference({
      code,
      fileName: EXAMPLE_PATH,
      scriptDir: dirname(EXAMPLE_ABSOLUTE),
      epsilonMm3: 0.01,
      ignorePairs: new Set<string>(),
    });

    expect(result.partCount).toBe(16);
    expect(result.pairs).toEqual([]);
  }, 180_000);
});
