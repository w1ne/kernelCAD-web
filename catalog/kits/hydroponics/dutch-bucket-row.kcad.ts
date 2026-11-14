// SPDX-License-Identifier: CC0-1.0
// Dutch bucket row: the vine-crop system used for tomatoes, peppers and
// cucumbers, where each plant grows in its own perlite-filled bucket and the
// surplus nutrient drains back through a shared return pipe.
// What makes it a Dutch bucket row: tapered square Bato buckets sitting
// directly on a 50 mm drain pipe that runs the length of the row (each
// bucket's siphon elbow drops into it), a drip line above with a dripper
// stake in every bucket, and a tall vine climbing a support string from each
// bucket to an overhead trellis wire carried on two end posts, with fruit
// trusses hanging off the stems.
// Generic visualization geometry at about real size (2.7 m long, 0.6 m deep,
// 2.1 m high), millimetres, Z up, drip line and fruit facing -Y.

meta({
  name: "dutch-bucket-row",
  license: 'CC0-1.0',
  title: "Dutch bucket row",
  description: "Dutch (Bato) bucket row at about real size: six tapered perlite-filled buckets on a shared 50 mm drain pipe with siphon elbows, drip line with a dripper stake per bucket, and a vine per bucket climbing a support string to an overhead trellis wire on two end posts, with fruit trusses. Material controls: buckets, plumbing, trellis frame and foliage, plus a crop choice (tomato, pepper, cucumber). tomato, sweetPepper, cucumber and weathered presets.",
  tags: ['dutch bucket', 'bato bucket', 'vine crop', 'tomato', 'pepper', 'cucumber', 'perlite', 'trellis', 'hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 5600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bucket = param('bucket', '#2a2c2e', { label: 'Buckets (polypropylene)' });
const plumbing = param('plumbing', '#e6e7e1', { label: 'Drain and drip plumbing (PVC)' });
const trellis = param('trellis', '#8f989c', { label: 'Trellis posts and wire (galvanised steel)' });
const foliage = param('foliage', '#3f8436', { label: 'Vine foliage' });
const crop = param('crop', 'tomato', { choices: ['tomato', 'pepper', 'cucumber'], label: 'Crop' });

presets({
  tomato: { bucket: '#2a2c2e', plumbing: '#e6e7e1', trellis: '#8f989c', foliage: '#3f8436' },
  sweetPepper: { bucket: '#d9cfb4', plumbing: '#e6e7e1', trellis: '#8f989c', foliage: '#2f7a30' },
  cucumber: { bucket: '#2a2c2e', plumbing: '#4a5a66', trellis: '#c9a640', foliage: '#56993d' },
  weathered: { bucket: '#4a4a46', plumbing: '#c8c6b8', trellis: '#7d7b72', foliage: '#6d8a46' },
});

const p = assembly("dutch-bucket-row");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 10) => cylinder(len, r, seg).translate(x, y, z);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const N = 6, PITCH = 420, L = (N - 1) * PITCH;
const ZP = 70; // drain pipe axis
const ZB = ZP + 45; // bucket bottom
const BH = 300; // bucket height
const ZW = 2050; // trellis wire
const fruit = crop.value === 'pepper' ? '#d8402b' : crop.value === 'cucumber' ? '#2d6a2a' : '#c9302c';
const fruitShape = crop.value === 'cucumber' ? [0.35, 0.35, 1.6] : crop.value === 'pepper' ? [0.9, 0.9, 1.2] : [1, 1, 0.9];

// Shared drain pipe on saddle blocks, sloping to an outlet on the +X end.
add("drain-pipe", cylX(-L / 2 - 250, 0, ZP, L + 600, 30).color(plumbing));
for (let i = 0; i <= N; i++) add(`pipe-saddle-${i}`, blk(-L / 2 - 210 + i * PITCH, 0, 0, 60, 120, ZP - 20).color('#5d6366'));
add("drain-cap", cylX(-L / 2 - 270, 0, ZP, 20, 36).color(plumbing));
add("drain-elbow", cylZ(L / 2 + 350, 0, 0, ZP + 30, 30).color(plumbing));

// Drip line along the front with a stake into every bucket.
const DY = -230, DZ = ZB + BH + 60;
add("drip-line", cylX(-L / 2 - 280, DY, DZ, L + 560, 10, 8).color('#1d2023'));
add("drip-riser", cylZ(-L / 2 - 280, DY, 0, DZ, 14).color('#1d2023'));
add("drip-filter", cylZ(-L / 2 - 280, DY, 280, 160, 34).color('#2f6fa8'));

// Trellis posts and wire.
for (const x of [-L / 2 - 350, L / 2 + 350]) {
  add(`post-${x > 0 ? 'r' : 'l'}`, blk(x, 0, 0, 60, 60, ZW + 100).color(trellis));
  add(`post-foot-${x > 0 ? 'r' : 'l'}`, blk(x, 0, 0, 200, 200, 10).color(trellis));
  add(`post-arm-${x > 0 ? 'r' : 'l'}`, blk(x, 0, ZW - 30, 80, 300, 40).color(trellis));
}
add("trellis-wire", cylX(-L / 2 - 350, 0, ZW, L + 700, 5, 6).color(trellis));

for (let i = 0; i < N; i++) {
  const x = -L / 2 + i * PITCH;
  // Tapered bucket, perlite fill and the siphon elbow into the drain pipe.
  const outer = rectPath(140, 125).loft(rectPath(160, 145), { spacing: BH, ruled: true });
  const inner = rectPath(130, 115).loft(rectPath(150, 135), { spacing: BH, ruled: true }).translate(0, 0, 12);
  add(`bucket-${i}`, outer.subtract(inner).translate(x, 0, ZB).color(bucket));
  add(`bucket-rim-${i}`, blk(x, 0, ZB + BH - 20, 334, 300, 20).subtract(blk(x, 0, ZB + BH - 30, 300, 270, 40)).color(bucket));
  add(`perlite-${i}`, blk(x, 0, ZB + 130, 270, 242, BH - 170).color('#e3e1d8'));
  add(`siphon-${i}`, cylZ(x + 90, 60, ZP, ZB - ZP + 30, 14).color(plumbing));
  // Dripper stake.
  add(`dripper-${i}`, rod([x - 40, DY, DZ], [x - 40, -80, ZB + BH - 40], 4).color('#1d2023'));
  add(`dripper-head-${i}`, blk(x - 40, DY, DZ - 20, 30, 30, 40).color('#c0392b'));
  // Vine: main stem leaning to the support string, leaf clusters and fruit.
  const top: [number, number, number] = [x + 30, 0, ZW - 40];
  add(`string-${i}`, rod([x + 30, 0, ZB + BH - 50], [x + 30, 0, ZW], 2, 4).color('#e8dcb8'));
  add(`stem-${i}`, rod([x, -10, ZB + BH - 50], top, 12).color('#5c7a2e'));
  for (let k = 0; k < 6; k++) {
    const t = 0.1 + k * 0.15;
    const lz = ZB + BH + t * (ZW - ZB - BH - 100);
    const side = k % 2 === 0 ? -1 : 1;
    add(`leaf-${i}-${k}`, sphere(130).scale([1.3, 0.8, 0.4]).rotateZ(side * 25).translate(x + side * 90 + t * 30, -30, lz).color(foliage));
  }
  add(`crown-${i}`, sphere(90).scale([1.2, 0.8, 0.7]).translate(top[0], -20, ZW - 120).color(foliage));
  for (let tr = 0; tr < 2; tr++) {
    const tz = ZB + BH + 300 + tr * 520 + (i % 2) * 80;
    for (let f = 0; f < 3; f++) {
      add(`fruit-${i}-${tr}-${f}`, sphere(42).scale(fruitShape).translate(x + 10 + (f - 1) * 55, -110 - (f % 2) * 30, tz - f * 40).color(f === 2 && crop.value === 'tomato' ? '#e8862a' : fruit));
    }
  }
}

return p.model();
