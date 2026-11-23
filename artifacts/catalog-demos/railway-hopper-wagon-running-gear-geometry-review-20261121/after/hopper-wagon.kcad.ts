// Open-top two-bay hopper wagon. What makes it a hopper and not a boxcar: the
// side sheets end in two V-shaped discharge pockets with bottom gates, and the
// open top shows the end slope sheets that run the load down into the pockets.
// The body rides on two freight bogies with a wheel pair on each rail, stub
// sills, couplers, end ladders and a hand brake wheel.
// Stylised kit scale shared with the other railway wagons. Millimetres, Z up,
// wheel flanges on z = 0.

meta({
  name: "hopper-wagon",
  license: 'CC0-1.0',
  title: "Hopper wagon",
  description: "Open-top two-bay hopper wagon: painted side sheets with posts and top chords, end slope sheets that feed two V-shaped discharge pockets with galvanized bottom gates, two freight bogies with wheels on both rails, stub sills, couplers, end ladders and a hand brake wheel. Editable material controls: rail and running gear steel, painted steel, galvanized steel. Includes weathered and fresh service presets.",
  tags: ["hopper wagon", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#3c4245', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#7a3a2c', { label: 'Painted steel' });
const galvanizedSteel = param('galvanizedSteel', '#a3acae', { label: 'Galvanized steel' });
presets({
  weathered: { railSteel: '#666a6a', paintedSteel: '#545858', galvanizedSteel: '#898e8d' },
  freshService: { railSteel: '#56636a', paintedSteel: '#b74734', galvanizedSteel: '#aab4b4' },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
// Cylinder with its axis along Y, centred on y.
const cY = (x: number, y: number, z: number, len: number, r: number, n = 14) => cylinder(len, r, n).rotateX(90).translate(x, y + len / 2, z).scale(scale);
// Cylinder with its axis along X, starting at x0 and running toward +X.
const cX = (x0: number, y: number, z: number, len: number, r: number, n = 14) => cylinder(len, r, n).rotateY(90).translate(x0, y, z).scale(scale);
// Side-view (x, z) outline extruded across the car over `depth`, centred on y.
const sideProfile = (pts: Array<[number, number]>, y: number, depth: number) => {
  let pb = path().moveTo(pts[0]![0], pts[0]![1]);
  for (const [u, v] of pts.slice(1)) pb = pb.lineTo(u, v);
  return pb.close().extrude(depth).rotateX(90).translate(0, y + depth / 2, 0).scale(scale);
};

const L = 690;        // half length of the body over the end sheets
const W = 150;        // half width of the body (outer face of the side sheets)
const T = 8;          // sheet thickness
const TOP = 580;      // top chord height
const SILL = 210;     // underside of the body over the bogies
const POCKET = 100;   // pocket outlet height
const BOGIE = 500;    // bogie centre distance from the car centre
const GAUGE = 95;     // wheel centre line distance from the car centre line
const WHEEL_R = 78;   // flange radius; the tread is 8 mm smaller

// Hopper floor: end slopes run down to two pocket outlets either side of a
// centre ridge. Top surface first, then the underside FLOOR_T lower.
const FLOOR_T = 24;
const floorTop: Array<[number, number]> = [
  [-L + 4, 560], [-255, POCKET], [-135, POCKET], [0, 262], [135, POCKET], [255, POCKET], [L - 4, 560],
];
const floorUnder: Array<[number, number]> = floorTop.map(([x, z]) => [x, z - FLOOR_T] as [number, number]).reverse();

const p = assembly("hopper-wagon");

// ---- Body: side sheets, end sheets, hopper floor, top chords, posts ----
const sideOutline: Array<[number, number]> = [
  [-L, TOP], [L, TOP], [L, SILL], [400, SILL], [255, POCKET - FLOOR_T], [135, POCKET - FLOOR_T], [0, 262 - FLOOR_T],
  [-135, POCKET - FLOOR_T], [-255, POCKET - FLOOR_T], [-400, SILL], [-L, SILL],
];
for (const [s, tag] of [[-1, 'front'], [1, 'back']] as const) {
  p.part(`side-sheet-${tag}`, sideProfile(sideOutline, s * (W - T / 2), T).color(paintedSteel));
  p.part(`top-chord-${tag}`, b(0, s * (W - 4), TOP - 6, 2 * L + 16, 22, 22).color(paintedSteel));
  // External side posts stiffen the sheet between the top chord and the floor line.
  for (const x of [-620, -420, -200, 200, 420, 620]) {
    p.part(`side-post-${tag}-${x}`, b(x, s * (W + 5), 300, 16, 10, TOP - 300).color(paintedSteel));
  }
}
// The floor spans between the side sheets.
p.part("hopper-floor", sideProfile([...floorTop, ...floorUnder], 0, 2 * (W - T)).color(paintedSteel));
for (const [s, tag] of [[-1, 'a'], [1, 'b']] as const) {
  p.part(`end-sheet-${tag}`, b(s * (L - T / 2), 0, 520, T, 2 * W, TOP - 520).color(paintedSteel));
  p.part(`top-chord-end-${tag}`, b(s * (L - 4), 0, TOP - 6, 22, 2 * W + 8, 22).color(paintedSteel));
}

// ---- Discharge gates under the two pockets ----
for (const [s, tag] of [[-1, 'a'], [1, 'b']] as const) {
  const xc = s * 195;
  const zg = POCKET - FLOOR_T;
  p.part(`gate-frame-${tag}`, b(xc, 0, zg - 18, 150, 2 * (W - T) - 20, 18).color(galvanizedSteel));
  p.part(`gate-door-${tag}`, b(xc, 0, zg - 30, 124, 2 * (W - T) - 60, 12).color(galvanizedSteel));
  // Transverse operating shaft with square drive heads outside both side sheets.
  p.part(`gate-shaft-${tag}`, cY(xc + s * 60, 0, zg - 12, 2 * W + 30, 8, 10).color(galvanizedSteel));
  for (const [sy, side] of [[-1, 'front'], [1, 'back']] as const) {
    p.part(`gate-drive-${tag}-${side}`, b(xc + s * 60, sy * (W + 22), zg - 24, 24, 14, 24).color(galvanizedSteel));
  }
}

// ---- Underframe: body bolsters, stub sills, end sills, couplers ----
for (const [s, tag] of [[-1, 'a'], [1, 'b']] as const) {
  p.part(`body-bolster-${tag}`, b(s * BOGIE, 0, 140, 70, 2 * W, SILL - 140).color(paintedSteel));
  p.part(`stub-sill-${tag}`, b(s * 585, 0, 180, 250, 70, 40).color(paintedSteel));
  p.part(`end-sill-${tag}`, b(s * (L + 10), 0, 180, 20, 2 * W, 40).color(paintedSteel));
  p.part(`coupler-shank-${tag}`, b(s * (L + 50), 0, 188, 60, 30, 26).color(railSteel));
  p.part(`coupler-knuckle-${tag}`, b(s * (L + 95), 0, 176, 30, 64, 50).color(railSteel));
}

// ---- Freight bogies: wheel pairs on both rails, axles, side frames, bolsters ----
const sideFrame: Array<[number, number]> = [[-165, 100], [-125, 132], [125, 132], [165, 100], [115, 58], [-115, 58]];
for (const [s, tag] of [[-1, 'a'], [1, 'b']] as const) {
  const xc = s * BOGIE;
  for (const dx of [-85, 85]) {
    const x = xc + dx;
    p.part(`axle-${tag}-${dx}`, cY(x, 0, WHEEL_R, 2 * GAUGE + 40, 12, 10).color(railSteel));
    for (const [sy, side] of [[-1, 'front'], [1, 'back']] as const) {
      p.part(`wheel-${tag}-${dx}-${side}`, cY(x, sy * (GAUGE + 3), WHEEL_R, 12, WHEEL_R - 8).color(railSteel));
      p.part(`flange-${tag}-${dx}-${side}`, cY(x, sy * (GAUGE - 6), WHEEL_R, 6, WHEEL_R).color(railSteel));
      p.part(`journal-box-${tag}-${dx}-${side}`, b(x, sy * (GAUGE + 24), WHEEL_R - 20, 44, 26, 40).color(railSteel));
    }
  }
  for (const [sy, side] of [[-1, 'front'], [1, 'back']] as const) {
    p.part(`side-frame-${tag}-${side}`, sideProfile(sideFrame.map(([x, z]) => [x + xc, z] as [number, number]), sy * (GAUGE + 24), 16).color(railSteel));
  }
  p.part(`bogie-bolster-${tag}`, b(xc, 0, 104, 60, 2 * (GAUGE + 32), 36).color(railSteel));
}

// ---- End fittings: ladders on both ends, hand brake wheel on the a end ----
for (const [s, tag] of [[-1, 'a'], [1, 'b']] as const) {
  const x = s * (L + 12);
  for (const y of [W - 70, W - 20]) {
    p.part(`ladder-rail-${tag}-${y}`, b(x, y, 220, 10, 10, TOP - 220).color(galvanizedSteel));
  }
  for (const z of [280, 350, 420, 490]) {
    p.part(`ladder-rung-${tag}-${z}`, b(x, W - 45, z, 8, 56, 8).color(galvanizedSteel));
  }
}
p.part("brake-staff", b(-(L + 12), -70, 220, 10, 10, 280).color(railSteel));
p.part("brake-wheel", cX(-(L + 22), -70, 500, 8, 44, 16).color(railSteel));
p.part("brake-wheel-hub", cX(-(L + 26), -70, 500, 16, 10, 10).color(railSteel));

return p.model();
