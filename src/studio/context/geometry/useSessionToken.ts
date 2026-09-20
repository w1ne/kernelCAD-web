// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useState } from 'react';
import { apiCall, rewritePath } from '../../api/apiBase';

/**
 * Slice 2E.bridge: acquires the pooled CaptureSession token for the current
 * `?script=` study. The pool reuses an existing session if one already
 * exists for this script, so a tab refresh doesn't lose params edits.
 */
type SettledSession = {
    script: string;
    token: string | null;
    status: 'resolved' | 'failed';
};

export function useSessionToken(studioScript: string | null) {
    // Settled result of the GET /session attempt, tagged with the script it
    // belongs to. The in-flight ('pending') and no-script ('idle') statuses
    // are derived during render below — the fetch effect then only writes
    // state from its async callbacks, so no setState runs in the effect body.
    const [session, setSession] = useState<SettledSession | null>(null);

    // Slice 2E.bridge: acquire the session token for the script. The pool
    // reuses an existing session if one already exists for this script, so
    // a tab refresh doesn't lose params edits. The mesh effect below waits
    // for `sessionStatus` to settle before fetching, so we never make two
    // mesh requests (one by-script, one by-session) on initial load.
    useEffect(() => {
        if (!studioScript) return;
        let cancelled = false;
        apiCall()
            .then(({ base, headers }) =>
                fetch(
                    rewritePath(
                        `/__kernelcad/session?script=${encodeURIComponent(studioScript)}`,
                        base,
                    ),
                    { headers },
                ),
            )
            .then(async (r) => {
                const body = await r.json();
                if (!r.ok) throw new Error(body?.error ?? r.statusText);
                return body as { sessionToken: string };
            })
            .then(({ sessionToken: token }) => {
                if (cancelled) return;
                setSession({ script: studioScript, token, status: 'resolved' });
            })
            .catch(() => {
                if (cancelled) return;
                // Fall back to the legacy per-request mesh path: token stays
                // null and the mesh effect fetches by-script.
                setSession({ script: studioScript, token: null, status: 'failed' });
            });
        return () => { cancelled = true; };
    }, [studioScript]);

    // 'idle' → no studio script (legacy in-process path); 'pending' → fetch in
    // flight; 'resolved' → token set; 'failed' → session fetch failed, mesh
    // effect falls back to by-script.
    const settled = studioScript && session?.script === studioScript ? session : null;
    const sessionToken = settled ? settled.token : null;
    const sessionStatus: 'idle' | 'pending' | 'resolved' | 'failed' = !studioScript
        ? 'idle'
        : settled?.status ?? 'pending';

    return { sessionToken, sessionStatus };
}
