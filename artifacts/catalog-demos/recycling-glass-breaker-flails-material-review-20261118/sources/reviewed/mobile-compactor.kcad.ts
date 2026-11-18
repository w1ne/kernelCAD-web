// SPDX-License-Identifier: CC0-1.0
// Mobile compactor: the self-contained portable compactor that a hooklift
// truck picks up whole and hauls to the transfer station. What makes it
// that unit rather than a skip: a long sealed container body with ribbed
// sides and a slightly tapered roof, a charge box at the front with an open
// loading hopper and the ram behind it, an on-board hydraulic power pack and
// control box, the hooklift A-frame and hook bar at the front, long-sill
// runners with rear rollers, a hinged rear door with lever locks and
// chevron stripes, and a few bags waiting in the hopper.
// Generic visualization geometry at about real size (6.2 m long, 2.5 m
// wide, 2.6 m tall), millimetres, Z up, hook end and hopper on -X, door on +X.

meta({
  name: "mobile-compactor",
  license: 'CC0-1.0',
  title: "Mobile compactor",
  description: "Portable hooklift self-contained compactor at about real size: ribbed sealed container body with tapered roof, front charge box with open loading hopper and ram, on-board hydraulic power pack and control box, hooklift A-frame with hook bar, long-sill runners with rear rollers, hinged rear door with lever locks and chevron stripes, and bags in the hopper (hopper lid open or closed). Material controls: container paint, charge box paint, hydraulics and fittings, and waste bags. municipal, weathered, retail and highVisibility presets.",
  tags: ["recycling", "compactor", "portable compactor", "self-contained", "hooklift", "roll-off", "container", "waste transport", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const container = param('container', '#566d6d', { label: 'Container body (paint)' });
const chargeBox = param('chargeBox', '#f0c419', { label: 'Charge box and hopper (paint)' });
const hydraulics = param('hydraulics', '#2b2f33', { label: 'Hydraulics, runners and hook (dark steel)' });
const bags = param('bags', '#3a3d40', { label: 'Waste bags' });
const lid = param('lidPosition', 'open', { choices: ['open', 'closed'], label: 'Hopper lid' });

presets({
  municipal: { container: '#566d6d', chargeBox: '#f0c419', hydraulics: '#2b2f33', bags: '#3a3d40' },
  weathered: { container: '#5e6157', chargeBox: '#c49a3c', hydraulics: '#3a3a36', bags: '#4a4a46' },
  retail: { container: '#2f5d9a', chargeBox: '#d9d9d4', hydraulics: '#2b2f33', bags: '#2f7a4f' },
  highVisibility: { container: '#c8322a', chargeBox: '#ffd044', hydraulics: '#2b2f33', bags: '#3a3d40' },
});

const p = assembly("mobile-compactor");
// Built with the hook end on +X, then turned so the hook end and hopper face the viewer (-X).
const add = (name: string, shape: Shape) => p.part(name, shape.rotateZ(180).scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const steel = '#c4c9cb';

const X0 = -3100, XB = 1000, X1 = 3100, W = 2400, ZR = 260; // container end, body/charge-box split, hook end, width, runner top
const H0 = 2550, H1 = 2350; // roof height at the door and at the charge box

// Long-sill runners and rear rollers.
for (const y of [-500, 500]) {
  add(`runner-${y > 0 ? 'b' : 'f'}`, blk(0, y, 60, X1 - X0, 160, ZR - 60).color(hydraulics));
  add(`roller-${y > 0 ? 'b' : 'f'}`, cylinder(180, 120, 14).rotateX(90).translate(X0 + 150, y + 90, 120).color(hydraulics));
}
add("runner-nose", blk(X1 - 150, 0, 0, 300, 1160, ZR).color(hydraulics));

// Container body: tapered side profile, ribbed sides.
add("body", profileXZ([[X0, ZR], [XB, ZR], [XB, ZR + H1], [X0, ZR + H0]], W).color(container));
for (let k = 0; k < 6; k++) {
  const x = X0 + 450 + k * 650, top = ZR + H0 - ((x - X0) / (XB - X0)) * (H0 - H1) - 120;
  for (const y of [-W / 2 - 40, W / 2 + 40]) add(`rib-${k}-${y > 0 ? 'b' : 'f'}`, blk(x, y, ZR + 60, 120, 80, top - ZR - 60).color(container));
}
for (const y of [-W / 2 - 50, W / 2 + 50]) {
  add(`top-rail-${y > 0 ? 'b' : 'f'}`, profileXZ([[X0, ZR + H0 - 180], [XB, ZR + H1 - 180], [XB, ZR + H1 - 60], [X0, ZR + H0 - 60]], 100).translate(0, y, 0).color(container));
  add(`bottom-rail-${y > 0 ? 'b' : 'f'}`, blk((X0 + XB) / 2, y, ZR, XB - X0, 100, 160).color(hydraulics));
}

// Rear door on -X with hinges, lever locks and chevrons.
add("rear-door", blk(X0 - 50, 0, ZR + 40, 100, W - 40, H0 - 100).color(container));
for (const z of [ZR + 400, ZR + H0 - 500]) add(`door-hinge-${z}`, cylinder(220, 45, 10).translate(X0 - 60, W / 2 - 40, z).color(hydraulics));
for (const y of [-500, 500]) {
  add(`lock-bar-${y > 0 ? 'b' : 'f'}`, cylinder(H0 - 300, 30, 8).translate(X0 - 130, y, ZR + 140).color(steel));
  add(`lock-lever-${y > 0 ? 'b' : 'f'}`, box(40, 40, 700, true).rotateX(y > 0 ? 70 : -70).translate(X0 - 160, y + (y > 0 ? 230 : -230), ZR + 1200).color(steel));
}
for (const [k, y] of [[0, -900], [1, -300], [2, 300], [3, 900]] as const) {
  add(`chevron-${k}`, box(16, 220, 900, true).rotateX(k % 2 ? 30 : -30).translate(X0 - 104, y, ZR + 600).color(chargeBox));
}

// Front charge box with an open hopper and the ram inside.
const CL = X1 - 500 - XB, CH = 1500;
add("charge-box", blk(XB + CL / 2, 0, ZR, CL, W, CH).subtract(blk(XB + CL / 2, 0, ZR + 500, CL - 300, W - 240, CH)).color(chargeBox));
add("hopper", profileXZ([[XB + 80, ZR + CH], [X1 - 580, ZR + CH], [X1 - 360, ZR + CH + 700], [XB - 120, ZR + CH + 700]], W + 80)
  .subtract(profileXZ([[XB + 160, ZR + CH - 20], [X1 - 660, ZR + CH - 20], [X1 - 440, ZR + CH + 720], [XB - 40, ZR + CH + 720]], W - 80))
  .color(chargeBox));
add("ram-face", blk(X1 - 800, 0, ZR + 500, 120, W - 260, 900).color(steel));
add("ram-guide", blk(X1 - 680, 0, ZR + 700, 300, 1200, 400).color(hydraulics));
if (lid.value === 'closed') {
  add("hopper-lid", blk((X1 + XB) / 2 - 240, 0, ZR + CH + 700, X1 - XB + 40, W + 120, 50).color(chargeBox));
} else {
  // Lid swung up on its far-side hinge; bags heaped in the open hopper.
  add("hopper-lid", box(X1 - XB - 180, 900, 50, true).rotateX(75).translate((X1 + XB) / 2 - 220, -W / 2 - 160, ZR + CH + 1130).color(chargeBox));
  add("chamber-floor-load", sphere(700).scale([1.3, 1.5, 0.5]).translate(XB + 800, 0, ZR + CH + 200).color(bags));
  for (let k = 0; k < 5; k++) {
    add(`bag-${k}`, sphere(260).scale([1.1, 0.9, 0.8]).translate(XB + 400 + (k % 3) * 380, -600 + k * 300, ZR + CH + 380 + (k % 2) * 120).color(k === 2 ? '#5f9ec4' : bags));
  }
}

// Power pack and control box on the hook end, then the hooklift A-frame.
add("power-pack", blk(X1 - 330, 500, ZR, 380, 1000, 1100).color(container));
add("pack-vent", blk(X1 - 140, 500, ZR + 600, 10, 700, 300).color(hydraulics));
add("control-box", blk(XB + CL / 2, W / 2 + 90, ZR + 700, 600, 180, 600).color('#d9d9d4'));
add("control-buttons", blk(XB + CL / 2, W / 2 + 185, ZR + 900, 300, 10, 120).color('#2f9a4f'));
add("estop", cylinder(30, 45, 10).rotateX(-90).translate(XB + CL / 2 + 200, W / 2 + 180, ZR + 1150).color('#d62f2a'));
add("cylinder", cylinder(1400, 110, 14).rotateY(90).translate(X1 - 1900, -350, ZR + 1000).color(hydraulics));
add("cylinder-rod", cylinder(500, 45, 10).rotateY(90).translate(X1 - 500, -350, ZR + 1000).color(steel));
for (const y of [-450, 450]) {
  add(`aframe-leg-${y > 0 ? 'b' : 'f'}`, box(180, 160, 1900, true).rotateY(-12).translate(X1 - 200, y, ZR + 950).color(hydraulics));
}
add("hook-bar", cylinder(1100, 60, 14).rotateX(90).translate(X1 + 20, 550, ZR + 1850).color(steel));
add("hook-plate", blk(X1 + 20, 0, ZR + 1650, 200, 1100, 160).color(hydraulics));
add("beacon", cylinder(150, 55, 10).translate(X1 - 300, 800, ZR + 1100).color('#f08a24'));

return p.model();
