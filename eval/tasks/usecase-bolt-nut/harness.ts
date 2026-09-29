// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-bolt-nut/harness.ts
//
// U11 bolt and nut: hex sizes, bolt length, the thread pitch measured on the
// geometry, the nut's internal thread, fit, and exports. See
// eval/tasks/USECASES.md. Not in the CI suite: modeled threads take minutes
// per build (see USECASES.md).
import { makeBox, type Shape3D } from 'replicad';
import type { HarnessResult } from '../../types';
import { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import {
  bbox, buildUsecase, near, part, standardExports, standardGates,
} from '../../usecaseChecks';

const PITCH = 1.25;

/**
 * Thread crests crossed by a thin radial bar at r = 3.6..3.9 mm (between the
 * minor and major diameter), z0..z1. Returns the crest heights.
 */
function crestHeights(s: OcctBackend, z0: number, z1: number): number[] {
  const bar = new OcctBackend(makeBox([3.6, -0.05, z0], [3.9, 0.05, z1]) as Shape3D);
  const hit = s.intersect(bar) as OcctBackend;
  return hit.solidComponents().map((c) => {
    const b = c.boundingBox();
    return (b.min[2] + b.max[2]) / 2;
  }).sort((a, b) => a - b);
}

/** At least `n` crests, evenly spaced by the pitch. */
function pitchIs(z: number[], n: number): boolean {
  if (z.length < n) return false;
  for (let i = 1; i < z.length; i++) if (!near(z[i] - z[i - 1], PITCH, 0.05)) return false;
  return true;
}

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, ['hex-bolt', 'hex-nut']);
  if (!gates['evaluates clean'] || !gates['parts: hex-bolt, hex-nut']) return { gates, scored: {} };
  const bolt = part(b, 'hex-bolt');
  const nut = part(b, 'hex-nut');
  const bb = bbox(bolt);
  const nb = bbox(nut);

  return {
    gates,
    scored: {
      'bolt 13 across flats, head 5.3, shank 30': near(bb.size[0], 13) && near(bb.min[2], 0) && near(bb.max[2], 35.3),
      'bolt thread pitch 1.25 (ISO 262 coarse)': pitchIs(crestHeights(bolt, 6, 34), 20),
      'nut 13 across flats, 6.8 tall, on the bolt axis': near(nb.size[0], 13) && near(nb.max[2] - nb.min[2], 6.8)
        && near(nb.min[0] + nb.max[0], 0) && near(nb.min[1] + nb.max[1], 0),
      'nut internal thread pitch 1.25': pitchIs(crestHeights(nut, nb.min[2] + 0.5, nb.max[2] - 0.5), 4),
      'nut and bolt do not overlap': bolt.intersectionVolume(nut) < 1e-3,
      // The whole-model STL fuses the threaded parts first and does not
      // finish (https://github.com/w1ne/kernelCAD-web/issues/807); per-part
      // STL still runs.
      ...(await standardExports(b, { solids: 2, threeMf: true, skipWholeStl: true })),
    },
  };
}
