// src/agent/mcp/tools/resolveTopoRef.ts
//
// MCP tool: resolve a single `@kc[owner/kind/name]` topology ref against a
// kernelCAD script's lowered geometry. The discovery primitive for agents
// that already hold a ref (e.g. from a previous list_faces / list_edges
// call) and want to confirm it still resolves on the current shape, or who
// want to inspect what an upstream tool emitted.
//
// F-surface Task F2.4: composes the F-foundation parser + resolver. No new
// resolution algorithms; this is a thin MCP adapter that turns the
// `TopoResolveResult` shape into an `ok/error` JSON envelope and surfaces
// the registered `feature.face-ref.*` diagnostic hint templates through
// `errorHint`.

import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import {
  parseTopoRef,
  resolveTopoRef,
  formatTopoRef,
  type TopoResolveResult,
} from '../../../kernel/naming';
import { runMcpScript } from '../runMcpScript';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';

export interface ResolveTopoRefInput {
  file?: string;
  code?: string;
  ref: string;
  feature_id?: string;
}

export interface ResolveTopoRefOutput {
  ok: boolean;
  /** Echo of the parsed ref in canonical form. */
  ref?: string;
  /** Resolved entity description on success. */
  entity?: {
    kind: 'face' | 'edge' | 'vertex' | 'connector' | 'part' | 'solid' | 'sketch';
    /** Lineage hash on `ok=true`. */
    hash: string;
    /** Whether resolution went through the lineage path or the snapshot fallback. */
    path: 'lineage' | 'snapshot';
  };
  /** Diagnostic warnings (info-severity) raised during resolution — e.g.
   *  `feature.face-ref.snapshot-fallback-used`. */
  warnings?: Array<{ code: string; message: string }>;
  /** Candidate refs when the resolution was ambiguous-after-split or
   *  not-resolvable; up to 3 nearest entries. */
  candidates?: string[];
  error?: string;
  errorCode?: string;
  /** Registry hint template surfaced through `KernelError.hint`, mirrored
   *  through the MCP error envelope for agents (spec §3.6 + F-surface F2). */
  errorHint?: string;
}

export async function resolveTopoRefTool(
  input: ResolveTopoRefInput,
): Promise<ResolveTopoRefOutput> {
  const parsed = parseTopoRef(input.ref);
  if ('error' in parsed) {
    return {
      ok: false,
      error: `resolve_topo_ref: ${parsed.error}`,
      errorCode: 'feature.invalid-args',
      errorHint: `The ref '${input.ref}' is not a valid @kc[owner/kind/name] string. ${parsed.error}.`,
    };
  }

  const script = await runMcpScript(input);
  if (!script.ok) return { ok: false, error: script.error, errorCode: script.errorCode };
  const { run } = script;
  if (run.records.length === 0) {
    return { ok: false, error: 'Script returned no features.' };
  }
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });

  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  const shape = r.shapes.get(targetId);
  if (!shape) {
    return { ok: false, error: `Feature '${targetId}' has no lowered shape.` };
  }
  if (!(shape instanceof OcctBackend)) {
    return { ok: false, error: 'Shape is not an OcctBackend.' };
  }

  const result: TopoResolveResult = resolveTopoRef(parsed, {
    currentShape: shape,
    featureId: targetId,
  });

  const canonical = formatTopoRef({
    owner: parsed.owner,
    kind: parsed.kind,
    segments: parsed.segments,
    ...(parsed.modifier !== undefined ? { modifier: parsed.modifier } : {}),
  });

  if (result.kind === 'ok') {
    return {
      ok: true,
      ref: canonical,
      entity: { kind: parsed.kind, hash: result.entityHash, path: result.path },
      ...(result.warnings !== undefined && result.warnings.length > 0
        ? { warnings: result.warnings.map((w) => ({ code: w.code, message: w.message })) }
        : {}),
    };
  }
  if (result.kind === 'ambiguous') {
    return {
      ok: false,
      ref: canonical,
      error: result.message,
      errorCode: result.code,
      candidates: result.candidates.slice(0, 3) as string[],
      errorHint: HINT_TEMPLATES[result.code]?.template,
    };
  }
  // not-resolvable
  return {
    ok: false,
    ref: canonical,
    error: result.message,
    errorCode: result.code,
    errorHint: HINT_TEMPLATES[result.code]?.template,
  };
}
