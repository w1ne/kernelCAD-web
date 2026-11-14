// SPDX-License-Identifier: CC0-1.0
// Used-oil drop-off tank: the bunded tank at a household recycling centre
// where the public pours old engine oil, so it is held safely until a
// licensed collector pumps it out for re-refining.
// What makes it a used-oil bank: a horizontal steel tank with dished ends
// sitting on saddles inside a galvanised spill bund, a public filling
// cabinet on the front end with its lid hinged open over a mesh drain tray
// and funnel, a dial contents gauge, a
// gooseneck vent, a lockable collection point for the tanker hose, a
// yellow "used engine oil" sign board, oil-absorbent spill kit bin and a
// drip mat in front of the filler.
// Generic visualization geometry at about real size (3.3 m long, 1.9 m
// deep, 2.0 m high), millimetres, Z up, filler and sign facing -Y.

meta({
  name: "used-oil-dropoff-tank",
  license: 'CC0-1.0',
  title: "Used-oil drop-off tank",
  description: "Public used engine oil bank at about real size: horizontal steel tank with dished ends on saddles inside a galvanised spill bund, filling cabinet with open lid over a mesh drain tray and funnel, dial contents gauge, gooseneck vent, lockable tanker collection point, sign board, spill kit bin and drip mat. Material controls: tank paint, bund steel, filler cabinet and sign. councilGreen, oilBlack, safetyYellow and weathered presets.",
  tags: ['used oil', 'oil bank', 'waste oil', 'engine oil', 'bunded tank', 'spill bund', 'drop-off', 'household recycling centre', 'hazardous waste', 'recycling', 'waste management', 'reception', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tankPaint = param('tankPaint', '#3f7a4a', { label: 'Tank shell (painted steel)' });
const bundSteel = param('bundSteel', '#a4acb0', { label: 'Spill bund and saddles (galvanised steel)' });
const cabinet = param('cabinet', '#2f3437', { label: 'Filling cabinet (powder-coated steel)' });
const sign = param('sign', '#f2c230', { label: 'Sign board and spill kit (safety yellow)' });

presets({
  councilGreen: { tankPaint: '#3f7a4a', bundSteel: '#a4acb0', cabinet: '#2f3437', sign: '#f2c230' },
  oilBlack: { tankPaint: '#2b2e30', bundSteel: '#9aa1a4', cabinet: '#c0392b', sign: '#f2c230' },
  safetyYellow: { tankPaint: '#e0b020', bundSteel: '#8f969a', cabinet: '#2f3437', sign: '#f2f2ec' },
  weathered: { tankPaint: '#556b4c', bundSteel: '#7d7b72', cabinet: '#4a4744', sign: '#b89a3a' },
});

const p = assembly("used-oil-dropoff-tank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 24) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateX(-90).translate(x, y, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();

const BL = 3300, BD = 1500, BH = 420;
const TL = 2500, R = 500, TZ = 660;

// Galvanised spill bund: an open tray with a stiffened lip.
add("bund", blk(0, 0, 0, BL, BD, BH).subtract(blk(0, 0, 30, BL - 40, BD - 40, BH)).color(bundSteel));
add("bund-lip", blk(0, 0, BH - 40, BL + 40, BD + 40, 40).subtract(blk(0, 0, BH - 50, BL - 40, BD - 40, 60)).color(bundSteel));
for (const x of [-1100, 0, 1100]) add(`bund-rib-${x}`, blk(x, -BD / 2 - 15, 0, 60, 30, BH - 40).color(bundSteel));
add("bund-rainwater", blk(0, 0, 30, BL - 60, BD - 60, 8).color('#4f6670'));

// Saddles carrying the tank.
for (const x of [-800, 800]) {
  add(`saddle-${x}`, blk(x, 0, 30, 200, 1000, TZ - 30).subtract(cylX(x - 120, 0, TZ, 240, R + 5)).color(bundSteel));
}

// Horizontal tank with dished ends and banding.
add("tank-shell", cylX(-TL / 2, 0, TZ, TL, R).color(tankPaint));
for (const s of [-1, 1]) {
  add(`tank-end-${s}`, cylX(s > 0 ? TL / 2 : -TL / 2 - 60, 0, TZ, 60, R - 50).color(tankPaint));
  add(`tank-dish-${s}`, cylX(s > 0 ? TL / 2 + 60 : -TL / 2 - 90, 0, TZ, 30, R - 200).color(tankPaint));
}
for (const x of [-500, 500]) add(`tank-band-${x}`, cylX(x - 30, 0, TZ, 60, R + 10).color('#2f3437'));
add("tank-stripe", cylX(-TL / 2 + 300, 0, TZ, TL - 600, R + 4).subtract(blk(0, 0, TZ - 900, TL, 2 * R + 40, 900 + 140)).subtract(blk(0, 0, TZ + 260, TL, 2 * R + 40, 600)).color(sign));

// Manway, contents gauge and gooseneck vent on top.
add("manway", cylZ(300, 0, TZ + R - 30, 120, 260, 20).color(tankPaint));
add("manway-lid", cylZ(300, 0, TZ + R + 90, 30, 280, 20).color('#2f3437'));
for (let i = 0; i < 8; i++) {
  const a = (i * 2 * Math.PI) / 8;
  add(`manway-bolt-${i}`, cylZ(300 + 250 * Math.cos(a), 250 * Math.sin(a), TZ + R + 120, 20, 16, 6).color('#c3c8cb'));
}
add("gauge-stem", cylZ(-200, -200, TZ + R - 120, 200, 40, 12).color('#c3c8cb'));
add("gauge-body", cylY(-200, -310, TZ + R + 140, 70, 130, 18).color('#2f3437'));
add("gauge-dial", cylY(-200, -315, TZ + R + 140, 5, 112, 18).color('#f2f2ec'));
add("gauge-red", cylY(-200, -320, TZ + R + 140, 3, 112, 18).subtract(blk(-200, -320, TZ + R - 60, 400, 30, 200)).subtract(blk(-290, -320, TZ + R + 40, 300, 30, 300)).color('#c0392b'));
add("gauge-needle", box(8, 4, 95, true).rotateY(-35).translate(-175, -324, TZ + R + 175).color('#1d2023'));
add("vent-pipe", cylZ(1000, 0, TZ + R - 60, 520, 40, 12).color('#c3c8cb'));
add("vent-bend", torus(90, 40, 12).rotateX(90).subtract(blk(0, 0, -200, 400, 200, 200)).translate(1090, 0, TZ + R + 460).color('#c3c8cb'));
add("vent-down", cylZ(1180, 0, TZ + R + 330, 130, 40, 12).color('#c3c8cb'));
add("vent-cap", cylZ(1180, 0, TZ + R + 300, 40, 70, 12).color('#2f3437'));

// Public filling cabinet at the front end with its lid open.
const CX = -TL / 2 + 420, CY = -150, CZ = TZ + R - 40;
add("cabinet-body", blk(CX, CY, CZ, 640, 520, 520).subtract(blk(CX, CY, CZ + 300, 560, 440, 400)).color(cabinet));
add("cabinet-skirt", blk(CX, CY, TZ + R - 160, 520, 420, 140).color(cabinet));
add("drain-tray", blk(CX, CY, CZ + 440, 560, 440, 12).subtract(blk(CX, CY, CZ + 430, 160, 160, 40)).color('#7e8487'));
for (let i = 0; i < 6; i++) add(`tray-bar-${i}`, blk(CX - 225 + i * 90, CY, CZ + 456, 14, 440, 14).color('#c3c8cb'));
add("funnel", rect(160, 160).loft([rect(520, 400)], {
  planes: [{ plane: 'XY' as const, origin: [CX, CY, CZ + 300] as [number, number, number] }, { plane: 'XY' as const, origin: [CX, CY, CZ + 440] as [number, number, number] }],
  ruled: true,
}).color('#5d6366'));
add("funnel-mouth", blk(CX, CY, CZ + 440, 150, 150, 4).color('#121416'));
add("oil-pool", cylZ(CX - 120, CY - 60, CZ + 452, 4, 70, 12).color('#3a2a14'));
// Lid hinged on the back edge, swung up past vertical.
add("lid", blk(0, -260, 0, 660, 540, 30).translate(0, 0, -15).rotateX(-100).translate(CX, CY + 270, CZ + 520).color(cabinet));
add("lid-stay", blk(CX + 300, CY + 220, CZ + 520, 20, 20, 480).color('#c3c8cb'));
add("lid-label", blk(0, -260, 0, 440, 300, 4).rotateX(-100).translate(CX, CY + 262, CZ + 520).color(sign));


// Lockable tanker collection point on the +X end.
add("suction-pipe", cylX(TL / 2 + 60, -320, TZ - 150, 260, 50, 12).color('#5d6366'));
add("suction-valve", blk(TL / 2 + 260, -320, TZ - 250, 120, 160, 200).color('#c0392b'));
add("camlock", cylX(TL / 2 + 320, -320, TZ - 150, 90, 70, 14).color('#c9a640'));
add("valve-padlock", blk(TL / 2 + 260, -420, TZ - 230, 40, 30, 60).color('#c9a640'));

// Sign board on posts in front of the bund.
const SY = -BD / 2 - 140;
for (const x of [250, 1150]) add(`sign-post-${x}`, blk(x, SY + 30, 0, 60, 60, 1700).color(bundSteel));
add("sign-board", blk(700, SY, 1000, 1100, 16, 650).color(sign));
add("sign-header", blk(700, SY - 10, 1480, 1040, 4, 130).color('#1d2023'));
add("sign-drop-icon", cylY(450, SY - 12, 1220, 4, 110, 18).color('#1d2023'));
add("sign-drop-tip", box(150, 4, 150, true).rotateY(45).translate(450, SY - 12, 1300).color('#1d2023'));
for (let i = 0; i < 4; i++) add(`sign-text-${i}`, blk(820, SY - 12, 1080 + i * 80, 480 - (i % 2) * 120, 4, 30).color('#1d2023'));

// Spill kit bin and drip mat.
add("spill-kit", blk(-1150, SY - 120, 0, 600, 450, 700).color(sign));
add("spill-kit-lid", blk(-1150, SY - 120, 700, 640, 490, 60).color(sign));
add("spill-kit-band", blk(-1150, SY - 347, 420, 560, 4, 160).color('#c0392b'));
add("drip-mat", blk(-300, -BD / 2 - 480, 0, 1200, 600, 12).color('#1d2023'));

return p.model();
