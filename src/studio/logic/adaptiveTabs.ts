import type { StudioRecomputeResult, TabId } from '../types';
import { selectAnimationMetadata } from './animationRecord';

const ALWAYS_VISIBLE: readonly TabId[] = ['scene', 'code'];

/**
 * Adaptive inspector tab strip.
 *
 * `scene` and `code` are unconditional — the script and the model graph are
 * always meaningful. The rest surface only when the latest recompute proves
 * the kernel has something to show:
 *
 * - `params` — the script declared at least one `param(...)`.
 * - `joints` — the script's assembly declared at least one mate with pose.
 * - `validity` — `validateAssembly` ran (regardless of status).
 * - `export` — there's at least one geometry to export.
 * - `animation` — the script declared an `animationView(...)` (last-wins).
 *
 * Reserved tabs (`sections`, `cut`, `render`) are not returned here; Phase 3
 * renders them dim-disabled with a tooltip explaining what the script must
 * declare to enable them. They'll move into this function as their owning
 * workstreams ship.
 */
export function getVisibleTabs(result: StudioRecomputeResult | null): readonly TabId[] {
    if (result == null) return ALWAYS_VISIBLE;
    const tabs: TabId[] = [...ALWAYS_VISIBLE];
    if (result.paramTable && result.paramTable.size() > 0) tabs.push('params');
    if ((result.joints ?? []).length > 0) tabs.push('joints');
    if (result.validity != null) tabs.push('validity');
    if (result.geometries.length > 0) tabs.push('export');
    if (selectAnimationMetadata(result.features) != null) tabs.push('animation');
    return tabs;
}
