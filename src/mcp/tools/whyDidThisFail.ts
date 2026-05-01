// src/mcp/tools/whyDidThisFail.ts
import { runScript } from '../../script-runtime/runScript';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { OcctLowerer } from '../../backends/occt/occtLowerer';
import { initOcct } from '../../backends/occt/occtBackend';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FeatureKind } from '../../intent/types';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface WhyDidThisFailInput {
  file?: string;
  code?: string;
  feature_id?: string;
}

export interface UpstreamFeature {
  feature_id: string;
  kind: FeatureKind;
  health: 'healthy' | 'warning' | 'error' | 'unknown';
}

export interface WhyDidThisFailOutput {
  ok: boolean;
  feature_id?: string;
  kind?: FeatureKind;
  health?: 'healthy' | 'warning' | 'error' | 'unknown';
  diagnostics?: CompilerDiagnostic[];
  upstream?: UpstreamFeature[];
  /** Human-readable suggestions, one per unique diagnostic code in `diagnostics`. */
  hints?: string[];
  error?: string;
  /** Structured diagnostic code when the underlying script-runtime exception
   *  was a `KernelError`; otherwise `cli.script.exception` for non-kernel
   *  throws. Only set on `ok=false` from the runScript catch path. */
  errorCode?: string;
}

/**
 * Maps known diagnostic codes to one-line human-readable suggestions. Keep entries
 * tight — agents will paste them into chat/edit explanations. Unknown codes are
 * silently absent from `hints`.
 *
 * Codes verified by grepping: src/backends/occt/edgeSelection.ts,
 * src/backends/occt/occtLowerer.ts, src/compute/recomputeEngine.ts,
 * src/cli/commands/evaluate.ts, src/cli/commands/export.ts,
 * src/script-runtime/export.ts.
 *
 * Dropped (never emitted): feature.edge-feature.face-ref-on-non-primitive
 * Added (emitted but missing from original plan): feature.fillet.no-base,
 * feature.fillet.no-radius, feature.chamfer.no-base, feature.chamfer.no-distance,
 * feature.shell.no-base, feature.shell.no-thickness,
 * feature.extrude.unsupported-profile, feature.revolve.unsupported-profile,
 * cli.no-input, cli.export.exception, export.no-shape, export.shape-not-lowered.
 */
const HINTS: Record<string, string> = {
  'feature.fillet.failed': "OCCT could not apply that fillet. Try a smaller radius — typically less than half of the smallest face dimension.",
  'feature.fillet.no-base': "Fillet has no base shape. Ensure the fillet is chained onto a solid shape (e.g. box(10, 10, 10).fillet(1)).",
  'feature.fillet.no-radius': "Fillet is missing a radius parameter. Pass a positive number as the first argument (e.g. .fillet(2)).",
  'feature.chamfer.failed': "OCCT could not apply that chamfer. Try a smaller distance — typically less than half of the smallest face dimension.",
  'feature.chamfer.no-base': "Chamfer has no base shape. Ensure the chamfer is chained onto a solid shape (e.g. box(10, 10, 10).chamfer(1)).",
  'feature.chamfer.no-distance': "Chamfer is missing a distance parameter. Pass a positive number as the first argument (e.g. .chamfer(2)).",
  'feature.shell.failed': "OCCT could not shell that solid. Try a thinner wall or a different open face. Thickness must be smaller than the shape's minimum thickness.",
  'feature.shell.no-base': "Shell has no base shape. Ensure the shell is chained onto a solid shape.",
  'feature.shell.no-thickness': "Shell is missing a thickness parameter. Pass a positive number as the first argument (e.g. .shell(1)).",
  'feature.extrude.unsupported-profile': "The extrude profile is not a supported 2D sketch type. Ensure you pass a sketch or closed wire as the profile.",
  'feature.revolve.unsupported-profile': "The revolve profile is not a supported 2D sketch type. Ensure you pass a sketch or closed wire as the profile.",
  'feature.revolve.crosses-axis': "A revolve profile must stay on one side of the rotation axis. Ensure all path coordinates have x >= 0 (the first coordinate is the radial distance from the Z axis).",
  'feature.revolve.empty-profile': "A revolve profile needs at least one lineTo or tangentArc segment to define a closed area. A path with only moveTo + close has zero area.",
  'feature.revolve.failed': "OCCT could not revolve the profile. The profile may self-intersect or have a degenerate shape. Try simplifying the profile.",
  'feature.revolve.bad-sketch': "revolve with profile='sketch' requires a sketch input. This usually means the upstream sketch failed to lower — check its diagnostics first.",
  'feature.sweep.invalid-rail': "Sweep rail must be an array of at least 2 points, each a `[x, y, z]` tuple of finite numbers. For helical rails, use `helix({radius, pitch, turns})` to generate the polyline.",
  'feature.sweep.failed': "OCCT could not sweep the profile along the rail. Common causes: profile larger than the rail's tightest curvature radius, rail with sharp corners that cause self-intersection, or non-planar profile. Try a smaller profile, smoother rail, or `frenet: true` for curved rails.",
  'feature.sweep.bad-sketch': "sweep with profile='sketch' requires a sketch input. This usually means the upstream sketch failed to lower — check its diagnostics first.",
  'feature.sweep.unsupported-profile': "The sweep profile is not a supported 2D sketch type. Pass a closed `path()` sketch as the profile.",
  'feature.edge-feature.face-ref-not-resolvable': "Canonical face refs (e.g. { face: 'top' }) only work on un-transformed primitives. Apply transforms after the fillet/chamfer instead of before, or fillet the primitive first then translate.",
  'feature.edge-feature.face-ref-not-applicable': "That canonical face name is not valid for this primitive. Boxes have all six (top/bottom/left/right/front/back); cylinders have only top/bottom; spheres have none.",
  'feature.edge-feature.face-ref-not-supported': "Edge / face ref kind not supported on this shape. Use a canonical name ({ face: 'top' }), a label ({ face: 'rim' }), or an inline EdgeQuery ({ atZ: 5, parallel: [0, 0, 1] }) instead. Tracked / created / propagated refs are reserved for v0.5+.",
  'feature.edge-feature.no-edges-match': "The selection matched no edges on this shape. Use the `list_edges` MCP tool to see what's available, or relax the query (larger `tolerance`, fewer keys).",
  'feature.edge-feature.ambiguous-selection': "Multiple edges match this query. Use `selectEdges` (plural) for all matches, or tighten the query — smaller `tolerance`, add a `near:` point to disambiguate.",
  'feature.edge-feature.invalid-query': "Query has contradictory keys, an unknown segment id, or an unsupported ref kind. Check the EdgeQuery type and ensure segment IDs come from a `selectEdges` call against the same shape lowering.",
  'feature.face-feature.face-required': "Shell needs a face to remove. Pass `{ face: 'top' }` (or another canonical face name applicable to the base primitive).",
  'feature.face-feature.face-ref-not-resolvable': "Same constraint as edge features: canonical face refs only work on un-transformed primitives. Apply shell before transforms.",
  'feature.face-feature.face-ref-not-applicable': "That canonical face is not valid for this primitive. Cylinders accept only top/bottom for shell; spheres have no canonical faces.",
  'feature.face-feature.face-ref-not-supported': "Face ref kind not supported. Use a canonical name ({face: 'top'}), a label ({face: 'rim'}), or an inline FaceQuery ({face: {atZ: 5}}). Tracked / created / propagated face refs are reserved for v0.5+.",
  'feature.face-feature.label-not-resolvable': "[Deprecated in v0.13.0-rc.7] This generic code is being split into feature.label.unknown-name, feature.label.no-upstream-sketch, feature.label.unsupported-base, and feature.label.mixed-convexity. If you still see this code, the underlying issue maps to one of those — check the diagnostic message for guidance, and update kernelCAD if you can.",
  'feature.label.unknown-name': "Label not found on the upstream sketch. Use the `list_face_labels` MCP tool to see available labels on this script.",
  'feature.label.no-upstream-sketch': "Labels work on shapes built from a path() sketch (currently extrude). For primitives or imported shapes, use a query like {face: {atZ: 5}} instead.",
  'feature.label.unsupported-base': "Labels are supported for extrude only in this rc. Revolve / sweep labels are deferred. Use an inline query against the geometry as a workaround: {face: {atZ: 5}} or similar.",
  'feature.label.mixed-convexity': "The labeled segment's probe matched a mix of convex and concave edges (typically a reflex / inside corner). Either split the label across smaller segments, or refine with an inline EdgeQuery that filters by convexity ({face: {label: 'name'}, convex: true} is not yet supported; use {atZ: ..., parallel: [...]} for now).",
  'feature.sketch.degenerate-arc': "An arc segment has degenerate geometry. For radiusArc: |radius| must be >= chord/2 (where chord is the straight-line distance start→end), and start must not coincide with end. Either pick a larger radius, change the endpoints, or use threePointsArc / sagittaArc.",
  'feature.sketch.failed': "Sketch construction failed during lowering. Check the diagnostic message for the underlying error from Replicad or our validation.",
  'feature.path.label-without-segment': "label() must follow a lineTo or arc segment. Calling label() before any segment, after moveTo, or after close has nothing to label.",
  'feature.path.duplicate-label': "Each sketch label must be unique. Pick a different name or remove the duplicate label() call.",
  'recompute.input.missing': "An upstream feature failed or was suppressed. Use `why_did_this_fail` on the upstream feature ID to find the root cause.",
  'recompute.lowering.exception': "An exception was raised during lowering. Check the diagnostic message for the OCCT error.",
  'cli.script.exception': "Your script raised an exception during execution. Check the diagnostic message for the JS error.",
  'cli.file.read': "kernelCAD could not read the script file at that path. Check the file exists and is readable.",
  'cli.no-input': "No input provided to the CLI command. Pass either a file path or inline code.",
  'cli.export.exception': "An exception occurred during export. Check the diagnostic message for details.",
  'export.no-shape': "The script did not return a shape. Ensure your script ends with `return <shape>`.",
  'export.shape-not-lowered': "The returned shape could not be lowered to OCCT. Check for upstream errors in the feature tree.",
};

function buildHints(diagnostics: readonly CompilerDiagnostic[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of diagnostics) {
    if (!seen.has(d.code) && HINTS[d.code]) {
      seen.add(d.code);
      out.push(HINTS[d.code]);
    }
  }
  return out;
}

export async function whyDidThisFailTool(input: WhyDidThisFailInput): Promise<WhyDidThisFailOutput> {
  await initOcct();

  let code: string;
  let fileName: string;
  if (input.code !== undefined) {
    code = input.code;
    fileName = input.file ?? '<inline>';
  } else if (input.file !== undefined) {
    const filePath = resolve(input.file);
    fileName = filePath;
    try {
      code = await readFile(filePath, 'utf8');
    } catch (e) {
      return { ok: false, error: `Cannot read file: ${e instanceof Error ? e.message : String(e)}` };
    }
  } else {
    return { ok: false, error: 'Must provide either { file } or { code }.' };
  }

  let run;
  try {
    run = await runScript({ code, fileName });
  } catch (e) {
    const diag = kernelErrorToDiagnostic(e);
    return { ok: false, error: diag.message, errorCode: diag.code };
  }

  if (run.records.length === 0) return { ok: false, error: 'Script produced no features.' };

  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  const targetRecord = run.records.find(r => r.id === targetId);
  if (!targetRecord) return { ok: false, error: `feature_id '${targetId}' not found.` };

  const engine = new RecomputeEngine(new OcctLowerer());
  const result = await engine.run(run.records);

  const ownDiagnostics = result.diagnostics.filter(d => d.featureId === targetId);
  const targetHealth = result.health.get(targetId) ?? (result.shapes.has(targetId) ? 'healthy' : 'unknown');

  // Walk upstream by following inputs (BFS through the feature graph)
  const upstream: UpstreamFeature[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];
  for (const ref of Object.values(targetRecord.inputs)) {
    const upId = ref.kind === 'feature' ? ref.id : ref.featureId;
    if (upId && !visited.has(upId)) {
      visited.add(upId);
      queue.push(upId);
    }
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    const rec = run.records.find(r => r.id === id);
    if (!rec) continue;
    upstream.push({
      feature_id: id,
      kind: rec.kind,
      health: result.health.get(id) ?? (result.shapes.has(id) ? 'healthy' : 'unknown'),
    });
    for (const ref of Object.values(rec.inputs)) {
      const upId = ref.kind === 'feature' ? ref.id : ref.featureId;
      if (upId && !visited.has(upId)) {
        visited.add(upId);
        queue.push(upId);
      }
    }
  }

  return {
    ok: true,
    feature_id: targetId,
    kind: targetRecord.kind,
    health: targetHealth,
    diagnostics: ownDiagnostics,
    upstream,
    hints: buildHints(ownDiagnostics),
  };
}
