// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/flightStudyRecord.ts
//
// Capture-time record for `shape.flightStudy({...})` and
// `arm.flightStudy({...})`. The validator is the one `run_flight` uses for
// its inline fields (kernel/flight/studySpec), so a declared study and one
// passed on the call cannot drift apart. A shape study is bound to the shape
// by an input ref; an assembly study carries the assembly name, and the
// runner finds the lowered scene of that assembly.

import { normalizeFlightStudy } from '../../kernel/flight/studySpec';
import type { FlightStudyHandle, FlightStudyMetadata, FlightStudySpec } from '../../shared/intent/flightStudyRecord';
import type { AuthoringFeatureSpec } from './authoringFeatureRecords';

/** The part of the capture session a study declaration needs. */
interface StudySink {
  register(spec: AuthoringFeatureSpec): { id: string; metadata?: Record<string, unknown> };
}

export function captureFlightStudy(
  session: StudySink,
  spec: FlightStudySpec,
  target: { shapeId: string } | { assembly: string },
): FlightStudyHandle {
  const api = 'assembly' in target ? 'arm.flightStudy(spec)' : 'shape.flightStudy(spec)';
  const metadata: FlightStudyMetadata = {
    ...normalizeFlightStudy(spec, api),
    ...('assembly' in target ? { assembly: target.assembly } : {}),
  };
  const r = session.register({
    kind: 'flightStudy',
    params: {},
    inputs: 'shapeId' in target ? { shape: { kind: 'feature', id: target.shapeId } } : {},
    metadata: metadata as unknown as Record<string, unknown>,
  });
  return { id: r.id, metadata: r.metadata as unknown as FlightStudyMetadata };
}
