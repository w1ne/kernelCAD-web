#!/usr/bin/env tsx
// scripts/smokeKinematicFacade.ts
//
// Inner-loop smoke for the T2 kc.kinematic.* facade. Builds a tiny
// fastened-mate assembly with mismatched hole diameters and confirms
// every facade entry returns a typed envelope without throwing.
//
// Run with: npx tsx scripts/smokeKinematicFacade.ts
// Expected outcome: process exits 0 and prints a per-entry summary line.

import { CaptureSession } from '../src/modeling/capture/captureSession';
import { createApi } from '../src/modeling/api';

async function main(): Promise<void> {
  const session = new CaptureSession();
  const kc = createApi({ session });
  const arm = kc.assembly('smoke');

  // Mismatched-diameter fastened mate: side A has a 5mm hole, side B has 6mm.
  const a = kc
    .box(20, 20, 5)
    .hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
  const b = kc
    .box(20, 20, 5)
    .hole('bottom', { u: 0, v: 0, diameter: 6, depth: 'through' });
  arm.part('a', a).connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
  });
  arm.part('b', b).connector('h', {
    type: 'frame',
    origin: {
      kind: 'topology',
      query: { kind: 'face-center', name: 'bottom' },
    },
  });
  arm.mate('screw', 'a.h', 'b.h', 'fastened');

  // 1. mounting-hole consistency — real substrate dispatch.
  const mh = await kc.kinematic.checkMountingHoleConsistency(arm);
  console.log(
    `[mounting-hole] source=${mh.source} ok=${mh.ok} mismatches=${mh.mismatches.length} diagnostics=${mh.diagnostics.length}`,
  );
  if (mh.source !== 'local') throw new Error('source!=local on mounting-hole');
  if (mh.ok !== false)
    throw new Error('expected ok=false on diameter mismatch');

  // 2. swept-collision stub — empty success envelope (T3 fills body).
  const sc = await kc.kinematic.checkSweptCollision(arm);
  console.log(
    `[swept-collision] source=${sc.source} ok=${sc.ok} poses=${sc.posesSampled}`,
  );
  if (sc.source !== 'local') throw new Error('source!=local on swept');

  // 3. reachable stub — unsupported-config diagnostic until T4/T5 ship.
  const rr = await kc.kinematic.checkReachable(arm, {
    tipLink: 'a',
    target: { position: [0, 0, 0] },
  });
  console.log(
    `[reachable] source=${rr.source} ok=${rr.ok} diagnostics=${rr.diagnostics.length}`,
  );
  if (rr.source !== 'local') throw new Error('source!=local on reachable');
  if (!rr.diagnostics.some((d) => d.code === 'kinematic.solver.unsupported-config'))
    throw new Error('expected unsupported-config on reachable stub');

  // 4. load-capacity stub — empty success envelope (T6 fills body).
  const lc = await kc.kinematic.checkLoadCapacity(arm);
  console.log(
    `[load-capacity] source=${lc.source} ok=${lc.ok} elements=${lc.elements.length}`,
  );
  if (lc.source !== 'local') throw new Error('source!=local on load');

  console.log('[smoke] kc.kinematic.* facade dispatched all four entries OK');
}

main().catch((err) => {
  console.error('[smoke] FAILED:', err);
  process.exit(1);
});
