// SPDX-License-Identifier: CC0-1.0
// Reject-load container: the front-load bin parked beside the tipping floor
// that takes loads refused at inspection (contaminated, hazardous or
// non-conforming material) until they are hauled to landfill. What makes it
// that bin rather than a crate: a steel body with a sloped, raked front and a
// high back, two black plastic lids hinged at the back and following the
// slope, fork sleeves on both sides for a front-loader truck's forks,
// floor skids, a drain plug, and a red REJECT band with a hazard stripe so
// nobody tips good material into it.
// Generic visualization geometry at about real size (6 yd, 1.9 m wide,
// 1.8 m at the back), millimetres, Z up, front on -Y.

meta({
  name: "reject-load-container",
  license: 'CC0-1.0',
  title: "Reject-load container",
  description: "Front-load reject container at about real size: steel body with a raked front and high back, two hinged black plastic lids following the slope, side fork sleeves for a front-loader truck, floor skids, drain plug, red REJECT band with a hazard stripe and a placard. Material controls: body paint, lids, fork sleeves and skids, and reject marking. reject, weathered, hazardous and municipal presets.",
  tags: ["recycling", "reject container", "front-load bin", "dumpster", "contamination", "tipping floor", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bodyPaint = param('bodyPaint', '#6c7a86', { label: 'Body (painted steel)' });
const lid = param('lid', '#1f2224', { label: 'Lids (plastic)' });
const sleeves = param('sleeves', '#2f3438', { label: 'Fork sleeves and skids' });
const marking = param('marking', '#c8322a', { label: 'Reject band and placard' });
const lids = param('lids', 'closed', { choices: ['closed', 'open'], label: 'Lids' });

presets({
  reject: { bodyPaint: '#6c7a86', lid: '#1f2224', sleeves: '#2f3438', marking: '#c8322a' },
  weathered: { bodyPaint: '#6e6458', lid: '#2e2c2a', sleeves: '#4a3f36', marking: '#9a3a2c' },
  hazardous: { bodyPaint: '#e0c21f', lid: '#1f2224', sleeves: '#2f3438', marking: '#c8322a' },
  municipal: { bodyPaint: '#2a5598', lid: '#3a6b3a', sleeves: '#2f3438', marking: '#d4552a' },
});

const p = assembly("reject-load-container");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const hazard = '#f0c419';

const L = 1900, Z0 = 120; // body length along X, floor height
const BY = 850, BZ = 1800, FY = -900, FZ = 1250; // back top and front top corners (y, z)
const slope = (Math.atan2(BZ - FZ, BY - FY) * 180) / Math.PI;

// Body shell with a raked lower front, open on top.
const outer = [[-700, Z0], [BY, Z0], [BY, BZ], [FY, FZ], [FY, 600]];
const inner = [[-660, Z0 + 60], [BY - 50, Z0 + 60], [BY - 50, BZ + 100], [FY + 50, FZ + 100], [FY + 50, 610]];
add("body", profileYZ(outer, L).subtract(profileYZ(inner, L - 100)).color(bodyPaint));
add("top-rim", profileYZ([[BY + 30, BZ - 60], [BY + 30, BZ], [FY - 30, FZ], [FY - 30, FZ - 60]], L + 60).color(bodyPaint));
for (const x of [-500, 0, 500]) add(`front-rib-${x}`, profileYZ([[-720, Z0 + 40], [-690, Z0 + 40], [FY - 10, 610], [FY - 10, FZ - 70], [FY - 40, FZ - 70], [FY - 40, 620]], 70).translate(x, 0, 0).color(bodyPaint));

// Two plastic lids, hinged at the back and following the slope.
for (const s of [-1, 1]) {
  const x = s * L / 4;
  const open = lids.value === 'open' && s < 0;
  const leaf = blk(0, 0, 0, L / 2 - 30, Math.hypot(BY - FY, BZ - FZ) + 80, 45);
  const shaped = (sh: Shape) => open
    ? sh.translate(0, -(BY - FY) / 2, 0).rotateX(slope + 105).translate(x, BY + 20, BZ + 40)
    : sh.rotateX(slope).translate(x, (BY + FY) / 2, (BZ + FZ) / 2 + 30);
  add(`lid-${s > 0 ? 'r' : 'l'}`, shaped(leaf).color(lid));
  for (const ry of [-200, 300]) add(`lid-${s > 0 ? 'r' : 'l'}-rib-${ry + 200}`, shaped(blk(0, ry, 45, L / 2 - 200, 60, 30)).color(lid));
  add(`lid-${s > 0 ? 'r' : 'l'}-hinge`, cylinder(L / 2 - 120, 30, 10).rotateY(90).translate(x - (L / 2 - 120) / 2, BY + 20, BZ + 10).color(sleeves));
}

// Fork sleeves on both sides and the floor skids.
for (const s of [-1, 1]) {
  add(`fork-sleeve-${s > 0 ? 'r' : 'l'}`, blk(s * (L / 2 + 70), 0, 1050, 140, 1150, 160).subtract(blk(s * (L / 2 + 70), 0, 1075, 100, 1200, 110)).color(sleeves));
  for (const y of [-450, 450]) add(`sleeve-gusset-${s > 0 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, profileYZ([[y - 40, 760], [y + 40, 760], [y + 40, 1050], [y - 40, 1050]], 120).translate(s * (L / 2 + 60), 0, 0).color(sleeves));
  add(`skid-${s > 0 ? 'r' : 'l'}`, blk(s * (L / 2 - 180), -30, 0, 160, 1500, Z0).color(sleeves));
}
add("drain-plug", cylinder(60, 45, 10).rotateX(90).translate(L / 2 - 300, FY + 10, 330).color('#b0b4b6'));

// Red REJECT band, hazard stripe and placard on the raked front.
add("reject-band", profileYZ([[FY - 52, 760], [FY - 52, 1000], [FY - 44, 1000], [FY - 44, 760]], L - 200).color(marking));
for (let k = 0; k < 9; k++) add(`hazard-${k}`, blk(-800 + k * 200, FY - 50, 1040, 100, 6, 80).color(k % 2 ? '#1f2224' : hazard));
add("placard", blk(0, FY - 58, 800, 520, 6, 160).color('#f2f2ee'));
add("placard-text", blk(0, FY - 62, 860, 400, 6, 40).color(marking));

return p.model();
