import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import { runInterference } from '../../oracle/interference';
import { renderScript } from '../../oracle/render';
import { scoreAgainstReference } from '../../oracle/scoreReference';
import { scoreMesh } from '../../oracle/scoreMesh';
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
// SSIM gate added by Slice A Task 16 (variable-fillet/chamfer + PBR material
// rewrite). The Slice A target was 0.35 — a stretch goal set by the spec
// against the reference photo at pose 30,15. The current rewrite ships ~0.14
// because the reference photo includes temples + a ground plane + significant
// lighting detail the front-face-only model does not reproduce. The gate is
// kept at 0.35 (per memory feedback_no_gate_tampering — never loosen a gate
// to make passing easier) so the scored field reflects the real gap until a
// follow-up slice closes it (NURBS brow curves + temple geometry).
const SSIM_FLOOR = 0.35;

// Geometric-oracle thresholds (used iff `reference.stl` exists in the task dir).
// These come from R12-R18 empirical baselines on the meta-glasses task: the
// human expert + E4 (NURBS) build at chamfer 16-19 mm; R5's slab hack hits
// 32+ mm. Thresholds picked to PASS the geometrically-faithful builds and
// FAIL the scorer-hacks.
const CHAMFER_CEIL_MM = 25;     // Pass if chamfer ≤ 25mm (R5's 32mm fails;
                                //   expert's 19mm passes; R14's 12mm passes)
const BBOX_IOU_FLOOR = 0.05;    // Pass if bbox IoU ≥ 0.05 (R5's 0.056 borderline)

async function exportToStl(scriptPath: string, outPath: string): Promise<boolean> {
  // Shell out to `kernelcad export stl <script> -o <outPath>`. Doesn't need
  // a running dev server — STL export is BREP→mesh in-process.
  const bin = process.env.KERNELCAD_BIN ?? './dist/cli/index.js';
  const cmd = bin.endsWith('.js') ? 'node' : bin;
  const args = bin.endsWith('.js') ? [bin, 'export', 'stl', scriptPath, '-o', outPath] : ['export', 'stl', scriptPath, '-o', outPath];
  return await new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    child.on('close', (code) => resolve(code === 0 && existsSync(outPath)));
    child.on('error', () => resolve(false));
  });
}

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
  let ssim = 0;
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
      ssim = score.perGate.ssim;
      rendered = true;
    }
  }

  // G5 (optional, gameable-resistant) 3D geometric scoring against
  // `reference.stl`. Activates iff the task dir ships a reference STL.
  // See memory: kernelcad_r5_scorer_hack_finding — the 2D-pixel scorer is
  // gameable (R5 inflated body depth → top vs photo, last vs 3D model).
  // The Chamfer distance gate punishes geometric divergence directly.
  let geomScored = false;
  let chamferMm = 0;
  let bboxIoU = 0;
  if (ctx) {
    const refStlPath = join(ctx.taskDir, 'reference.stl');
    if (existsSync(refStlPath)) {
      const genStlPath = join(ctx.runDir, 'generated.stl');
      const exported = await exportToStl(scriptPath, genStlPath);
      if (exported) {
        try {
          const m = scoreMesh(genStlPath, refStlPath);
          chamferMm = m.chamferDistance;
          bboxIoU = m.bboxIoU;
          geomScored = true;
        } catch {
          // scoreMesh throws on malformed STL — leave geomScored false.
        }
      }
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
      'SSIM >= 0.35 vs photo': rendered && ssim >= SSIM_FLOOR,
      // 3D-geometric gates (only present when reference.stl is shipped).
      // Order in object literal preserved → reads naturally in harness output.
      ...(geomScored ? {
        [`chamfer distance <= ${CHAMFER_CEIL_MM} mm vs STL`]: chamferMm <= CHAMFER_CEIL_MM,
        [`bbox IoU >= ${BBOX_IOU_FLOOR.toFixed(2)} vs STL`]: bboxIoU >= BBOX_IOU_FLOOR,
      } : {}),
    },
  };
}
