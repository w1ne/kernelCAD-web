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
//   infill.bands  low 10 % ~70 % of the volume, mid 25 % ~29 %, high 60 % ~1 %
//                 (the high band sits at the root fillet and the screw bores)
//   infill.saving ~39 % less filament than uniform 60 % (estimate); OrcaSlicer
//                 2.4.2 slicing the same file: 17.3 g / 1h26m vs 27.8 g /
//                 3h42m for uniform 60 %
//   infill.fea    peak ~45 MPa vs 55 MPa PETG yield -> safety factor ~1.2,
//                 ~5 mm tip deflection: it holds, with little margin
//   infill.images heatmap / bands / cutaway PNGs

const wall = param('wall', 6, { min: 4, max: 12 });
const width = 40;
const leg = 70;

// M5 clearance bore through the wall leg, along X.
const hole = (z: number) => cylinder(wall.add(2), 2.75).rotateY(90).translate(-1, width / 2, z);

const bracket = box(wall, width, leg)
  .union(box(leg, width, wall))
  .fillet(5, { parallel: [0, 1, 0], concave: true })
  .subtract(hole(25))
  .subtract(hole(55));

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
