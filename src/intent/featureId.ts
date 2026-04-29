import type { FeatureId, FeatureKind } from './types';

export interface FeatureIdGenerator {
  next(kind: FeatureKind): FeatureId;
  reset(): void;
}

export function createFeatureIdGenerator(): FeatureIdGenerator {
  const counters = new Map<FeatureKind, number>();
  return {
    next(kind) {
      const n = (counters.get(kind) ?? 0) + 1;
      counters.set(kind, n);
      return `${kind}_${n}`;
    },
    reset() {
      counters.clear();
    },
  };
}
