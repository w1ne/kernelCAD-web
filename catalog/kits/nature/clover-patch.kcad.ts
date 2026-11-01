// Original kernelCAD low-poly clover patch: a low mat of three-leaf clovers on
// short stems over a flat leafy base, with a few round clover flowers.

meta({
  name: 'clover-patch',
  license: 'CC0-1.0',
  title: 'Clover patch',
  description: 'Low patch of three-leaf clovers on short stems with a few round clover blossoms, for lawns and meadows. Knobs: clover count, blossoms, leaf, base and blossom colours.',
  tags: ['clover', 'shamrock', 'trefoil', 'ground cover', 'lawn', 'meadow', 'patch', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'meadow', 'garden', 'park', 'forest'],
  triangleBudget: 560,
});

const count = param('count', '8', { choices: ['5', '8', '10'], label: 'Clovers' });
const flowers = param('flowers', '3', { choices: ['0', '3', '4'], label: 'Blossoms' });
const leaf = param('leaf', '#4f9a3a', { label: 'Clover leaves' });
const base = param('base', '#3f7a30', { label: 'Base mat' });
const blossom = param('blossom', '#f2eef4', { label: 'Blossoms' });

presets({
  red: { blossom: '#d86a9a' },
  lucky: { leaf: '#3aa84a', base: '#2f7a34' },
});

const n = Number(count.value);
const nf = Number(flowers.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Trefoil outline: three rounded lobes with notches between, one flat slab.
const trefoil = (r: number) => {
  const pts: [number, number][] = [];
  for (let l = 0; l < 3; l++) {
    const c = (2 * Math.PI * l) / 3;
    for (const [da, rr] of [[-0.42, 1], [0.42, 1]] as const) {
      pts.push([r * rr * Math.cos(c + da), r * rr * Math.sin(c + da)]);
    }
    pts.push([r * 0.12 * Math.cos(c + Math.PI / 3), r * 0.12 * Math.sin(c + Math.PI / 3)]);
  }
  return extrudePolygon(pts, 5);
};

const patch = assembly('clover-patch');
// Base mat: an irregular low slab.
const mat: [number, number][] = [];
for (let k = 0; k < 9; k++) {
  const a = (2 * Math.PI * k) / 9;
  const rr = 250 * (0.75 + 0.25 * Math.sin(k * 2.3));
  mat.push([rr * Math.cos(a), rr * Math.sin(a)]);
}
patch.part('base', extrudePolygon(mat, 6).color(base));

for (let i = 0; i < n; i++) {
  const a = i * 2.39996;
  const d = i === 0 ? 0 : 60 * Math.sqrt(i) + 20;
  const x = d * Math.cos(a);
  const y = d * Math.sin(a);
  const sh = 35 + 30 * ((i * 0.618) % 1);
  patch.part(`stem-${i + 1}`, ngon(3, 3).extrude(sh).translate(x, y, 4).color(leaf));
  const tilt = 8 + 10 * (i % 3);
  patch.part(`clover-${i + 1}`, trefoil(55).rotateZ(i * 47).rotateY(tilt).rotateZ((a * 180) / Math.PI).translate(x, y, sh + 4).color(leaf));
}
// Blossoms: round faceted heads on taller stems.
for (let i = 0; i < nf; i++) {
  const a = i * 2.1 + 0.8;
  const d = 90 + 50 * (i % 2);
  const x = d * Math.cos(a);
  const y = d * Math.sin(a);
  const sh = 110 + 20 * (i % 3);
  patch.part(`flower-stem-${i + 1}`, ngon(3, 3).extrude(sh).translate(x, y, 4).color(leaf));
  patch.part(`flower-${i + 1}`, ngon(14, 4).loft([ngon(24, 4, Math.PI / 4), ngon(10, 4)], {
    planes: [
      { plane: 'XY', origin: [x, y, sh] },
      { plane: 'XY', origin: [x, y, sh + 18] },
      { plane: 'XY', origin: [x, y, sh + 40] },
    ],
    ruled: true,
  }).color(blossom));
}

return patch.model();
