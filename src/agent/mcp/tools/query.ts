import { evaluateQueryTool } from './evaluateQuery';
import { resolveTopoRefTool } from './resolveTopoRef';
import { getFaceLineageTool } from './getFaceLineage';

/** Topology-resolution mode. */
export type QueryMode = 'evaluate' | 'resolve' | 'lineage';

export interface QueryInput {
  /** Defaults to 'evaluate' (the Query-DSL inspector). */
  mode?: QueryMode;
  /**
   * Mode-specific params, forwarded verbatim:
   * - evaluate: { query, expect?, file?, code?, feature_id? }
   * - resolve:  { ref, file?, code?, feature_id? }
   * - lineage:  { feature_id, ref, file?, code? }
   */
  [key: string]: unknown;
}

/**
 * Topology query/resolution entrypoint. Replaces evaluate_query (mode:'evaluate',
 * the default), resolve_topo_ref (mode:'resolve'), and get_face_lineage
 * (mode:'lineage'). Pure routing layer; forwards all params except `mode`.
 */
export function queryTool(input: QueryInput): Promise<unknown> {
  const { mode = 'evaluate', ...rest } = input;
  switch (mode) {
    case 'evaluate':
      return evaluateQueryTool(rest as unknown as Parameters<typeof evaluateQueryTool>[0]);
    case 'resolve':
      return resolveTopoRefTool(rest as unknown as Parameters<typeof resolveTopoRefTool>[0]);
    case 'lineage':
      return getFaceLineageTool(rest as unknown as Parameters<typeof getFaceLineageTool>[0]);
    default:
      return Promise.reject(
        new Error(`Unknown query mode: ${String(mode)}. Valid: evaluate, resolve, lineage.`),
      );
  }
}
