// Stress-graded FDM infill: dense infill only where the part is loaded.
//
// A PETG shelf bracket. The wall leg bolts on with two M5 screws; the shelf
// leg carries 120 N (about 12 kg). FEA finds where it is stressed, and the
// 3MF export puts 60 % gyroid infill there, 25 % around it, and 10 %
// everywhere else, as Orca/Bambu modifier volumes.
//
// Requires the LOCAL CalculiX + gmsh toolchain (see the kernelcad-fea skill).
// Without it the export fails with fea.solver.unavailable — it never falls
// back to uniform infill.
//
// RUN IT
//
//   export({ target: 'model', file: 'examples/fea/stress-graded-infill-bracket.kcad.ts',
//            output_path: '/tmp/bracket.3mf', format: '3mf',
//            options: { format: '3mf', printer: 'bambu-a1', arrange: 'assembled',
//                       infill: { fromFea: 'shelf-load' } } })
//
// EXPECTED OUTPUT (measured; digits move with the mesh)
//
//   infill.bands  low 10 % ~65 % of the volume, mid 25 % ~27 %, high 60 % ~8 %
//                 (the high band is the two screw bosses, which always print
//                 dense, and the wall just below the lower bore)
//   infill.saving ~36 % less filament than uniform 60 % (estimate: 21.1 g vs
//                 33.0 g)
//   infill.fea    peak ~31 MPa vs 55 MPa PETG yield -> safety factor ~1.8,
//                 ~4.9 mm tip deflection. The ~50 MPa at the edge of the lower
//                 bore is the rigid-clamp singularity (peakAtSupportMPa, with a
//                 fea.stress.support-singularity warning), not the governing
//                 stress
//   infill.images heatmap / bands / cutaway PNGs

const wall = param('wall', 6, { min: 4, max: 12 });
const width = 40;
const leg = 70;

// Wall leg with two M5 clearance bores (5.5 mm, through) at 25 and 55 mm
// height (u/v are offsets from the face centre); shelf leg; root fillet.
const wallLeg = box(wall, width, leg)
  .hole('left', { u: 0, v: -10, diameter: 5.5, depth: 'through', name: 'screwLow' })
  .hole('left', { u: 0, v: 20, diameter: 5.5, depth: 'through', name: 'screwHigh' });

const bracket = wallLeg
  .union(box(leg, width, wall))
  .fillet(5, { parallel: [0, 1, 0], concave: true });

bracket.feaStudy({
  name: 'shelf-load',
  material: 'petg',
  // Held by the two screw bores: the only faces fully inside this box.
  fixed: { boundingBoxIn: { xMin: -1, xMax: wall.add(1), yMin: 15, yMax: 25, zMin: 20, zMax: 60 } },
  // 120 N TOTAL pressing down on the shelf top.
  loads: [{ name: 'shelf', faces: { atZ: wall }, force: [0, 0, -120] }],
  meshSize: 2.5,
});

return bracket;
