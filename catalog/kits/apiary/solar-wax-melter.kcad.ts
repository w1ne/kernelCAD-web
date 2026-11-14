// SPDX-License-Identifier: CC0-1.0
// Solar wax melter: a glazed, insulated box a beekeeper leaves in the sun to
// melt old comb and cappings into clean beeswax.
// What makes it a solar wax melter rather than a crate: a wedge-shaped body
// whose top slopes down toward the front so the glass faces the sun, thick
// insulated walls with a black-painted interior, a hinged double-glazed lid
// propped open on its back hinge, a stainless tray tilted toward the front
// carrying lumps of dark old comb, a mesh strainer at the low end of the tray,
// and a stainless pan underneath it where the clean yellow wax sets into a
// block. The box stands on four legs.
// Generic visualization geometry at real size (600 x 450 mm box), millimetres,
// Z up, ground on z = 0, sloping glass facing -Y.

meta({
  name: "solar-wax-melter",
  license: 'CC0-1.0',
  title: "Solar wax melter",
  description: "Solar beeswax melter: wedge-shaped insulated timber box with sloped glass facing the sun, black-painted interior, hinged double-glazed lid propped open, tilted stainless tray carrying dark old comb, mesh strainer at the low end and a stainless collecting pan with a set yellow wax block, on four legs. Material controls: box timber, lid glass, interior black paint, stainless tray and pan, beeswax. Lid open/closed choice; freshApiary and weatheredYard presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'beeswax', 'wax melter', 'solar', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const lid = param('lid', 'open', { choices: ['open', 'closed'], label: 'Glazed lid' });

const timber = param('timber', '#b8874a', { label: 'Box, lid frame and legs (timber)' });
const glass = param('glass', '#9ac1bd', { label: 'Lid glazing (glass)' });
const liner = param('liner', '#1f2224', { label: 'Interior (black heat-absorbing paint)' });
const stainless = param('stainless', '#b9c2c0', { label: 'Tray, strainer and pan (stainless steel)' });
const wax = param('wax', '#e8c95f', { label: 'Melted beeswax' });

presets({
  freshApiary: { timber: '#d4a462', glass: '#c9dfd8', liner: '#25292b', stainless: '#dfe5e2', wax: '#f1df9d' },
  weatheredYard: { timber: '#68543d', glass: '#6e9392', liner: '#2e2a26', stainless: '#8f9895', wax: '#bc9344' },
});

const p = assembly("solar-wax-melter");
const add = (name, shape) => p.part(name, shape.scale(scale));
const b = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);
// Extrude a (y, z) profile along X, centred on x = 0.
const alongX = (pts, len) => extrudePolygon(pts, len).rotateX(90).rotateZ(90).translate(-len / 2, 0, 0);

const W = 600; // across (X)
const D = 450; // front to back (Y)
const ZB = 300; // underside of the box
const HF = 150; // front wall height
const HR = 300; // back wall height
const T = 25; // insulated wall thickness
const tilt = (Math.atan((HR - HF) / D) * 180) / Math.PI;

// Legs.
for (const x of [-W / 2 + 40, W / 2 - 40]) {
  for (const y of [-D / 2 + 40, D / 2 - 40]) add(`leg-${x}-${y}`, b(x, y, 0, 50, 50, ZB).color(timber));
}

// Wedge-shaped insulated body, hollow, with a black interior lining.
const outer = alongX([[-D / 2, ZB], [D / 2, ZB], [D / 2, ZB + HR], [-D / 2, ZB + HF]], W);
const inner = alongX([[-D / 2 + T, ZB + T], [D / 2 - T, ZB + T], [D / 2 - T, ZB + HR + 50], [-D / 2 + T, ZB + HR + 50]], W - 2 * T);
add('body', outer.subtract(inner).color(timber));
add('liner-floor', b(0, 0, ZB + T, W - 2 * T, D - 2 * T, 4).color(liner));
add('liner-back', b(0, D / 2 - T - 2, ZB + T, W - 2 * T, 4, HR - T - 4).color(liner));
for (const sx of [-1, 1]) {
  add(`liner-side-${sx}`, alongX([[-D / 2 + T, ZB + T], [D / 2 - T, ZB + T], [D / 2 - T, ZB + HR - 6], [-D / 2 + T, ZB + HF - 6]], 4).translate(sx * (W / 2 - T - 2), 0, 0).color(liner));
}

// Collecting pan on the floor at the front with a set wax block in it.
const panY = -D / 2 + T + 70;
let pan = b(0, panY, ZB + T + 4, 300, 120, 55);
pan = pan.subtract(b(0, panY, ZB + T + 8, 290, 110, 60));
add('wax-pan', pan.color(stainless));
add('wax-block', b(0, panY, ZB + T + 8, 290, 110, 34).color(wax));

// Tilted melting tray above the pan, sloping down to the front, with a mesh
// strainer at its low end and lumps of old dark comb on it.
const trayDepth = 250;
const trayRise = 12;
const tray = b(0, 0, -3, W - 2 * T - 20, trayDepth, 6)
  .union(b(0, trayDepth / 2 - 4, 0, W - 2 * T - 20, 8, 40))
  .union(b(-(W - 2 * T - 20) / 2 + 4, 0, 0, 8, trayDepth, 40))
  .union(b((W - 2 * T - 20) / 2 - 4, 0, 0, 8, trayDepth, 40));
const onTray = (shape) => shape.rotateX(trayRise).translate(0, 85, ZB + 160);
add('tray', onTray(tray).color(stainless));
add('strainer', onTray(b(0, -trayDepth / 2 - 15, -2, W - 2 * T - 40, 30, 4)).color('#4d5254'));
const lumps = [[-160, 50, 0], [-60, 80, 20], [70, 30, -15], [170, 70, 35], [-110, -30, 50], [30, -55, 10], [140, -20, -30]];
lumps.forEach(([x, y, yaw], i) => {
  add(`old-comb-${i + 1}`, onTray(box(80, 55, 26, true).rotateZ(yaw).translate(x, y, 13)).color('#5c3d1e'));
});
add('wax-drip', onTray(b(0, -trayDepth / 2 - 15, -40, 120, 10, 38)).color(wax));

// Double-glazed lid in a timber frame, hinged along the high back edge.
const LL = Math.hypot(D, HR - HF) + 20;
let frame = b(0, -LL / 2, 0, W + 20, LL, 40);
frame = frame.subtract(b(0, -LL / 2, -5, W - 60, LL - 80, 60));
const lidShape = (angle) => (s) => s.rotateX(angle).translate(0, D / 2 + 10, ZB + HR);
const swing = lidShape(lid.value === 'open' ? -100 : tilt);
add('lid-frame', swing(frame).color(timber));
add('lid-glass-outer', swing(b(0, -LL / 2, 28, W - 50, LL - 70, 6)).color(glass));
add('lid-glass-inner', swing(b(0, -LL / 2, 10, W - 50, LL - 70, 6)).color(glass));
for (const x of [-W / 2 + 60, W / 2 - 60]) {
  add(`hinge-${x}`, cylinder(70, 9, 10).rotateY(90).translate(x - 35, D / 2 + 10, ZB + HR).color(stainless));
}

return p.model();
