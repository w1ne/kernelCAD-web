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

    useEffect(() => {
        let cancelled = false;
        if (!studioScript) {
            // Deferred a microtask so these aren't *synchronous* setState
            // calls in the effect body (flagged by
            // react-hooks/set-state-in-effect); microtasks still drain
            // before the next paint, so this commits in the same frame as
            // before.
            void Promise.resolve().then(() => {
                if (cancelled) return;
                setSessionToken(null);
                setSessionStatus('idle');
            });
            return () => { cancelled = true; };
        }
        void Promise.resolve().then(() => {
            if (cancelled) return;
            setSessionStatus('pending');
            setSessionToken(null);
        });
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
