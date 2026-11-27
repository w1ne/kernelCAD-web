// Track maintenance railcar. What makes it a maintenance railcar and not a wagon:
// a short self-propelled two-axle chassis with a glazed driving cab at one end
// and an open working deck behind it. The cab has a windscreen, a rear window
// onto the deck, a side window and a door with a step on each side, and an
// amber beacon on the roof. The deck carries a tool cabinet, a folded jib crane
// on its rest and handrails on both sides and the far end. The two axles run in
// horn guides under the solebars, with a wheel on each rail and a final drive
// on one axle; buffers and a coupler hook sit on a buffer beam at each end.
// Stylised kit scale shared with the other railway cars. Millimetres, Z up,
// wheel flanges on z = 0.

meta({
  name: "maintenance-railcar",
  license: 'CC0-1.0',
  title: "Rail maintenance car",
  description: "Two-axle track maintenance railcar: a glazed driving cab with windscreen, rear and side windows, side doors with steps and a roof beacon; an open working deck with a tool cabinet, a folded jib crane and handrails; horn guides, a final drive, buffers and coupler hooks at each end, and wheels on both rails. Editable material controls: rail and running gear steel, high-visibility paint, painted steel, amber signal glass, glazing. Includes weathered and fresh service presets.",
  tags: ["maintenance railcar", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#3c4245', { label: 'Rail and running gear steel' });
const safetyPaint = param('safetyPaint', '#e7b735', { label: 'High-visibility paint' });
const paintedSteel = param('paintedSteel', '#53646c', { label: 'Painted steel' });
const signalAmberGlass = param('signalAmberGlass', '#efb438', { label: 'Amber signal glass' });
const glass = param('glass', '#54a6bb', { label: 'Glazing' });
presets({
  weathered: { railSteel: '#666a6a', safetyPaint: '#c7a13f', paintedSteel: '#5b6567', signalAmberGlass: '#d6a53f', glass: '#5a8f99' },
  freshService: { railSteel: '#56636a', safetyPaint: '#f5c521', paintedSteel: '#b74734', signalAmberGlass: '#ffc12f', glass: '#68b9ca' },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
// Cylinder with its axis along Y, centred on y.
const cY = (x: number, y: number, z: number, len: number, r: number, n = 14) => cylinder(len, r, n).rotateX(90).translate(x, y + len / 2, z).scale(scale);
// Cylinder with its axis along X, starting at x0 and running toward +X.
const cX = (x0: number, y: number, z: number, len: number, r: number, n = 14) => cylinder(len, r, n).rotateY(90).translate(x0, y, z).scale(scale);
// Upright cylinder standing on z.
const cZ = (x: number, y: number, z: number, h: number, r: number, n = 12) => cylinder(h, r, n).translate(x, y, z).scale(scale);
// Side-view (x, z) outline extruded across the car over `depth`, centred on y.
const sideProfile = (pts: Array<[number, number]>, y: number, depth: number) => {
  let pb = path().moveTo(pts[0]![0], pts[0]![1]);
  for (const [u, v] of pts.slice(1)) pb = pb.lineTo(u, v);
  return pb.close().extrude(depth).rotateX(90).translate(0, y + depth / 2, 0).scale(scale);
};

const L = 480;        // half length over the buffer beams
const W = 150;        // half width of the deck plate
const FRAME = 170;    // underside of the solebars and buffer beams
const DECK = 246;     // top of the deck plate
const AXLE_X = 300;   // axle distance from the car centre (600 mm wheelbase)
const GAUGE = 95;     // wheel centre line distance from the car centre line
const WHEEL_R = 78;   // flange radius; the tread is 8 mm smaller
const CAB_X0 = -470;  // cab front face (driving end)
const CAB_X1 = -170;  // cab rear face, onto the deck
const CAB_W = 140;    // half width of the cab
const CAB_TOP = 560;

const p = assembly("maintenance-railcar");

// ---- Frame: solebars, buffer beams, cross members, deck plate ----
for (const [s, tag] of [[-1, 'front'], [1, 'back']] as const) {
  p.part(`solebar-${tag}`, b(0, s * (GAUGE + 24), FRAME, 2 * L - 40, 16, 60).color(safetyPaint));
}
for (const x of [-120, 120]) {
  p.part(`cross-member-${x}`, b(x, 0, FRAME + 10, 30, 2 * (GAUGE + 16), 50).color(railSteel));
}
p.part("deck", b(0, 0, FRAME + 60, 2 * L - 20, 2 * W, DECK - FRAME - 60).color(railSteel));
p.part("deck-edge-front", b(80, -(W + 3), FRAME + 50, 2 * L - 180, 6, DECK - FRAME - 50).color(safetyPaint));
p.part("deck-edge-back", b(80, W + 3, FRAME + 50, 2 * L - 180, 6, DECK - FRAME - 50).color(safetyPaint));

// ---- Buffer beams with buffers and a coupler hook at each end ----
for (const [s, tag] of [[-1, 'a'], [1, 'b']] as const) {
  p.part(`buffer-beam-${tag}`, b(s * (L - 10), 0, FRAME, 20, 2 * W - 10, 70).color(safetyPaint));
  for (const [sy, side] of [[-1, 'front'], [1, 'back']] as const) {
    const y = sy * 100;
    p.part(`buffer-${tag}-${side}`, cX(s > 0 ? L : -L - 46, y, 205, 46, 13, 12).color(railSteel));
    p.part(`buffer-head-${tag}-${side}`, cX(s > 0 ? L + 46 : -L - 54, y, 205, 8, 26, 16).color(railSteel));
  }
  p.part(`coupler-hook-${tag}`, b(s * (L + 22), 0, 194, 44, 16, 22).color(railSteel));
}

// ---- Running gear: two axles in horn guides, a wheel and flange on each rail ----
for (const [s, tag] of [[-1, 'a'], [1, 'b']] as const) {
  const x = s * AXLE_X;
  p.part(`axle-${tag}`, cY(x, 0, WHEEL_R, 2 * GAUGE + 40, 12, 10).color(railSteel));
  for (const [sy, side] of [[-1, 'front'], [1, 'back']] as const) {
    const y = sy * (GAUGE + 24);
    p.part(`wheel-${tag}-${side}`, cY(x, sy * (GAUGE + 3), WHEEL_R, 12, WHEEL_R - 8).color(railSteel));
    p.part(`flange-${tag}-${side}`, cY(x, sy * (GAUGE - 6), WHEEL_R, 6, WHEEL_R).color(railSteel));
    p.part(`journal-box-${tag}-${side}`, b(x, y, WHEEL_R - 20, 44, 26, 40).color(railSteel));
    // Horn guide: a tapered plate hung from the solebar with an opening for the journal box.
    const horn: Array<[number, number]> = [
      [x - 70, FRAME], [x + 70, FRAME], [x + 40, 40], [x + 22, 40], [x + 22, 104],
      [x - 22, 104], [x - 22, 40], [x - 40, 40],
    ];
    p.part(`horn-guide-${tag}-${side}`, sideProfile(horn, y, 12).color(safetyPaint));
    p.part(`horn-keeper-${tag}-${side}`, b(x, y, 30, 84, 14, 10).color(railSteel));
  }
}
// Final drive gearbox on the deck-end axle, held by a torque arm under the deck.
p.part("final-drive", b(AXLE_X - 40, 0, 52, 70, 90, 56).color(paintedSteel));
p.part("final-drive-torque-arm", b(AXLE_X - 40, 0, 108, 16, 16, FRAME + 60 - 108).color(railSteel));

// ---- Driving cab: body, roof, windows, doors, steps, beacon ----
const cabLen = CAB_X1 - CAB_X0;
const cabMid = (CAB_X0 + CAB_X1) / 2;
p.part("cab", b(cabMid, 0, DECK, cabLen, 2 * CAB_W, CAB_TOP - DECK).color(safetyPaint));
p.part("cab-roof", b(cabMid, 0, CAB_TOP, cabLen + 30, 2 * CAB_W + 24, 22).color(paintedSteel));
p.part("cab-gutter", b(cabMid, 0, CAB_TOP + 22, cabLen - 20, 2 * CAB_W - 20, 10).color(paintedSteel));
p.part("windscreen", b(CAB_X0 - 1, 0, 400, 6, 220, 120).color(glass));
p.part("windscreen-pillar", b(CAB_X0 - 3, 0, 400, 6, 10, 120).color(safetyPaint));
p.part("rear-window", b(CAB_X1 + 1, 0, 410, 6, 180, 100).color(glass));
for (const [s, tag] of [[-1, 'front'], [1, 'back']] as const) {
  p.part(`side-window-${tag}`, b(-400, s * (CAB_W + 1), 410, 90, 6, 100).color(glass));
  p.part(`cab-door-${tag}`, b(-260, s * (CAB_W + 2), DECK + 8, 100, 6, CAB_TOP - DECK - 30).color(safetyPaint));
  p.part(`cab-door-window-${tag}`, b(-260, s * (CAB_W + 5), 420, 64, 4, 90).color(glass));
  p.part(`cab-door-handle-${tag}`, b(-226, s * (CAB_W + 8), 360, 20, 6, 8).color(railSteel));
  p.part(`cab-grab-rail-${tag}`, b(-196, s * (CAB_W + 10), DECK + 20, 6, 6, 240).color(railSteel));
  p.part(`cab-step-${tag}`, b(-260, s * (W + 4), FRAME - 50, 100, 30, 8).color(railSteel));
  for (const dx of [-44, 44]) {
    p.part(`cab-step-hanger-${tag}-${dx}`, b(-260 + dx, s * (W - 4), FRAME - 42, 6, 6, 42 + 60).color(railSteel));
  }
}
p.part("beacon-base", cZ(cabMid, 0, CAB_TOP + 32, 12, 30).color(railSteel));
p.part("beacon", cZ(cabMid, 0, CAB_TOP + 44, 44, 24, 14).color(signalAmberGlass));
p.part("beacon-cap", cZ(cabMid, 0, CAB_TOP + 88, 6, 26, 14).color(railSteel));
for (const [sy, side] of [[-1, 'front'], [1, 'back']] as const) {
  p.part(`headlight-${side}`, cX(CAB_X0 - 14, sy * 100, 300, 14, 18, 12).color(glass));
}

// ---- Working deck: tool cabinet, folded jib crane, handrails ----
p.part("tool-cabinet", b(220, -50, DECK, 220, 170, 190).color(paintedSteel));
p.part("tool-cabinet-door-seam", b(220, 37, DECK + 10, 4, 4, 170).color(railSteel));
for (const dx of [-14, 14]) {
  p.part(`tool-cabinet-handle-${dx}`, b(220 + dx, 39, DECK + 100, 6, 6, 30).color(railSteel));
}
p.part("crane-pedestal", cZ(400, 70, DECK, 200, 26, 14).color(safetyPaint));
p.part("crane-slew-ring", cZ(400, 70, DECK + 200, 14, 34, 14).color(railSteel));
p.part("crane-boom", b(275, 70, DECK + 214, 280, 34, 34).color(safetyPaint));
p.part("crane-boom-rest", b(200, 70, DECK, 24, 34, 214).color(safetyPaint));
p.part("crane-hook-block", b(150, 70, DECK + 180, 20, 20, 34).color(railSteel));
p.part("crane-ram", cX(300, 70, DECK + 205, 100, 9, 10).color(railSteel));
const RAIL_TOP = DECK + 260;
for (const [s, tag] of [[-1, 'front'], [1, 'back']] as const) {
  const y = s * (W - 8);
  for (const x of [-130, 50, 250, 450]) {
    p.part(`handrail-post-${tag}-${x}`, cZ(x, y, DECK, RAIL_TOP - DECK, 6, 8).color(safetyPaint));
  }
  p.part(`handrail-top-${tag}`, cX(CAB_X1, y, RAIL_TOP, 450 - CAB_X1, 6, 8).color(safetyPaint));
  p.part(`handrail-mid-${tag}`, cX(CAB_X1, y, DECK + 130, 450 - CAB_X1, 5, 8).color(safetyPaint));
}
p.part("end-rail-top", cY(450, 0, RAIL_TOP, 2 * (W - 8), 6, 8).color(safetyPaint));
p.part("end-rail-mid", cY(450, 0, DECK + 130, 2 * (W - 8), 5, 8).color(safetyPaint));

return p.model();
