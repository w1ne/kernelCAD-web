// Enclosed freight boxcar. What makes it a boxcar and not a van or a coach: a
// tall closed body with exterior side posts, a shallow arched roof with
// transverse ribs, and a wide sliding door on each side that hangs from a top
// track and runs in a bottom track. The body sits on a centre sill and side
// sills over two freight bogies with a wheel pair on each rail, with couplers
// at sill height, side and end ladders over sill steps and a hand brake wheel.
// Stylised kit scale shared with the other railway wagons. Millimetres, Z up,
// wheel flanges on z = 0.

meta({
  name: "freight-boxcar",
  license: 'CC0-1.0',
  title: "Freight boxcar",
  description: "Enclosed freight boxcar: painted body with exterior side posts, an arched roof with ribs, a sliding door on each side in galvanized top and bottom tracks, centre and side sills, two freight bogies with wheels on both rails, couplers at sill height, side and end ladders over sill steps and a hand brake wheel. Editable material controls: rail and running gear steel, painted steel, galvanized steel. Includes weathered and fresh service presets.",
  tags: ["freight boxcar", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#3c4245', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#6c4a36', { label: 'Painted steel' });
const galvanizedSteel = param('galvanizedSteel', '#a3acae', { label: 'Galvanized steel' });
presets({
  weathered: { railSteel: '#666a6a', paintedSteel: '#6d6354', galvanizedSteel: '#898e8d' },
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
// End-view (y, z) outline extruded along the car over `len`, starting at x0.
const endProfile = (pts: Array<[number, number]>, x0: number, len: number) => {
  let pb = path().moveTo(-pts[0]![1], pts[0]![0]);
  for (const [y, z] of pts.slice(1)) pb = pb.lineTo(-z, y);
  return pb.close().extrude(len).rotateY(90).translate(x0, 0, 0).scale(scale);
};

const L = 700;        // half length of the body over the end sheets
const W = 155;        // half width of the body (outer face of the side sheets)
const FLOOR = 230;    // underside of the body, top of the sills
const EAVE = 640;     // top of the side sheets
const BOGIE = 500;    // bogie centre distance from the car centre
const GAUGE = 95;     // wheel centre line distance from the car centre line
const WHEEL_R = 78;   // flange radius; the tread is 8 mm smaller

// Arched roof cross-section: rise of 36 mm over the eaves, 10 mm overhang each side.
const roofArch = (lift: number, thick: number, half: number) => {
  const ys = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1].map((t) => t * half);
  const top = ys.map((y) => [y, EAVE + lift + 36 * (1 - (y / (W + 10)) ** 2)] as [number, number]);
  const under = top.map(([y, z]) => [y, z - thick] as [number, number]).reverse();
  return [...top, ...under];
};

const p = assembly("freight-boxcar");

// ---- Body: side and end sheets, exterior posts, arched roof with ribs ----
p.part("box-body", b(0, 0, FLOOR, 2 * L, 2 * W, EAVE - FLOOR).color(paintedSteel));
p.part("roof", endProfile(roofArch(14, 18, W + 10), -L - 10, 2 * L + 20).color(paintedSteel));
for (const x of [-560, -400, -240, 240, 400, 560]) {
  p.part(`roof-rib-${x}`, endProfile(roofArch(20, 10, W + 6), x - 8, 16).color(paintedSteel));
}
for (const [s, tag] of [[-1, 'front'], [1, 'back']] as const) {
  for (const x of [-640, -520, -400, -280, 280, 400, 520, 640]) {
    p.part(`side-post-${tag}-${x}`, b(x, s * (W + 5), FLOOR, 16, 10, EAVE - FLOOR).color(paintedSteel));
  }
  // Belt rail along the top of the side sheet ties the posts together.
  p.part(`side-plate-${tag}`, b(0, s * (W + 6), EAVE - 16, 2 * L, 12, 16).color(paintedSteel));
}
// Horizontal end ribs over each end sheet.
for (const [s, tag] of [[-1, 'a'], [1, 'b']] as const) {
  for (const z of [330, 440, 550]) {
    p.part(`end-rib-${tag}-${z}`, b(s * (L + 5), 0, z, 10, 2 * W - 20, 18).color(paintedSteel));
  }
}

// ---- Sliding doors: one per side, hung from a top track, guided by a bottom track ----
// Each door stands off the posts; both tracks run past the door toward +X so it can open.
const DOOR_W = 360;
for (const [s, tag] of [[-1, 'front'], [1, 'back']] as const) {
  const y = s * (W + 16);
  p.part(`sliding-door-${tag}`, b(0, y, FLOOR + 10, DOOR_W, 10, EAVE - FLOOR - 40).color(paintedSteel));
  for (const dz of [90, 200, 310]) {
    p.part(`door-panel-rib-${tag}-${dz}`, b(0, s * (W + 23), FLOOR + dz, DOOR_W - 20, 4, 10).color(paintedSteel));
  }
  p.part(`door-latch-bar-${tag}`, b(-DOOR_W / 2 + 30, s * (W + 25), FLOOR + 40, 10, 6, 280).color(galvanizedSteel));
  p.part(`door-track-top-${tag}`, b(200, s * (W + 20), EAVE - 30, 2 * DOOR_W + 80, 16, 14).color(galvanizedSteel));
  p.part(`door-track-bottom-${tag}`, b(200, s * (W + 20), FLOOR - 4, 2 * DOOR_W + 80, 16, 14).color(galvanizedSteel));
  p.part(`door-stop-${tag}`, b(200 + DOOR_W + 40, s * (W + 16), FLOOR + 10, 14, 20, 40).color(galvanizedSteel));
}

// ---- Underframe: centre sill, side sills, body bolsters, end sills, couplers ----
p.part("centre-sill", b(0, 0, 170, 2 * L + 20, 70, FLOOR - 170).color(railSteel));
for (const [s, tag] of [[-1, 'front'], [1, 'back']] as const) {
  p.part(`side-sill-${tag}`, b(0, s * (W - 4), 198, 2 * L, 16, FLOOR - 198).color(railSteel));
}
for (const [s, tag] of [[-1, 'a'], [1, 'b']] as const) {
  p.part(`body-bolster-${tag}`, b(s * BOGIE, 0, 140, 70, 2 * W, FLOOR - 140).color(railSteel));
  p.part(`end-sill-${tag}`, b(s * (L + 10), 0, 170, 20, 2 * W, FLOOR - 170).color(railSteel));
  p.part(`coupler-shank-${tag}`, b(s * (L + 50), 0, 182, 60, 30, 26).color(railSteel));
  p.part(`coupler-knuckle-${tag}`, b(s * (L + 95), 0, 170, 30, 64, 50).color(railSteel));
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

// ---- Ladders and sill steps: a side ladder at diagonally opposite corners, an end ladder at each end ----
const RUNGS = [300, 380, 460, 540];
for (const [s, tag] of [[-1, 'front'], [1, 'back']] as const) {
  // The front side carries its ladder at the b end, the back side at the a end.
  const xc = -s * (L - 50);
  for (const dx of [-28, 28]) {
    p.part(`side-ladder-rail-${tag}-${dx}`, b(xc + dx, s * (W + 14), FLOOR + 20, 8, 8, EAVE - FLOOR - 40).color(galvanizedSteel));
  }
  for (const z of RUNGS) {
    p.part(`side-ladder-rung-${tag}-${z}`, b(xc, s * (W + 14), z, 64, 6, 6).color(galvanizedSteel));
  }
  p.part(`sill-step-${tag}`, b(xc, s * (W + 14), 160, 64, 20, 6).color(galvanizedSteel));
  for (const dx of [-28, 28]) {
    p.part(`sill-step-hanger-${tag}-${dx}`, b(xc + dx, s * (W + 14), 166, 6, 6, FLOOR - 166).color(galvanizedSteel));
  }
}
for (const [s, tag] of [[-1, 'a'], [1, 'b']] as const) {
  const x = s * (L + 18);
  // End ladder on the corner opposite the side ladder at the same end.
  const yc = -s * (W - 45);
  for (const dy of [-28, 28]) {
    p.part(`end-ladder-rail-${tag}-${dy}`, b(x, yc + dy, FLOOR + 20, 8, 8, EAVE - FLOOR - 40).color(galvanizedSteel));
  }
  for (const z of RUNGS) {
    p.part(`end-ladder-rung-${tag}-${z}`, b(x, yc, z, 6, 64, 6).color(galvanizedSteel));
  }
}
p.part("brake-staff", b(-(L + 18), -70, FLOOR + 20, 10, 10, 330).color(railSteel));
p.part("brake-wheel", cX(-(L + 32), -70, 560, 8, 44, 16).color(railSteel));
p.part("brake-wheel-hub", cX(-(L + 36), -70, 560, 16, 10, 10).color(railSteel));

return p.model();
