// Original kernelCAD low-poly prickly pear: flat oval cactus pads growing out
// of each other's top edges, with red fruits on the upper rims.

meta({
  name: 'prickly-pear-cactus',
  license: 'CC0-1.0',
  title: 'Prickly pear cactus',
  description: 'Opuntia prickly pear built from flat oval pads branching from each other, with red fruit on the top pads, for desert scenes. Knobs: pad tiers, fruit, pad and fruit colours.',
  tags: ['cactus', 'prickly pear', 'opuntia', 'succulent', 'desert', 'mexico', 'western', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'desert', 'garden'],
  triangleBudget: 400,
});

const tiers = param('tiers', '3', { choices: ['2', '3'], label: 'Pad tiers' });
const fruits = param('fruits', 'yes', { choices: ['yes', 'no'], label: 'Fruit' });
const pad = param('pad', '#5f9a4a', { label: 'Pads' });
const fruit = param('fruit', '#c8304a', { label: 'Fruit' });

presets({
  flowering: { fruit: '#f2d23a' },
  blue: { pad: '#6a9a8a' },
});

const nt = Number(tiers.value);
const R = 220; // pad half-height
const T = 50; // pad thickness

// Pad: an 8-gon oval in its own XZ plane, bottom vertex at the origin, so a
// child pad hangs off one point and an upright root pad stands on z = 0.
const oval = () =>
  extrudePolygon([[0, -R], [R * 0.51, -R * 0.71], [R * 0.72, 0], [R * 0.51, R * 0.71], [0, R], [-R * 0.51, R * 0.71], [-R * 0.72, 0], [-R * 0.51, -R * 0.71]], T)
    .translate(0, R, -T / 2).rotateX(90);
// Pose = tilt within the pad plane (about the pad normal), then yaw about Z.
type Pose = { x: number; y: number; z: number; tilt: number; yaw: number; s: number };
const point = (p: Pose, u: number, v: number): [number, number, number] => {
  // Local in-plane point (u across, v up) scaled, tilted, yawed, moved.
  const t = (p.tilt * Math.PI) / 180;
  const lx = (u * Math.cos(t) + v * Math.sin(t)) * p.s;
  const lz = (-u * Math.sin(t) + v * Math.cos(t)) * p.s;
  const y = (p.yaw * Math.PI) / 180;
  return [p.x + lx * Math.cos(y), p.y + lx * Math.sin(y), p.z + lz];
};
const place = (p: Pose) => oval().scale([p.s, p.s, p.s]).rotateY(p.tilt).rotateZ(p.yaw).translate(p.x, p.y, p.z);

const cactus = assembly('prickly-pear-cactus');
const poses: Pose[] = [{ x: 0, y: 0, z: 0, tilt: 0, yaw: 0, s: 1.1 }, { x: 60, y: 40, z: 0, tilt: -18, yaw: 75, s: 0.8 }];
// Each tier: two children sprout from the upper shoulders of each parent of
// the previous tier, sunk 15 % into the parent so they stay attached.
let prev = [poses[0]];
for (let t = 1; t < nt; t++) {
  const next: Pose[] = [];
  prev.forEach((p, j) => {
    const kids = t === 1 ? [-1, 1] : [j % 2 ? 1 : -1];
    for (const side of kids) {
      const [x, y, z] = point(p, side * R * 0.42, R * 1.7);
      next.push({ x, y, z, tilt: p.tilt * 0.3 + side * 24, yaw: p.yaw + side * 30 + t * 12, s: p.s * 0.82 });
    }
  });
  poses.push(...next);
  prev = next;
}
poses.forEach((p, i) => cactus.part(`pad-${i + 1}`, place(p).color(pad)));

if (fruits.value === 'yes') {
  // Egg-shaped fruit sit on the top rim of the last tier's pads.
  const fr = 32;
  const ngon = (r: number, k0: number, rot = 0) => {
    let q = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
    for (let k = 1; k < k0; k++) q = q.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / k0), r * Math.sin(rot + (2 * Math.PI * k) / k0));
    return q.close();
  };
  prev.forEach((p, i) => {
    [-0.3, 0.3].forEach((u, k) => {
      const [x, y, z] = point(p, u * R, R * 2 - Math.abs(u) * R * 0.5 - fr * 0.6);
      cactus.part(`fruit-${i + 1}-${k + 1}`, ngon(fr * 0.6, 5).loft([ngon(fr, 5, 0.6), ngon(fr * 0.7, 5)], {
        planes: [
          { plane: 'XY', origin: [x, y, z] },
          { plane: 'XY', origin: [x, y, z + fr * 0.9] },
          { plane: 'XY', origin: [x, y, z + fr * 1.8] },
        ],
        ruled: true,
      }).color(fruit));
    });
  });
}

return cactus.model();
