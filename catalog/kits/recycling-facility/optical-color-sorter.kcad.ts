// SPDX-License-Identifier: CC0-1.0
// Optical color sorter: the chute-type colour sorter used to clean glass
// cullet or plastic flakes. Material drops from a top hopper onto vibratory
// feeders, slides down inclined chutes past front and rear cameras, and an
// air-jet bar blows the off-colour pieces into the reject outlet. What makes
// it that machine rather than a cabinet: the stepped cabinet with its sloped
// camera front and wide viewing window, the feed hopper on top filled by an
// inclined infeed conveyor, the side inspection opening showing the inclined
// chute and a stream of flakes, and the two outlet funnels dropping into an
// accept tote at the front and a reject tote at the back. An HMI on a swing
// arm and a signal tower sit on the operator side.
// Generic visualization geometry at about real size (2.4 m wide, 3.2 m
// tall), millimetres, Z up, operator front on -Y.

meta({
  name: "optical-color-sorter",
  license: 'CC0-1.0',
  title: "Optical color sorter",
  description: "Chute-type optical colour sorter at about real size: stepped cabinet with sloped camera front and viewing window, top feed hopper filled by an inclined infeed conveyor, side inspection opening showing the inclined chute and falling flakes, accept and reject outlet funnels into two totes, HMI on a swing arm, air filter-regulator and signal tower. Product set to glass cullet or plastic flakes. Material controls: cabinet, stainless chutes, window glass and brand accent. plant, weathered, graphite and highVisibility presets.",
  tags: ["recycling", "colour sorter", "color sorter", "optical sorter", "chute sorter", "cullet", "flakes", "air jet", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#dfe3e4', { label: 'Cabinet (powder coat)' });
const chute = param('chute', '#b6bec1', { label: 'Hopper and chutes (stainless)' });
const glass = param('glass', '#1f3540', { label: 'Viewing window (glass)' });
const accent = param('accent', '#1f6fb2', { label: 'Brand accent and stand' });
const product = param('product', 'cullet', { choices: ['cullet', 'flakes'], label: 'Product' });

presets({
  plant: { cabinet: '#dfe3e4', chute: '#b6bec1', glass: '#1f3540', accent: '#1f6fb2' },
  weathered: { cabinet: '#bdb8ad', chute: '#8e9294', glass: '#2a3a40', accent: '#4f6478' },
  graphite: { cabinet: '#3f4448', chute: '#c4c9cb', glass: '#14202a', accent: '#e07a2a' },
  highVisibility: { cabinet: '#f2f2ee', chute: '#c9ccce', glass: '#1c2a33', accent: '#e0a526' },
});

const p = assembly("optical-color-sorter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const plane = (z: number) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] });
const funnel = (w0: number, d0: number, z0: number, w1: number, d1: number, z1: number, t: number) =>
  rect(w0, d0).loft([rect(w1, d1)], { planes: [plane(z0), plane(z1)], ruled: true })
    .subtract(rect(w0 - 2 * t, d0 - 2 * t).loft([rect(w1 - 2 * t, d1 - 2 * t)], { planes: [plane(z0 - 1), plane(z1 + 1)], ruled: true }));

const cullet = product.value === 'cullet';
const pieceColours = cullet ? ['#3f8f5a', '#e6efe9', '#8a5a2b', '#a9cfc0'] : ['#a9d3e0', '#3f8f5a', '#e9e6dc', '#2f6fb5'];
const W = 2400, Z0 = 950, ZT = 2450;

// Stand on four legs with outlet funnels between them.
for (const x of [-W / 2 + 80, W / 2 - 80]) {
  for (const y of [-650, 650]) {
    add(`leg-${x < 0 ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, blk(x, y, 0, 120, 120, Z0).color(accent));
    add(`leg-foot-${x < 0 ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, blk(x, y, 0, 220, 220, 16).color(accent));
  }
}
for (const y of [-650, 650]) add(`stand-rail-${y < 0 ? 'f' : 'b'}`, blk(0, y, 260, W - 160, 80, 80).color(accent));
add("accept-funnel", funnel(500, 300, 620, W - 300, 560, Z0, 16).translate(0, -330, 0).color(chute));
add("reject-funnel", funnel(400, 260, 660, W - 500, 460, Z0, 16).translate(0, 380, 0).color(chute));

// Totes under the outlets.
const tote = (y: number, c: string, n: string) => {
  add(`${n}-tote`, funnel(1100, 560, 40, 1200, 620, 600, 20).translate(0, y, 0).color(c));
  add(`${n}-tote-floor`, blk(0, y, 40, 1100, 560, 20).color(c));
  for (const x of [-480, 480]) add(`${n}-tote-runner-${x < 0 ? 'l' : 'r'}`, blk(x, y, 0, 100, 600, 40).color('#3a3d40'));
  add(`${n}-tote-load`, sphere(380).scale([1.4, 0.7, 0.6]).translate(0, y, 520).subtract(blk(0, y, 0, 1200, 700, 470)).color(n === 'accept' ? pieceColours[1] : pieceColours[2]));
};
tote(-330, '#2f7d4f', 'accept');
tote(380, '#c8322a', 'reject');

// Stepped cabinet with a sloped camera front.
add("cabinet", profileYZ([[-750, Z0], [750, Z0], [750, ZT], [-150, ZT], [-750, 1950]], W)
  .subtract(blk(-W / 2, 0, 1150, 360, 1000, 720)).color(cabinet));
add("plinth-band", blk(0, 0, Z0, W + 20, 1520, 60).color(accent));
add("viewing-window", blk(0, -756, 1350, W - 500, 14, 420).color(glass));
add("window-frame-top", blk(0, -760, 1770, W - 440, 20, 30).color(accent));
add("window-frame-bottom", blk(0, -760, 1320, W - 440, 20, 30).color(accent));
for (const x of [-W / 6, W / 6]) add(`door-seam-${x < 0 ? 'l' : 'r'}`, blk(x, -756, Z0 + 80, 10, 10, 240).color('#9aa1a4'));
for (const x of [-W / 3, 0, W / 3]) add(`door-handle-${Math.round(x + W)}`, blk(x + 120, -768, 1120, 30, 24, 120).color('#5d6366'));
// Lamp housing along the sloped face.
add("lamp-housing", box(W - 400, 160, 120, true).rotateX(-34).translate(0, -450, 2240).color(glass));
add("accent-stripe", box(W, 20, 80, true).rotateX(-34).translate(0, -600, 2050).color(accent));

// Side inspection opening (-X) with the inclined chute and a stream of flakes.
add("chute-plate", box(260, 900, 16, true).rotateX(-38).translate(-W / 2 + 110, -20, 1500).color(chute));
let seed = cullet ? 7 : 19;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
for (let k = 0; k < 14; k++) {
  const t = k / 13;
  const y = 330 - t * 700, z = 1830 - t * 560;
  add(`flake-${k}`, blk(0, 0, 0, 40 + rnd() * 30, 30 + rnd() * 30, 10).rotateZ(rnd() * 180).rotateX(-38)
    .translate(-W / 2 + 60 + rnd() * 100, y, z + 20).color(pieceColours[k % pieceColours.length]));
}
add("ejector-bar", blk(-W / 2 + 120, -420, 1170, 160, 80, 70).color('#2b2f33'));

// Top feed hopper with channel dividers and product heap.
add("feed-hopper", funnel(W - 500, 500, ZT, W - 200, 1000, ZT + 450, 14).translate(0, 250, 0).color(chute));
add("hopper-heap", sphere(600).scale([1.6, 0.7, 0.22]).translate(0, 250, ZT + 260).color(pieceColours[0]));
for (let k = 1; k < 6; k++) add(`channel-fin-${k}`, blk(-W / 2 + 150 + k * (W - 300) / 6, 250, ZT, 10, 480, 220).color(chute));

// Inclined infeed conveyor from the floor on +X up over the hopper.
const L = 3600, ANG = 32;
const conv = (s: Shape) => s.rotateY(ANG).translate(W / 2 + 1100, 250, 2050);
add("infeed-belt", conv(blk(0, 0, 0, L, 560, 20)).color('#24272a'));
for (const s of [-1, 1]) add(`infeed-stringer-${s < 0 ? 'f' : 'b'}`, conv(blk(0, s * 310, -160, L, 50, 180)).color(accent));
add("infeed-load", conv(sphere(220).scale([3.2, 0.9, 0.18]).translate(-300, 0, 20)).color(pieceColours[0]));
const beltZ = (x: number) => 2050 - (x - (W / 2 + 1100)) * Math.tan((ANG * Math.PI) / 180);
for (const x of [W / 2 + 900, W / 2 + 2200]) {
  for (const s of [-1, 1]) add(`infeed-leg-${Math.round(x)}-${s < 0 ? 'f' : 'b'}`, blk(x, 250 + s * 310, 0, 80, 80, beltZ(x) - 190).color(accent));
}
add("infeed-motor", cylinder(260, 140, 12).rotateX(90).translate(W / 2 + 2350, 0, 1080).color('#5d6366'));

// HMI on a swing arm, filter-regulator and signal tower.
add("hmi-arm", blk(-W / 2 + 200, -900, 1900, 60, 300, 60).color('#5d6366'));
add("hmi-post", blk(-W / 2 + 200, -770, 1900, 60, 60, 300).color('#5d6366'));
add("hmi-screen", box(520, 60, 380, true).rotateX(-12).translate(-W / 2 + 200, -1080, 1920).color('#2b2f33'));
add("hmi-display", box(460, 10, 320, true).rotateX(-12).translate(-W / 2 + 200, -1114, 1925).color('#2b6e9a'));
add("filter-regulator", cylinder(260, 60, 10).translate(W / 2 + 70, -500, 1200).color('#c9ccce'));
add("air-hose", cylinder(Z0 + 250, 18, 8).translate(W / 2 + 70, -500, 0).color('#2f5d9a'));
add("tower-pole", cylinder(200, 20, 8).translate(W / 2 - 150, -600, ZT).color('#5d6366'));
['#2f9a4f', '#f0ae32', '#c8322a'].forEach((c, i) => add(`signal-${i}`, cylinder(90, 42, 10).translate(W / 2 - 150, -600, ZT + 200 + i * 90).color(c)));

return p.model();
