// SPDX-License-Identifier: MIT
import type { RunScriptResult } from '../../composition/runScript';
import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import { trackFullLower } from '../../modeling/capture/fullLowerTracker';

/**
 * Lower an already-executed script's records once (no gates, as the
 * validate / export callers always did) and reuse the session's clean full
 * lower for the unchanged record prefix.
 *
 * With no gates active this is the same work as the session's own full lower
 * (the solvedModel gate's, a clean `Shape.lower()` in the script, or an
 * earlier call), so seeding is output-identical. Only a clean lower is
 * reused: a seeded record emits no diagnostics, which these callers report.
 * When this run is itself clean it becomes the session's clean full lower, so
 * the next consumer (physical review's `Shape.lower()`, the mechanism probe)
 * does not lower the model again.
 */
export async function lowerScriptRun(
  run: RunScriptResult,
): Promise<Awaited<ReturnType<RecomputeEngine['run']>>> {
  const session = run.session;
  const engine = new RecomputeEngine(createOcctLowerer(session));
  const ungated = session.gatedFeatureNames.size === 0 && run.paramTable === session.paramTable;
  const seedShapes = ungated ? session.reusableLoweredPrefix(session.cleanScriptLower) : new Map();
  const track = trackFullLower(session);
  const r = await engine.run(run.records, {
    ...(seedShapes.size > 0 ? { seedShapes } : {}),
    paramTable: run.paramTable,
    warningSink: track.warningSink,
  });
  const { snapshot, clean } = track.result(r);
  if (ungated && clean && run.records.length === session.getRecords().length) {
    session.cleanScriptLower = snapshot;
    session.lastFullLower = snapshot;
  }
  return r;
}
