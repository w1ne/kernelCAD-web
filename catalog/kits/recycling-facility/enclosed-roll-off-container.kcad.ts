// SPDX-License-Identifier: CC0-1.0
// Enclosed roll-off container: the lidded steel box a hook-lift truck winches
// onto its bed to haul compacted or weather-sensitive loads away from the
// site. What makes it that container rather than a skip: a long, slab-sided
// body with a raked nose, vertical stiffening ribs and a top rail down both
// sides, two long-member rails underneath that it slides on, big steel
// rollers at the rear for rolling off the truck, a hook-lift A-frame and
// bail on the nose, a roof of sliding steel hatches, and full-height rear
// barn doors with cam lock bars.
// Generic visualization geometry at about real size (6.3 m long, 2.3 m
// high), millimetres, Z up, nose on -X, long side facing -Y.

meta({
  name: "enclosed-roll-off-container",
  license: 'CC0-1.0',
  title: "Enclosed roll-off container",
  description: "Enclosed hook-lift roll-off container at about real size: raked-nose steel body with vertical stiffening ribs and top rails, long-member slide rails and rear rollers, hook-lift A-frame with bail, sliding roof hatches with handles, rear barn doors with cam lock bars and hinges, and hazard-striped rear corners. Material controls: body paint, underframe, roof hatches and hardware. hauler, weathered, municipal and highVisibility presets.",
  tags: ["recycling", "roll-off container", "hook-lift", "enclosed container", "waste hauling", "skip", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#2f6b4f', { label: 'Body and ribs (paint)' });
const underframe = param('underframe', '#2b2f33', { label: 'Rails, rollers and A-frame' });
const hatch = param('hatch', '#7a8a86', { label: 'Roof hatches (steel)' });
const hardware = param('hardware', '#c9ccce', { label: 'Lock bars, hinges and handles' });
const lids = param('lids', 'closed', { choices: ['closed', 'open'], label: 'Roof hatches' });

presets({
  hauler: { body: '#2f6b4f', underframe: '#2b2f33', hatch: '#7a8a86', hardware: '#c9ccce' },
  weathered: { body: '#5d6a52', underframe: '#4a3f36', hatch: '#867a6a', hardware: '#9a8f80' },
  municipal: { body: '#2a5598', underframe: '#2b2f33', hatch: '#9aa6b2', hardware: '#d4d8dc' },
  highVisibility: { body: '#e0821f', underframe: '#2b2f33', hatch: '#f0c419', hardware: '#e6e6e6' },
});

const p = assembly("enclosed-roll-off-container");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const hazard = '#f0c419';

const X0 = -3000, X1 = 3000, W = 2300, Z0 = 300, ZT = 2300; // body extents
const HY = W / 2;

// Underframe: two long-member rails with a bevelled nose, cross-members, rear rollers.
for (const y of [-520, 520]) {
  add(`rail-${y > 0 ? 'b' : 'f'}`, face([[X0 + 150, 60], [X1, 60], [X1, Z0], [X0 - 60, Z0], [X0 - 60, 200]], 160, y - 80).color(underframe));
  add(`roller-${y > 0 ? 'b' : 'f'}`, cylinder(180, 140, 16).rotateX(90).translate(X1 - 160, y + 90, 140).color(underframe));
  add(`roller-hub-${y > 0 ? 'b' : 'f'}`, cylinder(200, 50, 10).rotateX(90).translate(X1 - 160, y + 100, 140).color(hardware));
}
for (let x = X0 + 400; x < X1; x += 1100) add(`cross-member-${x - X0}`, blk(x, 0, 160, 120, W - 100, Z0 - 160).color(underframe));

// Body shell with a raked nose.
add("body", face([[X0, Z0], [X1, Z0], [X1, ZT], [X0 + 350, ZT], [X0, ZT - 500]], W, -HY).color(body));
for (let x = X0 + 600; x < X1 - 100; x += 600) {
  for (const s of [-1, 1]) add(`rib-${x - X0}-${s > 0 ? 'b' : 'f'}`, blk(x, s * (HY + 30), Z0, 90, 60, ZT - Z0 - 80).color(body));
}
for (const s of [-1, 1]) {
  add(`top-rail-${s > 0 ? 'b' : 'f'}`, blk(160, s * (HY + 45), ZT - 120, X1 - X0 - 330, 90, 120).color(body));
  add(`bottom-rail-${s > 0 ? 'b' : 'f'}`, blk(0, s * (HY + 35), Z0, X1 - X0, 70, 110).color(underframe));
}
add("nose-plate", face([[X0 - 30, Z0 + 100], [X0 - 30, ZT - 520], [X0 + 330, ZT - 30]], 40, -HY + 200).color(body));

// Hook-lift A-frame and bail on the nose.
for (const y of [-450, 450]) add(`a-frame-${y > 0 ? 'b' : 'f'}`, rod([X0 - 10, y, Z0 + 80], [X0 - 260, y * 0.25, 1650], 55).color(underframe));
add("a-frame-brace", rod([X0 - 140, -320, 1000], [X0 - 140, 320, 1000], 40).color(underframe));
add("hook-bail", cylinder(400, 45, 12).rotateX(90).translate(X0 - 270, 200, 1650).color(hardware));
add("bail-plate", blk(X0 - 230, 0, 1580, 80, 300, 140).color(underframe));

// Roof: three sliding steel hatches on tracks.
add("roof-track-f", blk(160, -HY + 40, ZT, X1 - X0 - 380, 80, 50).color(underframe));
add("roof-track-b", blk(160, HY - 40, ZT, X1 - X0 - 380, 80, 50).color(underframe));
const hatchX = lids.value === 'open' ? [-1700, -1500, 1500] : [-1600, 300, 1950];
hatchX.forEach((x, k) => {
  const z = ZT + 50 + (lids.value === 'open' && k === 1 ? 70 : 0);
  add(`hatch-${k}`, blk(x, 0, z, 1800, W - 60, 50).color(hatch));
  for (let r = -1; r <= 1; r++) add(`hatch-${k}-rib-${r + 1}`, blk(x + r * 560, 0, z + 50, 60, W - 160, 40).color(hatch));
  add(`hatch-${k}-handle`, rod([x - 200, -HY + 40, z + 100], [x + 200, -HY + 40, z + 100], 18, 8).color(hardware));
});

// Rear barn doors with cam lock bars and hinges.
for (const s of [-1, 1]) {
  const y = s * HY / 2;
  add(`door-${s > 0 ? 'b' : 'f'}`, blk(X1 + 25, y, Z0 + 40, 50, HY - 30, ZT - Z0 - 80).color(body));
  for (const dy of [-280, 280]) {
    add(`lock-bar-${s > 0 ? 'b' : 'f'}-${dy > 0 ? 'o' : 'i'}`, cylinder(ZT - Z0 - 40, 22, 8).translate(X1 + 80, y + dy, Z0 + 20).color(hardware));
    add(`lock-cam-${s > 0 ? 'b' : 'f'}-${dy > 0 ? 'o' : 'i'}`, blk(X1 + 80, y + dy, ZT - 120, 60, 80, 100).color(hardware));
    add(`lock-handle-${s > 0 ? 'b' : 'f'}-${dy > 0 ? 'o' : 'i'}`, blk(X1 + 95, y + dy + 60, 1200, 30, 140, 40).color(hardware));
  }
  for (const z of [700, 1300, 1900]) add(`hinge-${s > 0 ? 'b' : 'f'}-${z}`, cylinder(160, 35, 8).translate(X1 + 40, s * (HY - 20), z).color(hardware));
}
for (const s of [-1, 1]) for (let k = 0; k < 4; k++) add(`hazard-${s > 0 ? 'b' : 'f'}-${k}`, blk(X1 - 120, s * (HY + 62), Z0 + 200 + k * 420, 160, 6, 160).color(hazard));
add("id-plate", blk(-1600, -HY - 62, 1300, 900, 6, 420).color('#e6e6e2'));
add("id-plate-band", blk(-1600, -HY - 66, 1360, 820, 6, 90).color(underframe));

return p.model();
