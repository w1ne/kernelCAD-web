// SPDX-License-Identifier: CC0-1.0
// Turbine nacelle shell: the glass-fibre housing that sits on top of a wind
// turbine tower, shown on its road-transport frame. What makes it one: a long,
// streamlined cover with a rounded, sloping nose pierced by the main-shaft
// opening, a roof that falls away towards the front, bolted panel seams, a
// roof service hatch with handrails, side ventilation louvres and the rear
// roof cooler carrying the aviation lights.
// Stylized at the wind-energy kit's reduced scene scale (about 1.3 m long),
// millimetres, Z up, nose towards -X.
meta({
  name: "turbine-nacelle-shell",
  license: 'CC0-1.0',
  title: "Turbine nacelle shell",
  description: "Streamlined GRP nacelle cover on a transport frame: sloping rounded nose with main-shaft opening and bearing housing, bolted panel seams, roof service hatch with handrails, side ventilation louvres, rear roof cooler with fins and aviation lights, steel transport skids and saddles. Material controls: shell composite, frame and fittings steel, cooler aluminium, warning paint and transport-frame paint; weathered, highVisibility and darkGrey presets.",
  tags: ['wind', 'wind turbine', 'nacelle', 'housing', 'composite', 'transport', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const composite = param('composite', '#eef0ec', { label: 'Shell composite (GRP)' });
const fittings = param('fittings', '#4b5559', { label: 'Frame and fittings steel' });
const cooler = param('cooler', '#a9b1b4', { label: 'Cooler aluminium' });
const warningPaint = param('warningPaint', '#c9342c', { label: 'Warning paint (aviation lights)' });
const transportPaint = param('transportPaint', '#e2a823', { label: 'Transport frame paint' });

presets({
  weathered: { composite: '#d6d6cc', fittings: '#5b5f5c', cooler: '#8c9192', warningPaint: '#9d4a40', transportPaint: '#b58a3c' },
  highVisibility: { composite: '#ffffff', fittings: '#353c40', cooler: '#c3cacc', warningPaint: '#ef6a1c', transportPaint: '#f2c21b' },
  darkGrey: { composite: '#5d6467', cooler: '#7d8588' },
});

const p = assembly("turbine-nacelle-shell");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Side outline [[x, z], ...] extruded across Y, centred on y0.
const side = (pts, t, y0 = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2 + y0, 0);
// Front outline [[y, z], ...] extruded along X, centred on x0.
const front = (pts, t, x0 = 0) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0 - t / 2, 0, 0);
// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const rect = (x0, y0, x1, y1, h) => extrudePolygon([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], h);
const grow = (pts, d) => pts.map(([u, v]) => [u + Math.sign(u) * d, v + (v > z0 + 200 ? d : -d)]);

// ---- Shell: side profile intersected with the rounded cross-section ----
const z0 = 200;
const SIDE = [[-600, z0 + 70], [-530, z0], [600, z0], [650, z0 + 60], [660, z0 + 250], [630, z0 + 380], [-500, z0 + 420], [-615, z0 + 310]];
const FRONT = [[-230, z0], [230, z0], [235, z0 + 290], [175, z0 + 420], [-175, z0 + 420], [-235, z0 + 290]];
add('shell', side(SIDE, 480).intersect(front(FRONT, 1400)).color(composite));
// Bolted panel seams: thin flanged bands standing proud of the shell.
for (const x of [-230, 230]) add(`seam-${x}`, side(grow(SIDE, 8), 500).intersect(front(grow(FRONT, 8), 22, x)).color(composite));

// Nose: main-shaft opening with the bearing housing inside.
const nose = (shape) => shape.rotateY(-90).translate(-560, 0, z0 + 215);
add('shaft-opening-rim', nose(turned([[100, 0], [140, 0], [140, 70], [100, 70]])).color(fittings));
add('bearing-housing', nose(turned([[0, 0], [100, 0], [100, 40], [55, 55], [0, 55]])).color(fittings));

// Roof service hatch with two handrails.
add('roof-hatch', rect(160, -115, 400, 115, 30).translate(0, 0, z0 + 385).color(composite));
add('hatch-hinge', rect(160, -110, 176, 110, 40).translate(0, 0, z0 + 385).color(fittings));
for (const y of [-150, 150]) {
  add(`handrail-${y}`, rect(120, y - 6, 440, y + 6, 10).translate(0, 0, z0 + 470).color(transportPaint));
  for (const x of [130, 280, 430]) add(`handrail-post-${x}-${y}`, rect(x - 6, y - 6, x + 6, y + 6, 90).translate(0, 0, z0 + 385).color(transportPaint));
}

// Side ventilation louvres, both sides towards the rear.
for (const sy of [-1, 1]) {
  for (let i = 0; i < 5; i++) {
    add(`louvre-${sy}-${i}`, side([[300, 0], [520, 0], [520, 14], [300, 22]], 16, sy * 236).translate(0, 0, z0 + 110 + i * 34).color(fittings));
  }
}

// Rear roof cooler: two rails and fins, with the aviation lights on top.
for (const [za, zb] of [[z0 + 375, z0 + 392], [z0 + 545, z0 + 562]]) add(`cooler-rail-${za}`, rect(470, -170, 620, 170, zb - za).translate(0, 0, za).color(fittings));
for (let i = 0; i < 7; i++) add(`cooler-fin-${i}`, rect(480, -160 + i * 48, 610, -138 + i * 48, 155).translate(0, 0, z0 + 392).color(cooler));
for (const y of [-130, 130]) add(`aviation-light-${y}`, turned([[0, 0], [17, 0], [17, 22], [8, 34], [0, 34]]).translate(545, y, z0 + 562).color(warningPaint));

// ---- Transport frame: skids, cross-beams and saddles ----
for (const y of [-190, 190]) add(`skid-${y}`, rect(-640, y - 35, 680, y + 35, 60).color(transportPaint));
for (const x of [-380, 380]) {
  add(`cross-beam-${x}`, rect(x - 45, -260, x + 45, 260, 70).translate(0, 0, 60).color(transportPaint));
  add(`saddle-${x}`, rect(x - 55, -215, x + 55, 215, z0 - 130).translate(0, 0, 130).color(fittings));
}
for (const [x, y] of [[-620, -190], [-620, 190], [660, -190], [660, 190]]) add(`lifting-eye-${x}-${y}`, turned([[14, 0], [32, 0], [32, 10], [14, 10]]).rotateX(90).translate(x, y, 70).color(fittings));

return p.model();
