// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export { };

declare global {
  interface Window {
    // Dev/E2E helpers (only set in development/test builds)
    setCode?: (code: string) => void;
    getCode?: () => string;
    isEditorReady?: boolean;
    setActiveDialog?: (dialog: string | null) => void;

    __TEST_SELECT_FACE?: (shapeIndex: number, faceId: number) => void;
    __TEST_SELECT_SKETCH?: (name: string | null) => void;
    __TEST_SELECT_ITEM?: (id: string | null) => void;
    __TEST_SET_HOVERED?: (id: string | null) => void;
    __TEST_TOGGLE_VISIBILITY?: (id: string) => void;
    getHoveredItemId?: () => string | null;
    selectedItemId?: () => string | null;
    getSelectedFace?: () => { shapeIndex: number; faceId: number } | null;

    getGeometries?: () => unknown;
    getPreviewGeometries?: () => unknown;
    getSketches?: () => unknown;
    isComputing?: () => boolean;
    getExecutionCount?: () => number;
    getError?: () => string | null;
    getGeometryMetrics?: () => {
      staleMainResponsesDropped: number;
      stalePreviewResponsesDropped: number;
      currentCodeRevision: number;
      lastSuccessfulRevision: number | null;
      executionHistoryLength: number;
    };
    getExecutionHistory?: () => Array<{
      revision: number;
      status: 'success' | 'error' | 'stale';
      error?: string;
      executionCountAtRecord: number;
    }>;
    getEngineDiagnostics?: () => {
      initFailures: number;
      workerCrashes: number;
      protocolViolations: number;
      requestTimeouts: number;
      requestsSent: number;
      requestsResolved: number;
      requestsRejected: number;
    };
    resetEngineDiagnostics?: () => void;
    getMutationDiagnostics?: () => {
      attempts: number;
      succeeded: number;
      failed: number;
    };
    resetMutationDiagnostics?: () => void;
    isEngineReady?: boolean;

    // Monaco is used in some Playwright suites
    monaco?: unknown;
  }
}
