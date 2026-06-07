// tests/integration/dfm/machineFactor.ts
//
// Machine-speed calibration for wall-time perf budgets.
//
// Perf budgets (e.g. the carousel truth set's 10 s full-gate-sweep budget)
// are DESIGN budgets defined on the reference machine that calibrated them.
// CI runners can be 2x+ slower than that machine, so asserting the raw
// budget there turns the gate into runner-hardware lottery instead of a
// regression detector. The fix is to measure a small deterministic
// reference workload on the machine actually running the test and scale
// the budget by `machineFactor = measuredRefMs / REF_BASELINE_MS`:
//
//   - the workload exercises the same primitive the DFM sweep spends its
//     time in (TriangleBvh build over a ~100k-triangle synthetic grid plus
//     a fixed raycast batch — the meshBvh perf-guard workload);
//   - REF_BASELINE_MS is FROZEN from the reference machine, so on that
//     machine the factor is ~1 and the gate stays exactly the design
//     budget — a genuine sweep regression still fails there;
//   - the factor never tightens below 1 (Math.max(1, ...)), so a machine
//     faster than the reference cannot shrink the budget and flake.

import { TriangleBvh, type DfmMesh } from '../../../src/modeling/runtime/dfm/meshBvh';

/**
 * Reference-workload wall time (ms) on the machine that calibrated the
 * DFM perf budgets, measured 2026-06-07 (min-of-3 across three fresh
 * processes: 60.3 / 62.9 / 64.3 ms — the same machine where the carousel
 * full gate sweep measures ~6.7 s against its 10 s budget). Frozen by
 * design: re-measure and update ONLY when the budgets themselves are
 * recalibrated.
 */
export const REF_BASELINE_MS = 62;

/**
 * Run the deterministic reference workload once and return its wall time
 * (ms): TriangleBvh build over a ~100k-triangle planar grid + 1000
 * fixed-pattern raycasts (mirrors the meshBvh perf-guard test).
 */
export function measureReferenceWorkloadMs(): number {
  // (n+1)^2 vertex grid over [0,n]^2 at z = 0, two triangles per cell.
  const n = 224; // 2 * 224^2 = 100352 triangles
  const vertices: number[] = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) vertices.push(i, j, 0);
  }
  const triangles: number[] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      const b = a + 1;
      const c = a + (n + 1);
      const d = c + 1;
      triangles.push(a, b, d, a, d, c);
    }
  }
  const mesh: DfmMesh = { vertices, triangles };

  const t0 = performance.now();
  const bvh = new TriangleBvh(mesh);
  let hits = 0;
  for (let k = 0; k < 1000; k++) {
    const x = ((k * 7919) % (n * 100)) / 100 + 0.005;
    const y = ((k * 104729) % (n * 100)) / 100 + 0.005;
    if (bvh.raycast([x, y, 5], [0, 0, -1])) hits++;
  }
  const elapsed = performance.now() - t0;
  if (hits !== 1000) {
    throw new Error(`machineFactor reference workload broken: ${hits}/1000 raycast hits`);
  }
  return elapsed;
}

/**
 * Machine slowdown factor relative to the reference machine, >= 1.
 * Best (minimum) of `runs` workload executions, so a one-off scheduler
 * hiccup cannot inflate the factor and mask a real regression.
 */
export function measureMachineFactor(runs = 3): number {
  let best = Infinity;
  for (let r = 0; r < runs; r++) best = Math.min(best, measureReferenceWorkloadMs());
  return Math.max(1, best / REF_BASELINE_MS);
}
