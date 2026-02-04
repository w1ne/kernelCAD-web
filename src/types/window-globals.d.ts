export { };

declare global {
  interface Window {
    // Dev/E2E helpers (only set in development/test builds)
    setCode?: (code: string) => void;
    getCode?: () => string;
    isEditorReady?: boolean;

    __TEST_SELECT_FACE?: (shapeIndex: number, faceId: number) => void;
    getSelectedFace?: () => { shapeIndex: number; faceId: number } | null;

    getGeometries?: () => unknown;
    getSketches?: () => unknown;
    isComputing?: () => boolean;
    getExecutionCount?: () => number;
    getError?: () => string | null;
    isEngineReady?: boolean;

    // Monaco is used in some Playwright suites
    monaco?: unknown;
  }
}
