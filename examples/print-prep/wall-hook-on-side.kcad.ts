// FDM printability: the wall hook from wall-hook.kcad.ts, printed the way its
// check recommended — lying on its side with +X up.
//
// The geometry is unchanged; only the declaration differs. buildDirection is
// the part-local axis that points away from the bed, so the L profile lies
// flat and every face of the arm and lip is a vertical wall.
//
// RUN IT
//
//   npx tsx src/agent/cli/index.ts dfm examples/print-prep/wall-hook-on-side.kcad.ts
//
// EXPECTED OUTPUT (exit 0, measured)
//
//   DFM: 1 parts, 0 clearance pairs, 0 wall clusters, 0 voids, fdm[shape] '+x'
//   up 0.0 mm² unsupported (best '+x' 0.0 mm²) — PASS
//
// Then slice it (needs OrcaSlicer or PrusaSlicer on PATH, or KERNELCAD_SLICER).
// The export applies the declared build direction (.rotateY(-90)) before the
// bed gate and the slicer, so the part is sliced in the orientation that
// passed:
//
//   npx tsx src/agent/cli/index.ts export gcode \
//     examples/print-prep/wall-hook-on-side.kcad.ts -o /tmp/wall-hook.gcode --json
//   grep -E '^; (max_z_height|total layer number|filament used \[g\])' /tmp/wall-hook.gcode
//
// EXPECTED OUTPUT (OrcaSlicer 2.x, default PLA profile, 0.2 mm layers)
//
//   {
//     "ok": true,
//     "bytesWritten": 892117,
//     "out": "/tmp/wall-hook.gcode",
//     "diagnostics": []
//   }
//   ; total layer number: 120
//   ; max_z_height: 24.00
//   ; filament used [g] = 9.57
//
// 24 mm tall = the hook's width: it was sliced on its side, without supports.

const width = param('width', 24, { min: 10, max: 60 });
const reach = param('reach', 40, { min: 20, max: 80 });

const screwHole = (z: number) => cylinder(5, 2.25).rotateX(-90).translate(width.divide(2), 0, z);
const backPlate = box(width, 5, 70).subtract(screwHole(12)).subtract(screwHole(58));
const arm = box(width, reach, 6).translate(0, 5, 35);
const lip = box(width, 4, 12).translate(0, reach.add(1), 41);

// Print lying on its side: +X points away from the bed.
dfmSpec({ process: 'fdm', buildDirection: '+x' });

return backPlate.union(arm).union(lip).fillet(4, { parallel: [1, 0, 0], concave: true });
