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
//   evaluate:
//     Features: 5
//     WARN [fea.mesh.quality-low] ... nodal stress-error estimate peaks at 31.5%
//     OK
//
//   run_fea summary:
//     minSafetyFactor     6.34   (required 2)  -> ok: true
//     maxVonMisesMPa      42.59  against the 270 MPa yield of aluminum-6061
//     maxDisplacementMm   0.2648
//     nodes / elements    9559 / 5134 at meshSize 4 mm
//     equilibriumResidual 1.1e-12  (reaction balances the applied 400 N)
//     hotSpots[0]         @kc[fillet_1/face/f7] at 42.6 MPa — the ROOT FILLET,
//                         not the loaded face and not the wall face
//     images              heatmap/iso.png, heatmap/front.png
//
//   The mesh-quality warning is honest, not a failure: at 4 mm elements the
//   peak stress is mesh-limited (displacement is not). Re-run with
//   `mesh_size: 2` for a converged stress number.
//
// TO SEE IT FAIL
//
//   Raise the load to 3000 N and the same evaluate command reports:
//     ERROR [fea.safety-factor.below-min] minimum safety factor 0.85 is below
//     the declared 2 (peak von Mises 319.4 MPa vs 270 MPa yield for
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
