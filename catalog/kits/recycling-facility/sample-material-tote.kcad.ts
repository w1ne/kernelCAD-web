// SPDX-License-Identifier: CC0-1.0
// Sample material tote: the attached-lid plastic crate a materials
// recovery facility uses for composition audits, a few kilos of a stream
// grabbed off the belt, tagged and wheeled to the sort table. What makes
// it a sample tote rather than a bin: a tapered nesting crate with ribbed
// walls and hand-hold slots, two split lids folded open on their side
// hinges, a clipped sample tag on the front, a mixed sample inside (cans,
// bottles, a carton) and a four-castor tote dolly underneath.
// Generic visualization geometry at about real size (600 x 400 x 520 mm on
// the dolly), millimetres, Z up, tag toward -Y.

meta({
  name: "sample-material-tote",
  license: 'CC0-1.0',
  title: "Sample material tote",
  description: "Attached-lid sample tote on a dolly at about real size: tapered ribbed polypropylene crate with hand-hold slots, two split lids folded open on side hinges, clipped sample tag, a mixed recyclables sample inside (cans, PET bottles, a carton) and a four-castor dolly. Material controls: tote, lids, sample tag and dolly. audit, weathered, foodGrade and highVisibility presets.",
  tags: ["recycling", "tote", "crate", "sample", "waste audit", "composition", "containers", "dolly", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tote = param('tote', '#2f6fb0', { label: 'Tote (polypropylene)' });
const lids = param('lids', '#24577f', { label: 'Lids (polypropylene)' });
const tag = param('tag', '#f0b429', { label: 'Sample tag' });
const dolly = param('dolly', '#3b3f42', { label: 'Dolly and castors' });

presets({
  audit: { tote: '#2f6fb0', lids: '#24577f', tag: '#f0b429', dolly: '#3b3f42' },
  weathered: { tote: '#4f6878', lids: '#3f5260', tag: '#c9b48a', dolly: '#4a4540' },
  foodGrade: { tote: '#e8e6dc', lids: '#cfd2cc', tag: '#2f8a5a', dolly: '#8f989c' },
  highVisibility: { tote: '#d4402a', lids: '#a83224', tag: '#f2efe6', dolly: '#24282b' },
});

const p = assembly("sample-material-tote");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
// Ruled loft between two rectangles.
const tapered = (wb: number, db: number, wt: number, dt: number, z0: number, z1: number) =>
  rect(wb, db).loft([rect(wt, dt)], { planes: [{ plane: 'XY', origin: [0, 0, z0] }, { plane: 'XY', origin: [0, 0, z1] }], ruled: true });

const ZD = 150, H = 330, ZT = ZD + H, WT = 600, DT = 400;

// Dolly: low frame with corner castors.
add("dolly-frame", blk(0, 0, ZD - 40, WT - 20, DT - 20, 30).subtract(blk(0, 0, ZD - 50, WT - 120, DT - 120, 50)).color(dolly));
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const x = sx * (WT / 2 - 50), y = sy * (DT / 2 - 50);
  add(`castor-horn-${sx}-${sy}`, blk(x, y, 42, 40, 60, ZD - 82).color(dolly));
  add(`castor-wheel-${sx}-${sy}`, cylinder(28, 40, 12).rotateY(90).translate(x - 14, y, 40).color('#24282b'));
}

// Tapered crate, hollow, with rim, ribs and hand-hold slots.
const shell = tapered(WT - 70, DT - 70, WT, DT, ZD, ZT).subtract(tapered(WT - 90, DT - 90, WT - 20, DT - 20, ZD + 10, ZT + 5));
let crate = shell;
for (const sx of [-1, 1]) crate = crate.subtract(blk(sx * (WT / 2 - 20), 0, ZT - 80, 60, 140, 40));
add("crate", crate.color(tote));
add("rim", tapered(WT + 10, DT + 10, WT + 10, DT + 10, ZT - 25, ZT).subtract(blk(0, 0, ZT - 30, WT - 20, DT - 20, 40)).color(tote));
for (const x of [-200, -100, 0, 100, 200]) add(`front-rib-${x}`, box(14, 14, H - 50, true).rotateX(3).translate(x, -DT / 2 + 15, ZD + (H - 50) / 2 + 10).color(tote));
for (const sx of [-1, 1]) for (const y of [-100, 0, 100]) add(`side-rib-${sx}-${y}`, box(14, 14, H - 50, true).rotateY(-sx * 3).translate(sx * (WT / 2 - 15), y, ZD + (H - 50) / 2 + 10).color(tote));

// Split lids folded down outside each long side, hinged along the rim.
for (const sx of [-1, 1]) {
  const lid = blk(0, 0, 0, WT / 2 + 0, DT, 12).union(blk(0, 0, 12, WT / 2 - 80, DT - 80, 10));
  add(`lid-${sx}`, lid.translate(sx * WT / 4, 0, 0).rotateY(sx * 80).translate(sx * (WT / 2 + 5), 0, ZT).color(lids));
  for (const y of [-120, 120]) add(`hinge-${sx}-${y}`, cylinder(40, 9, 8).rotateX(90).translate(sx * (WT / 2 + 5), y + 20, ZT).color(lids));
}

// Clipped sample tag on the front wall.
add("tag-clip", blk(-130, -DT / 2 - 6, ZT - 60, 40, 12, 60).color(dolly));
add("tag-card", blk(-130, -DT / 2 - 10, ZT - 210, 150, 4, 160).color(tag));
add("tag-line", blk(-130, -DT / 2 - 13, ZT - 150, 110, 2, 14).color('#24282b'));

// Mixed sample: cans, PET bottles and a carton heaped near the rim.
const fill = ZT - 120;
add("sample-bed", blk(0, 0, ZD + 10, WT - 100, DT - 100, fill - ZD - 10).color('#8f8a80'));
for (const [x, y, rx] of [[-180, -60, 70], [-90, 80, 10], [120, -90, -60]] as [number, number, number][]) {
  add(`can-${x}`, cylinder(120, 33, 12).rotateX(rx).translate(x, y, fill + 30).color('#c9ced1'));
}
for (const [x, y, rz, c] of [[60, 70, 30, '#7fc4c9'], [200, 40, -40, '#3f8f5a']] as [number, number, number, string][]) {
  add(`bottle-${x}`, cylinder(200, 40, 10).union(cylinder(60, 15, 8).translate(0, 0, 200)).rotateY(85).rotateZ(rz).translate(x - 110, y, fill + 45).color(c));
}
add("carton", box(90, 70, 190, true).rotateY(70).rotateZ(-20).translate(-10, -40, fill + 50).color('#e8e6dc'));

return p.model();
