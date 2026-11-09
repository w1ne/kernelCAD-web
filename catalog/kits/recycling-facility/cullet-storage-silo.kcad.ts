// SPDX-License-Identifier: CC0-1.0
// Cullet storage silo: the outdoor steel silo that holds crushed glass
// (cullet) until a tipper truck drives underneath and is loaded from the
// bottom. What makes it that silo rather than a tank: the round shell sits
// high on four braced legs with a steep cone hopper, a slide gate and a
// discharge spout at truck-bed height, a pneumatic fill line running up the
// side to the roof, a bin-vent dust filter, a level sensor and a caged
// ladder to a railed roof.
// Generic visualization geometry at about real size (3.2 m diameter, 11.3 m
// high), millimetres, Z up, ladder and gate actuator face the -X/-Y camera.

meta({
  name: "cullet-storage-silo",
  license: 'CC0-1.0',
  title: "Cullet storage silo",
  description: "Outdoor cullet silo at about real size: steel shell on four cross-braced legs, steep cone hopper with slide gate and truck-height discharge spout, pneumatic fill line up the side, roof bin-vent filter, level sensor, caged ladder and roof handrail. Material controls: silo shell, support structure, safety rail and fittings. plant, weathered, glassWorks and highVisibility presets.",
  tags: ["recycling", "cullet", "glass", "silo", "storage silo", "cone hopper", "truck loadout", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const shell = param('shell', '#d9dcd8', { label: 'Silo shell (painted steel)' });
const structure = param('structure', '#3a6c9c', { label: 'Legs and bracing' });
const safety = param('safety', '#f0b429', { label: 'Handrail and ladder cage' });
const fittings = param('fittings', '#8f989c', { label: 'Gate, spout and pipework' });

presets({
  plant: { shell: '#d9dcd8', structure: '#3a6c9c', safety: '#f0b429', fittings: '#8f989c' },
  weathered: { shell: '#b8b5a8', structure: '#55636c', safety: '#c09a45', fittings: '#7a7b75' },
  glassWorks: { shell: '#5d8f6a', structure: '#3d4b52', safety: '#f0b429', fittings: '#a9b1b4' },
  highVisibility: { shell: '#f2f2ee', structure: '#d4572a', safety: '#f2d21b', fittings: '#c9ced1' },
});

const p = assembly("cullet-storage-silo");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Turned profile [[radius, z], ...] about Z.
const turned = (pts: number[][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Straight bar between two points in a vertical plane of constant y (XZ) or x (YZ).
const barXZ = (x0: number, z0: number, x1: number, z1: number, y: number, t: number) => {
  const L = Math.hypot(x1 - x0, z1 - z0), a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(L, t, t, true).rotateY(-a).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};
const barYZ = (y0: number, z0: number, y1: number, z1: number, x: number, t: number) => barXZ(y0, z0, y1, z1, 0, t).rotateZ(90).translate(x, 0, 0);

const R = 1600, ZO = 2700, ZC = 4500, ZT = 10200, LG = 1150;

// Shell: cone hopper, straight wall, shallow roof cone; stiffening bands.
add("silo-body", turned([[0, ZO], [220, ZO], [R, ZC], [R, ZT], [R - 60, ZT + 60], [300, ZT + 620], [0, ZT + 620]]).color(shell));
for (const z of [ZC, ZC + 1900, ZC + 3800, ZT - 120]) add(`band-${z}`, cylinder(120, R + 30, 24).translate(0, 0, z).color(structure));

// Four legs with base plates, a ring girt and X bracing on every face.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  add(`leg-${sx}-${sy}`, blk(sx * LG, sy * LG, 0, 220, 220, ZC + 900).color(structure));
  add(`base-plate-${sx}-${sy}`, blk(sx * LG, sy * LG, 0, 420, 420, 30).color(fittings));
}
for (const s of [-1, 1]) {
  add(`girt-x-${s}`, blk(0, s * LG, 2500, 2 * LG, 160, 160).color(structure));
  add(`girt-y-${s}`, blk(s * LG, 0, 2500, 160, 2 * LG, 160).color(structure));
  for (const d of [-1, 1]) {
    add(`brace-x-${s}-${d}`, barXZ(-d * LG, 450, d * LG, 2450, s * LG, 90).color(structure));
    add(`brace-y-${s}-${d}`, barYZ(-d * LG, 450, d * LG, 2450, s * LG, 90).color(structure));
  }
}

// Slide gate with a pneumatic actuator, and a discharge spout above the truck bed.
add("gate-body", blk(0, 0, ZO - 260, 620, 620, 260).color(fittings));
add("gate-actuator", cylinder(900, 90, 12).rotateY(-90).translate(-310, 0, ZO - 130).color(safety));
add("actuator-rod", cylinder(250, 25, 8).rotateY(-90).translate(-1210, 0, ZO - 130).color(fittings));
add("spout", turned([[180, ZO - 260], [180, ZO - 900], [240, ZO - 900], [240, ZO - 960], [0, ZO - 960], [0, ZO - 260]]).color(fittings));
add("spout-sock", turned([[230, ZO - 960], [260, ZO - 1260], [0, ZO - 1260], [0, ZO - 960]]).color('#2b2f33'));

// Pneumatic fill line: truck coupling at ground level, up the -X side, over the roof.
const FX = -R - 260, FY = -900;
add("fill-coupling", blk(FX, FY, 900, 260, 260, 260).color(fittings));
add("fill-riser", cylinder(ZT + 300 - 1160, 75, 10).translate(FX, FY, 1160).color(fittings));
add("fill-elbow", sphere(110).translate(FX, FY, ZT + 300).color(fittings));
add("fill-roof-run", cylinder(-FX - 600, 75, 10).rotateY(90).translate(FX, FY, ZT + 300).color(fittings));
for (const z of [ZC + 900, ZC + 3000, ZT - 400]) add(`fill-bracket-${z}`, blk(FX + 260, FY, z, 520, 80, 80).color(structure));

// Roof: bin-vent filter, level sensor, manway and a ring handrail on posts.
add("filter-housing", cylinder(1100, 420, 16).translate(400, 300, ZT + 450).color(shell));
add("filter-cap", turned([[460, ZT + 1550], [0, ZT + 1850], [0, ZT + 1550]]).translate(400, 300, 0).color(structure));
add("level-sensor", cylinder(380, 70, 10).translate(-700, 600, ZT + 320).color(safety));
add("roof-manway", cylinder(160, 300, 14).translate(-400, -650, ZT + 260).color(fittings));
for (let k = 0; k < 12; k++) {
  const a = (k * 30 * Math.PI) / 180;
  add(`rail-post-${k}`, blk((R - 80) * Math.cos(a), (R - 80) * Math.sin(a), ZT, 50, 50, 1100).color(safety));
}
add("handrail", torus(R - 80, 30, 24).translate(0, 0, ZT + 1100).color(safety));
add("midrail", torus(R - 80, 22, 24).translate(0, 0, ZT + 600).color(safety));

// Caged ladder on -Y from a low landing up the leg frame and shell to the roof.
const LY = -R - 330;
for (const s of [-1, 1]) add(`ladder-stile-${s}`, blk(s * 230, LY, 300, 60, 60, ZT + 1100 - 300).color(fittings));
for (let z = 600; z < ZT + 900; z += 600) add(`rung-${z}`, cylinder(460, 18, 6).rotateY(90).translate(-230, LY, z).color(fittings));
for (const z of [ZC - 600, ZC + 2300, ZT - 300]) add(`ladder-standoff-${z}`, blk(0, (LY - R) / 2 + 20, z, 520, -LY - R + 40, 60).color(structure));
for (let z = 2600; z < ZT + 1100; z += 1100) {
  add(`hoop-front-${z}`, blk(0, LY - 680, z, 760, 40, 50).color(safety));
  for (const s of [-1, 1]) add(`hoop-side-${z}-${s}`, blk(s * 380, LY - 340, z, 40, 680, 50).color(safety));
}
for (const x of [-380, 0, 380]) add(`cage-bar-${x}`, blk(x, x === 0 ? LY - 680 : LY - 340, 2600, 40, 40, ZT + 1100 - 2600).color(safety));
add("ladder-landing", blk(0, LY + 40, 0, 900, 700, 300).color('#a7a39b'));

return p.model();
