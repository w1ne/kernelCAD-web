// SPDX-License-Identifier: CC0-1.0
// Jobsite tile saw: the wet-cutting rail saw a tiler sets up on a folding
// stand to cut porcelain and stone, with water spraying onto a diamond blade.
// What makes it one rather than a box: a folding X-leg stand, a moulded water
// tray with sloped walls and a submersible pump, twin round rails carrying a
// sliding cart with a rubber mat, a square-cut fence and a push handle, a rear
// post and overhead arm holding the motor with its fan cowl, a 254 mm diamond
// blade dipping into the cart slot under a hinged guard with water nozzles,
// and a ceramic tile on the cart mid-cut.
// Generic visualization geometry at real size (about 1.1 m long, 1.4 m to the
// top of the head), millimetres, Z up, feet on z = 0, cut direction along X.
meta({
  name: "jobsite-tile-saw",
  license: 'CC0-1.0',
  title: "Jobsite tile saw",
  description: "Wet-cutting rail tile saw at real size: folding X-leg stand, moulded water tray with submersible pump, twin round rails carrying a sliding cart with rubber mat, square fence and push handle, rear post and overhead arm holding the motor and fan cowl, 254 mm diamond blade under a guard with water nozzles, and a ceramic tile mid-cut. Blade choice 254 or 178 mm. Material controls: tool body paint, rail and blade metal, tray polymer, ceramic tile; contractorYellow, proBlue and weathered presets.",
  tags: ['tile saw', 'wet saw', 'rail saw', 'diamond blade', 'tiling', 'construction equipment', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 3200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const blade = param('blade', '254mm', { choices: ['178mm', '254mm'], label: 'Blade diameter' });
const bodyPaint = param('bodyPaint', '#d8302a', { label: 'Tool body paint' });
const railMetal = param('railMetal', '#b4bbbf', { label: 'Rail and blade metal' });
const trayPolymer = param('trayPolymer', '#30363a', { label: 'Tray polymer and mat' });
const ceramicTile = param('ceramicTile', '#d9cbb3', { label: 'Ceramic tile' });
presets({
  contractorYellow: { bodyPaint: '#f2b705', trayPolymer: '#25282a' },
  proBlue: { bodyPaint: '#1f5fae', ceramicTile: '#8f9aa1' },
  weathered: { bodyPaint: '#9a4a3a', railMetal: '#8d918f', trayPolymer: '#4a4d4c', ceramicTile: '#bfb39e' },
});

const p = assembly('jobsite-tile-saw');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
// Solid across Y (width w, centred on y = 0) from a side profile in [x, z] points.
const alongY = (pts, w) => extrudePolygon(pts, w).rotateX(90).translate(0, w / 2, 0);
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

const BR = blade.value === '254mm' ? 127 : 89;  // blade radius
const L = 1000;              // tray length along X
const TW = 600;              // tray width
const ZT = 780;              // tray bottom (top of the stand)
const ZR = ZT + 230;         // rail centre height
const ZC = ZR + 40;          // cart top
const XB = 80;               // blade centre x

// Folding X-leg stand with foot caps and cross tubes.
for (const s of [-1, 1]) {
  const y = s * (TW / 2 - 40);
  const k = s < 0 ? 'left' : 'right';
  add(`stand-leg-${k}-a`, rod([-420, y, 20], [380, y, ZT], 16).color(railMetal));
  add(`stand-leg-${k}-b`, rod([420, y, 20], [-380, y, ZT], 16).color(railMetal));
  add(`stand-pivot-${k}`, cylinder(30, 26, 10).rotateX(90).translate(0, y + 15, ZT / 2 + 10).color(bodyPaint));
  for (const x of [-420, 420]) add(`stand-foot-${k}-${x < 0 ? 'rear' : 'front'}`, box(70, 50, 30, true).translate(x, y, 15).color(trayPolymer));
}
for (const x of [-380, 380]) add(`stand-top-tube-${x < 0 ? 'rear' : 'front'}`, rod([x, -TW / 2 + 40, ZT], [x, TW / 2 - 40, ZT], 16).color(railMetal));

// Moulded water tray with sloped walls, drain plug and pump.
const W2 = TW / 2;
const tray = [[-W2 + 40, 0], [W2 - 40, 0], [W2, 170], [W2 - 14, 170], [W2 - 52, 14], [-W2 + 52, 14], [-W2 + 14, 170], [-W2, 170]];
add('water-tray', alongX(tray, -L / 2, L).translate(0, 0, ZT).color(trayPolymer));
add('tray-end-rear', alongX([[-W2 + 40, 0], [W2 - 40, 0], [W2, 170], [-W2, 170]], -L / 2 - 14, 14).translate(0, 0, ZT).color(trayPolymer));
add('tray-end-front', alongX([[-W2 + 40, 0], [W2 - 40, 0], [W2, 170], [-W2, 170]], L / 2, 14).translate(0, 0, ZT).color(trayPolymer));
add('water', box(L - 60, TW - 140, 10, true).translate(0, 0, ZT + 70).color(railMetal));
add('pump', box(110, 90, 70, true).translate(-L / 2 + 110, -W2 + 120, ZT + 50).color(bodyPaint));
add('pump-hose', rod([-L / 2 + 110, -W2 + 120, ZT + 85], [-L / 2 + 40, -W2 + 120, ZR + 380], 8, 6).color(trayPolymer));
add('drain-plug', cylinder(20, 18, 8).rotateY(90).translate(L / 2 + 14, 0, ZT + 30).color(bodyPaint));

// Twin round rails on end brackets.
for (const s of [-1, 1]) {
  const k = s < 0 ? 'left' : 'right';
  add(`rail-${k}`, rod([-L / 2 - 20, s * 210, ZR], [L / 2 + 20, s * 210, ZR], 16, 10).color(railMetal));
  for (const x of [-L / 2 - 10, L / 2 + 10]) add(`rail-bracket-${k}-${x < 0 ? 'rear' : 'front'}`, box(30, 50, 240, true).translate(x, s * 210, ZT + 120 + 20).color(bodyPaint));
}

// Sliding cart: frame, rubber mat split by the blade slot, square fence, push handle.
const XC = 160;   // cart centre (slid forward mid-cut)
add('cart-frame', box(520, 500, 40, true).translate(XC, 0, ZR + 20).color(bodyPaint));
for (const s of [-1, 1]) {
  add(`cart-mat-${s < 0 ? 'left' : 'right'}`, box(500, 220, 8, true).translate(XC, s * 125, ZC + 4).color(trayPolymer));
  add(`cart-runner-${s < 0 ? 'left' : 'right'}`, box(520, 40, 30, true).translate(XC, s * 210, ZR - 8).color(railMetal));
}
add('cart-fence', box(30, 500, 60, true).translate(XC - 245, 0, ZC + 30).color(railMetal));
add('cart-handle', rod([XC + 260, -150, ZR + 10], [XC + 330, -150, ZR + 60], 12).color(railMetal));
add('cart-handle-grip', rod([XC + 330, -150, ZR + 60], [XC + 330, 150, ZR + 60], 16).color(trayPolymer));
add('cart-handle-r', rod([XC + 260, 150, ZR + 10], [XC + 330, 150, ZR + 60], 12).color(railMetal));
add('tile', box(300, 300, 10, true).rotateZ(-8).translate(XC + 20, 40, ZC + 13).color(ceramicTile));
add('tile-offcut', box(120, 300, 10, true).rotateZ(-8).translate(XC + 230, 70, ZC + 13).color(ceramicTile));

// Rear post, overhead arm, motor and fan cowl; the blade sits straight on the motor shaft.
const ZB = ZC + BR - 40;    // blade centre (40 mm below the cart top)
const ZH = ZB + 150;        // arm height
add('rear-post', alongY([[-L / 2 - 80, ZT + 60], [-L / 2 + 20, ZT + 60], [-L / 2 + 20, ZH + 50], [-L / 2 - 30, ZH + 50], [-L / 2 - 80, ZH - 20]], 120).translate(0, 260, 0).color(bodyPaint));
add('overhead-arm', alongY([[-L / 2 - 30, ZH - 30], [XB - 40, ZH - 30], [XB + 40, ZH + 10], [XB + 40, ZH + 50], [-L / 2 - 30, ZH + 50]], 90).translate(0, 230, 0).color(bodyPaint));
add('motor', cylinder(260, 90, 14).rotateX(-90).translate(XB, 30, ZB).color(bodyPaint));
add('motor-fan-cowl', cylinder(60, 80, 14).rotateX(-90).translate(XB, 290, ZB).color(trayPolymer));
add('motor-mount', box(120, 200, ZH - ZB - 60, true).translate(XB, 160, (ZH + ZB + 60) / 2 - 30).color(bodyPaint));
add('motor-switch', box(70, 40, 40, true).translate(-L / 2 + 60, 230, ZH + 70).color(trayPolymer));
add('motor-cable', rod([-L / 2 - 30, 290, ZH - 20], [-L / 2 - 120, 340, ZT - 200], 10, 6).color(trayPolymer));

// Diamond blade with hub flange, dipping into the cart slot, and the hinged guard.
const disc = Array.from({ length: 24 }, (_, i) => [BR * Math.cos((i / 24) * Math.PI * 2), BR * Math.sin((i / 24) * Math.PI * 2)]);
add('diamond-blade', extrudePolygon(disc, 3).rotateX(90).translate(XB, 1.5, ZB).color(railMetal));
add('blade-rim', extrudePolygon(disc.map(([x, z]) => [x * 1.02, z * 1.02]), 5).rotateX(90).translate(XB, 2.5, ZB).color(trayPolymer));
add('blade-flange', cylinder(40, 34, 12).rotateX(-90).translate(XB, -20, ZB).color(railMetal));
add('blade-arbor', rod([XB, -30, ZB], [XB, 30, ZB], 18).color(railMetal));
const guard = [];
for (let i = 0; i <= 10; i++) {
  const a = (i / 10) * Math.PI;
  guard.push([XB + (BR + 22) * Math.cos(a), ZB + (BR + 22) * Math.sin(a)]);
}
add('blade-guard', alongY(guard, 60).color(bodyPaint));
for (const s of [-1, 1]) {
  add(`water-nozzle-${s < 0 ? 'left' : 'right'}`, rod([XB + BR * 0.6, s * 36, ZB + BR * 0.6], [XB + BR + 30, s * 22, ZB + 20], 6, 6).color(railMetal));
}
add('nozzle-hose', rod([XB - 40, 30, ZB + BR + 22], [-L / 2 + 40, -W2 + 120, ZR + 380], 8, 6).color(trayPolymer));

return p.model();
