// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/cfdStudyRecord.ts
//
// Capture-time record for `shape.cfdStudy({...})`. The validator is the one
// `run_cfd` uses for its inline fields (kernel/cfd/studySpec), so a study
// declared in the script and one passed on the call cannot drift apart.
// Selectors are resolved when the study runs (they need the fluid volume).

import { normalizeCfdStudy } from '../../kernel/cfd/studySpec';
import type { CfdStudyHandle, CfdStudyMetadata, CfdStudySpec } from '../../shared/intent/cfdStudyRecord';
import type { FeatureRef } from '../../shared/intent/types';
import type { AuthoringFeatureSpec } from './authoringFeatureRecords';

export function buildCfdStudyFeatureSpec(args: CfdStudySpec, shapeRef: FeatureRef): AuthoringFeatureSpec {
  const metadata = normalizeCfdStudy(args, 'cfdStudy(spec)');
  return {
    kind: 'cfdStudy',
    params: {},
    inputs: { shape: shapeRef },
    metadata: metadata as unknown as Record<string, unknown>,
  };
}

/** The part of the capture session a study declaration needs. */
interface StudySink {
  register(spec: AuthoringFeatureSpec): { id: string; metadata?: Record<string, unknown> };
}

/** Register a virtual cfdStudy record bound to `shapeId`; returns its handle. */
export function captureCfdStudy(session: StudySink, spec: CfdStudySpec, shapeId: string): CfdStudyHandle {
  const r = session.register(buildCfdStudyFeatureSpec(spec, { kind: 'feature', id: shapeId }));
  return { id: r.id, metadata: r.metadata as unknown as CfdStudyMetadata };
}
