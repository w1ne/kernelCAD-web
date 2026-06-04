import { evaluateScript } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

// Kinematic swept-collision eval: the expert solution builds a 2-DOF arm
// whose shoulder yaws into a base wall across [120°, 180°], then calls
// kinematic.checkSweptCollision and asserts the K1 diagnostic fires with
// ≥12 colliding poses via an in-script throw. A clean evaluate <=> all
// in-script assertions held.
export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  return {
    gates: {
      'evaluates clean (kinematic.checkSweptCollision asserted K1 + collisions)': ev.ok,
    },
    scored: {},
  };
}
