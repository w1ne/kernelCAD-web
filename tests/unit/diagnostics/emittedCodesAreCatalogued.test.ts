// tests/unit/diagnostics/emittedCodesAreCatalogued.test.ts
//
// Structural sentinel for spec 2026-05-05-diagnostic-vocabulary-milestone-c
// §Acceptance.1: exactly 24 codes are emitted by the kernel; no test or
// runtime path produces a code outside the catalogue.
//
// Reads the literal `code: '...'` strings out of every emit-site file in
// src/ and asserts each is in DIAGNOSTIC_CODES. Replaces three obsolete
// sentinels (hintsCoverage, whyDidThisFailReachability, and the SKILL.md
// per-code drift check) which were predicated on the old HINTS map.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIAGNOSTIC_CODES } from '../../../src/shared/diagnostics/registry';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolvePath(__dirname, '../../../src');

// Files known to emit CompilerDiagnostic / KernelError code literals.
// Adding to this list is meaningful — it must be a deliberate choice
// (a new emit site).
const EMITTING_FILES = [
  'backends/occt/occtLowerer.ts',
  'backends/occt/holeLowerer.ts',
  'backends/occt/edgeSelection.ts',
  'backends/occt/edgeQueries.ts',
  'backends/occt/textLowerer.ts',
  'backends/occt/sheetMetalLowerer.ts',     // W2.2
  'backends/occt/flattenPattern.ts',        // W2.2
  'capture/captureSession.ts',
  'capture/proxy.ts',
  'capture/sketch.ts',
  'capture/faceLabels.ts',
  'lib/fonts/index.ts',
  'modules/api.ts',
  'modules/sheetMetal.ts',                  // W2.2
  'modules/sketch/index.ts',
  'compute/recomputeEngine.ts',
  'cli/commands/evaluate.ts',
  'cli/commands/export.ts',
  'script-runtime/export.ts',
  'naming/resolveFaceRef.ts',
];

// Match `code: '<value>'` and `new KernelError('<code>', ...)`.
const CODE_LITERAL_RE = /\bcode:\s*['"]([\w.-]+)['"]/g;
const KERNEL_ERR_RE = /new\s+KernelError\(\s*['"]([\w.-]+)['"]/g;

function emittedCodes(): Set<string> {
  const codes = new Set<string>();
  for (const rel of EMITTING_FILES) {
    let src;
    try {
      src = readFileSync(join(SRC_DIR, rel), 'utf8');
    } catch {
      continue;
    }
    for (const m of src.matchAll(CODE_LITERAL_RE)) codes.add(m[1]);
    for (const m of src.matchAll(KERNEL_ERR_RE)) codes.add(m[1]);
  }
  return codes;
}

describe('every diagnostic code emitted in src/ is in the catalogue', () => {
  const catalogue = new Set<string>(DIAGNOSTIC_CODES);

  it('catalogue has exactly 211 codes', () => {
    // 47 baseline (milestone-C diagnostic-vocab spec)
    //  + 23 NURBS Slice B/C/D (Curve3D / variableSweep / surface / G2 / 2D path NURBS)
    //  + 31 Assembly fold (validator / pose-envelope / mechanical-plausibility / transmission / visual / connector)
    //  +  1 K1 watertight enrichment (mesher.cone-self-intersection)
    //  +  4 W2 HDRI / IBL render-environment (conflicting-spec / missing-spec / unknown-preset / intensity-out-of-range)
    //  +  5 W3 face authoring (embossText / projectCurve / face UV anchor)
    //  +  5 W4 §3 trace_from_image (tool.trace-from-image.*)
    //  +  7 W1 material expansion (thickness-negative / attenuation-distance-invalid / anisotropy-rotation-normalized /
    //       texture-not-found / texture-unsupported-format / texture-oversize-warning / texture-oversize-error)
    //  +  2 camera-target override (non-finite-target / invalid-distance)
    //  +  1 assembly mechanical fixed-contact-missing (develop)
    //  +  1 F-foundation @kc topology refs (feature.face-ref.snapshot-fallback-used)
    //  +  7 Slice A export trio (options-format-mismatch + six per-format
    //       not-implemented placeholders for dxf/3mf/glb/urdf/srdf/sdf-gazebo;
    //       the dxf/3mf/glb placeholders are removed by Slice A tasks 3-5).
    //  +  6 Slice C parts.* codes (parts.input.id-or-query-required,
    //       parts.fetch.offline-and-uncached, parts.fetch.checksum-mismatch,
    //       parts.fetch.checksum-drift, parts.fetch.api-error,
    //       parts.fetch.remote-disabled).
    //  + 24 dfm.* Slice E shopcheck (input/units/material/thickness/hole/slot/
    //       web/bend/bending/size/dxf/rule).
    //  - 3 Slice B-rest fills urdf/srdf/sdf-gazebo placeholder slots; the
    //       three `.not-implemented` entries are removed.
    //  + 11 Slice B-rest new diagnostics:
    //       URDF (5): cylindrical-lossy, pin-slot-lossy, ball-decomposed,
    //                 closed-loop, inertia-density-declared
    //       SRDF (2): acm-sparse-sampling, planning-group-missing
    //       SDF  (4): cylindrical-lossy, pin-slot-lossy, invalid-version,
    //                 dangling-link-ref
    //  +  1 V Task V1 verb-nurbs bridge (feature.nurbs.bridge-conversion-failed)
    //  +  5 V Task V2 Curve3D.analytics namespace (degenerate-arclength /
    //       closest-point-no-converge / derivatives-out-of-range /
    //       tessellation-tolerance-invalid / kernel-failed)
    //  +  2 V Task V3 Curve3D.analytics.intersect (intersect-kernel-failed /
    //       intersect-no-intersection)
    //  +  2 V Task V4 path().spline tangent extension (tangent-zero-magnitude /
    //       tangent-on-2d-only)
    //  +  7 Slice Q (Query DSL) — Q3 evaluator codes (empty / over-determined /
    //       evaluated-too-early / unknown-id / unknown-label / id-hierarchy-
    //       clash / unsupported-entity-type)
    //  +  1 Slice Q4 — composition-strict-failure
    //  +  1 Slice Q5 — type-mismatch
    //  +  1 Slice Q7 — invalid-syntax
    //  + 9 K1-K9 kinematic-grounding (this slice):
    //       collision.swept, collision.swept.sample-density-warning,
    //       unreachable, reachability.iteration-cap-hit,
    //       solver.unsupported-config, load-exceeds-yield,
    //       load.beam-not-applicable, no-material-declared,
    //       mounting-hole.diameter-mismatch.
    //  +  1 v0.7 Gate 4 (joint visual exposure): assembly.joint.not-visible.
    //  +  1 G2 Gate 6 (mate physical realization): assembly.mate.not-physically-realized.
    //  +  4 P0 physics-grounded loop (mechanism truth): mechanism.disconnect,
    //       mechanism.interpenetration, mechanism.dof-mismatch,
    //       mechanism.orphan-part.
    //  + 2 P6 physics-grounded loop: mechanism.unstable-under-gravity,
    //       mechanism.drops-on-release.
    //  + 1 P8 joint-mesh-continuity gate (this slice): mechanism.joint-mesh-gap.
    //  + 1 P11 Slice 2 tendon-routing gate: mechanism.tendon-body-intersect.
    // Develop baseline = 157 - 3 + 11 + 1 + 5 + 2 + 2 + 7 + 1 + 1 + 1 + 9 + 1 + 1 + 4 + 2 + 1 + 1 = 204.
    //  +  6 Slice C parts.* codes (itemised above) = 210.
    //  +  1 feature.emboss-text.boolean-noop (#393 silent no-op guard) = 211.
    expect(catalogue.size).toBe(211);
  });

  it('no emit site uses a code outside the catalogue', () => {
    const stale = [...emittedCodes()].filter((c) => !catalogue.has(c)).sort();
    expect(
      stale,
      `Stale codes still emitted in src/: ${JSON.stringify(stale)}.\nMigration policy: every code must be one of the ${DIAGNOSTIC_CODES.length} in DIAGNOSTIC_CODES.`,
    ).toEqual([]);
  });
});
