// SPDX-License-Identifier: CC0-1.0
// Folding stage ramp: a portable access ramp that hooks onto a stage or
// riser edge so a wheelchair, a wardrobe rail or a road case can roll up.
// What makes it a ramp rather than a wedge: two deck leaves joined by a
// piano hinge so it folds in half to carry, raised kerb rails down both
// sides, anti-slip tread strips across the slope, a hooked top lip plate
// with hinge knuckles that drops over the stage edge, a bevelled toe plate
// at the bottom, folding support legs under the top end and a tube handrail
// on posts along one side.
// Generic visualization geometry at about real size (1.8 m long, 0.9 m wide,
// rising 0.3 m), millimetres, Z up, ramp climbing toward +Y, toe on z = 0.

meta({
  name: "folding-stage-ramp",
  license: 'CC0-1.0',
  title: "Folding stage ramp",
  description: "Portable folding access ramp at about real size: two deck leaves joined by a centre piano hinge, raised kerb rails down both sides, anti-slip tread strips across the slope, a hooked top lip plate with hinge knuckles, a bevelled toe plate, folding support legs under the top end and a tube handrail on posts. Material controls: deck surface, aluminium frame, tread strips, handrail. houseShow, accessible and touring presets; with or without handrail.",
  tags: ['ramp', 'access ramp', 'wheelchair ramp', 'stage ramp', 'folding ramp', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const handrail = param('handrail', 'one side', { choices: ['one side', 'none'], label: 'Handrail' });

const deck = param('deck', '#2b2e33', { label: 'Deck surface' });
const frame = param('frame', '#b6bdc2', { label: 'Aluminium frame and kerbs' });
const tread = param('tread', '#e5b01c', { label: 'Anti-slip tread strips' });
const rail = param('rail', '#3a4147', { label: 'Handrail and legs' });

presets({
  houseShow: { deck: '#2b2e33', frame: '#b6bdc2', tread: '#e5b01c', rail: '#3a4147' },
  accessible: { deck: '#3a4a5c', frame: '#c9cfd3', tread: '#f2f0e8', rail: '#2a62b8' },
  touring: { deck: '#1c1d20', frame: '#2a2d30', tread: '#d9661f', rail: '#d4a31f' },
});

const RUBBER = '#18191b';

const p = assembly("folding-stage-ramp");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const L = 1800; // run along Y
const H = 300; // rise
const W = 900;
const Y0 = -L / 2;
const slope = Math.atan2(H, L);
const deg = (slope * 180) / Math.PI;
const zAt = (y: number) => ((y - Y0) / L) * H;
const T = 40; // deck thickness

// Deck leaves: sloped slabs with a gap at the centre hinge.
const leaf = (ya: number, yb: number) =>
  profileYZ([[ya, Math.max(zAt(ya) - T, 0)], [yb, Math.max(zAt(yb) - T, 0)], [yb, zAt(yb)], [ya, zAt(ya)]], W - 60);
add("deck-lower", leaf(Y0 + 60, -6).color(deck));
add("deck-upper", leaf(6, L / 2).color(deck));
add("centre-hinge", cylinder(W - 80, 12, 12).rotateY(90).translate(-(W - 80) / 2, 0, zAt(0) - 8).color(frame));

// Kerb rails down both sides.
for (const [s, x] of [["l", -W / 2 + 15], ["r", W / 2 - 15]] as [string, number][])
  add(`kerb-${s}`, profileYZ([[Y0 + 40, 0], [L / 2, H - T + 4], [L / 2, H + 50], [Y0 + 40, 50]], 30).translate(x, 0, 0).color(frame));

// Toe plate: bevelled lip from the floor up onto the deck.
add("toe-plate", profileYZ([[Y0 - 40, 0], [Y0 + 80, 0], [Y0 + 80, zAt(Y0 + 80) + 6], [Y0 - 40, 2]], W - 60).color(frame));

// Anti-slip tread strips across the slope.
for (let i = 0; i < 9; i++) {
  const y = Y0 + 200 + i * 175;
  if (Math.abs(y) < 40) continue;
  add(`tread-${i}`, box(W - 100, 50, 4, true).rotateX(deg).translate(0, y, zAt(y) + 6).color(tread));
}

// Hooked top lip plate with hinge knuckles.
add("lip-plate", blk(0, L / 2 + 70, H, W - 60, 140, 8).color(frame));
add("lip-hook", blk(0, L / 2 + 136, H - 60, W - 60, 8, 60).color(frame));
for (let k = 0; k < 4; k++)
  add(`lip-knuckle-${k}`, cylinder(120, 14, 12).rotateY(90).translate(-W / 2 + 70 + k * 210, L / 2, H + 2).color(frame));

// Folding support legs under the top end.
for (const [s, x] of [["l", -W / 2 + 90], ["r", W / 2 - 90]] as [string, number][]) {
  add(`leg-${s}`, blk(x, L / 2 - 120, 20, 40, 40, zAt(L / 2 - 120) - T - 16).color(rail));
  add(`leg-foot-${s}`, blk(x, L / 2 - 120, 0, 70, 70, 20).color(RUBBER));
}
add("leg-brace", blk(0, L / 2 - 120, 120, W - 180, 30, 30).color(rail));

// Handrail on posts along the left kerb.
if (handrail.value === 'one side') {
  const RH = 900;
  const XR = -W / 2 + 15;
  const posts = [Y0 + 150, 0, L / 2 - 80];
  for (const [i, y] of posts.entries()) {
    add(`rail-post-${i}`, cylinder(RH, 20, 12).translate(XR, y, zAt(y) + 40).color(rail));
    add(`rail-post-base-${i}`, blk(XR, y, zAt(y) + 30, 60, 60, 30).color(frame));
  }
  const ya = posts[0];
  const yb = posts[2];
  const len = Math.hypot(yb - ya, zAt(yb) - zAt(ya));
  add("rail-top", cylinder(len + 80, 22, 12).rotateX(-90 + deg).translate(XR, ya - 40, zAt(ya) + 40 + RH - 8).color(rail));
  add("rail-mid", cylinder(len, 14, 10).rotateX(-90 + deg).translate(XR, ya, zAt(ya) + 40 + RH / 2).color(rail));
}

return p.model();
