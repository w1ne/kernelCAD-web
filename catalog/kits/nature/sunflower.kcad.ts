// Original kernelCAD low-poly sunflower: a tall faceted stem with broad leaves
// and a big nodding head (a flat star of petals round a dark seed disc), with
// optional smaller side heads. Head faces -Y.

meta({
  name: 'sunflower',
  license: 'CC0-1.0',
  title: 'Sunflower',
  description: 'Tall sunflower with broad leaves and a big nodding head of yellow petals round a dark seed disc, with optional side heads. Knobs: height, heads, petal, seed, stem and leaf colours.',
  tags: ['sunflower', 'flower', 'tall flower', 'garden', 'farm', 'field', 'summer', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'garden', 'farm', 'meadow'],
  triangleBudget: 500,
});

const heightM = param('heightM', '1.8', { choices: ['1.2', '1.8', '2.5'], label: 'Height (m)' });
const heads = param('heads', '1', { choices: ['1', '2', '3'], label: 'Flower heads' });
const petals = param('petals', '#f2c21b', { label: 'Petals' });
const seeds = param('seeds', '#4a2e1a', { label: 'Seed disc' });
const stem = param('stem', '#5f8f34', { label: 'Stem' });
const leaves = param('leaves', '#4a8a30', { label: 'Leaves' });

presets({
  red: { petals: '#b8432a', seeds: '#2f1d12' },
  wilted: { petals: '#b88a3a', leaves: '#8a8a3e', stem: '#7a7a3a' },
});

const h = Number(heightM.value) * 1000;
const n = Number(heads.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Petal star in the XY plane, 10 points.
const star = (r: number, t: number) => {
  const pts: [number, number][] = [];
  for (let k = 0; k < 20; k++) {
    const a = (Math.PI * k) / 10;
    const rr = k % 2 === 0 ? r : r * 0.62;
    pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
  }
  return extrudePolygon(pts, t);
};

const flower = assembly('sunflower');
const sr = Math.max(12, h * 0.012);
const stemH = h * 0.9;
flower.part('stem', ngon(sr * 1.3, 5).loft(ngon(sr, 5), { spacing: stemH, ruled: true }).color(stem));

// Broad heart-ish leaves on short tilt, alternating sides up the stem.
const leaf = (len: number) => extrudePolygon([
  [0, 0], [len * 0.3, len * 0.25], [len * 0.25, len * 0.7], [0, len], [-len * 0.25, len * 0.7], [-len * 0.3, len * 0.25],
], 8).translate(0, 0, -4).rotateX(90);
for (let i = 0; i < 4; i++) {
  const z = h * (0.2 + i * 0.17);
  const len = h * (0.22 - i * 0.025);
  flower.part(`leaf-${i + 1}`, leaf(len).rotateY(62).rotateZ(i * 145 + 30).translate(0, 0, z).color(leaves));
}

// Head: built facing +Z then pitched forward to face -Y and nod down.
const head = (R: number) => {
  const disc = ngon(R * 0.55, 8).loft(ngon(R * 0.45, 8, Math.PI / 8), { spacing: R * 0.12, ruled: true }).translate(0, 0, R * 0.06);
  const back = ngon(R * 0.35, 6).loft(ngon(R * 0.6, 6), { spacing: R * 0.14, ruled: true }).translate(0, 0, -R * 0.1);
  return { ring: star(R, R * 0.04).translate(0, 0, R * 0.02), disc, back };
};
const place = (s: Shape, x: number, z: number, pitch: number, yaw: number) => s.rotateX(pitch).rotateZ(yaw).translate(x, -h * 0.02, z);
const addHead = (i: number, R: number, x: number, z: number, pitch: number, yaw: number) => {
  const hd = head(R);
  flower.part(`petals-${i}`, place(hd.ring, x, z, pitch, yaw).color(petals));
  flower.part(`seeds-${i}`, place(hd.disc, x, z, pitch, yaw).color(seeds));
  flower.part(`head-back-${i}`, place(hd.back, x, z, pitch, yaw).color(stem));
};
addHead(1, h * 0.15, 0, stemH + h * 0.02, 70, 0);

// Side heads on short branches.
for (let i = 1; i < n; i++) {
  const side = i === 1 ? 1 : -1;
  const bz = h * (0.38 + 0.12 * i);
  const bl = h * 0.26;
  flower.part(`branch-${i}`, ngon(sr * 0.8, 4).extrude(bl).rotateY(side * 40).translate(0, 0, bz).color(stem));
  const tipX = side * bl * Math.sin((40 * Math.PI) / 180);
  const tipZ = bz + bl * Math.cos((40 * Math.PI) / 180);
  addHead(i + 1, h * 0.08, tipX, tipZ, 60, side * 25);
}

return flower.model();
