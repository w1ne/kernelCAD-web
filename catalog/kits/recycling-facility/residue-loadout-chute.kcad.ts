// SPDX-License-Identifier: CC0-1.0
// Residue load-out chute: where an MRF's residue conveyor ends over a
// concrete push-wall bay so the rejects pile up ready for the loader. What
// makes it a load-out chute: an inclined belt conveyor climbing over the
// bay wall to a head pulley on a braced steel tower, a hooded head chute
// with a flop gate, a telescoping spout of nested steel sections ending in
// a rubber skirt, and a heap of mixed residue under it inside a three-sided
// concrete bay.
// Generic visualization geometry at about real size (5.2 m long, 3.0 m
// deep, 4.9 m high), millimetres, Z up, open side of the bay toward -Y.

meta({
  name: "residue-loadout-chute",
  license: 'CC0-1.0',
  title: "Residue load-out chute",
  description: "Residue load-out at about real size: inclined belt conveyor on a support leg climbing to a head pulley on a braced steel tower with platform and handrail, hooded head chute with flop gate and actuator, telescoping spout with rubber skirt, and a mixed residue heap inside a three-sided concrete push-wall bay. Material controls: structure, chute, rubber and residue. plant, galvanised, highVisibility and weathered presets.",
  tags: ["recycling", "residue", "load-out", "chute", "conveyor", "push wall", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structure = param('structure', '#2f6fa8', { label: 'Tower and conveyor (paint)' });
const chute = param('chute', '#9aa3a6', { label: 'Chute and spout (wear plate)' });
const rubber = param('rubber', '#24282b', { label: 'Belt and rubber skirt' });
const residue = param('residue', '#6b5a45', { label: 'Residue heap' });

presets({
  plant: { structure: '#2f6fa8', chute: '#9aa3a6', rubber: '#24282b', residue: '#6b5a45' },
  galvanised: { structure: '#a8b0b0', chute: '#8a9296', rubber: '#2a2e31', residue: '#7a6a52' },
  highVisibility: { structure: '#f0b429', chute: '#5a6270', rubber: '#1e2022', residue: '#6b5a45' },
  weathered: { structure: '#5f7380', chute: '#8a6a50', rubber: '#3a3c3a', residue: '#5a4a3a' },
});

const p = assembly("residue-loadout-chute");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Straight bar between two points in the XZ plane at constant y.
const barXZ = (x0: number, z0: number, x1: number, z1: number, y: number, w: number, t: number) => {
  const L = Math.hypot(x1 - x0, z1 - z0), a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(L, w, t, true).rotateY(-a).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};
const concrete = '#b8b4aa';

// Three-sided concrete push-wall bay.
add("bay-slab", blk(0, 0, 0, 3400, 3000, 40).color('#9a968c'));
add("back-wall", blk(0, 1350, 40, 3400, 300, 1500).color(concrete));
for (const s of [-1, 1]) add(`side-wall-${s}`, blk(s * 1550, -150, 40, 300, 2700, 1500).color(concrete));
for (const s of [-1, 1]) add(`wall-chevron-${s}`, blk(s * 1550, -1502, 1100, 300, 4, 200).color('#f0b429'));

// Braced tower on the back wall: four legs, platform, handrail.
const TZ = 3800;
for (const x of [-500, 500]) for (const y of [600, 1300]) add(`leg-${x}-${y}`, blk(x, y, 40, 120, 120, TZ - 40).color(structure));
for (const y of [600, 1300]) {
  add(`brace-a-${y}`, barXZ(-500, 1600, 500, TZ - 100, y, 60, 60).color(structure));
  add(`brace-b-${y}`, barXZ(500, 1600, -500, TZ - 100, y, 60, 60).color(structure));
}
add("platform", blk(0, 700, TZ, 1300, 1500, 60).color(structure));
add("platform-cut", blk(0, 0, TZ, 600, 600, 60).color(chute));
for (const x of [-640, 640]) add(`rail-post-${x}`, blk(x, -40, TZ + 60, 40, 40, 1000).color('#f0b429'));
add("handrail", blk(0, -40, TZ + 1020, 1320, 40, 40).color('#f0b429'));
add("midrail", blk(0, -40, TZ + 560, 1320, 30, 30).color('#f0b429'));
for (const s of [-1, 1]) add(`side-rail-${s}`, blk(s * 640, 700, TZ + 1020, 40, 1480, 40).color('#f0b429'));

// Inclined belt conveyor from +X over the side wall to the head pulley.
const x0 = 3700, z0 = 1100, x1 = 200, z1 = TZ + 650;
const ang = (Math.atan2(z1 - z0, x0 - x1) * 180) / Math.PI;
for (const y of [-430, 430]) add(`stringer-${y}`, barXZ(x0, z0, x1, z1, y, 80, 220).color(structure));
add("belt", barXZ(x0, z0 + 110, x1, z1 + 110, 0, 780, 20).color(rubber));
const beltZ = (x: number) => z0 + ((x0 - x) * (z1 - z0)) / (x0 - x1);
add("belt-load", barXZ(x0 - 600, beltZ(x0 - 600) + 150, x1 + 900, beltZ(x1 + 900) + 150, 0, 500, 60).color(residue));
add("head-pulley", cylinder(940, 230, 16).rotateX(-90).translate(x1, -470, z1).color(chute));
add("tail-pulley", cylinder(940, 160, 14).rotateX(-90).translate(x0, -470, z0).color(chute));
add("drive-motor", cylinder(420, 170, 14).rotateX(-90).translate(x1 + 60, 480, z1).color('#3f7f4a'));
add("gearbox", blk(x1 + 60, 560, z1 - 200, 300, 260, 400).color('#3f7f4a'));
for (const y of [-430, 430]) {
  add(`conveyor-leg-${y}`, blk(2600, y, 0, 100, 100, z0 + Math.tan((ang * Math.PI) / 180) * (x0 - 2600)).color(structure));
  add(`tail-leg-${y}`, blk(x0, y, 0, 100, 100, z0 - 100).color(structure));
}
add("tail-tie", blk(x0, 0, z0 - 200, 100, 960, 100).color(structure));

// Hooded head chute and flop gate on top of the tower opening.
add("head-hood", blk(-80, 0, TZ + 400, 700, 980, 700).color(chute));
add("hood-roof", barXZ(-430, TZ + 1100, 430, TZ + 1250, 0, 1000, 40).color(chute));
add("head-box", blk(0, 0, TZ - 400, 640, 640, 460).color(chute));
add("flop-actuator", barXZ(-340, TZ - 300, -340, TZ + 300, -340, 60, 60).color('#c9ced1'));
add("flop-shaft", cylinder(760, 30, 8).rotateX(-90).translate(-340, -380, TZ - 140).color(rubber));

// Telescoping spout: nested sections stepping in, rubber skirt at the end.
const sections: [number, number, number][] = [[560, TZ - 400, 520], [500, TZ - 940, 560], [440, TZ - 1520, 600]];
for (const [w, z, h] of sections) {
  add(`spout-${w}`, blk(0, 0, z - h, w, w, h).color(chute));
  add(`spout-ring-${w}`, blk(0, 0, z - h, w + 40, w + 40, 50).color(structure));
}
add("cable-reel", cylinder(260, 130, 14).rotateX(-90).translate(-420, 380, TZ + 160).color(structure));
add("lift-cable", blk(-330, 0, TZ - 2120, 12, 12, 2280).color(rubber));
add("skirt", blk(0, 0, TZ - 2400, 420, 420, 300).subtract(blk(0, 0, TZ - 2420, 360, 360, 340)).color(rubber));

// Residue heap filling the bay under the spout, with lumps.
add("heap", sphere(1400).subtract(blk(0, 0, -1400, 3000, 3000, 2100)).translate(0, 200, -660).color(residue));
const lumps: [number, number, number, number, number, number, number, string][] = [
  [-500, -300, 620, 520, 80, 70, 30, '#a8704a'],
  [420, -200, 640, 400, 70, 60, -40, '#8a5a3c'],
  [-200, 500, 720, 360, 90, 60, 70, '#a8704a'],
];
for (const [x, y, z, l, w, h, rz, c] of lumps) add(`timber-${x}`, box(l, w, h, true).rotateY(12).rotateZ(rz).translate(x, y, z).color(c));
for (const [x, y, z, r] of [[-700, -700, 180, 120], [300, -650, 400, 100], [600, 300, 620, 110], [-300, 100, 740, 90]] as [number, number, number, number][]) {
  add(`stone-${x}`, sphere(r).translate(x, y, z).color('#8f8a80'));
}
for (const [x, y, z, rx] of [[100, -500, 560, 25], [-650, 200, 600, -20], [250, 450, 710, 15]] as [number, number, number, number][]) {
  add(`film-${x}`, box(420, 320, 12, true).rotateX(rx).rotateZ(25).translate(x, y, z).color('#d9dcd6'));
}
add("spilled-bag", sphere(220).translate(-1050, -1250, 260).color('#2f3437'));

return p.model();
