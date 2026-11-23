// SPDX-License-Identifier: CC0-1.0
// Aeration manifold: the air header that splits one blower supply into many
// airlines for a deep-water-culture tank, shown on its frame above the tank
// it oxygenates.
// What makes it an aeration manifold: a PVC header fed at one end through a
// ball valve and check valve, with a pressure gauge, a row of lever gang
// valves along its underside, and an airline from each valve dropping into
// the nutrient solution, where every air stone shows as a bubbling patch on
// the surface.
// Generic visualization geometry at about real size (header about 1.3 m,
// tank about 1200 x 700 x 450 mm), millimetres, Z up, front toward -Y.

meta({
  name: "aeration-manifold",
  license: 'CC0-1.0',
  title: "Aeration manifold",
  description: "Deep-water-culture aeration manifold at about real size: PVC air header on a steel frame, fed from a blower hose through a ball valve and check valve, with a pressure gauge and a row of lever gang valves whose airlines drop into an open nutrient tank, each ending in a bubbling air-stone patch on the solution surface. Material controls: header, gang valves, airlines, tank, plus a 6/8/12 outlet choice. greyPvc, whitePvc, blackOut and weathered presets.",
  tags: ['aeration', 'air manifold', 'air header', 'gang valve', 'air stone', 'airline', 'deep water culture', 'dissolved oxygen', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const header = param('header', '#9aa3a8', { label: 'Header (PVC-U)' });
const valves = param('valves', '#2a8a4a', { label: 'Gang valves (polymer)' });
const airline = param('airline', '#cfe0d8', { label: 'Airlines (clear vinyl)' });
const tank = param('tank', '#2b2e30', { label: 'Tank (polyethylene)' });
const outlets = param('outlets', '8', { choices: ['6', '8', '12'], label: 'Outlets' });

presets({
  greyPvc: { header: '#9aa3a8', valves: '#2a8a4a', airline: '#cfe0d8', tank: '#2b2e30' },
  whitePvc: { header: '#eceeea', valves: '#2f6fa8', airline: '#d7e2dc', tank: '#3a6fa0' },
  blackOut: { header: '#3c4246', valves: '#c0392b', airline: '#1f2224', tank: '#1b1d1f' },
  weathered: { header: '#b8b49e', valves: '#5f7d5a', airline: '#c9c4a6', tank: '#45484a' },
});

const p = assembly("aeration-manifold");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const run = (name: string, pts: [number, number, number][], r: number, color: string, seg = 6) => {
  for (let k = 0; k < pts.length - 1; k++) add(`${name}-${k}`, rod(pts[k], pts[k + 1], r, seg).color(color));
};

// Open DWC tank with the nutrient solution near the rim.
const TW = 1200;
const TD = 700;
const TH = 450;
const ZW = TH - 70; // solution surface
add("tank-shell", blk(0, 0, 0, TW, TD, TH).subtract(blk(0, 0, 30, TW - 40, TD - 40, TH)).color(tank));
add("tank-rim", blk(0, 0, TH - 30, TW + 30, TD + 30, 30).subtract(blk(0, 0, TH - 40, TW - 40, TD - 40, 60)).color(tank));
add("solution", blk(0, 0, 30, TW - 40, TD - 40, ZW - 30).color('#3f8f8a'));
add("tank-label", blk(-300, -TD / 2 - 17, 160, 220, 4, 90).color('#e0a21c'));

// Steel frame behind the tank carrying the header.
const FY = TD / 2 + 80;
const ZH = 1100; // header centre line
for (const sx of [-1, 1]) {
  const x = sx * 720;
  add(`upright-${sx > 0 ? 'r' : 'l'}`, blk(x, FY, 20, 50, 50, ZH + 60).color('#8a9399'));
  add(`foot-${sx > 0 ? 'r' : 'l'}`, blk(x, FY, 0, 120, 300, 20).color('#8a9399'));
}
add("crossbar", blk(0, FY, ZH - 70, 1490, 40, 40).color('#8a9399'));
add("frame-top", blk(0, FY, ZH + 80, 1490, 40, 40).color('#8a9399'));

// Header with end cap, saddle clamps and the inlet train at -X.
const HX0 = -640;
const HX1 = 620;
add("header-pipe", cylX(HX0, FY, ZH, HX1 - HX0, 25, 16).color(header));
add("header-cap", cylX(HX1, FY, ZH, 24, 31, 16).color(header));
for (const x of [-480, 0, 480]) add(`clamp-${x}`, blk(x, FY, ZH - 30, 30, 60, 60).color('#5a6066'));
add("inlet-elbow", cylZ(HX0, FY, ZH - 30, 55, 31, 14).color(header));
add("inlet-drop", cylZ(HX0, FY, 700, ZH - 700, 25, 14).color(header));
add("check-valve", cylZ(HX0, FY, 900, 110, 42, 14).color(header));
add("check-arrow", blk(HX0, FY - 44, 920, 12, 4, 70).color('#2a2d30'));
add("ball-valve", blk(HX0, FY, 770, 80, 80, 80).color(header));
add("ball-valve-lever", blk(HX0, FY - 90, 830, 24, 140, 16).color('#c0392b'));
run("supply-hose", [[HX0, FY, 700], [HX0, FY + 60, 560], [HX0 - 60, FY + 260, 300], [HX0 - 80, FY + 420, 20]], 24, '#2a2d30', 10);
add("gauge-tee", cylZ(-560, FY, ZH, 90, 10, 8).color('#c9a43a'));
add("gauge-case", cylY(-560, FY + 15, ZH + 140, 30, 55, 18).color('#2a2d30'));
add("gauge-face", cylY(-560, FY - 15, ZH + 140, 4, 48, 18).color('#f2f2ec'));
add("gauge-needle", box(6, 3, 40, true).rotateY(30).translate(-570, FY - 21, ZH + 150).color('#c0392b'));

// Gang valves under the header; airlines drop to air stones in the tank,
// staggered in two rows. Each stone bubbles up as a pale patch.
const n = Number(outlets.value);
const span = 1000;
for (let k = 0; k < n; k++) {
  const x = -span / 2 + (k * span) / (n - 1);
  const sx = x * 0.95;
  const sy = k % 2 === 0 ? -150 : 120;
  add(`valve-boss-${k}`, cylZ(x, FY, ZH - 50, 30, 11, 8).color(header));
  add(`valve-${k}`, blk(x, FY, ZH - 95, 26, 30, 45).color(valves));
  add(`valve-lever-${k}`, box(9, 46, 7, true).rotateZ(k % 4 === 3 ? 90 : 0).translate(x, FY - 22, ZH - 72).color('#f2f2ec'));
  add(`valve-barb-${k}`, cylZ(x, FY, ZH - 125, 30, 5, 6).color('#c9ccce'));
  run(`airline-${k}`, [[x, FY, ZH - 125], [x, FY - 70, 820], [sx, sy + 60, ZW + 110], [sx, sy, ZW]], 5, airline);
  add(`bubbles-${k}`, cylZ(sx, sy, ZW, 4, 75, 14).color('#cfeae8'));
  add(`bubbles-core-${k}`, cylZ(sx, sy, ZW + 4, 4, 38, 10).color('#f4fbfb'));
}

return p.model();
