// SPDX-License-Identifier: CC0-1.0
// NFT channel rack: an A-frame nutrient film technique stand, where a thin
// film of nutrient solution runs down gently sloped channels past the roots
// of herbs and lettuce and drains back to the tank underneath.
// What makes it an NFT A-frame: two tubular A-frame ends, three tiers of
// white square-profile grow channels on each face (each tier stepping out
// as the frame widens toward the floor), plants in net pots along the
// channel tops, a feed header on the high end with spaghetti feed lines
// into every channel, a return gutter on the low end and a lidded
// reservoir with a submersible pump riser in the middle of the base.
// Generic visualization geometry at about real size (2.6 m long, 1.2 m
// wide, 1.7 m high), millimetres, Z up, one channel face toward -Y.

meta({
  name: "nft-channel-rack",
  license: 'CC0-1.0',
  title: "NFT channel rack",
  description: "Nutrient film technique A-frame at about real size: two tubular A-frame ends, three tiers of white square grow channels per face with herbs or lettuce in net pots, feed header with spaghetti lines into every channel, return gutter and a lidded reservoir with a pump riser. Material controls: frame, channels, reservoir and crop foliage. lettuce, basil, strawberry and weathered presets.",
  tags: ['nft', 'nutrient film technique', 'a-frame', 'grow channel', 'gully', 'herbs', 'lettuce', 'hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#a9b1b5', { label: 'A-frame (galvanised tube)' });
const channel = param('channel', '#f1f1ec', { label: 'Grow channels (white PVC)' });
const tank = param('tank', '#2b4f72', { label: 'Reservoir and plumbing (polyethylene)' });
const foliage = param('foliage', '#78b347', { label: 'Crop foliage' });

presets({
  lettuce: { frame: '#a9b1b5', channel: '#f1f1ec', tank: '#2b4f72', foliage: '#78b347' },
  basil: { frame: '#3a3f43', channel: '#f1f1ec', tank: '#1e2224', foliage: '#3b8a33' },
  strawberry: { frame: '#a9b1b5', channel: '#e8e4d8', tank: '#2f6b3a', foliage: '#c0392b' },
  weathered: { frame: '#8c8a80', channel: '#d2cfc1', tank: '#475a66', foliage: '#8fa35a' },
});

const p = assembly("nft-channel-rack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 10) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 10) => cylinder(len, r, seg).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const L = 2600, XE = 1150; // channel length, A-frame end position
const YF = 560, YT = 90, ZTOP = 1650; // leg foot y, apex y, apex height
const legY = (z: number) => YF - ((YF - YT) * z) / ZTOP;
const tiers = [420, 860, 1300];
const slope = 30; // channel drop over its length (high end at -X)

// A-frame ends: two tubular legs per side, apex bar, foot rails and tier arms.
for (const x of [-XE, XE]) {
  for (const s of [-1, 1]) {
    add(`foot-${x > 0 ? 'r' : 'l'}-${s > 0 ? 'b' : 'f'}`, blk(x, s * YF, 0, 120, 120, 12).color(frame));
    add(`leg-${x > 0 ? 'r' : 'l'}-${s > 0 ? 'b' : 'f'}`, rod([x, s * YF, 12], [x, s * YT, ZTOP], 22).color(frame));
  }
  add(`apex-${x > 0 ? 'r' : 'l'}`, cylZ(x, 0, ZTOP - 20, 60, 30).color(frame));
  add(`apex-bar-${x > 0 ? 'r' : 'l'}`, blk(x, 0, ZTOP - 20, 50, 2 * YT + 60, 40).color(frame));
  add(`base-bar-${x > 0 ? 'r' : 'l'}`, blk(x, 0, 180, 40, 2 * legY(180), 40).color(frame));
}
add("apex-ridge", cylX(-XE, 0, ZTOP + 10, 2 * XE, 18).color(frame));

// Channels: square profile, net pots and plants on each face.
const plants = 10;
tiers.forEach((z, t) => {
  for (const s of [-1, 1]) {
    const y = s * (legY(z) + 70);
    const tag = `${t}-${s > 0 ? 'b' : 'f'}`;
    for (const x of [-XE, XE]) add(`arm-${tag}-${x > 0 ? 'r' : 'l'}`, blk(x, s * (legY(z) + 35), z - 30, 50, 90, 30).color(frame));
    const run = blk(0, y, 0, L, 100, 60).subtract(blk(0, y, 15, L - 20, 80, 60)).rotateY((Math.atan2(slope, L) * 180) / Math.PI).translate(0, 0, z);
    add(`channel-${tag}`, run.color(channel));
    add(`channel-lid-${tag}`, blk(0, y, z + 55, L, 106, 8).rotateY((Math.atan2(slope, L) * 180) / Math.PI).color(channel));
    add(`channel-cap-${tag}`, blk(-L / 2 - 10, y, z + slope / 2 - 5, 20, 110, 75).color('#c9cbc4'));
    for (let i = 0; i < plants; i++) {
      const x = -L / 2 + 200 + i * ((L - 400) / (plants - 1));
      const zc = z + 63 - (slope * x) / L;
      add(`plant-${tag}-${i}`, sphere(80).scale([1, 0.95, 0.75]).translate(x, y + s * 10, zc + 50).color(foliage));
    }
  }
});

// Feed header up the high (-X) end with spaghetti lines into each channel.
const FX = -L / 2 - 90;
add("feed-riser", cylZ(FX, -120, 120, tiers[2] + 120, 18).color(tank));
for (const z of tiers) {
  add(`feed-tee-${z}`, cylX(FX - 25, -120, z + 90, 50, 26).color(tank));
  for (const s of [-1, 1]) {
    const y = s * (legY(z) + 70);
    add(`feed-line-${z}-${s > 0 ? 'b' : 'f'}`, rod([FX, -120, z + 90], [-L / 2 + 30, y, z + 70], 5, 6).color('#1d2023'));
  }
}

// Return gutter on the low (+X) end dropping into the reservoir.
const GX = L / 2 + 60;
for (const s of [-1, 1]) add(`return-gutter-${s > 0 ? 'b' : 'f'}`, rod([GX, s * (legY(tiers[2]) + 70), tiers[2] + 10], [GX, s * (legY(tiers[0]) + 70), tiers[0] - 30], 30).color(tank));
add("return-header", cylX(GX - 40, -legY(tiers[0]) - 70, tiers[0] - 60, 80, 32).color(tank));
add("return-drop", rod([GX, -legY(tiers[0]) - 70, tiers[0] - 60], [700, -200, 560], 30).color(tank));

// Reservoir in the base with lid, pump riser and level sight tube.
add("reservoir", blk(200, 0, 0, 1300, 560, 520).subtract(blk(200, 0, 40, 1240, 500, 520)).color(tank));
add("reservoir-lid", blk(200, 0, 520, 1340, 600, 40).color(tank));
add("reservoir-hatch", blk(600, -100, 560, 280, 240, 20).color('#1d2023'));
add("reservoir-sight", cylZ(-300, -285, 60, 400, 14).color('#cfe6ee'));
add("pump-riser", rod([-200, -120, 560], [FX, -120, 140], 18).color(tank));
add("pump-head", blk(-200, -120, 560, 160, 140, 120).color('#1d2023'));

return p.model();
