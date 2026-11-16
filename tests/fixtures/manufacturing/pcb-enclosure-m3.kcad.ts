// Manufacturing benchmark case 01 (#1227): FDM tray for an 85 x 56 mm board
// with the Raspberry Pi 4 mounting pattern (58 x 49 mm, M3).
//
// Prompt: "Open-top PETG tray for a Pi 4. Four M3 self-tapping bosses on the
// board's 58 x 49 mm hole pattern, 5 mm standoff, and a USB-C opening in the
// front wall. The board footprint must stay centred when the tray resizes."
//
// Interfaces the benchmark checks:
//   - four blind pilot holes, 2.5 mm diameter, 4 mm deep, mouths at
//     Floor + 5 mm, centres on a 58 x 49 mm rectangle centred in the tray;
//   - one USB-C opening, 9.4 x 3.6 mm (9.0 x 3.2 mm plug + 0.2 mm per side),
//     through the y = 0 wall, centred on X.
// Board dimensions come from the Raspberry Pi 4 Model B mechanical drawing.
const width = param('Width', 95, { unit: 'mm', min: 90, max: 140 });
const depth = param('Depth', 66, { unit: 'mm', min: 61, max: 120 });
const height = param('Height', 25, { unit: 'mm', min: 15, max: 60 });
const wall = param('Wall', 2.5, { unit: 'mm', min: 1.6, max: 4 });
const floor = param('Floor', 2, { unit: 'mm', min: 1.2, max: 4 });

const cx = width.divide(2);
const cy = depth.divide(2);

const tray = box(width, depth, height).subtract(
  box(width.subtract(wall.multiply(2)), depth.subtract(wall.multiply(2)), height)
    .translate(wall, wall, floor),
);

// Boss: 6 mm OD, 5 mm standoff. Pilot: 2.5 mm, 4 mm deep, so 1 mm of boss
// stays under the pilot and the hole is blind.
const holeOffsets: Array<[number, number]> = [[-29, -24.5], [29, -24.5], [-29, 24.5], [29, 24.5]];
let body = tray;
for (const [dx, dy] of holeOffsets) {
  body = body.union(cylinder(5, 3).translate(cx.add(dx), cy.add(dy), floor));
}
for (const [dx, dy] of holeOffsets) {
  body = body.subtract(cylinder(4, 1.25).translate(cx.add(dx), cy.add(dy), floor.add(1)));
}

// USB-C opening: bottom edge 6.6 mm above the floor (standoff + 1.6 mm board).
const usbC = box(9.4, wall.add(2), 3.6).translate(cx.subtract(4.7), -1, floor.add(6.6));
return body.subtract(usbC);
