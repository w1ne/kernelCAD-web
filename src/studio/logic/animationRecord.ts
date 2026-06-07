import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { AnimationViewMetadata } from '../../shared/intent/animationViewRecord';

/**
 * Pick the animationView metadata that Studio's Animation tab should play.
 *
 * Last-wins across the session's records — identical to the offline capture
 * engine (`src/agent/render/captureAnimation.ts`: it filters
 * `kind === 'animationView'` and takes the last). A script may re-declare
 * the view; the most recent declaration is the one a reviewer sees.
 *
 * The stored metadata is always in the normalized track shape (see
 * `src/shared/intent/animationViewRecord.ts`). It lives under the
 * FeatureMetadata catch-all, so we cast — the same cast the capture engine
 * uses. Returns `null` when no animationView record exists (the tab stays
 * disabled in that case).
 */
export function selectAnimationMetadata(
    features: readonly FeatureRecord[],
): AnimationViewMetadata | null {
    let found: AnimationViewMetadata | null = null;
    for (const f of features) {
        if (f.kind !== 'animationView') continue;
        if (!f.metadata) continue;
        found = f.metadata as unknown as AnimationViewMetadata;
    }
    return found;
}
