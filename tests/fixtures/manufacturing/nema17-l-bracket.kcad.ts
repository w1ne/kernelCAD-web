// Manufacturing benchmark case 02 (#1227): CNC L-bracket for a NEMA 17
// stepper motor.
//
// Prompt: "Machined 6061 aluminium L-bracket that holds a NEMA 17 stepper
// with its shaft horizontal. Clear the 22 mm pilot boss, use M3 clearance on
// the 31 mm square pattern, and bolt the base down with two M5 screws on a
// 40 mm pitch. The motor and the base holes must stay centred when the
// bracket widens."
//
// Interfaces the benchmark checks:
//   - one 22.5 mm through bore in the upright (22 mm boss + 0.25 mm per
//     side), axis along Y, centre at x = Width / 2, z = Thickness + 23;
//   - four 3.4 mm M3 clearance through holes on a 31 x 31 mm square centred
//     on that bore;
//   - two 5.5 mm M5 clearance through holes in the base, axis along Z, on a
//     40 mm pitch centred on X, midway across the base flange.
// Motor dimensions come from the NEMA ICS 16 size 17 frame: 42.3 mm square
// body, 31 mm hole pitch, 22 mm pilot.
const width = param('Width', 60, { unit: 'mm', min: 56, max: 100 });
const baseDepth = param('BaseDepth', 40, { unit: 'mm', min: 30, max: 80 });
const height = param('Height', 50, { unit: 'mm', min: 50, max: 80 });
const thickness = param('Thickness', 5, { unit: 'mm', min: 4, max: 8 });

const cx = width.divide(2);
// Motor axis 23 mm above the base top: the 42.3 mm body clears it by 1.85 mm.
const motorZ = thickness.add(23);

const base = box(width, baseDepth, thickness);
const upright = box(width, thickness, height);
let bracket = base.union(upright);

// Upright holes: cylinders along Z rotated onto +Y, cut through the plate.
const throughUpright = (radius: number) =>
  cylinder(thickness.add(2), radius).rotate([1, 0, 0], -90);
bracket = bracket.subtract(throughUpright(11.25).translate(cx, -1, motorZ));
const motorHoles: Array<[number, number]> = [[-15.5, -15.5], [15.5, -15.5], [-15.5, 15.5], [15.5, 15.5]];
for (const [dx, dz] of motorHoles) {
  bracket = bracket.subtract(throughUpright(1.7).translate(cx.add(dx), -1, motorZ.add(dz)));
}

// Base holes: midway across the flange in front of the upright.
const baseHoleY = thickness.add(baseDepth.subtract(thickness).divide(2));
for (const dx of [-20, 20]) {
  bracket = bracket.subtract(cylinder(thickness.add(2), 2.75).translate(cx.add(dx), baseHoleY, -1));
}
return bracket;
