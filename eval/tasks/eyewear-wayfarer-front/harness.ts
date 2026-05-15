import { join } from 'node:path';
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import { runInterference } from '../../oracle/interference';
import { renderScript } from '../../oracle/render';
import { scoreAgainstReference } from '../../oracle/scoreReference';
import type { HarnessCtx, HarnessResult } from '../../types';

// Reference photo: front-right product shot from approximately az=30°, el=15°.
// See ../../docs/specs/2026-05-15-from-prompt-to-object-eval-loop-roadmap.md
// Phase 1 — first L5 task wired through the new oracle (render + pose + scorer).
const REFERENCE_POSE = '30,15';
// Composite-score thresholds. Today's manual A/B baseline on the same target:
// Agent A reached 0.449 with the lean skill set; the eval-harness'd agent
// gets the same scoring rubric and ~3-attempt budget.
const SILHOUETTE_FLOOR = 0.45;
const COMPOSITE_FLOOR = 0.30;

export default async function harness(scriptPath: string, ctx?: HarnessCtx): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const shape = await getShapeInfo(scriptPath);
  const dims = [
    shape.bbox.max[0] - shape.bbox.min[0],
    shape.bbox.max[1] - shape.bbox.min[1],
    shape.bbox.max[2] - shape.bbox.min[2],
  ].sort((a, b) => b - a);

  // G3 interference. The expected output is a single Shape; noSceneToCheck
  // means "nothing to gate on" rather than a failure.
  const interference = await runInterference(scriptPath);
  const interferenceClean = interference.ok && (interference.noSceneToCheck || interference.pairs.length === 0);

  // G4 image similarity vs the reference photo, at the reference pose.
  // If ctx isn't supplied (harness invoked outside the runner), skip the
  // render+score path and surface that as an inconclusive gate.
  let silhouetteIoU = 0;
  let composite = 0;
  let rendered = false;
  if (ctx) {
    const referencePath = join(ctx.taskDir, 'reference.jpg');
    const renderStem = join(ctx.runDir, 'render.png');
    const r = await renderScript(scriptPath, {
      outStem: renderStem,
      poses: [REFERENCE_POSE],
    });
    if (r.ok && r.paths.poses[REFERENCE_POSE]) {
      const score = await scoreAgainstReference(r.paths.poses[REFERENCE_POSE], referencePath);
      silhouetteIoU = score.perGate.silhouetteIoU;
      composite = score.composite;
      rendered = true;
    }
  }

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': shape.volume > 0,
      // Eyewear is at least ~100 mm wide. Anything narrower than a wristwatch
      // is geometrically not the target — gate that without making temple
      // extension or chunky bodies fail other dims.
      'eyewear-wide (>= 100 mm in some axis)': dims[0] >= 100,
      'no unintended interferences': interferenceClean,
    },
    scored: {
      'rendered against reference': rendered,
      'silhouette IoU >= 0.45 vs photo': rendered && silhouetteIoU >= SILHOUETTE_FLOOR,
      'composite >= 0.30 vs photo': rendered && composite >= COMPOSITE_FLOOR,
    },
  };
}
