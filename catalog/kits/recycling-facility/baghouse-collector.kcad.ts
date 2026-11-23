// SPDX-License-Identifier: CC0-1.0
// Baghouse collector: the pulse-jet dust filter that cleans the air pulled
// off shredders, screens and trommels in a recovery plant. What makes it a
// baghouse rather than a tall cabinet: a square bag housing standing high on
// braced legs, an inverted-pyramid dust hopper under it that empties through
// a rotary airlock into a collection drum, a round dirty-air inlet duct on
// the side, a clean-air plenum on top with compressed-air pulse headers and
// diaphragm valves, a railed roof walkway reached by a caged ladder, and an
// exhaust fan with a tall stack.
// Generic visualization geometry at about real size (2 x 2 m housing, about
// 7.5 m to the stack top), millimetres, Z up, access doors on -Y.

meta({
  name: "baghouse-collector",
  license: 'CC0-1.0',
  title: "Baghouse collector",
  description: "Pulse-jet baghouse dust collector at about real size: square bag housing on braced legs, inverted-pyramid hopper with rotary airlock and collection drum, round inlet duct, clean-air plenum with pulse headers and diaphragm valves, railed roof walkway, caged access ladder and an exhaust fan with stack. Material controls: housing paint, legs and hopper structure, galvanised ducting, safety rail yellow. plantGrey, foodGradeWhite and weathered presets.",
  tags: ['baghouse', 'dust collector', 'pulse jet', 'bag filter', 'air pollution control', 'hopper', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 6500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#5f7f8f', { label: 'Bag housing and plenum (painted steel)' });
const structure = param('structure', '#3d4448', { label: 'Legs, hopper and bracing' });
const ducting = param('ducting', '#b4bcbf', { label: 'Ducting, headers and stack (galvanised)' });
const safety = param('safety', '#e2b51e', { label: 'Handrails and ladder (safety yellow)' });

presets({
  plantGrey: { housing: '#5f7f8f', structure: '#3d4448', ducting: '#b4bcbf', safety: '#e2b51e' },
  foodGradeWhite: { housing: '#e6e8e6', structure: '#9aa3a6', ducting: '#c9cfd1', safety: '#e2b51e' },
  weathered: { housing: '#6b7268', structure: '#4b4239', ducting: '#8e8a7f', safety: '#b8963a' },
});

const p = assembly("baghouse-collector");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
// A rod between two points in the XZ plane (y fixed), for bracing.
const rodXZ = (x0: number, z0: number, x1: number, z1: number, y: number, t: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = (Math.atan2(x1 - x0, z1 - z0) * 180) / Math.PI;
  return box(t, t, len, true).rotateY(ang).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};
const rodYZ = (y0: number, z0: number, y1: number, z1: number, x: number, t: number) => {
  const len = Math.hypot(y1 - y0, z1 - z0);
  const ang = (Math.atan2(y1 - y0, z1 - z0) * 180) / Math.PI;
  return box(t, t, len, true).rotateX(-ang).translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
};

const H = 2000;
const LEG = 900;
const Z_HOP = 1500;
const Z_BOX = 2600;
const Z_PLEN = 5000;
const Z_ROOF = 5500;

// Legs with base plates, and X-bracing on the front and side bays.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const t = `${sx < 0 ? 'l' : 'r'}${sy < 0 ? 'f' : 'b'}`;
  add(`leg-${t}`, blk(sx * LEG, sy * LEG, 20, 150, 150, Z_BOX - 20).color(structure));
  add(`base-plate-${t}`, blk(sx * LEG, sy * LEG, 0, 320, 320, 20).color(structure));
}
for (const sy of [-1, 1]) {
  add(`brace-x-a-${sy}`, rodXZ(-LEG, 300, LEG, Z_HOP - 100, sy * LEG, 70).color(structure));
  add(`brace-x-b-${sy}`, rodXZ(LEG, 300, -LEG, Z_HOP - 100, sy * LEG, 70).color(structure));
}
for (const sx of [-1, 1]) {
  add(`brace-y-a-${sx}`, rodYZ(-LEG, 300, LEG, Z_HOP - 100, sx * LEG, 70).color(structure));
  add(`brace-y-b-${sx}`, rodYZ(LEG, 300, -LEG, Z_HOP - 100, sx * LEG, 70).color(structure));
}
add("ring-beam", blk(0, 0, Z_BOX - 160, H + 60, H + 60, 160).subtract(blk(0, 0, Z_BOX - 200, H - 200, H - 200, 240)).color(structure));

// Inverted-pyramid dust hopper.
const hopper = rect(320, 320).loft([rect(H, H)], {
  planes: [{ plane: 'XY' as const, origin: [0, 0, Z_HOP] as [number, number, number] }, { plane: 'XY' as const, origin: [0, 0, Z_BOX - 160] as [number, number, number] }],
  ruled: true,
});
add("hopper", hopper.color(structure));
add("hopper-vibrator", blk(0, -560, 2050, 180, 120, 160).color(housing));

// Rotary airlock and drive under the hopper, dropping into a drum.
add("airlock-flange", blk(0, 0, Z_HOP - 40, 380, 380, 40).color(structure));
add("airlock-body", cylinder(420, 200, 16).rotateY(90).translate(-210, 0, Z_HOP - 240).color(housing));
add("airlock-motor", cylinder(320, 120, 12).rotateY(90).translate(210, 0, Z_HOP - 240).color(structure));
add("airlock-chute", blk(0, 0, 900, 240, 240, Z_HOP - 440 - 900).color(structure));
add("drum", cylinder(880, 290, 20).translate(0, 0, 10).color(housing));
add("drum-lid", cylinder(30, 300, 20).translate(0, 0, 880).color(structure));
for (const z of [250, 600]) add(`drum-hoop-${z}`, cylinder(24, 298, 20).translate(0, 0, z).color(structure));

// Bag housing with vertical stiffeners and two access doors on the front.
add("bag-housing", blk(0, 0, Z_BOX, H, H, Z_PLEN - Z_BOX).color(housing));
for (const x of [-990, -330, 330, 990]) add(`stiffener-f-${x}`, blk(x, -1015, Z_BOX, 50, 30, Z_PLEN - Z_BOX).color(structure));
for (const y of [-330, 330]) add(`stiffener-l-${y}`, blk(-1015, y, Z_BOX, 30, 50, Z_PLEN - Z_BOX).color(structure));
for (const sx of [-1, 1]) {
  const t = sx < 0 ? 'l' : 'r';
  add(`door-${t}`, blk(sx * 660, -1020, 3100, 480, 20, 1300).color(housing));
  add(`door-frame-${t}`, blk(sx * 660, -1012, 3060, 560, 10, 1380).color(structure));
  for (const z of [3350, 4050]) add(`door-clamp-${t}-${z}`, blk(sx * 660 + sx * 200, -1040, z, 60, 30, 120).color(ducting));
}
add("dp-gauge", cylinder(40, 110, 16).rotateX(90).translate(0, -1000, 3900).color(structure));
add("dp-gauge-face", cylinder(6, 92, 16).rotateX(90).translate(0, -1040, 3900).color('#f1f1ec'));

// Clean-air plenum, a lighter band of the same steel.
add("plenum", blk(0, 0, Z_PLEN, H + 100, H + 100, Z_ROOF - Z_PLEN).color(housing));
add("plenum-seam", blk(0, 0, Z_PLEN - 20, H + 120, H + 120, 40).color(structure));

// Pulse-jet headers along X on the roof, each with diaphragm valves.
for (const y of [-600, -200, 200, 600]) {
  add(`header-${y}`, cylinder(1800, 70, 12).rotateY(90).translate(-900, y, Z_ROOF + 120).color(ducting));
  for (const x of [-500, 0, 500]) add(`valve-${y}-${x}`, cylinder(110, 60, 10).translate(x, y, Z_ROOF + 180).color(structure));
}
add("air-tank", cylinder(1700, 140, 14).rotateY(90).translate(-850, 820, Z_ROOF + 150).color(ducting));
add("pulse-controller", blk(-700, -880, Z_ROOF, 360, 120, 420).color(structure));

// Roof handrail on all four edges (open where the ladder lands).
const RH = 1100;
const RE = H / 2 + 20;
for (const [x, y] of [[-RE, -RE], [RE, -RE], [RE, RE], [-RE, RE], [0, -RE], [RE, 0], [0, RE]]) add(`rail-post-${x}-${y}`, blk(x, y, Z_ROOF, 50, 50, RH).color(safety));
for (const z of [Z_ROOF + 550, Z_ROOF + RH - 30]) {
  add(`rail-f-${z}`, blk(0, -RE, z, H + 90, 45, 45).color(safety));
  add(`rail-b-${z}`, blk(0, RE, z, H + 90, 45, 45).color(safety));
  add(`rail-r-${z}`, blk(RE, 0, z, 45, H + 90, 45).color(safety));
  add(`rail-l-${z}`, blk(-RE, 510, z, 45, 1020, 45).color(safety));
}
add("toe-board", blk(0, -RE, Z_ROOF, H + 60, 20, 120).color(safety));

// Caged ladder up the -X side.
const LX = -1180;
for (const y of [-430, -70]) add(`ladder-stile-${y}`, blk(LX, y, 0, 50, 50, Z_ROOF + RH).color(safety));
for (let z = 300; z < Z_ROOF; z += 300) add(`rung-${z}`, cylinder(360, 14, 8).rotateX(90).translate(LX, -70, z).color(safety));
for (let z = 2400; z <= Z_ROOF + 600; z += 700) add(`cage-hoop-${z}`, torus(300, 18, 16).scale([1, 0.9, 1]).translate(LX - 260, -250, z).subtract(blk(LX + 200, -250, z - 100, 400, 800, 200)).color(safety));
for (const [x, y] of [[LX - 545, -250], [LX - 410, -500], [LX - 410, 0]]) add(`cage-bar-${y}`, blk(x, y, 2400, 30, 30, Z_ROOF + 600 - 2400).color(safety));

// Round dirty-air inlet duct entering the -X side above the hopper.
add("inlet-duct", cylinder(1300, 260, 20).rotateY(90).translate(-2300, 450, 3000).color(ducting));
add("inlet-flange", cylinder(40, 300, 20).rotateY(90).translate(-1040, 450, 3000).color(structure));
add("inlet-flange-outer", cylinder(40, 300, 20).rotateY(90).translate(-2300, 450, 3000).color(structure));

// Clean-air outlet from the plenum to the exhaust fan and stack on +X.
add("outlet-duct", cylinder(900, 220, 18).rotateY(90).translate(1050, 300, 5250).color(ducting));
add("outlet-elbow", sphere(225).translate(1950, 300, 5250).color(ducting));
add("outlet-drop", cylinder(5250 - 1500, 220, 18).translate(1950, 300, 1500).color(ducting));
add("fan-scroll", cylinder(500, 650, 22).rotateX(90).translate(1950, 550, 800).color(housing));
add("fan-motor", cylinder(500, 220, 14).rotateX(90).translate(1950, 1050, 800).color(structure));
add("fan-skid", blk(1950, 500, 0, 1500, 1300, 140).color(structure));
add("stack", cylinder(7500 - 800, 200, 18).translate(2800, 300, 800).color(ducting));
add("stack-transition", blk(2600, 300, 700, 500, 360, 360).color(ducting));
add("stack-cap", cylinder(60, 260, 18).translate(2800, 300, 7400).color(structure));
add("sample-port", cylinder(140, 50, 10).rotateX(90).translate(2800, 160, 6200).color(structure));

return p.model();
