import type { StudioConfig } from './types';

// Module-level handle on the embed config. `StudioConfigProvider` writes here
// on mount/update so non-React, async call sites (notably `apiCall()` in
// `src/studio/api/apiBase.ts`, which awaits a Supabase session) can consult
// embed-time settings without lifting React context into async land.
//
// In the standalone Vite app this stays `null` and every consumer falls back
// to its previous behavior (env vars, same-origin fetch, the HTTP brush save
// path). In an embedded host (e.g. proto.cat) the provider populates it once
// near the root, mirroring whatever the host passed via context.

let embedConfig: StudioConfig | null = null;

export function getEmbedConfig(): StudioConfig | null {
    return embedConfig;
}

export function setEmbedConfig(next: StudioConfig | null): void {
    embedConfig = next;
}
