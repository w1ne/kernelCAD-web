// SPDX-License-Identifier: CC0-1.0
// Exploration core drill rig, the skid-mounted diamond drill that cuts a
// continuous rock core to prove an orebody. What makes it one: a tall
// lattice mast raised on rams from the skid (vertical or tilted back for an
// angled hole), a hydraulic drill head riding the mast on a feed cylinder
// with the drill string running down through the foot clamp into the
// collar, a crown sheave for the wireline, an engine power pack and operator
// panel on the skid, a rod rack of drill rods and core trays holding grey
// core beside it.
// Millimetres, Z up, skid along X with the mast at +X, operator side and rod
// rack towards -Y (front), ground origin under the skid centre.
meta({
  name: "core-drill-rig",
  license: 'CC0-1.0',
  title: "Exploration core drill rig",
  description: "Skid-mounted diamond core drill at about real size: 9.5 m lattice mast on raising rams with a hydraulic drill head on a feed cylinder, drill string through the foot clamp into a collar casing, crown and wireline sheaves with wireline winch, louvred engine power pack with radiator and exhaust stack, hydraulic tank, tilted operator panel with gauges, mud tank and water pump, rod rack of drill rods on trestles and three core trays of grey core on a stand. Material controls: rig coating, mast and skid steel, drill rods and chrome, timber core trays, plus a mast angle choice (vertical, angled 60 degrees). weathered, highVisibility and redRig presets.",
  tags: ['mining', 'exploration', 'core drilling', 'diamond drill', 'drill rig', 'geology', 'core tray', 'drilling'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#e8c21a', { label: 'Rig coating' });
const structuralSteel = param('structuralSteel', '#4f5b62', { label: 'Mast and skid steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Drill rods and chrome' });
const coreTray = param('coreTray', '#b88a55', { label: 'Core tray timber' });
const mastAngle = param('mastAngle', 'vertical', { choices: ['vertical', 'angled'], label: 'Mast angle' });
presets({
  weathered: { coatedSteel: '#9a8a55', structuralSteel: '#666a66', stainlessSteel: '#969f9e', coreTray: '#8d7356' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#c5ccca', coreTray: '#c49a62' },
  redRig: { coatedSteel: '#b8322a', structuralSteel: '#3b4248', stainlessSteel: '#c5ccca', coreTray: '#9b7a50' },
});

const p = assembly("core-drill-rig");
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

const dark = '#26292b', concrete = '#a6a196', hose = '#1f2224', core = '#7d7a72', gauge = '#e9ece8', red = '#c0392b';
const tilt = mastAngle.value === 'angled' ? -30 : 0; // top leans back over the skid
const tr = (tilt * Math.PI) / 180;
const MX = 2300, MZ = 900; // mast foot pivot
const ML = 9500; // mast length
// Mast frame: s along the mast from the foot, built up +Z then tilted.
const mast = (s) => s.rotateY(tilt).translate(MX, 0, MZ);
const M = (x, y, s) => [MX + x * Math.cos(tr) + s * Math.sin(tr), y, MZ - x * Math.sin(tr) + s * Math.cos(tr)];

// ---- Skid and deck ----
for (const y of [-1050, 1050]) add(`skid-runner-${y < 0 ? 'f' : 'b'}`, blk(-3400, y - 120, 0, 2900, y + 120, 300).color(structuralSteel));
add('skid-nose', blk(-3600, -1170, 0, -3400, 1170, 300).color(structuralSteel));
add('deck', blk(-3400, -1250, 300, 2900, 1250, 380).color(structuralSteel));

// ---- Power pack: louvred engine enclosure, radiator, exhaust ----
add('engine-enclosure', blk(-3300, -1100, 380, -1100, 1100, 2200).color(coatedSteel));
add('enclosure-roof', blk(-3350, -1150, 2200, -1050, 1150, 2280).color(coatedSteel));
for (let x = -3100; x <= -1500; x += 200) add(`louvre-${x}`, blk(x, -1130, 1300, x + 120, -1100, 1900).color(dark));
add('radiator-grille', blk(-3330, -900, 700, -3300, 900, 1900).color(dark));
add('exhaust-stack', rod(70, 2280, 3200, 8).translate(-1500, 700, 0).color(dark));
add('exhaust-cap', rod(95, 3200, 3260, 8).translate(-1500, 700, 0).color(dark));
add('hydraulic-tank', blk(-1000, 300, 380, 200, 1150, 1500).color(coatedSteel));
add('tank-filler', rod(80, 1500, 1620, 8).translate(-400, 700, 0).color(stainlessSteel));

// ---- Operator panel with gauges, tilted towards the operator ----
const panel = (s) => s.rotateX(-25).translate(-200, -900, 1500);
add('panel-stand', blk(-700, -1100, 380, 300, -700, 1400).color(coatedSteel));
add('control-panel', panel(blk(-650, -60, -300, 650, 60, 300)).color(dark));
for (const [i, x] of [-450, -150, 150, 450].entries()) add(`gauge-${i}`, panel(rod(90, 0, 40, 12).rotateX(90).translate(x, -60, 120)).color(gauge));
for (const [i, x] of [-400, -200, 0, 200, 400].entries()) add(`lever-${i}`, panel(tube([x, -60, -150], [x, -260, -60], 18, 6)).color(red));

// ---- Mast: two rails, rungs, crown, raising rams ----
for (const y of [-330, 330]) add(`mast-rail-${y < 0 ? 'f' : 'b'}`, mast(blk(-120, y - 70, 0, 120, y + 70, ML)).color(structuralSteel));
for (let s = 600; s < ML; s += 1100) add(`mast-rung-${s}`, mast(blk(80, -330, s, 140, 330, s + 90)).color(structuralSteel));
add('foot-clamp', mast(blk(-350, -420, -250, 350, 420, 250)).color(coatedSteel));
add('mast-pivot', rod(110, -470, 470, 10).rotateX(90).translate(MX, 0, MZ).color(stainlessSteel));
add('crown-block', mast(blk(-250, -420, ML, 300, 420, ML + 280)).color(coatedSteel));
add('crown-sheave', mast(rod(320, -60, 60, 14).rotateX(90).translate(-60, 0, ML + 420)).color(stainlessSteel));
for (const y of [-330, 330]) {
  add(`raise-ram-${y < 0 ? 'f' : 'b'}`, tube([MX - 2200, y, 400], M(150, y, 3200), 90, 8).color(coatedSteel));
  add(`raise-ram-rod-${y < 0 ? 'f' : 'b'}`, tube(M(150, y, 2000), M(150, y, 3200), 50, 8).color(stainlessSteel));
}
add('mast-support-frame', blk(MX - 450, -500, 380, MX + 450, 500, MZ - 250).color(structuralSteel));

// ---- Feed cylinder, drill head and drill string ----
add('feed-cylinder', mast(rod(110, 500, ML - 600, 10).translate(220, 0, 0)).color(stainlessSteel));
const hs = 5600; // drill head position on the mast
add('head-carriage', mast(blk(-200, -450, hs - 400, 300, 450, hs + 400)).color(structuralSteel));
add('drill-head', mast(blk(-650, -400, hs - 350, -150, 400, hs + 350)).color(coatedSteel));
add('head-motor', mast(rod(200, hs + 350, hs + 850, 12).translate(-400, -150, 0)).color(dark));
add('head-chuck', mast(rod(170, hs - 650, hs - 350, 12).translate(-400, 0, 0)).color(stainlessSteel));
add('drill-string', mast(rod(48, -600, hs - 650, 8).translate(-400, 0, 0)).color(stainlessSteel));
add('head-hose-a', tube(M(-600, -300, hs + 300), [-600, -400, 1500], 35, 6).color(hose));
add('head-hose-b', tube(M(-600, 300, hs + 300), [-600, 400, 1500], 35, 6).color(hose));
const [cx, , cz] = M(-400, 0, -600);
add('collar-casing', rod(150, 0, Math.max(cz - 60, 200), 10).translate(cx, 0, 0).color(dark));
add('drill-pad', blk(cx - 900, -900, 0, cx + 900, 900, 60).color(concrete));

// ---- Wireline winch and line to the crown ----
add('wireline-drum', latheX([[300, -900], [300, -200]], -800, 900, 14).translate(0, 1800, 0).color(dark));
add('wireline-flanges', latheX([[360, -940], [360, -900]], 1000, 900, 14).color(coatedSteel));
add('wireline', tube([-550, 1000, 1200], M(-60, 0, ML + 700), 14, 4).color(hose));

// ---- Mud tank and water pump at the nose ----
add('mud-tank', blk(MX + 900, -1200, 0, MX + 2400, 1200, 900).subtract(blk(MX + 980, -1120, 80, MX + 2320, 1120, 920)).color(structuralSteel));
add('mud', blk(MX + 980, -1120, 80, MX + 2320, 1120, 720).color('#6f6252'));
add('water-pump', latheX([[260, MX + 1400], [260, MX + 2100]], 1500, 400, 12).color(red));
add('pump-skid', blk(MX + 1300, 1200, 0, MX + 2200, 1800, 140).color(structuralSteel));
add('water-hose', tube([MX + 1400, 1500, 400], [MX + 300, 0, MZ - 200], 35, 6).color(hose));

// ---- Rod rack: drill rods on trestles ----
const ry = -2500;
for (const x of [-2800, -400]) add(`trestle-${x}`, blk(x - 80, ry - 700, 0, x + 80, ry + 700, 900).color(coatedSteel));
for (let row = 0; row < 3; row++) {
  for (let k = 0; k < 6 - row; k++) {
    const y = ry - 500 + k * 200 + row * 100, z = 960 + row * 170;
    add(`drill-rod-${row}-${k}`, latheX([[48, -3300], [48, 100]], y, z, 6).color(stainlessSteel));
  }
}

// ---- Core trays on a stand ----
const ty = -1200; // tray stand sits in front of the rod rack
add('tray-stand', blk(400, ty - 3400, 0, 2800, ty - 2200, 600).color(structuralSteel));
for (let t = 0; t < 3; t++) {
  const x0 = 450 + t * 800;
  add(`core-tray-${t}`, blk(x0, ty - 3380, 600, x0 + 750, ty - 2220, 720).subtract(blk(x0 + 30, ty - 3350, 630, x0 + 720, ty - 2250, 730)).color(coreTray));
  for (let k = 0; k < 5; k++) add(`core-${t}-${k}`, latheX([[42, x0 + 50], [42, x0 + 700]], ty - 3290 + k * 220, 675, 6).color(core));
}

return p.model();
