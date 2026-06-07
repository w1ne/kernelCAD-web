import type { GeometryResult } from '../../../shared/worker/geometryEngine';

/**
 * Stable key identifying a shape for the keep-whole exclusion set. Mirrors
 * the naming the Scene tab uses for hiding: assembly part name first, then
 * the returned-variable name, then a positional fallback for anonymous
 * shapes. Viewer (exclusion boundary) and SectionPanel (checkbox list) MUST
 * both derive keys through this helper so they always agree.
 */
export function sectionPartKey(
    g: GeometryResult,
    itemName: string | null | undefined,
    index: number,
): string {
    return g.assemblyPartName ?? itemName ?? `shape-${index + 1}`;
}
