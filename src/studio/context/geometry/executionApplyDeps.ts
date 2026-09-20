// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { GeometryEngine, GeometryResult, SketchGeometry } from '../../../shared/worker/geometryEngine';
import type { SerializedParamEntry } from '../../../shared/runtime/paramTable';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { ExecutionRecord, ScriptReviewSummary } from './types';

/** Shared setter/ref surface both the auto-run loop and the explicit
 *  `executeGeometry` action apply a mesh/worker result through. Extracted so
 *  those two action bodies can live outside `useScriptExecution` as plain
 *  functions (keeps them under the complexity/length ratchet). */
export interface ExecutionApplyDeps {
    engine: GeometryEngine;
    mainRevisionRef: MutableRefObject<number>;
    setCurrentCodeRevision: (n: number) => void;
    setIsComputing: (b: boolean) => void;
    setStaleMainResponsesDropped: Dispatch<SetStateAction<number>>;
    setGeometries: (g: GeometryResult[]) => void;
    setGeometryTransformOverrides: (next: Record<string, number[]>) => void;
    setFeatureRecords: (r: FeatureRecord[]) => void;
    setScriptParams: (p: SerializedParamEntry[]) => void;
    setScriptReview: Dispatch<SetStateAction<ScriptReviewSummary | null>>;
    setSketchesGeometries: (s: SketchGeometry[]) => void;
    setPreviewGeometries: (g: GeometryResult[]) => void;
    setError: (e: string | null) => void;
    setLastSuccessfulRevision: (n: number) => void;
    setExecutionCount: Dispatch<SetStateAction<number>>;
    pushExecutionRecord: (r: ExecutionRecord) => void;
}
