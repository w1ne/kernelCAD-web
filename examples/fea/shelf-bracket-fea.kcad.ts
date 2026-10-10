// Structural FEA gate: will this shelf bracket hold the load?
//
// An L-shaped aluminium shelf bracket with a filleted inside corner. The wall
// leg bolts to a wall; the shelf leg carries 400 N (about 40 kg) spread over
// its top face. The study declares a minimum safety factor of 2, which makes
// it an ENFORCEMENT gate: `evaluate_script` fails if the part cannot clear it.
//
// This part is deliberately outside the closed-form beam envelope — the load
// path turns a corner and the stress riser sits in a root fillet, which is a
// geometric feature no hand calculation names.
//
// RUN IT
//
//   # the gate: solves the study and fails the evaluation if SF < 2
//   npx kernelcad evaluate examples/fea/shelf-bracket-fea.kcad.ts
//
//   # the evidence: full summary, hot spots, and heatmap PNGs
//   run_fea({ file: 'examples/fea/shelf-bracket-fea.kcad.ts', output_dir: '/tmp/bracket-fea' })
//   fea_summary({ output_dir: '/tmp/bracket-fea' })
//
// EXPECTED OUTPUT (measured; last digits move with mesh size)
//
//   evaluate (the gate: one solve at the study's 4 mm, no refinement):
//     Features: 5
//     WARN [fea.safety-factor.unverified] safety factor 6.35 meets the
//          declared 2, but on a 4.00 mm mesh whose stress is not trusted
//          (error estimate 30.6% in the high-stress region) ... UNVERIFIED
//     OK
//
//   run_fea summary (refines automatically):
//     refinement.passes   4 mm     5246 el   42.5 MPa  error 30.6%
//                         2.62 mm 17815 el   46.3 MPa  error 27.4%  (+8.1%)
//                         1.91 mm 39194 el   49.7 MPa  error 25.4%  (+6.9%)
//     stoppedBy           max-passes (converged: false; trust stays false)
//     minSafetyFactor     5.43   (required 2)  -> ok: true
//     maxVonMisesMPa      49.70  against the 270 MPa yield of aluminum-6061
//     hotSpots[0]         @kc[fillet_1/face/f7] — the ROOT FILLET, not the
//                         loaded face and not the wall face
//     images              heatmap/iso.png, heatmap/front.png
//
//   The fillet peak climbs as the mesh refines (about 50 MPa at 1.9 mm in a
//   finer run), so the 4 mm gate number reads about 15 % low. The margin is
//   wide here, so the verdict holds; for a tight margin, run
//   run_fea({ mesh_size: 1.9 }) and gate on the size it settles at.
//
// TO SEE IT FAIL
//
//   Raise the load to 3000 N and the same evaluate command reports:
//     ERROR [fea.safety-factor.below-min] minimum safety factor 0.85 is below
//     the declared 2 (peak von Mises 318.9 MPa vs 270 MPa yield for
//     aluminum-6061, governing region @kc[fillet_1/face/f7]).

const legLength = param('legLength', 90, { min: 40, max: 160 });
const wall = param('wall', 8, { min: 3, max: 20 });
const width = param('width', 40);

// Wall leg (bolts to the wall) and shelf leg (carries the load), fused into
// one solid so the study analyses a single body. The concave corner edge is
// filleted — that root fillet is exactly the feature a beam formula cannot
// see and the solver can.
const wallLeg = box(wall, width, legLength);
const shelfLeg = box(legLength, width, wall);

const bracket = wallLeg.union(shelfLeg).fillet(4, { parallel: [0, 1, 0], concave: true });

bracket.feaStudy({
  name: 'shelf-load',
  material: 'aluminum-6061',
  // The wall face of the wall leg is bolted flat against the wall.
  fixed: { atX: 0 },
  // 400 N straight down, spread over the top face of the shelf leg.
  loads: [{ name: 'shelf', faces: { atZ: wall }, force: [0, 0, -400] }],
  meshSize: 4,
  minSafetyFactor: 2,
});

return bracket;
