// SPDX-License-Identifier: CC0-1.0
// Traveler curtain track: a hand-operated draw-curtain rig, shown half open
// with the stage-left panel stacked off at its end and the stage-right panel
// drawn across to centre, hung from a pipe batten.
// What makes it a traveler rather than a curtain on a pole: a box track with
// carriers riding inside it, a heavier master carrier at each leading edge,
// a live-end pulley block at one end and a dead-end block at the other, the
// operating line looping down to a weighted floor block, hanger clamps on
// the batten, and pleated drapes with header webbing and hem weights.
// Generic visualization geometry at about real size (3.2 m track, 2.6 m to
// the batten), millimetres, Z up, drape face toward -Y, the drape hems and
// floor block standing on z = 0.

meta({
  name: "traveler-curtain-track",
  license: 'CC0-1.0',
  title: "Traveler curtain track",
  description: "Hand-operated draw-curtain rig at about real size, shown half open: 3.2 m box track on hanger clamps under a pipe batten, carriers along the track, master carriers at the leading edges, live-end and dead-end pulley blocks, an operating line looping down to a weighted floor block, and two pleated drape panels with header webbing and hem chain, one stacked off and one drawn to centre. Material controls: track and batten, drape, pulleys and hardware, operating line. houseShow, touring and blackMasking presets.",
  tags: ['traveler curtain', 'traveller track', 'draw curtain', 'curtain track', 'drape', 'theatre rigging', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 4500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const track = param('track', '#26292c', { label: 'Track and batten' });
const drape = param('drape', '#9a2430', { label: 'Drape fabric' });
const hardware = param('hardware', '#aab2b6', { label: 'Pulleys, carriers and clamps' });
const line = param('line', '#e8e2cf', { label: 'Operating line' });

presets({
  houseShow: { track: '#26292c', drape: '#9a2430', hardware: '#aab2b6', line: '#e8e2cf' },
  touring: { track: '#b9c0c3', drape: '#203d6a', hardware: '#e0b13c', line: '#1f2225' },
  blackMasking: { track: '#1b1d1f', drape: '#242528', hardware: '#6c757a', line: '#d8d2bf' },
});

const WEBBING = '#e9e3d2';
const RUBBER = '#141516';

const p = assembly("traveler-curtain-track");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const alongX = (len: number, r: number, n = 16) => cylinder(len, r, n).rotateY(90); // x from 0 to len
const alongY = (len: number, r: number, n = 16) => cylinder(len, r, n).rotateX(90); // y from 0 to -len

const L = 3200;
const ZT = 2330; // track underside
const ZP = ZT + 260; // batten centre

// Box track, batten and hanger clamps.
const channel = [[-28, 60], [28, 60], [28, 0], [8, 0], [8, 6], [22, 6], [22, 54], [-22, 54], [-22, 6], [-8, 6], [-8, 0], [-28, 0]];
add("track", profileYZ(channel, L).translate(0, 0, ZT).color(track));
add("batten", alongX(L + 400, 24).translate(-L / 2 - 200, 0, ZP).color(track));
for (const x of [-1200, -400, 400, 1200]) {
  const id = `${x < 0 ? 'l' : 'r'}${Math.abs(x)}`;
  add(`hanger-${id}`, box(36, 10, ZP - ZT - 60, true).translate(x, 0, (ZP + ZT + 60) / 2).color(hardware));
  add(`clamp-${id}`, alongX(44, 34, 12).translate(x - 22, 0, ZP).color(hardware));
}

// Live-end block (stage left) and dead-end block (stage right).
const XL = -L / 2 - 70;
const XR = L / 2 + 70;
add("live-end-housing", box(160, 100, 90, true).translate(XL, 0, ZT + 70).color(track));
for (const y of [-46, 0, 46]) add(`live-end-cheek-${y < 0 ? 'f' : y > 0 ? 'b' : 'm'}`, box(150, 8, 120, true).translate(XL, y, ZT - 10).color(track));
add("live-end-sheave-front", alongY(16, 62).translate(XL, -18, ZT - 20).color(hardware));
add("live-end-sheave-back", alongY(16, 62).translate(XL, 34, ZT - 20).color(hardware));
add("dead-end-housing", box(140, 90, 140, true).translate(XR, 0, ZT + 30).color(track));
add("dead-end-sheave", alongY(16, 52).translate(XR, 8, ZT + 30).color(hardware));

// Operating line: two falls from the live end down to a weighted floor block.
const ZB = 260; // floor block sheave centre
add("line-front", cylinder(ZT - 20 - ZB, 7, 8).translate(XL - 62, -26, ZB).color(line));
add("line-back", cylinder(ZT - 20 - ZB, 7, 8).translate(XL - 62, 26, ZB).color(line));
for (const dx of [-28, 28]) add(`floor-block-cheek-${dx < 0 ? 'a' : 'b'}`, box(10, 150, 170, true).translate(XL - 62 + dx, 0, ZB).color(track));
add("floor-block-sheave", alongX(30, 60).translate(XL - 77, 0, ZB).color(hardware));
add("floor-block-weight", box(200, 160, 120, true).translate(XL - 62, 0, 60).color(RUBBER));
add("floor-block-stem", cylinder(ZB - 140, 14, 10).translate(XL - 62, 0, 120).color(hardware));

// Pleated panel: zigzag outline extruded from the hem up to the header.
const HEM = ZT - 70;
const panel = (id: string, x0: number, x1: number, n: number, depth: number, dy: number) => {
  const step = (x1 - x0) / n;
  const zig = (off: number) => {
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push([x0 + i * step, (i % 2 === 0 ? -depth : depth) + dy + off]);
    return pts;
  };
  const sheet = (a: number, b: number) => [...zig(a), ...zig(b).reverse()];
  add(`drape-${id}`, extrudePolygon(sheet(0, 7), HEM - 40).translate(0, 0, 40).color(drape));
  add(`header-${id}`, extrudePolygon(sheet(-2, 9), 80).translate(0, 0, HEM - 80).color(WEBBING));
  add(`hem-${id}`, extrudePolygon(sheet(-2, 9), 40).color(drape));
  for (let i = 0; i <= n; i += 4) {
    const x = x0 + i * step;
    add(`carrier-${id}-${i}`, box(40, 30, 26, true).translate(x, 0, ZT + 20).color(hardware));
    add(`hook-${id}-${i}`, cylinder(ZT - HEM, 4, 6).translate(x, 0, HEM).color(hardware));
  }
};
// Stage-left panel stacked off; stage-right panel drawn to centre.
panel("left", -L / 2 + 30, -L / 2 + 470, 16, 60, 0);
panel("right", -60, L / 2 - 30, 40, 32, 40);

// Master carriers at the leading edges, with overlap arm on the right one.
add("master-left", box(110, 50, 70, true).translate(-L / 2 + 500, 0, ZT + 25).color(hardware));
add("master-right", box(110, 50, 70, true).translate(-90, 0, ZT + 25).color(hardware));
add("master-arm", box(260, 14, 30, true).translate(-140, 30, ZT - 40).color(hardware));

return p.model();
