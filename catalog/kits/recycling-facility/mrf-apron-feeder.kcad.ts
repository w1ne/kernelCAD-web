// SPDX-License-Identifier: CC0-1.0
// MRF apron feeder: the heavy-duty infeed that takes waste straight off a
// loader bucket and meters it up into the sort plant. What makes it an apron
// feeder rather than a belt: the carrying surface is a train of overlapping
// steel pans bolted to two roller chains, so it survives loader impact and
// sharp metal; a deep receiving hopper with flared wear plates sits over the
// tail, the pan train climbs on an incline to a sprocket head with a shaft-
// mounted gearbox and torque arm, and it discharges into a chute at the top.
// Generic visualization geometry at about real size (7.5 m long, 2.4 m wide,
// head 2.6 m high), millimetres, Z up, pans climb toward +Y.

meta({
  name: "mrf-apron-feeder",
  license: 'CC0-1.0',
  title: "MRF apron feeder",
  description: "Inclined steel-pan apron feeder at about real size: overlapping pans with raised wings on twin roller chains, deep receiving hopper with flared wear plates over the tail, track rollers, sprocket head with shaft-mounted gearbox, motor and torque arm, discharge chute and stepped support legs, carrying a heap of mixed waste. Material controls: frame paint, pan steel, chain and drive, hopper wear plates; with or without load. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "apron feeder", "pan conveyor", "steel pans", "infeed", "receiving hopper", "sprocket", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3a78a8', { label: 'Frame and legs (paint)' });
const pans = param('pans', '#8d9599', { label: 'Apron pans (steel)' });
const chain = param('chain', '#2f3436', { label: 'Chains, sprockets and drive' });
const hopper = param('hopper', '#d8a13a', { label: 'Hopper and wear plates' });
const load = param('load', 'waste', { choices: ['waste', 'empty'], label: 'Load in hopper' });

presets({
  plant: { frame: '#3a78a8', pans: '#8d9599', chain: '#2f3436', hopper: '#d8a13a' },
  weathered: { frame: '#566673', pans: '#7a6a5a', chain: '#3a3836', hopper: '#9a7a45' },
  stainless: { frame: '#c6cbcd', pans: '#e0e4e5', chain: '#30363a', hopper: '#2f5d9a' },
  highVisibility: { frame: '#3d7a4a', pans: '#a9b0b3', chain: '#1f2224', hopper: '#f2d21b' },
});

const p = assembly("mrf-apron-feeder");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Shaft or roller along X from x0, axis at (y, z).
const alongX = (x0: number, len: number, r: number, y: number, z: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x0, y, z);

const L = 6400, W = 1800, ANG = 14, Z0 = 700; // pan train length, width, incline, tail pan height
const t = Math.tan((ANG * Math.PI) / 180);
// Parts built flat along local +Y (pans at z = 0) are tilted and lifted onto the incline.
const onDeck = (s: Shape) => s.rotateX(ANG).translate(0, 0, Z0);
const zAt = (y: number) => Z0 + y * t;
const FX = W / 2 + 120;

// Pan train: overlapping pans with upturned wings and a raised leading lip.
const PP = 320;
for (let k = 0; k < Math.floor(L / PP); k++) {
  const y = 160 + k * PP;
  add(`pan-${k}`, onDeck(blk(0, y, -30, W, PP + 30, 30)).color(pans));
  add(`pan-lip-${k}`, onDeck(blk(0, y + PP / 2 - 10, 0, W, 20, 60)).color(pans));
}
for (const s of [-1, 1]) add(`pan-wing-${s}`, onDeck(blk(s * (W / 2 + 15), L / 2, -30, 30, L, 200)).color(pans));

// Chains and track rollers under the pan edges, return strand below.
for (const s of [-1, 1]) {
  add(`chain-top-${s}`, onDeck(blk(s * (W / 2 - 150), L / 2, -110, 70, L, 80)).color(chain));
  add(`chain-return-${s}`, onDeck(blk(s * (W / 2 - 150), L / 2, -560, 70, L - 600, 80)).color(chain));
  for (let k = 0; k < 7; k++) add(`track-roller-${s}-${k}`, onDeck(alongX(s > 0 ? W / 2 - 190 : -W / 2 + 110, 80, 70, 400 + k * 900, -190, 10)).color(chain));
}

// Side frames: deep plate girders the whole length.
for (const s of [-1, 1]) add(`girder-${s}`, onDeck(blk(s * FX, L / 2, -650, 60, L + 400, 600)).color(frame));
for (let k = 0; k < 5; k++) add(`girder-stiffener-${k}`, onDeck(blk(-FX - 40, 600 + k * 1300, -650, 30, 60, 600)).color(frame));

// Tail and head sprockets on their shafts.
for (const [y, nm] of [[0, 'tail'], [L, 'head']] as [number, string][]) {
  add(`${nm}-shaft`, onDeck(alongX(-FX - 120, 2 * FX + 240, 70, y, -320, 12)).color(chain));
  for (const s of [-1, 1]) add(`${nm}-sprocket-${s}`, onDeck(alongX(s * (W / 2 - 150) - 30, 60, 300, y, -320, 10)).color(chain));
  for (const s of [-1, 1]) add(`${nm}-bearing-${s}`, onDeck(blk(s * (FX + 70), y, -420, 120, 260, 200)).color(frame));
}

// Shaft-mounted gearbox, motor and torque arm on the +X side of the head.
const hy = L, hz = zAt(L);
add("gearbox", blk(FX + 330, hy, hz - 650, 300, 520, 620).color(chain));
add("drive-motor", cylinder(560, 150, 14).rotateX(90).translate(FX + 330, hy - 260, hz - 340).color('#5a6266'));
add("torque-arm", box(60, 60, 900, true).rotateX(-25).translate(FX + 330, hy + 150, hz - 1000).color(frame));
add("drive-guard", blk(FX + 140, hy, hz - 700, 60, 700, 650).color(hopper));

// Head discharge chute dropping forward.
add("head-hood", blk(0, L + 300, hz - 200, W + 400, 600, 600).subtract(blk(0, L + 200, hz - 260, W + 200, 600, 560)).color(frame));
add("discharge-chute", blk(0, L + 500, 300, W, 400, hz - 500).subtract(blk(0, L + 500, 260, W - 160, 260, hz)).color(hopper));

// Receiving hopper over the tail: low near wall so the pans and load show, flared wear plates behind.
const HY0 = -200, HY1 = 2600;
for (const s of [-1, 1]) {
  add(`hopper-side-${s}`, onDeck(blk(s * (W / 2 + 60), (HY0 + HY1) / 2, 160, 50, HY1 - HY0, s > 0 ? 1200 : 450)).color(hopper));
  if (s > 0) add(`hopper-flare-${s}`, onDeck(box(50, HY1 - HY0, 900, true).rotateY(30).translate(W / 2 + 330, (HY0 + HY1) / 2, 1700)).color(hopper));
}
add("hopper-back", onDeck(blk(0, HY0 - 25, 0, W + 170, 50, 1600)).color(hopper));
add("hopper-back-flare", onDeck(box(W + 600, 50, 900, true).rotateX(-30).translate(0, HY0 - 250, 1950)).color(hopper));
for (let k = 0; k < 4; k++) add(`wear-plate-${k}`, onDeck(blk(W / 2 + 30, 200 + k * 600, 400, 12, 520, 600)).color('#5a6266'));
for (const y of [0, 1300, 2600]) add(`hopper-rib-${y}`, onDeck(blk(-W / 2 - 100, y, 160, 40, 80, 450)).color(frame));

// Legs from the floor to the girders, getting taller toward the head.
for (const y of [400, 2400, 4400, 6200]) {
  const zg = Z0 + y * t - 650 / Math.cos((ANG * Math.PI) / 180);
  for (const s of [-1, 1]) add(`leg-${s}-${y}`, blk(s * FX, y, 0, 160, 160, zg).color(frame));
  add(`leg-tie-${y}`, blk(0, y, 250, 2 * FX, 100, 100).color(frame));
}
for (const s of [-1, 1]) add(`baseplate-${s}`, blk(s * FX, 3300, 0, 260, 6400, 30).color(chain));

// Mixed waste heaped in the hopper and riding up the pans.
if (load.value !== 'empty') {
  const colors = ['#8a6f55', '#c49a6c', '#5c8fc4', '#d9d2bf', '#3d8a4f', '#7a7f84', '#c8202a', '#e2e6e8'];
  add("heap", onDeck(extrudePolygon([[-W / 2 + 40, 0], [W / 2 - 40, 0], [W / 2 - 200, 420], [0, 620], [-W / 2 + 300, 380]], 2200).rotateX(90).translate(0, 2400, 0)).color('#6b5a48'));
  for (let i = 0; i < 18; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    const x = -550 + col * 550 + ((row * 173) % 200) - 100;
    const y = row < 4 ? 300 + row * 520 : 2900 + (row - 4) * 900 + col * 200;
    const z = row < 4 ? 380 + (col === 1 ? 200 : 0) : 40;
    add(`chunk-${i}`, onDeck(box(360, 280, 200, true).rotateZ(i * 29).rotateX((i * 13) % 40).translate(x, y, z + 100)).color(colors[i % colors.length]));
  }
}

return p.model();
