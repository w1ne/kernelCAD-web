// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { loadStudioScriptSource } from './scriptSource';

// Live-edit bridge (dev only). The `kernelcad-mesh-endpoint` vite plugin
// pushes a `kernelcad:script-changed` WS event whenever a `.kcad.ts` file
// changes on disk. The VIEWPORT update for `?script=` routes happens
// server-side (the plugin rebuilds the pooled session, whose SSE `relower`
// frame makes GeometryContext re-fetch mesh + review) — this client bridge
// only refreshes the Code tab text so the editor matches the file on disk.
//
// Two HMR pitfalls shape this module:
// - The `import.meta.hot.on` subscription lives at module scope HERE, in a
//   rarely-edited module, on purpose: vite prunes a module's hot listeners
//   whenever that module is HMR-updated, so placing the subscription inside
//   App.tsx makes the bridge silently die on every edit to App.tsx.
// - Registration state is parked in `import.meta.hot.data` so it survives
//   re-execution when this module itself IS edited during dev.

type CodeSetter = (code: string) => void;

interface BridgeState {
    activeScript: string | null;
    setCodeRef: CodeSetter | null;
}

const hotData = import.meta.hot?.data as { liveScriptBridge?: BridgeState } | undefined;
const state: BridgeState = hotData?.liveScriptBridge ?? { activeScript: null, setCodeRef: null };
if (hotData) hotData.liveScriptBridge = state;

/**
 * Point the bridge at the active `?script=` route. Call with the current
 * script param and code setter on mount; call `unregisterLiveScriptTarget`
 * on unmount. Passing a new target replaces the previous one (single slot —
 * Studio renders one script route at a time).
 */
export function registerLiveScriptTarget(script: string, setCode: CodeSetter): void {
    state.activeScript = script.replace(/^\.\//, '');
    state.setCodeRef = setCode;
}

export function unregisterLiveScriptTarget(setCode: CodeSetter): void {
    // Only clear when the caller still owns the slot — a later registrant
    // (e.g. React StrictMode double-mount) must not be torn down by the
    // earlier mount's cleanup.
    if (state.setCodeRef !== setCode) return;
    state.activeScript = null;
    state.setCodeRef = null;
}

if (import.meta.hot) {
    import.meta.hot.on('kernelcad:script-changed', (data: { file?: string }) => {
        if (!data?.file || !state.activeScript || !state.setCodeRef) return;
        if (data.file !== state.activeScript) return;
        const script = state.activeScript;
        loadStudioScriptSource(script)
            .then((source) => state.setCodeRef?.(source))
            .catch((error) => console.error('Live script reload failed:', error));
    });
}
