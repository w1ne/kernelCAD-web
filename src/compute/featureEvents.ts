// src/compute/featureEvents.ts
import type { FeatureId, FeatureKind } from '../intent/types';
import type { ShapeBackend } from '../backends/backend';
import type { CompilerDiagnostic } from '../shared/diagnostics/diagnostic';

export type FeatureEvent =
  | {
      kind: 'feature.compiled';
      featureId: FeatureId;
      featureKind: FeatureKind;
      shape: ShapeBackend;
      predecessors: FeatureId[];
      diagnostics: CompilerDiagnostic[];
      health: 'healthy' | 'warning';
      op?: 'subtract' | 'union' | 'intersect';
    }
  | {
      kind: 'feature.failed';
      featureId: FeatureId;
      featureKind: FeatureKind;
      predecessors: FeatureId[];
      diagnostics: CompilerDiagnostic[];
    }
  | { kind: 'recompute.complete'; featureCount: number };

export type FeatureEventSink = (event: FeatureEvent) => void;
