// SPDX-License-Identifier: CC0-1.0
// Bato bucket: the single Dutch-bucket unit used for vine crops, a tapered
// square polypropylene bucket filled with perlite or clay pebbles, holding one
// plant and draining its surplus nutrient through a siphon elbow.
// What makes it a Bato bucket: the tapered square body with a wide flat rim
// and moulded corner ribs, the media level sitting below the rim, the bent
// siphon elbow in one back corner that holds a small reservoir in the base
// and drops through the floor into a drain spigot, and a black drip line
// coming in over the rim to a dripper stake beside the plant stem.
// Generic visualization geometry at real size (about 310 x 270 mm at the rim,
// 250 mm deep), millimetres, Z up, front toward -Y.

meta({
  name: "bato-bucket",
  license: 'CC0-1.0',
  title: "Bato bucket",
  description: "Bato (Dutch) bucket at real size: tapered square polypropylene body with flat rim and corner ribs, perlite or clay-pebble media, siphon elbow dropping through the floor to a drain spigot, drip line with dripper stake, and a young vine plant on a cane. Material controls: bucket, media, plumbing and foliage, plus media and plant choices. classicBlack, tanBucket, clayPebbles and weathered presets.",
  tags: ['bato bucket', 'dutch bucket', 'media bucket', 'siphon', 'perlite', 'clay pebbles', 'drip irrigation', 'vine crop', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bucket = param('bucket', '#26282a', { label: 'Bucket (polypropylene)' });
const media = param('media', '#e4e2da', { label: 'Growing media' });
const plumbing = param('plumbing', '#e8e8e2', { label: 'Siphon and drain (PVC)' });
const foliage = param('foliage', '#3f8a38', { label: 'Plant foliage' });
const mediaType = param('mediaType', 'perlite', { choices: ['perlite', 'clay-pebbles'], label: 'Media type' });
const plant = param('plant', 'tomato', { choices: ['tomato', 'pepper', 'empty'], label: 'Plant' });

presets({
  classicBlack: { bucket: '#26282a', media: '#e4e2da', plumbing: '#e8e8e2', foliage: '#3f8a38' },
  tanBucket: { bucket: '#cdbf9c', media: '#e4e2da', plumbing: '#f0f0ea', foliage: '#3f8a38' },
  clayPebbles: { bucket: '#26282a', media: '#b5603a', plumbing: '#e8e8e2', foliage: '#4a9440' },
  weathered: { bucket: '#4b4a45', media: '#c9c4b4', plumbing: '#c8c4b4', foliage: '#6f8a48' },
});

const p = assembly("bato-bucket");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const ZB = 30; // bucket floor, lifted on moulded feet
const BH = 250;
const pebbles = mediaType.value === 'clay-pebbles';

// Tapered body: lofted shell minus a lofted cavity.
const outer = rectPath(118, 100).loft(rectPath(145, 125), { spacing: BH, ruled: true });
const inner = rectPath(108, 90).loft(rectPath(135, 115), { spacing: BH, ruled: true }).translate(0, 0, 8);
add("bucket-body", outer.subtract(inner).translate(0, 0, ZB).color(bucket));
add("bucket-rim", blk(0, 0, ZB + BH - 14, 312, 272, 14).subtract(blk(0, 0, ZB + BH - 24, 270, 230, 34)).color(bucket));
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const k = `${sx > 0 ? 'r' : 'l'}${sy > 0 ? 'b' : 'f'}`;
  add(`corner-rib-${k}`, rod([sx * 116, sy * 98, ZB + 10], [sx * 142, sy * 122, ZB + BH - 16], 7, 6).color(bucket));
  add(`foot-${k}`, blk(sx * 90, sy * 72, 0, 40, 40, ZB).color(bucket));
}
add("front-label-recess", blk(0, -112, ZB + 120, 120, 4, 60).rotateX(-6).color(bucket));

// Media fill below the rim, with a lumpy top.
const ZM = ZB + BH - 40;
add("media-fill", rectPath(124, 104).loft(rectPath(133, 113), { spacing: 40, ruled: true }).translate(0, 0, ZM - 40).color(media));
const lumps: [number, number][] = [[-80, -60], [-20, -75], [50, -55], [95, 10], [60, 70], [-10, 60], [-85, 40], [-50, 0], [20, 5]];
lumps.forEach(([x, y], k) => {
  add(`media-lump-${k}`, sphere(pebbles ? 16 : 22).scale([1, 1, pebbles ? 0.8 : 0.45]).translate(x, y, ZM).color(media));
});

// Siphon elbow in the back-right corner: riser, bend and drop through the floor.
add("siphon-riser", cylZ(95, 75, ZB + 8, 70, 13).color(plumbing));
add("siphon-bend", rod([95, 75, ZB + 78], [70, 75, ZB + 90], 13, 10).color(plumbing));
add("siphon-cap", cylZ(95, 75, ZB + 72, 14, 17).color(plumbing));
add("drain-spigot", cylZ(70, 75, 0, ZB + 10, 14).color(plumbing));
add("drain-nut", cylZ(70, 75, ZB - 12, 10, 22, 6).color(plumbing));

// Drip line over the rim to a dripper stake.
add("drip-line", rod([-160, 140, ZB + BH + 40], [-150, 60, ZB + BH + 30], 6).color('#1c1e20'));
add("drip-tube", rod([-150, 60, ZB + BH + 30], [-60, -20, ZM + 10], 3, 5).color('#1c1e20'));
add("dripper", blk(-60, -20, ZM, 14, 14, 30).color('#c0392b'));
add("drip-header", rod([-260, 140, ZB + BH + 40], [-100, 140, ZB + BH + 40], 8).color('#1c1e20'));

// Young vine plant on a support cane.
if (plant.value !== 'empty') {
  const pepper = plant.value === 'pepper';
  const top = pepper ? 380 : 470;
  add("cane", cylZ(30, 20, ZM - 60, top + 120, 5, 6).color('#c9a86a'));
  add("stem", rod([0, 0, ZM], [10, 5, ZM + top], 9).color('#5c7a2e'));
  for (let k = 0; k < 5; k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const z = ZM + 120 + k * (top - 140) / 4;
    const r = 80 - k * 9;
    add(`leaf-${k}`, sphere(r).scale([1.4, 0.8, 0.35]).rotateY(side * 18).translate(side * (r + 10), -10, z).color(foliage));
  }
  add("crown", sphere(60).scale([1.2, 0.9, 0.7]).translate(10, 0, ZM + top).color(foliage));
  const fruit = pepper ? '#d8402b' : '#c9302c';
  for (let f = 0; f < 3; f++) {
    add(`fruit-${f}`, sphere(pepper ? 30 : 26).scale(pepper ? [0.9, 0.9, 1.3] : [1, 1, 0.9]).translate(-25 + f * 28, -55, ZM + 190 - f * 30).color(f === 2 && !pepper ? '#e08a2a' : fruit));
  }
}

return p.model();
