// Passenger dining car. What makes it a dining car and not a plain coach: a long
// saloon with large windows on both sides, and a galley at one end with small
// high windows, a stainless roof exhaust hood and two flue stacks above the
// stove. The body has an arched roof with stainless ventilators, belt and
// letterboard mouldings, a hinged entrance door on each side at the saloon end
// and a glazed end door at each end with stainless grab rails. It rides on two
// bogies with a wheel pair on each rail; the underframe carries a water
// tank and couplers at sill height. Stylised kit scale shared with the other
// railway cars. Millimetres, Z up, wheel flanges on z = 0.

meta({
  name: "dining-car",
  license: 'CC0-1.0',
  title: "Dining car",
  description: "Passenger dining car: saloon windows on both sides, a galley end with small high windows, a stainless roof exhaust hood and flue stacks, an arched roof with ventilators, a side entrance door on each side, a glazed end door at each end, a water tank, couplers at sill height and two bogies with wheels on both rails. Editable material controls: rail and running gear steel, painted steel, glazing, stainless steel. Includes weathered and fresh service presets.",
  tags: ["dining car", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#3c4245', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#8c7650', { label: 'Painted steel' });
const glass = param('glass', '#54a6bb', { label: 'Glazing' });
const stainlessSteel = param('stainlessSteel', '#b8c1c2', { label: 'Stainless steel' });
presets({
  weathered: { railSteel: '#666a6a', paintedSteel: '#847252', glass: '#5a99a7', stainlessSteel: '#a5a9a6' },
  freshService: { railSteel: '#56636a', paintedSteel: '#b74734', glass: '#68b9ca', stainlessSteel: '#cad2d1' },
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
// End-view (y, z) outline extruded along the car over `len`, starting at x0.
const endProfile = (pts: Array<[number, number]>, x0: number, len: number) => {
  let pb = path().moveTo(-pts[0]![1], pts[0]![0]);
  for (const [y, z] of pts.slice(1)) pb = pb.lineTo(-z, y);
  return pb.close().extrude(len).rotateY(90).translate(x0, 0, 0).scale(scale);
};

const L = 720;        // half length of the body over the end sheets
const W = 155;        // half width of the body (outer face of the side sheets)
const FLOOR = 230;    // underside of the body, top of the sills
const EAVE = 610;     // top of the side sheets
const BOGIE = 500;    // bogie centre distance from the car centre
const GAUGE = 95;     // wheel centre line distance from the car centre line
const WHEEL_R = 78;   // flange radius; the tread is 8 mm smaller

// Arched roof cross-section: rise of 40 mm over the eaves, 8 mm overhang each side.
const roofArch = (lift: number, thick: number, half: number) => {
  const ys = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1].map((t) => t * half);
  const top = ys.map((y) => [y, EAVE + lift + 40 * (1 - (y / (W + 8)) ** 2)] as [number, number]);
  const under = top.map(([y, z]) => [y, z - thick] as [number, number]).reverse();
  return [...top, ...under];
};
const ROOF_TOP = EAVE + 12 + 40;

const p = assembly("dining-car");

// ---- Body, arched roof, mouldings ----
p.part("body", b(0, 0, FLOOR, 2 * L, 2 * W, EAVE - FLOOR).color(paintedSteel));
p.part("roof", endProfile(roofArch(12, 18, W + 8), -L - 8, 2 * L + 16).color(paintedSteel));
for (const [s, tag] of [[-1, 'front'], [1, 'back']] as const) {
  p.part(`belt-moulding-${tag}`, b(0, s * (W + 2), 382, 2 * L - 40, 6, 10).color(stainlessSteel));
  p.part(`letterboard-moulding-${tag}`, b(0, s * (W + 2), 560, 2 * L - 40, 6, 8).color(stainlessSteel));
  p.part(`skirt-${tag}`, b(0, s * (W - 3), FLOOR - 34, 2 * L - 160, 6, 34).color(paintedSteel));
}

// ---- Saloon windows on both sides, small high galley windows on both sides ----
const SALOON_X = [-520, -380, -240, -100, 40, 180];
const GALLEY_X = [420, 560];
for (const [s, tag] of [[-1, 'front'], [1, 'back']] as const) {
  for (const x of SALOON_X) {
    p.part(`saloon-window-${tag}-${x}`, b(x, s * (W + 1), 398, 112, 6, 150).color(glass));
  }
  for (const x of GALLEY_X) {
    p.part(`galley-window-${tag}-${x}`, b(x, s * (W + 1), 470, 64, 6, 66).color(glass));
  }
}
// Galley roof: stainless exhaust hood over the stove and two flue stacks.
p.part("galley-vent", b(500, 0, ROOF_TOP - 6, 220, 140, 40).color(stainlessSteel));
p.part("galley-vent-cap", b(500, 0, ROOF_TOP + 34, 240, 160, 8).color(stainlessSteel));
for (const x of [360, 640]) {
  p.part(`galley-flue-${x}`, cZ(x, -50, ROOF_TOP - 6, 70, 14).color(stainlessSteel));
  p.part(`galley-flue-cap-${x}`, cZ(x, -50, ROOF_TOP + 64, 6, 22).color(stainlessSteel));
}
// Saloon roof ventilators along the ridge.
for (const x of [-560, -380, -200, -20, 160]) {
  p.part(`roof-ventilator-${x}`, cZ(x, 0, ROOF_TOP - 6, 26, 26).color(stainlessSteel));
}

// ---- Doors: a side entrance door on each side at the saloon end, a glazed end door at each end ----
for (const [s, tag] of [[-1, 'front'], [1, 'back']] as const) {
  const y = s * (W + 3);
  p.part(`side-door-${tag}`, b(-640, y, FLOOR + 8, 76, 6, 330).color(paintedSteel));
  p.part(`side-door-window-${tag}`, b(-640, s * (W + 6), 440, 44, 4, 90).color(glass));
  for (const dx of [-48, 48]) {
    p.part(`side-door-grab-${tag}-${dx}`, b(-640 + dx, s * (W + 8), FLOOR + 60, 6, 6, 260).color(stainlessSteel));
  }
  p.part(`side-door-step-${tag}`, b(-640, s * (W + 10), FLOOR - 70, 90, 30, 8).color(railSteel));
  for (const dx of [-42, 42]) {
    p.part(`side-door-step-hanger-${tag}-${dx}`, b(-640 + dx, s * (W + 10), FLOOR - 62, 6, 6, 62).color(railSteel));
  }
}
for (const [s, tag] of [[-1, 'a'], [1, 'b']] as const) {
  const x = s * (L + 3);
  p.part(`end-door-${tag}`, b(x, 0, FLOOR + 8, 6, 96, 350).color(paintedSteel));
  p.part(`end-door-window-${tag}`, b(s * (L + 6), 0, 450, 4, 56, 96).color(glass));
  for (const dy of [-70, 70]) {
    p.part(`end-grab-rail-${tag}-${dy}`, b(s * (L + 8), dy, FLOOR + 40, 6, 6, 300).color(stainlessSteel));
  }
}

// ---- Underframe: centre sill, side sills, bolsters, end sills, couplers, water tank ----
p.part("centre-sill", b(0, 0, 170, 2 * L + 20, 70, FLOOR - 170).color(railSteel));
for (const [s, tag] of [[-1, 'front'], [1, 'back']] as const) {
  p.part(`side-sill-${tag}`, b(0, s * (W - 16), 198, 2 * L, 16, FLOOR - 198).color(railSteel));
}
for (const [s, tag] of [[-1, 'a'], [1, 'b']] as const) {
  p.part(`body-bolster-${tag}`, b(s * BOGIE, 0, 140, 70, 2 * W - 20, FLOOR - 140).color(railSteel));
  p.part(`end-sill-${tag}`, b(s * (L + 10), 0, 170, 20, 2 * W - 20, FLOOR - 170).color(railSteel));
  p.part(`coupler-shank-${tag}`, b(s * (L + 50), 0, 182, 60, 30, 26).color(railSteel));
  p.part(`coupler-knuckle-${tag}`, b(s * (L + 95), 0, 170, 30, 64, 50).color(railSteel));
}
p.part("water-tank", cX(-260, 0, 168, 360, 56, 16).color(railSteel));
for (const x of [-200, 40]) {
  p.part(`water-tank-strap-${x}`, b(x, 0, 104, 14, 120, FLOOR - 104).color(railSteel));
}

// ---- Bogies: wheel pairs on both rails, axles, side frames, bolsters ----
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

return p.model();
