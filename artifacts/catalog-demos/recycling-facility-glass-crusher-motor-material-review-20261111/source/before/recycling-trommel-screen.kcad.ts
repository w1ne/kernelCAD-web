// SPDX-License-Identifier: CC0-1.0
// Stationary trommel screen, the slowly turning drum that splits MRF or
// compost feed into fines and overs. What makes it one: a long, slightly
// inclined cylindrical screen drum built from a dark perforated shell inside
// longitudinal bars and stiffener rings; two riding tyres sitting on four
// trunnion rollers, one of them driven by a gearmotor; a feed hopper at the
// high end and an overs chute at the low end; and a fines trough under the
// drum feeding a cross conveyor that builds a fines pile. Millimetres, Z up,
// floor origin, the drum axis runs along Y and falls toward -Y.
meta({
  name: "recycling-trommel-screen",
  license: 'CC0-1.0',
  title: "Recycling trommel screen",
  description: "Stationary trommel screen at about real size: inclined screen drum with perforated shell, longitudinal bars, stiffener rings and open mouths, two riding tyres on four trunnion rollers with a driven gearmotor, feed hopper at the high end, overs chute at the low end, fines trough under the drum and a cross conveyor building a fines pile, all on a braced base frame. Material controls: base frame, screen drum, hopper and chutes, conveyor belting; weathered, highVisibility and green-plant presets.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "trommel", "screen", "compost", "conveyor", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3e5f7a', { label: 'Base frame' });
const drum = param('drum', '#a3a9ad', { label: 'Screen drum steel' });
const chutes = param('chutes', '#e0a321', { label: 'Hopper and chutes' });
const belting = param('belting', '#2c3033', { label: 'Conveyor belting and rollers' });
presets({
  weathered: { frame: '#4c5862', drum: '#7d776c', chutes: '#a98845', belting: '#3a3936' },
  highVisibility: { frame: '#d77632', chutes: '#ffd044' },
  greenPlant: { frame: '#3f6b45', chutes: '#c9cdd0', drum: '#8a9196' },
});

const p = assembly("recycling-trommel-screen");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const ring = (r0, r1, z0, z1) => turned([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);
const rod = (r, z0, z1) => turned([[0, z0], [r, z0], [r, z1], [0, z1]]);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Cross-section [[y, z], ...] extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Section [[x, z], ...] extruded across Y from y0 to y1.
const prismY = (pts, y0, y1) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
const alongY = (shape) => shape.rotateX(-90);
const alongX = (shape) => shape.rotateY(90);

// Drum frame: axis along local Y through the origin, tilted so +Y rises.
const tilt = 4, zc = 1950;
const rise = Math.sin((tilt * Math.PI) / 180);
const onDrum = (shape) => shape.rotateX(tilt).translate(0, 0, zc);
const zAt = (y) => zc + y * rise;
const shell = '#353a3e', fines = '#5b4330';

// ---- Screen drum: perforated shell, bars, stiffener rings and mouth flanges ----
add('drum-shell', onDrum(alongY(ring(1030, 1050, -3000, 3000))).color(shell));
for (let i = 0; i < 18; i++) {
  const a = (Math.PI * 2 * i) / 18;
  add(`drum-bar-${i}`, onDrum(blk(-30, -3000, 1045, 30, 3000, 1095).rotateY((a * 180) / Math.PI)).color(drum));
}
for (const y of [-1500, -750, 0, 750, 1500]) add(`drum-stiffener-${y}`, onDrum(alongY(ring(1050, 1120, y, y + 70))).color(drum));
add('mouth-feed', onDrum(alongY(ring(760, 1120, 2950, 3050))).color(drum));
add('mouth-overs', onDrum(alongY(ring(980, 1120, -3050, -2950))).color(drum));
for (const y of [-2200, 2200]) add(`riding-tyre-${y}`, onDrum(alongY(turned([[1050, y - 110], [1170, y - 110], [1190, y - 80], [1190, y + 80], [1170, y + 110], [1050, y + 110]]))).color(drum));

// ---- Trunnion rollers under each tyre; the front-right one is driven ----
const ra = (36 * Math.PI) / 180, rr = 1190 + 160;
for (const y of [-2200, 2200]) for (const s of [-1, 1]) {
  const lx = s * rr * Math.sin(ra), lz = -rr * Math.cos(ra);
  add(`trunnion-${y}-${s}`, onDrum(alongY(rod(160, y - 140, y + 140)).translate(lx, 0, lz)).color(belting));
  add(`trunnion-axle-${y}-${s}`, onDrum(alongY(rod(45, y - 330, y + 330)).translate(lx, 0, lz)).color(drum));
  const top = zAt(y) + lz;
  for (const e of [-1, 1]) add(`pillow-block-${y}-${s}-${e}`, blk(lx - 120, y + e * 280 - 60, top - 130, lx + 120, y + e * 280 + 60, top + 60).color(frame));
  add(`roller-pedestal-${y}-${s}`, blk(lx - 160, y - 380, 300, lx + 160, y + 380, top - 130).color(frame));
}
{
  const lx = rr * Math.sin(ra), lz = -rr * Math.cos(ra), y = -2200;
  add('gearbox', blk(lx - 220, y - 700, zAt(y) + lz - 220, lx + 220, y - 400, zAt(y) + lz + 260).color(frame));
  add('drive-motor', alongX(rod(170, 0, 600)).translate(lx + 220, y - 550, zAt(y) + lz + 20).color(frame));
  add('drive-motor-cowl', alongX(rod(150, 600, 700)).translate(lx + 220, y - 550, zAt(y) + lz + 20).color(belting));
}

// ---- Base frame: two long beams, cross members and diagonal braces ----
for (const s of [-1, 1]) {
  add(`base-beam-${s}`, blk(s * 760 - 150, -3300, 0, s * 760 + 150, 3300, 300).color(frame));
  add(`brace-${s}`, prismX([[-2000, 300], [-1900, 300], [1900, 1000], [1800, 1000]], s * 760 - 60, s * 760 + 60).color(frame));
}
for (const y of [-3200, 0, 3200]) add(`cross-member-${y}`, blk(-910, y - 100, 0, 910, y + 100, 300).color(frame));

// ---- Feed hopper at the high end on its own legs ----
const fy = 3050, ftop = 4000;
add('feed-hopper', prismX([[fy - 100, zAt(fy) - 200], [fy + 400, zAt(fy) - 200], [fy + 1300, ftop], [fy - 300, ftop]], -1150, 1150).color(chutes));
add('feed-hopper-mouth', prismX([[fy - 250, ftop - 30], [fy + 1250, ftop - 30], [fy + 1250, ftop + 5], [fy - 250, ftop + 5]], -1050, 1050).color(shell));
for (const [y0, y1] of [[fy - 340, fy - 220], [fy + 1220, fy + 1340]]) add(`feed-hopper-rim-${y0}`, blk(-1200, y0, ftop, 1200, y1, ftop + 60).color(frame));
for (const x of [-1, 1]) add(`feed-hopper-rim-side-${x}`, blk(x > 0 ? 1080 : -1200, fy - 340, ftop, x > 0 ? 1200 : -1080, fy + 1340, ftop + 60).color(frame));
add('feed-spout', onDrum(alongY(ring(0, 700, 2700, 3000))).color(chutes));
for (const x of [-1050, 1050]) for (const y of [fy + 50, fy + 1150]) add(`hopper-leg-${x}-${y}`, blk(x - 80, y - 80, 0, x + 80, y + 80, zAt(fy) + (y > fy + 500 ? 900 : -200)).color(frame));

// ---- Overs chute at the low end ----
const oy = -3050;
add('overs-chute', prismX([[oy + 100, zAt(oy) + 800], [oy - 300, zAt(oy) + 800], [oy - 1400, 500], [oy - 900, 500]], -1150, 1150).color(chutes));
for (const s of [-1, 1]) add(`overs-chute-cheek-${s}`, prismX([[oy + 100, zAt(oy) + 1000], [oy - 300, zAt(oy) + 1000], [oy - 1400, 750], [oy - 1400, 500], [oy - 300, zAt(oy) + 800], [oy + 100, zAt(oy) + 800]], s > 0 ? 1150 : -1210, s > 0 ? 1210 : -1150).color(chutes));
const overs = [];
for (let i = 0; i <= 8; i++) {
  const a = (Math.PI * i) / 8;
  overs.push([Math.cos(a) * 1300, Math.sin(a) * 650]);
}
add('overs-pile', prismX(overs.map(([y, z]) => [oy - 1900 + y * 0.8, z]), -900, 900).color('#7b7f6c'));

// ---- Fines trough under the drum and cross conveyor to a fines pile ----
add('fines-trough', prismY([[-1120, 1100], [1120, 1100], [450, 700], [-450, 700]], -2000, 2000).color(chutes));
add('fines-trough-lip', prismY([[-1180, 1100], [1180, 1100], [1180, 1160], [-1180, 1160]], -2000, 2000).color(frame));
const cz0 = 450, cx1 = 4400, cz1 = 1500;
const slope = (Math.atan2(cz1 - cz0, cx1 + 500) * 180) / Math.PI;
const run = Math.hypot(cx1 + 500, cz1 - cz0);
const belt = (shape) => shape.rotateY(-slope).translate(-500, 0, cz0);
add('conveyor-belt', belt(blk(0, -450, -20, run, 450, 30)).color(belting));
add('conveyor-stringer-front', belt(blk(0, -520, -180, run, -450, 60)).color(frame));
add('conveyor-stringer-back', belt(blk(0, 450, -180, run, 520, 60)).color(frame));
add('head-pulley', belt(alongY(rod(150, -460, 460)).translate(run, 0, -120)).color(belting));
add('tail-pulley', belt(alongY(rod(130, -460, 460)).translate(0, 0, -110)).color(belting));
for (const x of [1600, 3400]) {
  const z = cz0 + ((x + 500) / (cx1 + 500)) * (cz1 - cz0);
  for (const s of [-1, 1]) add(`conveyor-leg-${x}-${s}`, blk(x - 50, s * 480 - 40, 0, x + 50, s * 480 + 40, z - 150).color(frame));
}
add('fines-pile', turned([[0, 0], [1500, 0], [0, 1300]]).translate(cx1 + 700, 0, 0).color(fines));

return p.model();
