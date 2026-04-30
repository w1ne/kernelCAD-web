// src/mcp/tools/whyDidThisFail.ts
import { runScript } from '../../script-runtime/runScript';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { OcctLowerer } from '../../backends/occt/occtLowerer';
import { initOcct } from '../../backends/occt/occtBackend';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FeatureKind } from '../../intent/types';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';

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
  'feature.edge-feature.face-ref-not-resolvable': "Canonical face refs (e.g. { face: 'top' }) only work on un-transformed primitives. Apply transforms after the fillet/chamfer instead of before, or fillet the primitive first then translate.",
  'feature.edge-feature.face-ref-not-applicable': "That canonical face name is not valid for this primitive. Boxes have all six (top/bottom/left/right/front/back); cylinders have only top/bottom; spheres have none.",
  'feature.edge-feature.face-ref-not-supported': "Only canonical face refs are supported in v0.2-alpha. Apply fillet/chamfer without a face filter, or use a canonical face name like { face: 'top' }.",
  'feature.face-feature.face-required': "Shell needs a face to remove. Pass `{ face: 'top' }` (or another canonical face name applicable to the base primitive).",
  'feature.face-feature.face-ref-not-resolvable': "Same constraint as edge features: canonical face refs only work on un-transformed primitives. Apply shell before transforms.",
  'feature.face-feature.face-ref-not-applicable': "That canonical face is not valid for this primitive. Cylinders accept only top/bottom for shell; spheres have no canonical faces.",
  'feature.face-feature.face-ref-not-supported': "Only canonical face refs are supported in v0.2-alpha. Tracked / created / propagated face refs land in v0.2 full.",
  'feature.sketch.degenerate-arc': "An arc segment has degenerate geometry. For radiusArc: |radius| must be >= chord/2 (where chord is the straight-line distance start→end), and start must not coincide with end. Either pick a larger radius, change the endpoints, or use threePointsArc / sagittaArc.",
  'feature.sketch.failed': "Sketch construction failed during lowering. Check the diagnostic message for the underlying error from Replicad or our validation.",
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
    return { ok: false, error: `Script execution failed: ${e instanceof Error ? e.message : String(e)}` };
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
