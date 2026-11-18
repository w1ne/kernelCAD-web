// SPDX-License-Identifier: CC0-1.0
// Laminar-flow clean bench on an open tubular stand.
// What makes it a clean bench rather than a fume hood: the air comes out of
// a white HEPA diffuser (the whole rear wall for horizontal flow, the
// chamber ceiling for vertical flow) towards the user, so the chamber has
// clear acrylic side panels instead of solid cheeks, a low stainless work
// tray, a blower housing on top with a slatted prefilter grille, a sloped
// switch panel, and the whole cabinet sits on a four-leg stand with
// levelling feet. Generic visualization geometry at real size (1.3 m wide,
// 1.9 m tall), millimetres, Z up, user on the -Y side, feet on z = 0.
meta({
  name: 'laminar-flow-workbench',
  license: 'CC0-1.0',
  title: 'Laminar-flow workbench enclosure',
  description: 'Laminar-flow clean bench: white HEPA diffuser rear wall (horizontal flow) or ceiling (vertical flow with front sash), clear acrylic side panels, stainless work tray, blower housing with slatted prefilter grille, sloped switch panel with light and UV switches, four-leg tubular stand with levelling feet. Material controls: cabinet enamel, acrylic panels, HEPA diffuser, stainless tray and stand, polymer switches. Horizontal or vertical flow; cleanroom, high-visibility and pharma presets.',
  tags: ['laminar flow', 'clean bench', 'HEPA', 'flow hood', 'laboratory', 'lab infrastructure', 'research facility', 'cleanroom', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const flow = param('flow', 'horizontal', { choices: ['horizontal', 'vertical'], label: 'Airflow direction' });
const enamel = param('enamel', '#c9dedc', { label: 'Cabinet enamel' });
const glass = param('glass', '#55b7ca', { label: 'Acrylic side and sash panels' });
const filter = param('filter', '#f1f3ef', { label: 'HEPA diffuser face' });
const stainless = param('stainless', '#b8c7ca', { label: 'Work tray, grille and stand stainless' });
const polymer = param('polymer', '#e5a331', { label: 'Switch panel polymer' });
presets({
  cleanroom: { enamel: '#e7f0ed', glass: '#8bd4dc', filter: '#ffffff', stainless: '#d0d9d8', polymer: '#23a5a2' },
  highVisibility: { enamel: '#f0f2e8', glass: '#44d3e2', filter: '#f4f4ee', stainless: '#6f8488', polymer: '#ffe000' },
  pharma: { enamel: '#dfe6ec', glass: '#9cc7dc', filter: '#eef2f5', stainless: '#aab6bd', polymer: '#2f6fa8' },
});

const p = assembly('laminar-flow-workbench');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Solid from a (y, z) side profile, `t` thick and centred on x = 0.
const sideProfile = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1300;
const D = 800;
const FRONT = -D / 2;
const ZS = 750;
const ZW = ZS + 60;
const ZC = 1480;
const TOP = 1880;
const vertical = flow.value === 'vertical';

// Four-leg tubular stand with cross rails and levelling feet.
for (const [i, [x, y]] of [[-1, -1], [1, -1], [-1, 1], [1, 1]].entries()) {
  const lx = x * (W / 2 - 60);
  const ly = y * (D / 2 - 60);
  add(`stand-leg-${i}`, box(50, 50, ZS - 40, true).translate(lx, ly, 40 + (ZS - 40) / 2).color(stainless));
  add(`levelling-foot-${i}`, turned([[0, 0], [35, 0], [35, 10], [10, 18], [10, 40], [0, 40]]).translate(lx, ly, 0).color(polymer));
}
for (const y of [-1, 1]) add(`rail-x-${y}`, box(W - 170, 40, 40, true).translate(0, y * (D / 2 - 60), 220).color(stainless));
for (const x of [-1, 1]) add(`rail-y-${x}`, box(40, D - 170, 40, true).translate(x * (W / 2 - 60), 0, 220).color(stainless));
add('stand-top-frame', box(W - 60, D - 60, 40, true).translate(0, 0, ZS - 20).color(stainless));

// Cabinet base below the work tray, and the stainless tray with a front lip.
add('cabinet-base', box(W, D, ZW - ZS, true).translate(0, 0, (ZS + ZW) / 2).color(enamel));
add('work-tray', box(W - 80, D - 120, 12, true).translate(0, -20, ZW + 6).color(stainless));
add('tray-lip', sideProfile([[FRONT, ZW], [FRONT + 60, ZW], [FRONT + 60, ZW + 14], [FRONT + 20, ZW + 26], [FRONT, ZW + 20]], W - 60).color(stainless));

// Chamber: corner posts, clear acrylic sides, back and ceiling.
for (const s of [-1, 1]) {
  add(`front-post-${s}`, box(40, 40, ZC - ZW, true).translate(s * (W / 2 - 20), FRONT + 20, (ZW + ZC) / 2).color(enamel));
  add(`side-panel-${s}`, box(12, D - 120, ZC - ZW - 20, true).translate(s * (W / 2 - 16), 20, (ZW + ZC) / 2).color(glass));
}
add('back-wall', box(W, 60, ZC - ZW, true).translate(0, D / 2 - 30, (ZW + ZC) / 2).color(enamel));
if (vertical) {
  // Ceiling diffuser blowing down, and a fixed front sash.
  add('ceiling-diffuser', box(W - 120, D - 160, 16, true).translate(0, 20, ZC - 8).color(filter));
  for (let i = 1; i < 6; i += 1) add(`diffuser-mullion-${i}`, box(10, D - 160, 4, true).translate(-W / 2 + 60 + (i * (W - 120)) / 6, 20, ZC - 18).color(stainless));
  add('front-sash', sideProfile([[FRONT - 2, ZC - 360], [FRONT + 10, ZC - 360], [FRONT + 10, ZC], [FRONT - 2, ZC]], W - 80).color(glass));
  add('sash-rail', box(W - 80, 30, 30, true).translate(0, FRONT + 4, ZC - 375).color(stainless));
} else {
  // Rear HEPA diffuser blowing towards the user, divided by mullions.
  add('rear-diffuser', box(W - 120, 16, ZC - ZW - 60, true).translate(0, D / 2 - 68, (ZW + ZC) / 2).color(filter));
  for (let i = 1; i < 4; i += 1) add(`diffuser-mullion-${i}`, box(10, 4, ZC - ZW - 60, true).translate(-W / 2 + 60 + (i * (W - 120)) / 4, D / 2 - 78, (ZW + ZC) / 2).color(stainless));
  add('diffuser-transom', box(W - 120, 4, 10, true).translate(0, D / 2 - 78, (ZW + ZC) / 2).color(stainless));
  add('ceiling-panel', box(W - 40, D - 40, 30, true).translate(0, 0, ZC - 15).color(enamel));
}
add('light-lens', box(W - 400, 120, 10, true).translate(0, FRONT + 120, ZC - (vertical ? 30 : 35)).color(filter));

// Blower housing with a sloped switch panel and a slatted prefilter grille on top.
add('blower-housing', sideProfile([[FRONT, ZC], [D / 2, ZC], [D / 2, TOP], [FRONT + 160, TOP], [FRONT, ZC + 180]], W).color(enamel));
add('switch-panel', sideProfile([[FRONT - 4, ZC + 40], [FRONT - 4, ZC + 150], [FRONT + 50, ZC + 230], [FRONT + 50, ZC + 120]], W - 300).color(polymer));
for (const [i, x] of [-300, -150, 0, 150].entries()) {
  add(`switch-${i}`, box(40, 20, 50, true).rotateX(-34).translate(x, FRONT + 3, ZC + 175).color(i === 3 ? stainless : enamel));
}
add('display-window', box(150, 8, 70, true).rotateX(-34).translate(320, FRONT + 3, ZC + 175).color(glass));
add('prefilter-frame', box(W - 300, D - 340, 20, true).translate(0, 110, TOP + 10).color(stainless));
for (let i = 0; i < 9; i += 1) {
  add(`prefilter-slat-${i}`, box(W - 340, 14, 16, true).translate(0, 110 - (D - 380) / 2 + (i * (D - 380)) / 8, TOP + 28).color(enamel));
}

return p.model();
