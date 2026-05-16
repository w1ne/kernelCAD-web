import type { SafeSketcher } from './safeSketch';

type SafeReplicadWithSketcher = {
  Sketcher: new (plane?: unknown) => SafeSketcher;
};

export function createUserGlobals(safeReplicad: SafeReplicadWithSketcher) {
  const Sketcher = safeReplicad.Sketcher;
  const sketcher = (plane?: unknown) => new Sketcher(plane);
  return { Sketcher, sketcher };
}

