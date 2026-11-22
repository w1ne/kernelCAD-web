// SPDX-License-Identifier: CC0-1.0
// Turnout gear extractor: the front-loading washer-extractor a station uses
// to launder contaminated bunker gear on a gentle, low-temperature program.
// What makes it one: a stainless cabinet on a raised, bolted-down base
// frame, a large round porthole door with a domed glass bowl, a heavy hinge
// and a lever latch, a sloped programmable control console across the top
// front with a display and emergency stop, the chemical-injection manifold
// and hose bundle at the back of the top, and a big drain valve housing at
// the bottom. Millimetres, Z up, base origin, the door faces -Y.
meta({
  name: "turnout-gear-extractor",
  license: 'CC0-1.0',
  title: "Turnout gear extractor",
  description: "Front-loading washer-extractor for turnout gear: stainless cabinet with painted side panels on a raised bolted base frame, round porthole door with domed glass bowl, hinge block and lever latch, sloped control console with display, keypad and emergency stop, chemical-injection manifold with supply hoses, water inlet valves and a drain valve housing. Material controls: stainless shell, painted panels and console, door glass and hoses/seals; apparatus-red, clean-zone and weathered presets.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "CC0", "turnout", "gear", "extractor", "washer", "laundry", "decontamination"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 6000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shell = param('shell', '#c3c9cc', { label: 'Stainless cabinet and door ring' });
const panels = param('panels', '#b83d34', { label: 'Painted side panels and console' });
const glass = param('glass', '#7fa6b8', { label: 'Door glass bowl' });
const rubber = param('rubber', '#252a2d', { label: 'Seals, feet and hoses' });

presets({
  'apparatus-red': { panels: '#b83d34' },
  'clean-zone': { panels: '#4e8c87', shell: '#d0d8db' },
  weathered: { shell: '#9ea4a4', panels: '#7d3a33', glass: '#6c858c', rubber: '#34383a' },
});

const p = assembly("turnout-gear-extractor");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const ring = (r0, r1, z0, z1) => turned([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);
const rod = (r, z0, z1) => turned([[0, z0], [r, z0], [r, z1], [0, z1]]);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Cross-section [[y, z], ...] extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Turned parts with the axis along +X, and facing out of the -Y front.
const alongX = (shape) => shape.rotateY(90);
const facingFront = (shape) => shape.rotateX(90);

// Fixed trade colours: display glass, the red E-stop on its yellow collar.
const display = '#1c3a4a', estopRed = '#c92a2a', estopYellow = '#e9c21f';

const W = 430, D = 430; // half width (X), half depth (Y)
const baseTop = 200, top = 1320;

// ---- Raised base frame, anchor feet and drain valve housing ----
add('base-frame', blk(-W - 20, -D - 10, 60, W + 20, D + 10, baseTop).color(panels));
add('base-kick', blk(-W + 30, -D - 16, 80, W - 30, -D - 10, baseTop - 20).color(rubber));
for (const x of [-W + 10, W - 10]) {
  for (const y of [-D + 10, D - 10]) {
    add(`foot-${x}-${y}`, turned([[0, 0], [60, 0], [45, 60], [0, 60]]).translate(x, y, 0).color(rubber));
  }
}
add('drain-housing', facingFront(turned([[0, 0], [90, 0], [90, 60], [70, 90], [0, 90]])).translate(-W + 170, -D - 10, 130).color(shell));

// ---- Cabinet: stainless front and top, painted sides ----
add('cabinet', blk(-W, -D, baseTop, W, D, top).color(shell));
for (const x of [-W - 8, W]) add(`side-panel-${x}`, blk(x, -D + 30, baseTop + 30, x + 8, D - 30, top - 30).color(panels));
add('top-cap', blk(-W - 10, -D + 120, top, W + 10, D + 10, top + 20).color(shell));

// ---- Porthole door: stainless ring, domed glass bowl, hinge and latch ----
const dz = 700, dx = -20;
add('door-gasket', facingFront(ring(250, 300, 0, 14)).translate(dx, -D, dz).color(rubber));
add('door-ring', facingFront(turned([[230, 14], [330, 14], [330, 44], [300, 74], [230, 74]])).translate(dx, -D, dz).color(shell));
add('door-glass', facingFront(turned([[0, 30], [235, 30], [235, 50], [200, 90], [120, 112], [0, 120]])).translate(dx, -D, dz).color(glass));
add('hinge-block', blk(dx - 400, -D - 70, dz - 150, dx - 300, -D, dz + 150).color(shell));
for (const z of [dz - 110, dz + 110]) add(`hinge-pin-${z}`, rod(22, z - 30, z + 30).translate(dx - 380, -D - 50, 0).color(rubber));
add('latch-body', blk(dx + 300, -D - 80, dz - 60, dx + 360, -D - 30, dz + 60).color(shell));
add('latch-lever', blk(dx + 330, -D - 110, dz - 170, dx + 365, -D - 80, dz + 20).color(rubber));
add('soap-drawer', blk(W - 230, -D - 6, top - 330, W - 50, -D, top - 230).color(panels));

// ---- Sloped control console across the top front ----
add('console', prismX([[-D - 60, top - 200], [-D + 150, top - 200], [-D + 150, top + 120], [-D + 100, top + 120]], -W - 10, W + 10).color(panels));
// Place a front-facing control at fraction t up the 26.6 degree sloped face.
const onConsole = (shape, x, t) => shape.rotateX(-26.6).translate(x, -D - 74 + 160 * t, top - 195 + 320 * t);
add('display', onConsole(blk(-130, -8, -55, 130, 4, 55), -190, 0.55).color(display));
for (let i = 0; i < 6; i++) add(`key-${i}`, onConsole(blk(-22, -14, -16, 22, 4, 16), 40 + 60 * (i % 3), 0.35 + 0.3 * Math.floor(i / 3)).color(shell));
add('estop-collar', onConsole(facingFront(ring(0, 46, 0, 8)), 330, 0.5).color(estopYellow));
add('estop-button', onConsole(facingFront(turned([[0, 8], [34, 8], [34, 28], [26, 40], [0, 40]])), 330, 0.5).color(estopRed));

// ---- Chemical-injection manifold, supply hoses and water inlets ----
add('chem-manifold', blk(-W + 60, D - 120, top + 20, W - 60, D - 40, top + 110).color(panels));
for (let i = 0; i < 5; i++) {
  const x = -W + 120 + 150 * i;
  add(`chem-port-${i}`, rod(16, top + 110, top + 150).translate(x, D - 80, 0).color(shell));
  add(`chem-hose-${i}`, alongX(rod(14, 0, 240)).rotateZ(90).translate(x, D - 80, top + 150).color(rubber));
}
for (const [x, c] of [[-W + 90, '#c92a2a'], [-W + 210, '#2f6fbf']]) {
  add(`water-inlet-${x}`, alongX(rod(22, 0, 120)).rotateZ(90).translate(x, D, top - 160).color(shell));
  add(`water-valve-${x}`, blk(x - 40, D + 120, top - 200, x + 40, D + 180, top - 120).color(c));
}

return p.model();
