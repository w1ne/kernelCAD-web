// Studio shell — synthetic diagnostic codes the UI emits.
//
// SEPARATE registry from the kernel-emitted `DiagnosticCode` catalogue
// (src/diagnostics/codes.ts), which is hard-capped at 24 codes per the
// milestone-C vocabulary collapse. Studio codes describe UI-observability
// failures (worker crash, MCP disconnect, validate-itself-threw) — the
// kernel doesn't emit these; the shell does. Keeping the two registries
// disjoint lets each respect its own cap.
//
// Shape mirrors the kernel side: a string-literal union, a frozen array,
// and a hint map. No `nextAction` field — these are observability codes,
// not retry-targeted, so `inspect-message` is implicit.

export type StudioDiagnosticCode =
    | 'studio.script.parse-failed'
    | 'studio.script.transpile-failed'
    | 'studio.script.runtime-threw'
    | 'studio.worker.crashed'
    | 'studio.validator.threw'
    | 'studio.mcp.disconnected';

export const STUDIO_DIAGNOSTIC_CODES: readonly StudioDiagnosticCode[] = [
    'studio.script.parse-failed',
    'studio.script.transpile-failed',
    'studio.script.runtime-threw',
    'studio.worker.crashed',
    'studio.validator.threw',
    'studio.mcp.disconnected',
] as const;

export const STUDIO_HINTS: Record<StudioDiagnosticCode, string> = {
    'studio.script.parse-failed':
        'Fix the .kcad.ts syntax error reported by the Monaco marker. Save the file to re-run.',
    'studio.script.transpile-failed':
        'Fix the TypeScript/transpile error. Read the diagnostic message for the offending line.',
    'studio.script.runtime-threw':
        'Your script threw at runtime. Read the diagnostic message for the JS error and the offending line.',
    'studio.worker.crashed':
        'The geometry worker terminated. Click Reload worker in the Studio shell; if persistent, copy diagnostics and file an issue.',
    'studio.validator.threw':
        'validateAssembly itself threw. The status is unknown; read the stack in the Validity tab.',
    'studio.mcp.disconnected':
        'MCP server is offline. Authoring still works; reconnect happens automatically.',
};

export interface StudioDiagnostic {
    readonly code: StudioDiagnosticCode;
    readonly severity: 'info' | 'warning' | 'error';
    readonly message: string;
    readonly hint: string;
    /** Set when the diagnostic targets a specific feature (e.g. parse error at line N). */
    readonly scriptLocation?: { line: number; column: number };
}

/**
 * Construct a StudioDiagnostic with the canonical hint baked in. Use this
 * instead of building the object literal by hand so every emission carries
 * the right hint without copy-paste drift.
 */
export function makeStudioDiagnostic(
    code: StudioDiagnosticCode,
    message: string,
    options: { severity?: 'info' | 'warning' | 'error'; scriptLocation?: { line: number; column: number } } = {},
): StudioDiagnostic {
    return {
        code,
        severity: options.severity ?? 'error',
        message,
        hint: STUDIO_HINTS[code],
        scriptLocation: options.scriptLocation,
    };
}
