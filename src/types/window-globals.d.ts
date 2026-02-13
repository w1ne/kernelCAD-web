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
    getGeometryMetrics?: () => { staleMainResponsesDropped: number; stalePreviewResponsesDropped: number };
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
    isEngineReady?: boolean;

    // Monaco is used in some Playwright suites
    monaco?: unknown;
  }
}
