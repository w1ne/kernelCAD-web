// SPDX-License-Identifier: CC0-1.0
// Feed spreader: the vibrating pan at the head of an MRF sort line that
// takes a narrow, lumpy stream from the infeed chute and shakes it out into
// a thin, even layer across the full width of the sorting belt, so optical
// sorters and pickers see one item at a time.
// What makes it a feed spreader: a stainless pan that flares from the
// chute width to the belt width, tilted a few degrees downhill, riding on
// coil springs on a painted steel stand, driven by twin out-of-balance
// vibrator motors on angled brackets, with a row of spreading fingers at
// the discharge lip that drops the material onto a wide belt conveyor.
// Generic visualization geometry at about real size (4.0 m long, 1.6 m
// wide, 2.2 m to the top of the chute), millimetres, Z up, material flows
// toward +X.

meta({
  name: "feed-spreader",
  license: 'CC0-1.0',
  title: "Feed spreader",
  description: "Vibratory feed spreader at about real size: lofted infeed chute, stainless flared pan tilted downhill on coil springs, twin out-of-balance vibrator motors on angled brackets, spreading fingers at the discharge lip, and a wide belt conveyor carrying the spread layer of bottles, cans and board away. Material controls: painted steel stand, stainless pan, rubber belt and mixed recyclables. linePaint, stainless, highVisibility and weathered presets.",
  tags: ['feed spreader', 'vibratory feeder', 'vibrating pan', 'spreader pan', 'sort line', 'belt conveyor', 'optical sorter feed', 'recycling', 'materials recovery', 'waste management', 'sorting', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f6fa8', { label: 'Stand and conveyor frame (painted steel)' });
const pan = param('pan', '#b8c2c6', { label: 'Pan, chute and fingers (stainless steel)' });
const rubber = param('rubber', '#26292b', { label: 'Belt and spring mounts (rubber)' });
const material = param('material', '#7a9a5a', { label: 'Mixed recyclables on the line' });

presets({
  linePaint: { frame: '#2f6fa8', pan: '#b8c2c6', rubber: '#26292b', material: '#7a9a5a' },
  stainless: { frame: '#8f989c', pan: '#cfd6d8', rubber: '#2e3133', material: '#b38a55' },
  highVisibility: { frame: '#f0b429', pan: '#a8b0b4', rubber: '#1e2022', material: '#5f8fc0' },
  weathered: { frame: '#5a6a72', pan: '#8a8f86', rubber: '#3a3c3a', material: '#7a6a4a' },
});

const p = assembly("feed-spreader");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (x: number, w: number, d: number) => path().moveTo(x - w / 2, -d / 2).lineTo(x + w / 2, -d / 2).lineTo(x + w / 2, d / 2).lineTo(x - w / 2, d / 2).close();
const hopper = (x: number, w0: number, z0: number, w1: number, z1: number) => rect(x, w0, w0).loft([rect(x, w1, w1)], {
  planes: [z0, z1].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
});

// The pan is built flat at z = 0 and tilted 4 degrees downhill toward +X.
const TILT = 4;
const PZ = 1030;
const tilt = (s: Shape) => s.rotateY(TILT).translate(0, 0, PZ);
const X0 = -1200;
const X1 = 800;
const W0 = 640;
const W1 = 1500;
const flare = (Math.atan2((W1 - W0) / 2, X1 - X0) * 180) / Math.PI;
const sideLen = Math.hypot(X1 - X0, (W1 - W0) / 2);
add("pan-floor", tilt(path().moveTo(X0, -W0 / 2).lineTo(X1, -W1 / 2).lineTo(X1, W1 / 2).lineTo(X0, W0 / 2).close().extrude(16)).color(pan));
for (const s of [-1, 1]) {
  add(`pan-side-${s}`, tilt(box(sideLen, 14, 260, true).rotateZ(s * flare).translate((X0 + X1) / 2, s * (W0 + W1) / 4, 130)).color(pan));
  add(`pan-side-lip-${s}`, tilt(box(sideLen, 60, 12, true).rotateZ(s * flare).translate((X0 + X1) / 2, s * ((W0 + W1) / 4 + 24), 260)).color(pan));
}
add("pan-back", tilt(blk(X0, 0, 0, 14, W0, 260)).color(pan));
// Spreading fingers at the lip.
for (let i = 0; i < 13; i++) add(`finger-${i}`, tilt(blk(X1 + 120, -W1 / 2 + 60 + (i * (W1 - 120)) / 12, 0, 240, 40, 14)).color(pan));
// Stiffener ribs under the pan and the vibrator brackets on each side.
for (const x of [-800, -200, 400]) add(`pan-rib-${x}`, tilt(blk(x, 0, -100, 60, W0 + ((x - X0) / (X1 - X0)) * (W1 - W0) - 40, 100)).color(pan));
for (const s of [-1, 1]) {
  const y = s * ((W0 + (W1 - W0) * 0.45) / 2 + 120);
  add(`motor-bracket-${s}`, tilt(box(420, 30, 300, true).rotateY(-35).translate(-300, y - s * 40, 80)).color(frame));
  add(`vibrator-motor-${s}`, tilt(cylinder(520, 140, 16).translate(0, 0, -260).rotateX(90).rotateZ(90).rotateY(-35).translate(-300, y + s * 60, 140)).color('#3f7f4a'));
  for (const e of [-1, 1]) add(`motor-weight-cover-${s}-${e}`, tilt(cylinder(80, 170, 16).rotateY(90).translate(-40, 0, 0).rotateY(-35).translate(-300 + e * 213, y + s * 60, 140 + e * 149)).color('#3f7f4a'));
}

// Spread layer of material sliding down the pan and a heavier lump at the back.
add("pan-layer", tilt(path().moveTo(X0 + 200, -W0 / 2 + 40).lineTo(X1 - 40, -W1 / 2 + 60).lineTo(X1 - 40, W1 / 2 - 60).lineTo(X0 + 200, W0 / 2 - 40).close().extrude(40).translate(0, 0, 16)).color(material));
const panItems: [number, number, number, number, number][] = [
  [-950, -80, 140, 0, 0], [-850, 150, 120, 25, 1], [-500, -200, 90, -30, 2], [-300, 260, 80, 40, 1],
  [-100, -380, 70, 10, 0], [150, 120, 60, -15, 2], [400, -480, 60, 30, 1], [500, 420, 60, -25, 0],
];
for (const [x, y, h, rz, kind] of panItems) {
  const shape = kind === 0 ? box(260, 200, 12, true).rotateZ(rz).translate(x, y, 66)
    : kind === 1 ? cylinder(240, 45, 10).rotateY(90).rotateZ(rz).translate(x - 120, y, 100)
    : cylinder(120, 33, 10).translate(x, y, 56);
  add(`pan-item-${x}`, tilt(shape).color(kind === 0 ? '#b38a55' : kind === 1 ? '#7fb3d5' : '#c0392b'));
  if (h > 100) add(`pan-lump-${x}`, tilt(sphere(h).scale(1.3, 1, 0.5).translate(x + 80, y, 56)).color(material));
}

// Stand: four legs, top rails, and coil springs on rubber mounts.
const SZ = 760;
for (const [x, y] of [[-1050, -480], [-1050, 480], [450, -760], [450, 760]]) {
  add(`leg-${x}-${y}`, blk(x, y, 0, 120, 120, SZ).color(frame));
  add(`foot-${x}-${y}`, blk(x, y, 0, 220, 220, 16).color(frame));
  add(`spring-mount-${x}-${y}`, cylinder(40, 90, 14).translate(x, y, SZ).color(rubber));
  for (let c = 0; c < 3; c++) add(`spring-coil-${x}-${y}-${c}`, torus(70, 16, 8).translate(x, y, SZ + 75 + c * 65).color('#d0a020'));
}
add("stand-rail-a", blk(-300, -620, SZ - 120, 1640, 100, 120).color(frame));
add("stand-rail-b", blk(-300, 620, SZ - 120, 1640, 100, 120).color(frame));
add("stand-cross", blk(-1050, 0, SZ - 120, 100, 960, 120).color(frame));
add("stand-cross-front", blk(450, 0, SZ - 120, 100, 1520, 120).color(frame));
add("stand-brace", blk(-300, 0, 120, 1500, 80, 80).color(frame));

// Infeed chute: lofted hopper above the back of the pan, on two posts.
const CZ = PZ + 260;
add("chute", hopper(X0 + 300, 520, CZ, 960, CZ + 760).subtract(hopper(X0 + 300, 460, CZ - 2, 900, CZ + 762)).color(pan));
add("chute-rim", blk(X0 + 300, 0, CZ + 760, 1000, 1000, 40).subtract(blk(X0 + 300, 0, CZ + 750, 900, 900, 60)).color(frame));
add("chute-curtain", blk(X0 + 300, 0, CZ - 160, 480, 480, 160).subtract(blk(X0 + 300, 0, CZ - 170, 450, 450, 180)).color(rubber));
for (const s of [-1, 1]) add(`chute-post-${s}`, blk(X0 + 300, s * 560, 0, 100, 100, CZ + 500).color(frame));
for (const s of [-1, 1]) add(`chute-arm-${s}`, blk(X0 + 300, s * 520, CZ + 400, 100, 140, 80).color(frame));

// Wide belt conveyor carrying the spread layer away.
const BZ = 640;
const BX0 = 600;
const BX1 = 2800;
for (const s of [-1, 1]) add(`conv-stringer-${s}`, blk((BX0 + BX1) / 2, s * 820, BZ - 220, BX1 - BX0, 60, 220).color(frame));
add("belt", blk((BX0 + BX1) / 2, 0, BZ, BX1 - BX0, 1600, 20).color(rubber));
for (const x of [BX0, BX1]) add(`pulley-${x}`, cylinder(1700, 110, 16).rotateX(90).translate(x, 850, BZ - 100).color(pan));
for (const x of [1400, 2600]) for (const s of [-1, 1]) add(`conv-leg-${x}-${s}`, blk(x, s * 820, 0, 90, 90, BZ - 220).color(frame));
for (const s of [-1, 1]) add(`skirt-${s}`, blk(1500, s * 780, BZ + 20, 1600, 20, 120).color(rubber));
const beltItems: [number, number, number][] = [
  [1300, -500, 0], [1500, 300, 1], [1700, -100, 2], [1900, 550, 0], [2100, -350, 1], [2300, 100, 2], [2500, -600, 1], [2600, 450, 0],
];
for (const [x, y, kind] of beltItems) {
  const shape = kind === 0 ? box(300, 220, 12, true).rotateZ(x / 40).translate(x, y, BZ + 26)
    : kind === 1 ? cylinder(240, 45, 10).rotateY(90).rotateZ(x / 30).translate(x, y, BZ + 65)
    : cylinder(120, 33, 10).translate(x, y, BZ + 20);
  add(`belt-item-${x}`, shape.color(kind === 0 ? '#b38a55' : kind === 1 ? '#7fb3d5' : material));
}

return p.model();
