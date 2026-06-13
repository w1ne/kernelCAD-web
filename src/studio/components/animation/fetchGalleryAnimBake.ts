// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Static gallery bake fetcher. Unlike `fetchAnimationBake` (which POSTs to the
// live session endpoint), this GETs the build-time precomputed timeline
// `/gallery/_anim/<sha>.json`, so anonymous gallery visitors — who cannot open
// a server session — still get a moving mechanism. The `key` it receives is the
// .kcad.ts SOURCE; it computes the same sha256 digest build-gallery used.
import { galleryPrecomputedAnimUrl } from '../../gallerySource';
import type { BakedTimeline } from './bakeInterpolation';
import type { BakeFetcher } from './fetchAnimationBake';

/** sha256 hex via Web Crypto — matches the node digest build-gallery keys the
 *  `_anim/<sha>.json` files by (and the same one `scriptSource` uses for mesh). */
async function sha256Hex(text: string): Promise<string> {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export const fetchGalleryAnimBake: BakeFetcher = async (source) => {
    const sha = await sha256Hex(source);
    const res = await fetch(galleryPrecomputedAnimUrl(sha));
    if (!res.ok) {
        // No precomputed animation for this source (not an animated model, or
        // the gallery wasn't rebuilt). Typed error → the tab shows the static
        // readout instead of hanging in "baking".
        throw new Error(`no precomputed animation (${res.status})`);
    }
    return (await res.json()) as BakedTimeline;
};
