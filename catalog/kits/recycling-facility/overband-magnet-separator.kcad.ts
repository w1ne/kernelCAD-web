// SPDX-License-Identifier: CC0-1.0
// Cross-belt overband magnet hung over a troughed conveyor, the first
// ferrous-recovery step on most MRF and shredder lines. What makes it one: a
// heavy finned magnet block between two pulleys, wrapped by a cleated
// self-cleaning belt that runs across the conveyor and flings tin cans and
// tramp steel off to one side; a shaft-mounted gearmotor on the head pulley;
// four suspension chains to a portal gantry; a troughed conveyor of mixed
// material passing underneath; and a discharge chute dropping the ferrous
// into a skip. Millimetres, Z up, floor origin, the conveyor runs along Y and
// the magnet belt along X, discharging toward +X.
meta({
  name: "overband-magnet-separator",
  license: 'CC0-1.0',
  title: "Overband magnet separator",
  description: "Cross-belt overband magnet at about real size: finned permanent-magnet block between head and tail pulleys, cleated self-cleaning belt with captured cans, side frames with take-up screws, shaft-mounted gearmotor, four suspension chains from a portal gantry, troughed conveyor with idlers carrying mixed material underneath, ferrous discharge chute into a skip of scrap. Material controls: magnet paint, gantry and frames, belting, ferrous scrap; weathered, highVisibility and red-magnet presets.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "magnet", "overband", "ferrous", "conveyor", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const magnet = param('magnet', '#2b5c9e', { label: 'Magnet paint' });
const structure = param('structure', '#e0a321', { label: 'Gantry and frames' });
const belting = param('belting', '#2c3033', { label: 'Belting and rollers' });
const scrap = param('scrap', '#8a6a4f', { label: 'Ferrous scrap' });
presets({
  weathered: { magnet: '#45607a', structure: '#a98845', belting: '#3a3936', scrap: '#6f5440' },
  highVisibility: { structure: '#ffc93a', magnet: '#1f6fd0' },
  redMagnet: { magnet: '#b2302b', structure: '#5f6b72' },
});

const p = assembly("overband-magnet-separator");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const rod = (r, z0, z1) => turned([[0, z0], [r, z0], [r, z1], [0, z1]]);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Section [[x, z], ...] extruded across Y from y0 to y1.
const prismY = (pts, y0, y1) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
const alongY = (shape) => shape.rotateX(-90);
const alongX = (shape) => shape.rotateY(90);

const roller = '#9aa0a4', mix = ['#c94b3a', '#3d8bc9', '#e6dccb', '#5aa04a', '#d9b23a', '#8a8f93'];

// ---- Troughed conveyor along Y, with idlers, legs and a mixed load ----
const trough = [[-650, 1080], [-420, 960], [420, 960], [650, 1080], [650, 1030], [420, 910], [-420, 910], [-650, 1030]];
add('conveyor-belt', prismY(trough, -3800, 3800).color(belting));
for (const s of [-1, 1]) add(`conveyor-stringer-${s}`, blk(s * 760 - 60, -3800, 650, s * 760 + 60, 3800, 850).color(structure));
for (let i = 0; i < 9; i++) {
  const y = -3400 + i * 850;
  add(`idler-centre-${i}`, alongX(rod(65, -400, 400)).translate(0, y, 840).color(roller));
  for (const s of [-1, 1]) add(`idler-wing-${i}-${s}`, alongX(rod(65, 0, 290)).rotateY(s > 0 ? -28 : 28).translate(s * 400, y, 840).color(roller));
  add(`idler-frame-${i}`, blk(-760, y - 40, 760, 760, y + 40, 790).color(structure));
}
for (const y of [-3400, -1000, 1400, 3400]) for (const s of [-1, 1]) add(`conveyor-leg-${y}-${s}`, blk(s * 760 - 50, y - 50, 0, s * 760 + 50, y + 50, 650).color(structure));
for (let i = 0; i < 22; i++) {
  const x = ((i * 397) % 900) - 450, y = -3500 + i * 320;
  const w = 120 + ((i * 53) % 140), h = 60 + ((i * 31) % 90);
  add(`load-${i}`, blk(-w / 2, -90, 0, w / 2, 90, h).rotateZ((i * 37) % 60).translate(x, y, 960 + Math.abs(x) * 0.2).color(mix[i % mix.length]));
}

// ---- Magnet block with cooling fins, between head (+X) and tail pulleys ----
const mz0 = 1700, mz1 = 2150, hx = 1450, tx = -1350, pr = 240, pz = 1925;
add('magnet-block', blk(-950, -700, mz0, 950, 700, mz1).color(magnet));
add('magnet-face', blk(-900, -650, mz0 - 30, 900, 650, mz0).color('#c9cdd0'));
for (let i = 0; i < 9; i++) add(`magnet-fin-${i}`, blk(-880 + i * 210, -660, mz1, -820 + i * 210, 660, mz1 + 160).color(magnet));
add('magnet-terminal-box', blk(-300, -760, 1900, 300, -700, 2100).color(magnet));
add('magnet-label', blk(-250, -772, 1950, 250, -760, 2050).color('#f2f2ee'));

// ---- Pulleys and a cleated belt wrapped around them ----
for (const [name, x, r] of [['head', hx, pr], ['tail', tx, pr - 30]]) {
  add(`${name}-pulley`, alongY(rod(r, -760, 760)).translate(x, 0, pz).color(belting));
  add(`${name}-shaft`, alongY(rod(55, -980, 980)).translate(x, 0, pz).color(roller));
  for (const s of [-1, 1]) add(`${name}-bearing-${s}`, blk(x - 140, s * 900 - 70, pz - 130, x + 140, s * 900 + 70, pz + 130).color(magnet));
}
add('belt-bottom-run', blk(tx, -760, pz - pr - 20, hx, 760, pz - pr + 10).color(belting));
add('belt-top-run', blk(tx, -760, pz + pr - 10, hx, 760, pz + pr + 20).color(belting));
for (let i = 0; i < 9; i++) {
  const x = tx + 150 + i * 320;
  add(`cleat-${i}`, blk(x - 25, -740, pz - pr - 90, x + 25, 740, pz - pr - 20).color(belting));
}
// Cans and tramp steel held against the belt underside by the magnet.
for (let i = 0; i < 5; i++) {
  const x = -900 + i * 480 + (i % 2) * 90, y = -400 + ((i * 290) % 800);
  add(`captured-can-${i}`, (i % 2 ? alongY(rod(45, -70, 70)) : alongX(rod(45, -70, 70))).translate(x, y, pz - pr - 70).color(scrap));
}

// ---- Side frames with take-up screws and the shaft-mounted gearmotor ----
for (const s of [-1, 1]) {
  add(`side-frame-${s}`, blk(tx - 100, s * 820 - 40, pz - 90, hx + 100, s * 820 + 40, pz + 90).color(structure));
  add(`take-up-screw-${s}`, alongX(rod(25, -260, 0)).translate(tx - 100, s * 900, pz).color(roller));
  add(`take-up-plate-${s}`, blk(tx - 300, s * 900 - 60, pz - 80, tx - 260, s * 900 + 60, pz + 80).color(structure));
}
add('gearbox', blk(hx - 200, -1240, pz - 260, hx + 220, -980, pz + 220).color(magnet));
add('drive-motor', rod(150, 0, 560).translate(hx + 10, -1110, pz + 220).color(magnet));
add('motor-cowl', rod(130, 560, 650).translate(hx + 10, -1110, pz + 220).color(belting));
add('torque-arm', blk(hx - 40, -1150, pz - 700, hx + 40, -1070, pz - 260).color(structure));

// ---- Portal gantry and suspension chains ----
const gz = 3600;
for (const x of [-2100, 2100]) {
  for (const y of [-1500, 1500]) add(`gantry-column-${x}-${y}`, blk(x - 110, y - 110, 0, x + 110, y + 110, gz).color(structure));
  add(`gantry-beam-y-${x}`, blk(x - 120, -1620, gz, x + 120, 1620, gz + 280).color(structure));
}
for (const y of [-1500, 1500]) add(`gantry-beam-x-${y}`, blk(-2220, y - 120, gz, 2220, y + 120, gz + 280).color(structure));
for (const x of [-800, 800]) {
  add(`hanger-beam-${x}`, blk(x - 90, -1620, gz - 200, x + 90, 1620, gz).color(structure));
  for (const y of [-600, 600]) {
    add(`chain-${x}-${y}`, blk(x - 18, y - 18, mz1 + 160, x + 18, y + 18, gz - 200).color(roller));
    for (let k = 0; k < 6; k++) add(`chain-link-${x}-${y}-${k}`, blk(x - 30, y - 8, mz1 + 260 + k * 200, x + 30, y + 8, mz1 + 330 + k * 200).color(roller));
    add(`shackle-${x}-${y}`, blk(x - 50, y - 50, mz1 + 160, x + 50, y + 50, mz1 + 220).color(structure));
  }
}

// ---- Ferrous discharge chute and skip of scrap at +X ----
add('discharge-chute', prismY([[hx + 250, 2350], [hx + 420, 2350], [2900, 1450], [2700, 1300]], -800, 800).color(structure));
add('chute-hood', prismY([[hx + 250, 2350], [hx + 700, 2600], [2900, 1800], [2900, 1450], [hx + 420, 2350]], -820, -780).color(structure));
add('skip-body', prismY([[2500, 1300], [4300, 1300], [4000, 100], [2800, 100]], -900, 900).color(magnet));
add('skip-base', blk(2700, -950, 0, 4100, 950, 100).color(belting));
add('skip-rim', prismY([[2480, 1280], [4320, 1280], [4320, 1350], [2480, 1350]], -920, 920).color(magnet));
add('scrap-heap', prismY([[2600, 1200], [3000, 1450], [3400, 1550], [3900, 1400], [4200, 1200]], -850, 850).color(scrap));
for (let i = 0; i < 6; i++) add(`scrap-can-${i}`, rod(50, 0, 130).rotateY(70 + i * 15).translate(2800 + i * 230, -600 + ((i * 370) % 1200), 1420 + (i % 3) * 60).color(scrap));

return p.model();
