// SPDX-License-Identifier: CC0-1.0
// Vehicle barrier gate: the automatic arm barrier at a recovery site's
// weighbridge entry. What makes it a barrier rather than a pole on a box: a
// tall rounded drive cabinet with a lockable door and a vented top, a
// rotating hub on the cabinet's road side, a long lightweight boom striped
// red and white with a rubber bottom edge, a fork rest post that catches the
// boom tip, an amber LED beacon on the cabinet, and a photo-eye pair either
// side of the lane. The boom angle is a parameter, from closed to fully up.
// Generic visualization geometry at about real size (4 m boom, cabinet
// 1.1 m tall), millimetres, Z up, lane runs along Y, road side on -Y.

meta({
  name: "vehicle-barrier-gate",
  license: 'CC0-1.0',
  title: "Vehicle barrier gate",
  description: "Automatic arm barrier at about real size: rounded drive cabinet with lockable door, vented top and access hatch, rotating hub, 4 m striped boom with rubber bottom edge, fork rest post, amber LED beacon and photo-eye pair. Boom angle from closed to fully up. Material controls: cabinet, boom, stripes and beacon. Optional rest post. siteOrange, councilBlue and weathered presets.",
  tags: ['barrier', 'boom barrier', 'arm barrier', 'boom gate', 'access control', 'weighbridge', 'reception', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#e07b24', { label: 'Drive cabinet (powder coat)' });
const boom = param('boom', '#f2f0ea', { label: 'Boom (white aluminium)' });
const stripes = param('stripes', '#c62d2a', { label: 'Boom stripes' });
const beacon = param('beacon', '#f2a01c', { label: 'Beacon lens' });
const boomAngle = param('boomAngle', 'closed', { choices: ['closed', 'half', 'open'], label: 'Boom position' });
const restPost = param('restPost', true, { label: 'Fork rest post' });

presets({
  siteOrange: { cabinet: '#e07b24', boom: '#f2f0ea', stripes: '#c62d2a', beacon: '#f2a01c' },
  councilBlue: { cabinet: '#2c4f7c', boom: '#f2f0ea', stripes: '#c62d2a', beacon: '#f2a01c' },
  weathered: { cabinet: '#9a6a3e', boom: '#cfc9b8', stripes: '#8d3a2e', beacon: '#c99436' },
});

const p = assembly("vehicle-barrier-gate");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

// Drive cabinet: plinth, rounded body, vented cap, door with lock and hatch.
const CW = 360;
const CD = 340;
const CH = 1100;
add("plinth", blk(0, 0, 0, 520, 480, 40).color('#8a8d88'));
for (const [x, y] of [[-200, -180], [200, -180], [-200, 180], [200, 180]]) add(`anchor-${x}-${y}`, cylinder(30, 14, 8).translate(x, y, 40).color('#4a4c4e'));
add("cabinet-body", extrudeRoundedRect(CW, CD, 50, CH - 60).translate(0, 0, 40).color(cabinet));
add("cabinet-cap", extrudeRoundedRect(CW + 30, CD + 30, 60, 50).translate(0, 0, CH - 20).color(cabinet));
for (let i = 0; i < 4; i++) add(`vent-${i}`, blk(0, CD / 2 + 2, CH - 160 + i * 28, 220, 6, 12).color('#2b2d2f'));
// Door on the -X face (towards the operator), with handle lock.
add("door", blk(-CW / 2 - 3, 0, 120, 6, CD - 70, CH - 330).color(cabinet));
add("door-seam", blk(-CW / 2 - 5, 0, 120, 4, CD - 50, 10).color('#2b2d2f'));
add("door-lock", cylinder(20, 18, 10).rotateY(-90).translate(-CW / 2 - 6, 110, CH - 380).color('#b9c0c2'));
add("door-handle", blk(-CW / 2 - 18, 110, CH - 470, 24, 30, 70).color('#2b2d2f'));
add("warning-sticker", box(110, 4, 110, true).rotateY(45).translate(0, -CD / 2 - 3, 700).color('#f2d21c'));
add("warning-sticker-mark", blk(0, -CD / 2 - 6, 680, 12, 3, 50).color('#1b1c1d'));

// Beacon on the cabinet cap.
add("beacon-base", cylinder(30, 50, 16).translate(-80, -60, CH + 30).color('#2b2d2f'));
add("beacon-lens", turnedLens().translate(-80, -60, CH + 60).color(beacon));
function turnedLens() {
  return path().moveTo(0, 0).lineTo(46, 0).lineTo(46, 70).lineTo(30, 100).lineTo(0, 106).close().revolve();
}

// Hub and boom on the +X face; boom runs along +X when closed.
const HZ = CH - 180;
const HX = CW / 2;
add("hub-flange", cylinder(40, 120, 20).rotateY(90).translate(HX, 0, HZ).color('#b9c0c2'));
add("hub-cap", cylinder(40, 80, 20).rotateY(90).translate(HX + 40, 0, HZ).color('#2b2d2f'));
const ang = boomAngle.value === 'open' ? 88 : boomAngle.value === 'half' ? 45 : 0;
const L = 4000;
const BH = 100;
const BX = HX + 50;
// Boom built along +X from the hub axis, then raised about the hub.
const raise = (s: Shape) => s.rotateY(-ang).translate(BX, 0, HZ);
add("boom-tube", raise(extrudeRoundedRect(BH, 70, 22, L, { axis: 'x' }).translate(0, 0, 0)).color(boom));
add("boom-clamp", raise(blk(150, 0, -80, 300, 110, 160)).color(cabinet));
for (let i = 0; i < 7; i++) {
  if (i % 2 === 1) continue;
  add(`stripe-${i}`, raise(blk(500 + i * 500 + 250, 0, -BH / 2 - 1, 500, 74, BH + 2)).color(stripes));
}
add("rubber-edge", raise(blk(L / 2 + 150, 0, -BH / 2 - 40, L - 300, 40, 40)).color('#1b1c1d'));
add("boom-tip-cap", raise(blk(L + 15, 0, -BH / 2, 30, 74, BH)).color(stripes));
// Counterweight tail behind the hub.
add("tail-weight", raise(blk(-200, 0, -60, 260, 90, 120)).color('#2b2d2f'));

// Fork rest post at the boom tip.
if (restPost.value) {
  const RX = BX + L - 200;
  add("rest-foot", blk(RX, 0, 0, 260, 260, 20).color('#8a8d88'));
  add("rest-post", cylinder(HZ - 140, 38, 12).translate(RX, 0, 20).color(cabinet));
  add("rest-fork-base", blk(RX, 0, HZ - 120, 180, 60, 30).color('#2b2d2f'));
  for (const y of [-55, 55]) add(`rest-fork-${y}`, blk(RX, y, HZ - 120, 150, 18, 170).color('#2b2d2f'));
}

// Photo-eye pair either side of the lane, just behind the boom.
for (const [i, y] of [[0, -600], [1, 600]] as const) {
  const x = BX + 900;
  add(`eye-post-${i}`, blk(x, y, 0, 80, 80, 620).color(cabinet));
  add(`eye-head-${i}`, blk(x, y, 620, 110, 110, 150).color('#2b2d2f'));
  add(`eye-lens-${i}`, cylinder(10, 26, 12).rotateX(i === 0 ? -90 : 90).translate(x, i === 0 ? y + 55 : y - 55, 700).color('#d23a2a'));
}

return p.model();
