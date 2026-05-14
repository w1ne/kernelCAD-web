import type { StudioRecomputeResult, TabId } from '../types';

const ALWAYS_VISIBLE: readonly TabId[] = ['scene', 'code'];

/**
 * Adaptive inspector tab strip.
 *
 * `scene` and `code` are unconditional — the script and the model graph are
 * always meaningful. The rest surface only when the latest recompute proves
 * the kernel has something to show:
 *
 * - `params` — the script declared at least one `param(...)`.
 * - `validity` — `validateAssembly` ran (regardless of status).
 *
 * Reserved tabs (`joints`, `export`, `sections`, `cut`, `animation`,
 * `render`) are not returned here; Phase 3 renders them dim-disabled with a
 * tooltip explaining what the script must declare to enable them. They'll
 * move into this function as their owning workstreams ship.
 */
export function getVisibleTabs(result: StudioRecomputeResult | null): readonly TabId[] {
    if (result == null) return ALWAYS_VISIBLE;
    const tabs: TabId[] = [...ALWAYS_VISIBLE];
    if (result.paramTable && result.paramTable.size() > 0) tabs.push('params');
    if (result.validity != null) tabs.push('validity');
    return tabs;
}
