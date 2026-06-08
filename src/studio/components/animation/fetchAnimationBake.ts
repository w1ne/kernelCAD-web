// Client fetcher for `POST /__kernelcad/animation-bake`. Routes through the
// shared apiBase helper (signed-in users hit the hosted backend; localhost
// hits the vite middleware), same as the mesh / transforms fetches in
// GeometryContext.

import { apiCall, rewritePath } from '../../api/apiBase';
import type { BakedTimeline } from './bakeInterpolation';

/** Injectable bake fetcher — the hook depends on this signature so tests pass a
 *  mock without touching the network. */
export type BakeFetcher = (sessionToken: string) => Promise<BakedTimeline>;

/** Default network bake fetcher. Throws on a non-200 with the server's typed
 *  error message when present so the tab can surface it. */
export const fetchAnimationBake: BakeFetcher = async (sessionToken) => {
    const { base, headers } = await apiCall();
    const url = rewritePath(
        `/__kernelcad/animation-bake?session=${encodeURIComponent(sessionToken)}`,
        base,
    );
    const response = await fetch(url, { method: 'POST', headers });
    const payload = await response.json();
    if (!response.ok) {
        const message = typeof payload?.error === 'string' ? payload.error : response.statusText;
        throw new Error(message);
    }
    return payload as BakedTimeline;
};
