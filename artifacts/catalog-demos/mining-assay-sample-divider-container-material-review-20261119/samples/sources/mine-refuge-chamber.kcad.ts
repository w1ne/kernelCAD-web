// SPDX-License-Identifier: CC0-1.0
// Mine refuge chamber, the sealed steel shelter that miners walk into when
// a fire or gas outburst cuts them off from fresh air. What makes it one: a
// long, high-visibility steel box with chamfered roof edges and pressed
// stiffener ribs, sitting on sled runners so a loader can drag it to the
// working face; a pressure door with a porthole and a locking wheel at one
// end; reflective bands and a green REFUGE sign so it can be found in
// smoke; a rack of breathing-air cylinders at the other end; an air
// conditioning and scrubber unit, a strobe beacon and an aerial on the
// roof; and a connection panel where the mine compressed-air and phone
// lines plug in. Two sizes: eight-person and twenty-person.
// Millimetres, Z up, chamber long axis on X, door at +X.
meta({
  name: "mine-refuge-chamber",
  license: 'CC0-1.0',
  title: "Mine refuge chamber",
  description: "Portable underground refuge chamber at about real size: chamfered steel shell with stiffener ribs on a sled skid with upturned runners and tow eyes, pressure door with porthole, locking wheel and hinges (closed or open showing the dark airlock), side portholes, reflective bands, green REFUGE sign, breathing-air cylinder rack, roof air conditioning and scrubber unit with fan, strobe beacon, aerial and lifting lugs, and a compressed-air and phone connection panel. Size choice: eight-person (4.2 m) or twenty-person (7.2 m). Material controls: shell paint, skid steel, air cylinder paint and window glass. weathered, mineGreen and highVisibility presets.",
  tags: ['mining', 'underground', 'mine safety', 'refuge chamber', 'rescue', 'breathing air', 'shelter'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 4400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const shellPaint = param('shellPaint', '#e8781e', { label: 'Shell paint' });
const skidSteel = param('skidSteel', '#4d5459', { label: 'Skid steel' });
const airCylinder = param('airCylinder', '#3b3f44', { label: 'Air cylinder paint' });
const windowGlass = param('windowGlass', '#6fa6b8', { label: 'Window glass' });
const size = param('size', 'eightPerson', { choices: ['eightPerson', 'twentyPerson'], label: 'Size' });
const door = param('door', 'closed', { choices: ['closed', 'open'], label: 'Door' });
presets({
  weathered: { shellPaint: '#a8683a', skidSteel: '#5a554e', airCylinder: '#4a4740', windowGlass: '#5d7c80' },
  mineGreen: { shellPaint: '#3f8a4c', skidSteel: '#3f464b', airCylinder: '#2f3438', windowGlass: '#6fa6b8' },
  highVisibility: { shellPaint: '#f2c21a', skidSteel: '#2f363b', airCylinder: '#2a6fb0', windowGlass: '#7cc0d2' },
});

const p = assembly("mine-refuge-chamber");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Round bar along X / along Y.
const cylX = (r, x0, x1, y, z, n = 12) => rod(r, x0, x1, n).rotateY(90).translate(0, y, z);
const cylY = (r, y0, y1, x, z, n = 12) => rod(r, y0, y1, n).rotateX(-90).translate(x, 0, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// Closed outline [[a, b], ...] extruded: prismX takes (y, z) along X, prismY takes (x, z) across Y.
const outlineOf = (pts) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [a, b] of pts.slice(1)) o = o.lineTo(a, b);
  return o.close();
};
const prismX = (pts, x0, x1) => outlineOf(pts).extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
const prismY = (pts, y0, y1) => outlineOf(pts).extrude(y1 - y0).rotateX(90).translate(0, y1, 0);

const big = size.value === 'twentyPerson';
const L = big ? 7200 : 4200; // shell length
const W = 950; // shell half width
const ZS = 300; // top of skid
const H = 2000; // shell height
const XE = L / 2; // door end
const section = (w, z0, h, c) => [[-w, z0], [w, z0], [w, z0 + h - c], [w - c, z0 + h], [-w + c, z0 + h], [-w, z0 + h - c]];
const tape = '#e9e9de', sign = '#1f8a4c', dark = '#16191b', lamp = '#f2a516';

// ---- Sled skid ----
for (const [k, y] of [-720, 720].entries()) {
  add(`runner-${k}`, prismY([[-XE + 250, 0], [XE - 250, 0], [XE + 50, 220], [XE + 50, ZS], [-XE - 50, ZS], [-XE - 50, 220]], y - 90, y + 90).color(skidSteel));
}
const nCross = big ? 6 : 4;
for (let i = 0; i < nCross; i++) {
  const x = -XE + 300 + (i * (L - 600)) / (nCross - 1);
  add(`cross-member-${i}`, blk(x - 80, -810, 140, x + 80, 810, ZS).color(skidSteel));
}
for (const [k, s] of [-1, 1].entries()) add(`tow-eye-${k}`, torus(110, 30, 10).rotateY(90).translate(s * (XE + 100), 0, 200).color(skidSteel));

// ---- Shell with ribs, bands and portholes ----
add('shell', prismX(section(W, ZS, H, 320), -XE, XE).color(shellPaint));
const nRib = big ? 7 : 4;
for (let i = 0; i < nRib; i++) {
  const x = -XE + 200 + (i * (L - 400)) / (nRib - 1);
  add(`rib-${i}`, prismX(section(W + 45, ZS, H + 45, 340), x - 50, x + 50).color(shellPaint));
}
for (const [k, s] of [-1, 1].entries()) {
  add(`reflective-band-${k}`, blk(-XE, s * (W + 2) - 4, ZS + 1250, XE, s * (W + 2) + 4, ZS + 1400).color(tape));
  add(`reflective-band-low-${k}`, blk(-XE, s * (W + 2) - 4, ZS + 250, XE, s * (W + 2) + 4, ZS + 350).color(tape));
}
const nPort = big ? 3 : 2;
for (let i = 0; i < nPort; i++) {
  const x = -XE + L * ((i + 1) / (nPort + 1));
  add(`porthole-rim-${i}`, cylY(170, -W - 30, -W, x, ZS + 1600, 14).color(skidSteel));
  add(`porthole-${i}`, cylY(130, -W - 36, -W - 30, x, ZS + 1600, 14).color(windowGlass));
}

// ---- Door end ----
add('door-frame', blk(XE, -480, ZS + 120, XE + 40, 480, ZS + 1780).color(skidSteel));
add('doorway', blk(XE + 40, -380, ZS + 180, XE + 46, 380, ZS + 1720).color(dark));
const leaf = [
  blk(0, 0, ZS + 170, 70, 780, ZS + 1730),
  cylX(110, 70, 90, 390, ZS + 1350, 14).color(skidSteel),
  cylX(80, 90, 96, 390, ZS + 1350, 14).color(windowGlass),
  torus(150, 18, 10).rotateY(90).translate(110, 390, ZS + 850).color(dark),
  rod(20, 0, 40, 6).rotateY(90).translate(70, 390, ZS + 850).color(dark),
];
const swing = door.value === 'open' ? -105 : 0;
for (const [k, s] of leaf.entries()) {
  const placed = s.rotateZ(swing).translate(XE + 40, -390, 0);
  add(`door-${k}`, k === 0 ? placed.color(shellPaint) : placed);
}
for (const [k, z] of [ZS + 400, ZS + 1500].entries()) add(`hinge-${k}`, rod(35, z - 90, z + 90, 8).translate(XE + 60, -420, 0).color(skidSteel));
add('refuge-sign', blk(XE + 40, 520, ZS + 1100, XE + 50, 900, ZS + 1600).color(sign));
add('sign-cross-v', blk(XE + 50, 680, ZS + 1180, XE + 54, 740, ZS + 1520).color(tape));
add('sign-cross-h', blk(XE + 50, 560, ZS + 1320, XE + 54, 860, ZS + 1380).color(tape));

// ---- Breathing-air cylinder rack at the far end ----
const nCyl = big ? 8 : 5;
add('rack-base', blk(-XE - 520, -820, ZS - 60, -XE, 820, ZS).color(skidSteel));
add('rack-top-rail', blk(-XE - 520, -820, ZS + 1350, -XE - 470, 820, ZS + 1400).color(skidSteel));
for (const [k, y] of [-820, 820].entries()) add(`rack-post-${k}`, blk(-XE - 520, y - 25, ZS, -XE - 470, y + 25, ZS + 1400).color(skidSteel));
for (let i = 0; i < nCyl; i++) {
  const y = -700 + (i * 1400) / (nCyl - 1);
  add(`air-cylinder-${i}`, lathe([[110, ZS], [115, ZS + 30], [115, ZS + 1350], [60, ZS + 1460], [30, ZS + 1480]], 10).translate(-XE - 250, y, 0).color(airCylinder));
  add(`cylinder-valve-${i}`, rod(25, ZS + 1480, ZS + 1560, 6).translate(-XE - 250, y, 0).color('#b8a64a'));
}
add('air-manifold', cylY(30, -760, 760, -XE - 250, ZS + 1600, 6).color('#b8a64a'));

// ---- Roof equipment ----
const ZR = ZS + H;
add('aircon-unit', blk(-XE + 200, -600, ZR, -XE + 1500, 600, ZR + 450).color(tape));
add('aircon-fan', torus(260, 30, 14).translate(-XE + 850, 0, ZR + 470).color(dark));
add('aircon-grille', rod(240, ZR + 450, ZR + 460, 14).translate(-XE + 850, 0, 0).color(skidSteel));
add('beacon-base', rod(90, ZR, ZR + 60, 10).translate(XE - 400, 0, 0).color(dark));
add('beacon', lathe([[80, ZR + 60], [80, ZR + 220], [40, ZR + 280]], 10).translate(XE - 400, 0, 0).color(lamp));
add('aerial', rod(12, ZR, ZR + 900, 6).translate(XE - 700, 300, 0).color(dark));
for (const [k, x] of [-XE + 200, XE - 200].entries()) {
  for (const [j, y] of [-450, 450].entries()) add(`lifting-lug-${k}-${j}`, torus(80, 22, 8).rotateX(90).translate(x, y, ZR + 70).color(skidSteel));
}

// ---- Service connection panel ----
add('service-panel', blk(XE - 1300, W, ZS + 500, XE - 500, W + 120, ZS + 1100).color(skidSteel));
for (let i = 0; i < 3; i++) add(`coupler-${i}`, cylY(45, W + 120, W + 230, XE - 1150 + i * 250, ZS + 700, 8).color(i === 2 ? '#2b6fd0' : '#c9b13a'));
add('air-hose', tube([XE - 1150, W + 230, ZS + 700], [XE + 900, W + 700, 90], 40, 8).color('#2a2d30'));

return p.model();
