// SPDX-License-Identifier: CC0-1.0
// Green-waste shredder: the tracked mobile slow-speed shredder that a
// composting site uses to break down brush, tree prunings and garden waste
// before windrowing. What makes it that machine rather than a static
// shredder: it sits on a pair of crawler tracks so it can walk around the
// yard; a big flared hopper over a single toothed shredding shaft takes
// loads tipped by a wheel loader; the diesel power pack sits in a tall
// grilled engine module at one end with an exhaust stack; and a long
// discharge conveyor with an overband magnet throws the shredded material
// out onto a pile.
// Generic visualization geometry at about real size (11 m long, 2.5 m
// wide, 3.8 m high), millimetres, Z up, discharge toward -X.

meta({
  name: "green-waste-shredder",
  license: 'CC0-1.0',
  title: "Green-waste shredder",
  description: "Tracked mobile green-waste shredder at about real size: crawler tracks with road wheels and pads, flared hopper over a single toothed shredding shaft heaped with brush and branches (or empty), diesel engine module with grilles, exhaust stack, ladder and handrails, long inclined discharge conveyor carrying mulch with an overband magnet. Material controls: machine paint, tracks and chassis, hopper wear plate, green waste. komptech, doppstadt, weathered and highVisibility presets; hopper loaded or empty.",
  tags: ["recycling", "shredder", "mobile shredder", "tracked shredder", "green waste", "composting", "brush", "mulch", "biomass", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#3f7d3a', { label: 'Machine body (paint)' });
const chassis = param('chassis', '#2e3135', { label: 'Tracks and chassis' });
const hopper = param('hopper', '#5b6266', { label: 'Hopper wear plate' });
const greenWaste = param('greenWaste', '#4f8a2f', { label: 'Green waste (brush)' });
const load = param('load', 'brush', { choices: ['brush', 'empty'], label: 'Hopper load' });

presets({
  komptech: { body: '#3f7d3a', chassis: '#2e3135', hopper: '#5b6266', greenWaste: '#4f8a2f' },
  doppstadt: { body: '#e0b12a', chassis: '#2e3135', hopper: '#4a4f53', greenWaste: '#5c8a34' },
  weathered: { body: '#6d7458', chassis: '#3d3a36', hopper: '#6a5e50', greenWaste: '#7a7a3e' },
  highVisibility: { body: '#d9692a', chassis: '#2f3438', hopper: '#5b6266', greenWaste: '#4f8a2f' },
});

const p = assembly("green-waste-shredder");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();

// Crawler tracks: stadium side profile, road wheels on the outer face, top pads.
const TL = 1700, TR = 400;
const stadium: [number, number][] = [];
for (let k = 0; k <= 8; k++) { const a = ((-90 + k * 22.5) * Math.PI) / 180; stadium.push([TL + TR * Math.cos(a), TR + TR * Math.sin(a)]); }
for (let k = 0; k <= 8; k++) { const a = ((90 + k * 22.5) * Math.PI) / 180; stadium.push([-TL + TR * Math.cos(a), TR + TR * Math.sin(a)]); }
for (const s of [-1, 1]) {
  const t = s < 0 ? 'l' : 'r';
  add(`track-${t}`, profileXZ(stadium, 500).translate(0, s * 1000, 0).color(chassis));
  for (let i = 0; i < 12; i++) add(`track-pad-${t}-${i}`, blk(-1540 + i * 280, s * 1000, 2 * TR, 120, 520, 30).color('#1d2023'));
  for (const x of [-TL, TL]) add(`idler-${t}-${x < 0 ? 'l' : 'r'}`, cylinder(30, 300, 14).rotateX(90).translate(x, s < 0 ? -1250 : 1280, TR).color(hopper));
}
for (let i = 0; i < 5; i++) add(`road-wheel-${i}`, cylinder(20, 150, 12).rotateX(90).translate(-1100 + i * 550, -1250, 260).color(hopper));

// Chassis deck.
add("deck", blk(0, 0, 2 * TR, 6600, 2000, 480).color(body));
add("deck-skirt", blk(0, -1010, 2 * TR + 60, 6600, 20, 360).color(chassis));

// Flared hopper over a single toothed shredding shaft.
const ZH = 2 * TR + 480, HH = 1700, XH = -1200;
const hOut = rectPath(1800, 850).loft(rectPath(2250, 1250), { spacing: HH, ruled: true }).translate(XH, 0, ZH);
const hIn = rectPath(1715, 765).loft(rectPath(2235, 1235), { spacing: HH + 100, ruled: true }).translate(XH, 0, ZH - 50);
add("hopper", hOut.subtract(hIn).color(hopper));
add("hopper-rim", blk(XH, 0, ZH + HH, 4600, 2600, 60).subtract(blk(XH, 0, ZH + HH - 10, 4400, 2400, 80)).color(body));
for (const x of [XH - 1400, XH, XH + 1400]) add(`hopper-rib-${x}`, blk(0, 0, 0, 120, 80, HH - 300).rotateX(13).translate(x, -910, ZH + 100).color(body));
add("shaft", cylinder(3400, 380, 14).rotateY(90).translate(XH - 1700, 0, ZH + 250).color('#8e979c'));
for (let i = 0; i < 12; i++) add(`shaft-tooth-${i}`, blk(0, 0, 340, 140, 120, 160).rotateX(i * 75).translate(XH - 1500 + i * 280, 0, ZH + 250).color('#b9c0c3'));
if (load.value === 'brush') {
  add("brush-heap", sphere(1500).scale([1.3, 0.72, 0.55]).translate(XH, 0, ZH + 1300).color(greenWaste));
  const branches: [number, number, number, number][] = [[-1500, -300, 30, 60], [-500, 250, -40, 110], [300, -200, 55, 20], [-1000, 100, 70, 160], [600, 350, -25, 210], [-200, -450, 15, 300]];
  for (const [dx, dy, tilt, yaw] of branches) {
    add(`branch-${dx}`, cylinder(1900, 55, 6).translate(0, 0, -950).rotateY(90 - tilt / 3).rotateZ(yaw).translate(XH + dx, dy, ZH + 1750).color('#6b4a2b'));
  }
}

// Engine module: grilled panels, doors, exhaust, ladder and top handrail.
const XE = 2150, EW = 2100, ZE = ZH + 1900;
add("engine-module", blk(XE, 0, ZH, EW, 2200, ZE - ZH).color(body));
add("engine-roof", blk(XE, 0, ZE, EW + 80, 2280, 60).color(chassis));
for (let i = 0; i < 9; i++) add(`grille-${i}`, blk(XE + 350, -1105, ZH + 650 + i * 100, 1000, 12, 50).color('#1d2023'));
for (const x of [XE - 700, XE + 350]) add(`door-seam-${x}`, blk(x - 560, -1106, ZH + 100, 10, 8, 1650).color(chassis));
add("door-handle", blk(XE - 360, -1115, ZH + 900, 160, 20, 30).color(hopper));
add("exhaust-stack", cylinder(800, 110, 12).translate(XE + 600, 600, ZE).color('#3d4448'));
add("exhaust-cap", cylinder(40, 140, 12).translate(XE + 600, 600, ZE + 800).color('#3d4448'));
add("air-filter", cylinder(500, 200, 12).translate(XE - 300, 650, ZE + 60).color(chassis));
for (const s of [-1, 1]) add(`ladder-rail-${s < 0 ? 'l' : 'r'}`, blk(XE - EW / 2 - 60, -1180 + s * 220, 0, 50, 50, ZE + 900).color('#f0b429'));
for (let i = 0; i < 9; i++) add(`ladder-rung-${i}`, blk(XE - EW / 2 - 60, -1180, 300 + i * 340, 40, 440, 30).color('#f0b429'));
for (const [x, y] of [[XE - EW / 2 + 60, -1050], [XE + EW / 2 - 60, -1050], [XE - EW / 2 + 60, 1050], [XE + EW / 2 - 60, 1050]]) add(`rail-post-${x < XE ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, blk(x, y, ZE + 60, 50, 50, 1000).color('#f0b429'));
for (const y of [-1050, 1050]) add(`top-rail-${y < 0 ? 'f' : 'b'}`, blk(XE, y, ZE + 1060, EW - 70, 50, 50).color('#f0b429'));
add("beacon", cylinder(150, 70, 10).translate(XE + EW / 2 - 60, -1050, ZE + 1110).color('#f0ae32'));

// Long inclined discharge conveyor toward -X with mulch and an overband magnet.
const L = 5600, ANG = 20, TH = (ANG * Math.PI) / 180, X0 = -2600, Z0 = 900;
const onConv = (s: Shape) => s.rotateY(ANG).translate(X0, 0, Z0); // local x runs 0 to -L
add("conveyor-frame", onConv(blk(-L / 2, 0, -220, L, 1200, 180).subtract(blk(-L / 2, 0, -230, L + 20, 1060, 160))).color(body));
add("conveyor-belt", onConv(blk(-L / 2, 0, -40, L, 1040, 30)).color('#24272a'));
for (const s of [-1, 1]) add(`conveyor-skirt-${s < 0 ? 'l' : 'r'}`, onConv(blk(-L / 2 + 900, s * 540, -40, L - 1800, 30, 200)).color(body));
add("head-drum", onConv(cylinder(1160, 160, 12).rotateX(90).translate(-L, 580, -150)).color(hopper));
for (let i = 0; i < 24; i++) {
  const x = -200 - i * 210, y = 300 * Math.sin(i * 2.1);
  add(`mulch-${i}`, onConv(box(170, 130, 60, true).rotateZ(i * 33).translate(x, y, 20)).color(i % 3 === 0 ? '#8a6a3c' : '#6b4a2b'));
}
const XM = -L + 900;
add("overband-magnet", onConv(blk(XM, 0, 700, 1100, 1300, 380)).color(body));
add("magnet-belt", onConv(blk(XM, 0, 640, 1300, 1000, 60)).color('#24272a'));
for (const x of [XM - 400, XM + 400]) add(`magnet-hanger-${x}`, onConv(blk(x, -680, -200, 60, 60, 1100)).color(body));
const xw = X0 - 3200 * Math.cos(TH), zw = Z0 + 3200 * Math.sin(TH) - 380;
for (const s of [-1, 1]) add(`conveyor-leg-${s < 0 ? 'l' : 'r'}`, blk(xw, s * 520, 0, 100, 100, zw).color(chassis));
add("conveyor-leg-tie", blk(xw, 0, 600, 100, 1140, 100).color(chassis));
add("mulch-pile", sphere(1200).scale([1.1, 1.3, 0.55]).translate(X0 - L * Math.cos(TH) - 250, 0, 0).subtract(blk(-9000, 0, -1000, 8000, 4000, 1000)).color('#6b4a2b'));

return p.model();
