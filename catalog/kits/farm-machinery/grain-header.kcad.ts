// SPDX-License-Identifier: CC0-1.0
// Grain header: the auger platform a combine carries through wheat, barley or
// soybeans. What makes it one rather than a box: a full-width cutterbar with a
// row of pointed knife guards at the front lip, a pick-up reel above it (centre
// tube, six-armed spiders, bats carrying a comb of spring tines hanging down) on two
// support arms with lift cylinders, a shallow floor running back into a
// trough with a flighted cross auger and centre fingers, a tall back sheet
// with the feeder-house opening, end sheets ending in pointed crop dividers,
// and skid shoes it parks on. Generic visualization geometry at real size
// (a 25 ft platform is about 7.6 m wide), millimetres, Z up, cutterbar
// facing -Y, skids on z = 0.
meta({
  name: "grain-header",
  license: 'CC0-1.0',
  title: "Grain header",
  description: "Auger grain platform at real size: full-width cutterbar with pointed knife guards, pick-up reel with six-arm spiders, bats and spring tines on support arms with lift cylinders, floor and auger trough with a flighted cross auger and centre fingers, back sheet with feeder-house opening, end sheets with pointed crop dividers and skid shoes. Width choice 25 or 35 ft. Material controls: header paint, reel paint, knife steel and tines; harvestRed, fieldYellow and weathered presets.",
  tags: ['grain header', 'grain platform', 'combine header', 'reel', 'cutterbar', 'auger', 'farm machinery', 'agriculture', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 9000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const width = param('width', '25 ft', { choices: ['25 ft', '35 ft'], label: 'Platform width' });
const headerPaint = param('headerPaint', '#3d7a3a', { label: 'Header paint' });
const reelPaint = param('reelPaint', '#e0b22a', { label: 'Reel paint' });
const knifeSteel = param('knifeSteel', '#9aa3a6', { label: 'Knife, auger and shaft steel' });
const tineDark = param('tineDark', '#2b2e30', { label: 'Tines, openings and rubber' });
presets({
  harvestRed: { headerPaint: '#b52a22', reelPaint: '#b52a22', tineDark: '#262626' },
  fieldYellow: { headerPaint: '#e0a51c', reelPaint: '#2f3336', knifeSteel: '#a8aeb0' },
  weathered: { headerPaint: '#55684a', reelPaint: '#a99551', knifeSteel: '#7b8180', tineDark: '#3a3530' },
});

const p = assembly('grain-header');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
// Plate across X (thickness t, centred on x = 0) from a side profile in [y, z] points.
const sidePlate = (pts, t) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// Tube from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const W = width.value === '35 ft' ? 10670 : 7620;
const X0 = -W / 2;

// Platform: floor from the cutterbar lip back into the auger trough and up the back sheet.
const pan = [[-1000, 110], [-960, 135], [-420, 165], [-260, 190], [-100, 300], [-20, 1100], [40, 1100], [40, 280], [-150, 130], [-420, 100], [-1000, 85]];
add('platform-pan', alongX(pan, X0, W).color(headerPaint));
add('back-sheet-top-lip', alongX([[-20, 1100], [-140, 1130], [-140, 1160], [40, 1160], [40, 1100]], X0, W).color(headerPaint));
add('feeder-opening', box(1300, 12, 480, true).translate(0, 46, 560).color(tineDark));
add('feeder-flange', box(1420, 30, 40, true).translate(0, 55, 820).color(knifeSteel));

// Cutterbar with a row of pointed knife guards.
add('cutterbar', box(W - 40, 60, 30, true).translate(0, -1000, 100).color(knifeSteel));
const guards = Math.round(W / 230);
for (let i = 0; i < guards; i++) {
  const x = X0 + 120 + i * ((W - 240) / (guards - 1));
  add(`knife-guard-${i}`, sidePlate([[-1170, 98], [-1030, 88], [-1000, 112], [-1030, 122]], 36).translate(x, 0, 0).color(knifeSteel));
}

// End sheets with pointed crop dividers and skid shoes.
const skid = [[-900, 50], [-600, 0], [-120, 0], [-120, 80], [-900, 80]];
for (const s of [-1, 1]) {
  const k = s < 0 ? 'left' : 'right';
  const xe = s * (W / 2 + 7);
  add(`end-sheet-${k}`, sidePlate([[-1000, 85], [40, 85], [40, 1160], [-300, 1160], [-760, 640], [-1000, 260]], 14).translate(xe, 0, 0).color(headerPaint));
  add(`crop-divider-${k}`, sidePlate([[-1650, 140], [-1000, 85], [-1000, 260], [-1250, 210]], 60).translate(xe, 0, 0).color(headerPaint));
  add(`divider-rod-${k}`, rod([xe, -1640, 150], [xe - s * 120, -900, 520], 14, 6).color(knifeSteel));
  add(`skid-shoe-${k}`, sidePlate(skid, 120).translate(s * (W / 2 - 160), 0, 0).color(knifeSteel));
}
add('skid-shoe-centre', sidePlate(skid, 160).color(knifeSteel));

// Cross auger: tube with flighting rings and retracting fingers at the centre.
const YA = -270;
const ZA = 330;
add('cross-auger-tube', rod([X0 + 60, YA, ZA], [W / 2 - 60, YA, ZA], 120, 12).color(headerPaint));
const flights = Math.round(W / 340);
for (let i = 0; i < flights; i++) {
  const x = X0 + 160 + i * ((W - 320) / (flights - 1));
  if (Math.abs(x) < 450) continue;
  add(`auger-flight-${i}`, rod([x, YA, ZA], [x + 24, YA, ZA], 200, 12).color(knifeSteel));
}
for (let i = 0; i < 6; i++) {
  const x = -375 + i * 150;
  const a = (i * 60 * Math.PI) / 180;
  add(`auger-finger-${i}`, rod([x, YA, ZA], [x, YA - 230 * Math.cos(a), ZA + 230 * Math.sin(a)], 12, 4).color(knifeSteel));
}

// Drive: shaft along the back and gearbox at the right end.
add('drive-shaft', rod([X0 + 200, 120, 900], [W / 2 - 200, 120, 900], 28, 6).color(knifeSteel));
add('drive-gearbox', box(240, 220, 260, true).translate(W / 2 - 260, 150, 760).color(headerPaint));

// Reel: centre tube, six-armed spiders, bats and spring tines.
const YR = -820;
const ZR = 1350;
const R = 560;
const RX = W / 2 - 90;
add('reel-tube', rod([-RX, YR, ZR], [RX, YR, ZR], 70, 10).color(reelPaint));
const bat = (k) => [YR + R * Math.cos((k * Math.PI) / 3 + 0.3), ZR + R * Math.sin((k * Math.PI) / 3 + 0.3)];
const spiders = W > 9000 ? 5 : 4;
for (let j = 0; j < spiders; j++) {
  const x = -RX + 40 + j * ((2 * RX - 80) / (spiders - 1));
  for (let k = 0; k < 6; k++) {
    const [y, z] = bat(k);
    add(`reel-arm-${j}-${k}`, rod([x, YR, ZR], [x, y, z], 22, 6).color(reelPaint));
  }
}
const tines = Math.round(W / 420);
for (let k = 0; k < 6; k++) {
  const [y, z] = bat(k);
  add(`reel-bat-${k}`, rod([-RX, y, z], [RX, y, z], 26, 6).color(reelPaint));
  for (let t = 0; t < tines; t++) {
    const x = -RX + 150 + t * ((2 * RX - 300) / (tines - 1));
    add(`tine-${k}-${t}`, rod([x, y, z], [x, y + 50, z - 200], 9, 4).color(tineDark));
  }
}

// Reel support arms with lift cylinders, hinged on top of the back sheet.
for (const s of [-1, 1]) {
  const k = s < 0 ? 'left' : 'right';
  const xa = s * (W / 2 - 30);
  add(`reel-support-arm-${k}`, rod([xa, 20, 1180], [xa, YR, ZR], 50, 8).color(headerPaint));
  add(`reel-bearing-${k}`, rod([xa - s * 40, YR, ZR], [xa + s * 20, YR, ZR], 110, 10).color(headerPaint));
  add(`lift-cylinder-${k}`, rod([xa - s * 70, -260, 640], [xa - s * 70, -560, 1220], 45, 8).color(tineDark));
  add(`lift-rod-${k}`, rod([xa - s * 70, -560, 1220], [xa - s * 70, -620, 1290], 20, 6).color(knifeSteel));
}

return p.model();
