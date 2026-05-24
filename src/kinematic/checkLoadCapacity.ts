// src/kinematic/checkLoadCapacity.ts
//
// T2 stub. T6 replaces the body with the closed-form Euler-Bernoulli beam
// equation against the v0.7.4 jointLoadCapacity substrate. When no loads
// are declared, the entry returns ok=true (a load-less assembly has no
// element to check).

import type { Assembly } from '../modeling/capture/assembly';
import type {
  LoadCapacityOpts,
  LoadCapacityResult,
} from './types';

/**
 * Check static load capacity for declared parts. T2 stub returns the
 * empty-success envelope; T6 wires the closed-form beam analysis and the
 * K6 / K7 / K8 emit paths.
 */
export async function checkLoadCapacity(
  arm: Assembly,
  opts?: LoadCapacityOpts,
): Promise<LoadCapacityResult> {
  void arm;
  void opts;
  return {
    ok: true,
    elements: [],
    diagnostics: [],
    source: 'local',
  };
}
