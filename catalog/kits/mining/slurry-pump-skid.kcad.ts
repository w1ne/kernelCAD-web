// SPDX-License-Identifier: CC0-1.0
// Slurry pump skid, the heavy horizontal centrifugal pump that moves ore
// slurry between process stages. What makes it one: a thick split volute
// casing clamped by a ring of bolts, an end suction facing away from the
// drive with a knife-gate valve and rubber expansion joint, a tangential
// discharge rising from the top of the volute, a pedestal bearing frame on a
// base plate, gland-seal water piping, and a motor mounted over the pump on an
// adjustable overhead frame driving through V-belts in a guard (or coupled in
// line behind it).
// Millimetres, Z up, shaft along X with the drive towards +X, ground origin
// under the pump casing.
meta({
  name: "slurry-pump-skid",
  license: 'CC0-1.0',
  title: "Slurry pump skid",
  description: "Horizontal centrifugal slurry pump on a skid at about real size: split volute casing with a ring of clamp bolts and lifting lugs, end suction spool with rubber expansion joint and knife-gate valve, tangential discharge riser with pressure gauge and flanged elbow, pedestal bearing frame with shaft and adjustment bolts, gland-seal water line, drain trough, and a motor either on an overhead frame with V-belts in a guard or coupled in line behind the bearing frame. Material controls: pump casing coating, skid and frame steel, rubber hoses and joints, valve and shaft steel, plus a drive choice (overhead, inline). weathered, highVisibility and greyPlant presets.",
  tags: ['mining', 'mineral processing', 'slurry pump', 'centrifugal pump', 'pump skid', 'knife-gate valve', 'v-belt drive', 'concentrator'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#2f6f9e', { label: 'Pump casing coating' });
const structuralSteel = param('structuralSteel', '#4f5b62', { label: 'Skid and frame steel' });
const rubber = param('rubber', '#1f2224', { label: 'Rubber hoses and joints' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Valve and shaft steel' });
const drive = param('drive', 'overhead', { choices: ['overhead', 'inline'], label: 'Motor drive' });
presets({
  weathered: { coatedSteel: '#5d6f73', structuralSteel: '#666a66', rubber: '#333332', stainlessSteel: '#969f9e' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#26292b', stainlessSteel: '#c5ccca' },
  greyPlant: { coatedSteel: '#b9bec0', structuralSteel: '#2f5a8a', rubber: '#1f2224', stainlessSteel: '#d0d6d6' },
});

const p = assembly("slurry-pump-skid");
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
// Lathe along X: [[radius, x], ...] with x rising, centred on (y, z).
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const dark = '#26292b', concrete = '#a6a196', guard = '#e8c21a', gauge = '#e9ece8';
const Zs = 1150; // shaft centreline
const Rv = 750; // volute radius
const N = 24;

add('plinth', blk(-2600, -1300, 0, 2700, 1300, 200).color(concrete));
add('skid-rail-a', blk(-1500, -650, 200, 2500, -450, 420).color(structuralSteel));
add('skid-rail-b', blk(-1500, 450, 200, 2500, 650, 420).color(structuralSteel));
add('base-plate', blk(-1300, -700, 420, 2400, 700, 480).color(structuralSteel));

// ---- Volute casing: split halves clamped by bolts, spiral swell to the discharge ----
add('volute-frame-half', latheX([[Rv - 40, -200], [Rv, -120], [Rv, 0]], 0, Zs, N).color(coatedSteel));
add('volute-cover-half', latheX([[Rv, 0], [Rv, 140], [Rv - 80, 260]], 0, Zs, N).color(coatedSteel));
add('volute-swell', latheX([[Rv - 60, -170], [Rv - 60, 220]], -120, Zs + 160, N).color(coatedSteel));
add('volute-split-band', latheX([[Rv + 40, -30], [Rv + 40, 30]], 0, Zs, N).color(structuralSteel));
for (let k = 0; k < 10; k++) {
  const a = (360 * k) / 10 + 18;
  add(`clamp-bolt-${k}`, blk(-150, -45, Rv - 30, 170, 45, Rv + 90).rotateX(a).translate(0, 0, Zs).color(stainlessSteel));
}
add('casing-foot', blk(-250, -500, 480, 260, 500, Zs - Rv + 100).color(coatedSteel));
for (const y of [-Rv + 80, Rv - 80]) add(`lifting-lug-${y}`, blk(-60, y - 40, Zs + Rv - 40, 60, y + 40, Zs + Rv + 220).color(coatedSteel));

// ---- End suction: throatbush cover, expansion joint and knife-gate valve towards -X ----
add('suction-cover', latheX([[420, -420], [380, -200]], 0, Zs, 18).color(coatedSteel));
add('suction-flange', latheX([[460, -500], [460, -420]], 0, Zs, 18).color(structuralSteel));
add('expansion-joint', latheX([[300, -900], [360, -800], [300, -700], [360, -600], [300, -500]], 0, Zs, 16).color(rubber));
add('knife-gate-body', blk(-1150, -480, Zs - 480, -900, 480, Zs + 420).color(stainlessSteel));
add('knife-gate-bonnet', blk(-1110, -300, Zs + 420, -940, 300, Zs + 1100).color(stainlessSteel));
add('knife-gate-stem', rod(30, Zs + 1100, Zs + 1500, 6).translate(-1025, 0, 0).color(stainlessSteel));
add('knife-gate-handwheel', rod(260, Zs + 1500, Zs + 1550, 12).subtract(rod(210, Zs + 1490, Zs + 1560, 12)).translate(-1025, 0, 0).color(guard));
add('suction-spool', latheX([[300, -2400], [300, -1150]], 0, Zs, 16).color(rubber));
add('suction-spool-flange', latheX([[400, -1260], [400, -1150]], 0, Zs, 16).color(structuralSteel));
add('suction-support', blk(-2000, -250, 200, -1800, 250, Zs - 300).color(structuralSteel));

// ---- Tangential discharge riser with gauge and elbow ----
const dy = -Rv + 300;
add('discharge-branch', tube([30, dy, Zs + Rv - 60], [30, dy, Zs + Rv + 450], 280, 14).color(coatedSteel));
add('discharge-flange', rod(390, Zs + Rv + 450, Zs + Rv + 540, 14).translate(30, dy, 0).color(structuralSteel));
add('discharge-spool', tube([30, dy, Zs + Rv + 540], [30, dy, Zs + Rv + 1300], 260, 14).color(rubber));
add('discharge-elbow', tube([30, dy, Zs + Rv + 1300], [-700, dy, Zs + Rv + 1700], 260, 14).color(rubber));
add('discharge-line', tube([-700, dy, Zs + Rv + 1700], [-2500, dy, Zs + Rv + 1700], 260, 14).color(rubber));
add('pressure-gauge-tap', tube([30, dy - 260, Zs + Rv + 800], [30, dy - 520, Zs + Rv + 800], 25, 6).color(stainlessSteel));
add('pressure-gauge', rod(110, -40, 40, 12).rotateX(90).translate(30, dy - 560, Zs + Rv + 800).color(gauge));

// ---- Bearing frame, shaft and gland water ----
add('pedestal', blk(300, -520, 480, 1700, 520, Zs - 280).color(structuralSteel));
add('bearing-housing', latheX([[330, 300], [330, 1700]], 0, Zs, 16).color(structuralSteel));
add('bearing-end-cap-a', latheX([[380, 300], [380, 420]], 0, Zs, 16).color(coatedSteel));
add('bearing-end-cap-b', latheX([[380, 1580], [380, 1700]], 0, Zs, 16).color(coatedSteel));
add('shaft', latheX([[90, 1700], [90, 2300]], 0, Zs, 10).color(stainlessSteel));
for (const y of [-430, 430]) add(`adjusting-bolt-${y}`, tube([1750, y, Zs - 380], [2050, y, Zs - 380], 30, 6).color(stainlessSteel));
add('gland-housing', latheX([[260, 230], [260, 300]], 0, Zs, 14).color(coatedSteel));
add('gland-water-line', tube([260, 260, Zs + 220], [260, 900, Zs + 900], 25, 6).color(rubber));
add('gland-water-header', tube([260, 900, Zs + 900], [260, 900, 500], 30, 6).color(stainlessSteel));
add('drain-trough', blk(-300, -650, 480, 600, 650, 560).subtract(blk(-260, -610, 500, 560, 610, 570)).color(structuralSteel));

// ---- Motor and drive ----
if (drive.value === 'inline') {
  const mz = Zs;
  add('coupling-guard', latheX([[300, 1750], [300, 2400]], 0, mz, 12).color(guard));
  add('motor-base', blk(2300, -600, 480, 3700, 600, mz - 600).color(structuralSteel));
  add('motor', latheX([[520, 2400], [600, 2500], [600, 3500], [500, 3650]], 0, mz, 20).color(structuralSteel));
  for (let x = 2600; x < 3450; x += 170) add(`motor-fin-${x}`, latheX([[650, x], [650, x + 40]], 0, mz, 20).color(structuralSteel));
  add('motor-terminal-box', blk(2800, -300, mz + 560, 3200, 300, mz + 820).color(structuralSteel));
  add('motor-fan-cowl', latheX([[460, 3650], [500, 3800]], 0, mz, 16).color(dark));
  add('plinth-extension', blk(2700, -1300, 0, 4000, 1300, 200).color(concrete));
  add('skid-extension', blk(2300, -700, 200, 3900, 700, 480).color(structuralSteel));
} else {
  // Overhead motor on a hinged frame above the bearing pedestal, belts at +X.
  const mz = Zs + 1250;
  add('overhead-frame-post-a', blk(400, -560, Zs - 280, 560, -400, mz - 520).color(structuralSteel));
  add('overhead-frame-post-b', blk(400, 400, Zs - 280, 560, 560, mz - 520).color(structuralSteel));
  add('overhead-frame-deck', blk(300, -620, mz - 520, 1900, 620, mz - 440).color(structuralSteel));
  add('overhead-jack-screw', tube([1500, 0, Zs + 340], [1500, 0, mz - 520], 40, 6).color(stainlessSteel));
  add('motor', latheX([[400, 350], [450, 450], [450, 1600], [380, 1700]], 0, mz, 20).color(structuralSteel));
  for (let x = 550; x < 1550; x += 170) add(`motor-fin-${x}`, latheX([[500, x], [500, x + 40]], 0, mz, 20).color(structuralSteel));
  add('motor-terminal-box', blk(800, -720, mz - 150, 1200, -470, mz + 250).color(structuralSteel));
  add('motor-fan-cowl', latheX([[340, 200], [380, 350]], 0, mz, 16).color(dark));
  add('belt-guard', blk(1750, -550, Zs - 520, 2350, 550, mz + 620).color(guard));
  add('belt-guard-vent', blk(2350, -300, Zs + 100, 2370, 300, mz + 300).color(dark));
}

return p.model();
