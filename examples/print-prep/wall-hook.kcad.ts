// FDM printability: a wall hook, checked before it reaches the slicer.
//
// Modeled the way it hangs: a back plate screws to the wall, an arm sticks
// straight out, and a lip at the end keeps a cable or a headphone band from
// sliding off. Printed that way up, the arm's underside is a 40 mm cantilever
// over nothing. dfmSpec({ process: 'fdm' }) makes that an enforced gate and
// names the orientation that removes it.
//
// RUN IT
//
//   npx tsx src/agent/cli/index.ts dfm examples/print-prep/wall-hook.kcad.ts
//
// EXPECTED OUTPUT (exit 1, measured)
//
//   ERROR [dfm.fdm.overhang-unsupported] <unknown>: dfm.fdm: part 'shape' has
//   938.2 mm² of unsupported overhang in 1 region(s) printing '+z' up (limit
//   45° from vertical); largest 938.2 mm² at @kc[fillet_1/face/bottom] (bbox
//   (0.0, 6.2, 33.9)–(24.0, 45.0, 35.0)), 90.0° from vertical, reaching
//   38.8 mm past its nearest support.
//     Hint: Downward-facing surfaces steeper than maxOverhangDeg have nothing
//     below them to print onto. Reorient the part, add a 45° chamfer or gusset
//     under the overhang, or slice with supports. Rotate -90° about Y
//     (.rotateY(-90), or dfmSpec buildDirection: '+x'): unsupported area drops
//     from 938.2 to 0.0 mm².
//   WARN [dfm.fdm.tip-risk] <unknown>: dfm.fdm: part 'shape' is 70.0 mm tall
//   on a base 5.0 mm wide (ratio 14.0 > 8) printing '+z' up; it may tip or
//   wobble while printing.
//     Hint: ... Print it lying down, widen the base, or add a brim.
//   DFM: 1 parts, 0 clearance pairs, 0 wall clusters, 0 voids, fdm[shape] '+z'
//   up 938.2 mm² unsupported (best '+x' 0.0 mm²) — FAIL
//
// The 938.2 mm² is the arm underside (24 mm wide × 36 mm clear of the 4 mm
// root fillet) plus the steep band of that fillet. The screw holes are
// horizontal but only 4.5 mm across, so they bridge and are not reported.
//
// Take the advice as written: wall-hook-on-side.kcad.ts is this file with
// buildDirection: '+x' declared. It passes the same check, and the gcode
// export slices it lying on its side (24 mm tall instead of 70 mm).

const width = param('width', 24, { min: 10, max: 60 });
const reach = param('reach', 40, { min: 20, max: 80 });

const screwHole = (z: number) => cylinder(5, 2.25).rotateX(-90).translate(width.divide(2), 0, z);
const backPlate = box(width, 5, 70).subtract(screwHole(12)).subtract(screwHole(58));
const arm = box(width, reach, 6).translate(0, 5, 35);
const lip = box(width, 4, 12).translate(0, reach.add(1), 41);

// Print as modeled: back plate on the bed, +Z up.
dfmSpec({ process: 'fdm' });

// Both concave root edges run along X: arm-to-back-plate and arm-to-lip.
return backPlate.union(arm).union(lip).fillet(4, { parallel: [1, 0, 0], concave: true });
