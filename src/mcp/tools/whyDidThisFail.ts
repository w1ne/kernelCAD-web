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
  /**
   * Human-readable suggestions, one per unique diagnostic code in `diagnostics`.
   * Each entry carries the diagnostic `code`, the `hint` text, and a
   * `reachable` classification — see HintReachability for semantics.
   */
  hints?: Array<{ code: string; hint: string; reachable: HintReachability }>;
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
export type HintReachability = 'engine-path' | 'direct-lowerer-only' | 'reserved' | 'tool-error-field';

interface HintEntry {
  /** One-line human-readable suggestion. Pasted into agent chat. */
  hint: string;
  /**
   * Whether this code can fire through the normal RecomputeEngine
   * evaluation path.
   *
   * - 'engine-path': fires during normal recompute. Most codes.
   * - 'direct-lowerer-only': only fires if the lowerer is invoked
   *   directly. The recompute engine short-circuits with
   *   `recompute.input.missing` before the lowerer's branch runs, so
   *   agents won't see this code through normal MCP usage. See
   *   docs/superpowers/specs/2026-05-01-error-attribution-policy.md.
   * - 'tool-error-field': the code appears in MCP tool results' `error` /
   *   `errorCode` field rather than the `diagnostics[]` array. Agents see
   *   these as top-level tool failures (file I/O, script exceptions, export
   *   errors).
   * - 'reserved': forward-looking infrastructure with no current trigger.
   */
  reachable: HintReachability;
}

export const HINTS: Record<string, HintEntry> = {
  'feature.fillet.failed': { reachable: 'engine-path', hint: "OCCT could not apply that fillet. Try a smaller radius — typically less than half of the smallest face dimension." },
  'feature.fillet.no-base': { reachable: 'engine-path', hint: "Fillet has no base shape. Ensure the fillet is chained onto a solid shape (e.g. box(10, 10, 10).fillet(1))." },
  'feature.fillet.no-radius': { reachable: 'engine-path', hint: "Fillet is missing a radius parameter. Pass a positive number as the first argument (e.g. .fillet(2))." },
  'feature.fillet.empty-groups': { reachable: 'engine-path', hint: "Variable-radius fillet needs at least one group. Pass `[{ edges: ..., radius: ... }, ...]` with one entry per intended blend region." },
  'feature.fillet.invalid-group': { reachable: 'engine-path', hint: "Each fillet group needs `edges` (an EdgeSelector or canonical face) and a positive finite `radius`. Check the failing entry's index in the diagnostic message." },
  'feature.fillet.invalid-edge-ref': { reachable: 'engine-path', hint: "Variable-radius fillet's edge_group_<i> input must be an edge or face ref. Other ref kinds (feature, vertex) aren't supported in this slot." },
  'feature.chamfer.failed': { reachable: 'engine-path', hint: "OCCT could not apply that chamfer. Try a smaller distance — typically less than half of the smallest face dimension." },
  'feature.chamfer.no-base': { reachable: 'engine-path', hint: "Chamfer has no base shape. Ensure the chamfer is chained onto a solid shape (e.g. box(10, 10, 10).chamfer(1))." },
  'feature.chamfer.no-distance': { reachable: 'engine-path', hint: "Chamfer is missing a distance parameter. Pass a positive number as the first argument (e.g. .chamfer(2))." },
  'feature.chamfer.empty-groups': { reachable: 'engine-path', hint: "Variable-distance chamfer needs at least one group. Pass `[{ edges: ..., distance: ... }, ...]` with one entry per intended bevel region." },
  'feature.chamfer.invalid-group': { reachable: 'engine-path', hint: "Each chamfer group needs `edges` (an EdgeSelector or canonical face) and a positive finite `distance`." },
  'feature.chamfer.invalid-edge-ref': { reachable: 'engine-path', hint: "Variable-distance chamfer's edge_group_<i> input must be an edge or face ref. Other ref kinds (feature, vertex) aren't supported in this slot." },
  'feature.mirror.no-base': { reachable: 'engine-path', hint: "Mirror has no base shape. Ensure mirror is chained onto a solid shape (e.g. box(10,10,10).mirror({ plane: 'yz' }))." },
  'feature.mirror.invalid-plane': { reachable: 'engine-path', hint: "Mirror plane must be 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset: <number> }. Check the plane argument." },
  'feature.mirror.failed': { reachable: 'engine-path', hint: "OCCT rejected the boolean union of source and reflection. Common cause: source touches the mirror plane, producing zero-thickness intersections — translate the source away or use { plane, offset }. Note: some coplanar configurations succeed without throwing; if mirror returned a shape with unexpected volume, check the input geometry." },
  'feature.transform.invalid-translate': { reachable: 'engine-path', hint: "Translate Vec3 must be three finite numbers. Check the (x, y, z) arguments to .translate()." },
  'feature.transform.invalid-rotate': { reachable: 'engine-path', hint: "Rotate axis must be a finite Vec3 and degrees must be a finite number. Check the arguments to .rotate(axis, degrees, pivot?)." },
  'feature.transform.invalid-scale': { reachable: 'engine-path', hint: "Scale factor must be a positive finite number, or a Vec3 of three positive finite numbers. Check the argument to .scale()." },
  'feature.transform.invalid-reflect': { reachable: 'engine-path', hint: "Reflect plane must be 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset?: number }. Check the argument to .reflect()." },
  'feature.transform.invalid-plane': { reachable: 'direct-lowerer-only', hint: "Reflect plane must be 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset?: number }. Check the plane argument on the Shape.reflect call." },
  'feature.shell.failed': { reachable: 'engine-path', hint: "OCCT could not shell that solid. Try a thinner wall or a different open face. Thickness must be smaller than the shape's minimum thickness." },
  'feature.shell.no-base': { reachable: 'engine-path', hint: "Shell has no base shape. Ensure the shell is chained onto a solid shape." },
  'feature.shell.no-thickness': { reachable: 'engine-path', hint: "Shell is missing a thickness parameter. Pass a positive number as the first argument (e.g. .shell(1))." },
  'feature.extrude.unsupported-profile': { reachable: 'engine-path', hint: "The extrude profile is not a supported 2D sketch type. Ensure you pass a sketch or closed wire as the profile." },
  'feature.revolve.unsupported-profile': { reachable: 'engine-path', hint: "The revolve profile is not a supported 2D sketch type. Ensure you pass a sketch or closed wire as the profile." },
  'feature.revolve.crosses-axis': { reachable: 'engine-path', hint: "A revolve profile must stay on one side of the rotation axis. Ensure all path coordinates have x >= 0 (the first coordinate is the radial distance from the Z axis)." },
  'feature.revolve.empty-profile': { reachable: 'engine-path', hint: "A revolve profile needs at least one lineTo or tangentArc segment to define a closed area. A path with only moveTo + close has zero area." },
  'feature.revolve.failed': { reachable: 'engine-path', hint: "OCCT could not revolve the profile. The profile may self-intersect or have a degenerate shape. Try simplifying the profile." },
  'feature.revolve.bad-sketch': { reachable: 'engine-path', hint: "revolve with profile='sketch' requires a sketch input. This usually means the upstream sketch failed to lower — check its diagnostics first." },
  'feature.sweep.invalid-rail': { reachable: 'engine-path', hint: "Sweep rail must be an array of at least 2 points, each a [x, y, z] tuple of finite numbers. For helical rails, use helix(radius, pitch, turns) to generate the polyline." },
  'feature.sweep.failed': { reachable: 'engine-path', hint: "OCCT could not sweep the profile along the rail. Common causes: profile larger than the rail's tightest curvature radius, rail with sharp corners that cause self-intersection, or non-planar profile. Try a smaller profile, smoother rail, or frenet:true for curved rails." },
  'feature.sweep.multi-face-profile': { reachable: 'direct-lowerer-only', hint: "The profile sketch produces multiple closed loops (e.g. a path that crosses itself or has nested loops). Sweep accepts a single closed loop. Refine the path to a simple single loop, or build the multi-face shape via boolean operations after sweeping the simpler loops separately." },
  'feature.sweep.profile-too-large': { reachable: 'engine-path', hint: "The sweep profile is too large for the rail's tightest curvature. The profile cross-section radius must be smaller than the rail's smallest curvature radius. Reduce the profile size, increase the rail's curvature radius, or use a smoother rail." },
  'feature.sweep.spine-self-intersection': { reachable: 'engine-path', hint: "The rail polyline self-intersects when extruded along the profile. Common causes: sharp 90-degree corners on a planar rail, helix with pitch smaller than 2pi times profile-half-width. Smooth the rail's corners (add intermediate points) or relax the helix pitch." },
  'feature.sweep.bad-sketch': { reachable: 'engine-path', hint: "sweep with profile='sketch' requires a sketch input. This usually means the upstream sketch failed to lower — check its diagnostics first." },
  'feature.sweep.unsupported-profile': { reachable: 'engine-path', hint: "The sweep profile is not a supported 2D sketch type. Pass a closed path() sketch as the profile." },
  'feature.loft.empty-sections': { reachable: 'engine-path', hint: "Loft needs at least 2 sketches. Pass another path()...close() sketch (or array of them) as the first argument: s1.loft(s2) or s1.loft([s2, s3, s4])." },
  'feature.loft.invalid-planes': { reachable: 'engine-path', hint: "If you pass opts.planes, its length must equal the total number of sections (1 + others.length). Or omit planes and use opts.spacing for axial z-stacking." },
  'feature.loft.failed': { reachable: 'engine-path', hint: "OCCT could not loft these sections. Common causes: profiles with very different vertex counts (loft fails to match edges), tightly-spaced sections with mismatched orientation, non-planar input, or self-intersecting interpolation. Try ruled:true for sharp transitions, or pre-rotate sections to align orientations." },
  'feature.loft.bad-sketch': { reachable: 'direct-lowerer-only', hint: "loft is missing an upstream sketch input. The most common cause is an upstream sketch failed to lower (check feature.sketch.failed diagnostics). Verify each input sketch is a valid closed path()." },
  'feature.edge-feature.face-ref-not-resolvable': { reachable: 'engine-path', hint: "Canonical face refs only work on un-transformed primitives. Apply transforms after the fillet/chamfer instead of before, or fillet the primitive first then translate." },
  'feature.edge-feature.face-ref-not-applicable': { reachable: 'engine-path', hint: "That canonical face name is not valid for this primitive. Boxes have all six (top/bottom/left/right/front/back); cylinders have only top/bottom; spheres have none." },
  'feature.edge-feature.face-ref-not-supported': { reachable: 'engine-path', hint: "Edge / face ref kind not supported on this shape. Use a canonical name, a label, or an inline EdgeQuery instead. Tracked / created / propagated refs are reserved for v0.5+." },
  'feature.edge-feature.no-edges-match': { reachable: 'engine-path', hint: "The selection matched no edges on this shape. Use the list_edges MCP tool to see what's available, or relax the query (larger tolerance, fewer keys)." },
  'feature.edge-feature.ambiguous-selection': { reachable: 'engine-path', hint: "Multiple edges match this query. Use selectEdges (plural) for all matches, or tighten the query — smaller tolerance, add a near: point to disambiguate." },
  'feature.edge-feature.invalid-query': { reachable: 'engine-path', hint: "Query has contradictory keys, an unknown segment id, or an unsupported ref kind. Check the EdgeQuery type and ensure segment IDs come from a selectEdges call against the same shape lowering." },
  'feature.face-feature.face-required': { reachable: 'engine-path', hint: "Shell needs a face to remove. Pass the face option with a canonical face name applicable to the base primitive." },
  'feature.face-feature.face-ref-not-resolvable': { reachable: 'engine-path', hint: "Same constraint as edge features: canonical face refs only work on un-transformed primitives. Apply shell before transforms." },
  'feature.face-feature.face-ref-not-applicable': { reachable: 'engine-path', hint: "That canonical face is not valid for this primitive. Cylinders accept only top/bottom for shell; spheres have no canonical faces." },
  'feature.face-feature.face-ref-not-supported': { reachable: 'engine-path', hint: "Face ref kind not supported. Use a canonical name, a label, or an inline FaceQuery. Tracked / created / propagated face refs are reserved for v0.5+." },
  'feature.face-feature.no-match': { reachable: 'engine-path', hint: "The face query matched no faces on this shape. Use the list_faces MCP tool to see what's available, or relax the query (larger tolerance, fewer keys)." },
  'feature.face-feature.label-not-resolvable': { reachable: 'engine-path', hint: "[Deprecated in v0.13.0-rc.7] This generic code is being split into feature.label.unknown-name, feature.label.no-upstream-sketch, feature.label.unsupported-base, and feature.label.mixed-convexity. If you still see this code, check the diagnostic message for guidance, and update kernelCAD if you can." },
  'feature.label.unknown-name': { reachable: 'engine-path', hint: "Label not found on the upstream sketch. Use the list_face_labels MCP tool to see available labels on this script." },
  'feature.label.no-upstream-sketch': { reachable: 'engine-path', hint: "Labels work on shapes built from a path() sketch (currently extrude). For primitives or imported shapes, use an inline face query instead." },
  'feature.label.unsupported-base': { reachable: 'engine-path', hint: "Labels are supported for extrude only in this rc. Revolve / sweep labels are deferred. Use an inline query against the geometry as a workaround." },
  'feature.label.mixed-convexity': { reachable: 'engine-path', hint: "The labeled segment's probe matched a mix of convex and concave edges (typically a reflex / inside corner). Either split the label across smaller segments, or refine with an inline EdgeQuery that filters by convexity." },
  'feature.sketch.degenerate-arc': { reachable: 'engine-path', hint: "An arc segment has degenerate geometry. For radiusArc: |radius| must be >= chord/2 (where chord is the straight-line distance start to end), and start must not coincide with end. Either pick a larger radius, change the endpoints, or use threePointsArc / sagittaArc." },
  'feature.sketch.reflect.invalid-axis': { reachable: 'engine-path', hint: "Sketch reflection axis must be 'x', 'y', or { axis: 'x' | 'y', offset: <number> }. Check the axis argument." },
  'feature.sketch.failed': { reachable: 'engine-path', hint: "Sketch construction failed during lowering. Check the diagnostic message for the underlying error from the sketch engine or our validation." },
  'feature.path.label-without-segment': { reachable: 'engine-path', hint: "label() must follow a lineTo or arc segment. Calling label() before any segment, after moveTo, or after close has nothing to label." },
  'feature.path.duplicate-label': { reachable: 'engine-path', hint: "Each sketch label must be unique. Pick a different name or remove the duplicate label() call." },
  'recompute.input.missing': { reachable: 'engine-path', hint: "An upstream feature failed or was suppressed. Use why_did_this_fail on the upstream feature ID to find the root cause." },
  'recompute.lowering.exception': { reachable: 'engine-path', hint: "An exception was raised during lowering. Check the diagnostic message for the OCCT error." },
  'cli.script.exception': { reachable: 'tool-error-field', hint: "Your script raised an exception during execution. Check the diagnostic message for the JS error." },
  'cli.file.read': { reachable: 'tool-error-field', hint: "kernelCAD could not read the script file at that path. Check the file exists and is readable." },
  'cli.no-input': { reachable: 'tool-error-field', hint: "No input provided to the CLI command. Pass either a file path or inline code." },
  'cli.export.exception': { reachable: 'tool-error-field', hint: "An exception occurred during export. Check the diagnostic message for details." },
  'export.no-shape': { reachable: 'engine-path', hint: "The script did not return a shape. Ensure your script ends with return <shape>." },
  'export.shape-not-lowered': { reachable: 'engine-path', hint: "The returned shape could not be lowered to OCCT. Check for upstream errors in the feature tree." },
};

function buildHints(diagnostics: readonly CompilerDiagnostic[]): Array<{ code: string; hint: string; reachable: HintReachability }> {
  const seen = new Set<string>();
  const out: Array<{ code: string; hint: string; reachable: HintReachability }> = [];
  for (const d of diagnostics) {
    if (!seen.has(d.code) && HINTS[d.code]) {
      seen.add(d.code);
      const entry = HINTS[d.code];
      out.push({ code: d.code, hint: entry.hint, reachable: entry.reachable });
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
