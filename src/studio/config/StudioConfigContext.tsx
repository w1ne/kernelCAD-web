// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { setEmbedConfig } from './embedConfigRef';
import type { StudioConfig } from './types';

const StudioConfigContext = createContext<StudioConfig | null>(null);

/** Wrap `<StudioApp>` to opt into embed mode. The provider both exposes the
 *  config via React context (for components that can read it directly) and
 *  mirrors it into the module-level `embedConfigRef` so async, non-React
 *  call sites (`api/apiBase.ts`) can pick it up. The standalone Vite entry
 *  does NOT mount this provider — components fall back to today's defaults. */
export function StudioConfigProvider({ value, children }: {
    value: StudioConfig;
    children: ReactNode;
}) {
    // Mirror into module ref so async code (apiCall) reads the latest. Done
    // in an effect so we observe the same value React sees after commit.
    useEffect(() => {
        setEmbedConfig(value);
        return () => setEmbedConfig(null);
    }, [value]);

    return (
        <StudioConfigContext.Provider value={value}>
            {children}
        </StudioConfigContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStudioConfig(): StudioConfig {
    // Returning an empty object (not null) lets every consumer write
    // `useStudioConfig().showHeader ?? true` without a null check. The
    // standalone app never mounts the provider, so this is the hot path.
    const ctx = useContext(StudioConfigContext);
    return useMemo(() => ctx ?? {}, [ctx]);
}
