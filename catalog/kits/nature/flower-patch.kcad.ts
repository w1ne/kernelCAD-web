// Original kernelCAD low-poly flower patch: a leafy clump with thin stems,
// each topped by a flat star-shaped flower head and a raised centre.

meta({
  name: 'flower-patch',
  license: 'CC0-1.0',
  title: 'Flower patch',
  description: 'Small clump of wildflowers with thin stems and star-shaped petals over a leafy base. Knobs: flower count, height, petal, centre and leaf colours.',
  tags: ['flower', 'flowers', 'wildflower', 'daisy', 'meadow', 'garden', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'meadow', 'garden', 'park'],
  triangleBudget: 300,
});

const count = param('count', '5', { choices: ['3', '4', '5'], label: 'Flowers' });
const heightM = param('heightM', '0.35', { choices: ['0.25', '0.35', '0.5'], label: 'Height (m)' });
const petals = param('petals', '#f2f0e8', { label: 'Petals' });
const centre = param('centre', '#f0c419', { label: 'Flower centre' });
const leaves = param('leaves', '#4f8f3a', { label: 'Leaves and stems' });

presets({
  poppies: { petals: '#d8342c', centre: '#2a2422' },
  bluebells: { petals: '#6d7fd8', centre: '#f4f0d0' },
  sunny: { petals: '#f5c42a', centre: '#7a4a1e' },
});

const h = Number(heightM.value) * 1000;
const n = Number(count.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Five-petal star head, flat.
const star = (r: number) => {
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const a = (Math.PI * k) / 5;
    const rr = k % 2 === 0 ? r : r * 0.45;
    pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
  }
  return extrudePolygon(pts, h * 0.025);
};

const patch = assembly('flower-patch');
patch.part(
  'leaves',
  ngon(h * 0.34, 5).loft(ngon(h * 0.12, 5, Math.PI / 5), { spacing: h * 0.14, ruled: true }).color(leaves),
);
const fr = h * 0.13;
for (let i = 0; i < n; i++) {
  const a = (2 * Math.PI * i) / n + 0.5;
  const d = i === 0 ? 0 : h * (0.22 + 0.06 * (i % 2));
  const x = d * Math.cos(a);
  const y = d * Math.sin(a);
  const sh = h * (0.8 + 0.2 * Math.sin(i * 2.4)) - fr * 0.3;
  patch.part(`stem-${i + 1}`, ngon(h * 0.012, 3).extrude(sh).translate(x, y, 0).color(leaves));
  const tilt = i === 0 ? 0 : 18;
  const head = star(fr).rotateZ(i * 23).rotateY(tilt).rotateZ((a * 180) / Math.PI);
  patch.part(`petals-${i + 1}`, head.translate(x, y, sh).color(petals));
  const dot = ngon(fr * 0.36, 3).extrude(h * 0.04).rotateY(tilt).rotateZ((a * 180) / Math.PI);
  patch.part(`centre-${i + 1}`, dot.translate(x, y, sh).color(centre));
}

return patch.model();
