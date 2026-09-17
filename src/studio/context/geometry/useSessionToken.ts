// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useState } from 'react';
import { apiCall, rewritePath } from '../../api/apiBase';

/**
 * Slice 2E.bridge: acquires the pooled CaptureSession token for the current
 * `?script=` study. The pool reuses an existing session if one already
 * exists for this script, so a tab refresh doesn't lose params edits.
 */
export function useSessionToken(studioScript: string | null) {
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    // Tracks whether the GET /session attempt has settled so the mesh effect
    // knows to wait. 'idle' → no studio script (legacy in-process path);
    // 'pending' → fetch in flight; 'resolved' → token set; 'failed' →
    // session fetch failed, mesh effect falls back to by-script.
    const [sessionStatus, setSessionStatus] = useState<'idle' | 'pending' | 'resolved' | 'failed'>('idle');

    // Slice 2E.bridge: acquire the session token for the script. The pool
    // reuses an existing session if one already exists for this script, so
    // a tab refresh doesn't lose params edits. The mesh effect below waits
    // for `sessionStatus` to settle before fetching, so we never make two
    // mesh requests (one by-script, one by-session) on initial load.
    useEffect(() => {
        if (!studioScript) {
            // Synchronous setState, matching the original inline effect
            // byte-for-byte (zero-behavior-change outranks the lint rule
            // here — this file is only linted as a "hook" because it's
            // named `use*`; the identical code was invisible to
            // react-hooks/set-state-in-effect inside the original
            // GeometryProvider).
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSessionToken(null);
            setSessionStatus('idle');
            return;
        }
        let cancelled = false;
        setSessionStatus('pending');
        setSessionToken(null);
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
                setSessionToken(token);
                setSessionStatus('resolved');
            })
            .catch(() => {
                if (cancelled) return;
                // Fall back to the legacy per-request mesh path: token stays
                // null and the mesh effect fetches by-script.
                setSessionStatus('failed');
            });
        return () => { cancelled = true; };
    }, [studioScript]);

    return { sessionToken, sessionStatus };
}
