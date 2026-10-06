// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/compute/featureEvents.ts
import type { FeatureId, FeatureKind } from '../../shared/intent/types';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';

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
      /** Set when the engine reused the shape of this earlier record (same
       *  geometry key) instead of lowering; `shape` is that record's object. */
      sharedFrom?: FeatureId;
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
