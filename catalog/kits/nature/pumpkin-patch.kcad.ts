// Original kernelCAD low-poly pumpkin patch: ribbed pumpkins with stubby
// stems sitting among broad vine leaves on a low soil mound.

meta({
  name: 'pumpkin-patch',
  license: 'CC0-1.0',
  title: 'Pumpkin patch',
  description: 'Low soil mound with ribbed pumpkins, stubby stems and broad vine leaves, for farms, autumn and Halloween scenes. Knobs: pumpkins, size, pumpkin, stem, leaf and soil colours.',
  tags: ['pumpkin', 'pumpkins', 'squash', 'harvest', 'autumn', 'halloween', 'farm', 'garden', 'vegetable', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'farm', 'garden', 'meadow'],
  triangleBudget: 500,
});

const count = param('count', '3', { choices: ['1', '2', '3', '4'], label: 'Pumpkins' });
const size = param('size', 'medium', { choices: ['small', 'medium', 'giant'], label: 'Pumpkin size' });
const pumpkin = param('pumpkin', '#e8822a', { label: 'Pumpkins' });
const stem = param('stem', '#6a5a32', { label: 'Stems' });
const leaf = param('leaf', '#4f8a3a', { label: 'Vine leaves' });
const soil = param('soil', '#5e4430', { label: 'Soil' });

presets({
  white: { pumpkin: '#ece6d6' },
  green: { pumpkin: '#6a8a3a' },
  halloween: { pumpkin: '#f07a1a', leaf: '#6a7a3a' },
});

const n = Number(count.value);
const pr = size.value === 'small' ? 120 : size.value === 'medium' ? 200 : 380;

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Ribbed ring: six lobes with shallow grooves between them.
const ribs = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < 12; k++) {
    const a = (Math.PI * k) / 6;
    const rr = k % 2 === 0 ? r : r * 0.86;
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};
const pumpkinAt = (x: number, y: number, r: number, rot: number) => {
  const hh = r * 1.25;
  const body = ribs(r * 0.6).loft([ribs(r), ribs(r * 0.5)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, hh * 0.45] },
      { plane: 'XY', origin: [0, 0, hh * 0.9] },
    ],
    ruled: true,
  }).rotateZ(rot).translate(x, y, 0);
  const st = ngon(r * 0.1, 5).loft(ngon(r * 0.07, 5), { spacing: r * 0.4, ruled: true }).rotateY(12).rotateZ(rot).translate(x, y, hh * 0.82);
  return { body, st };
};

const patch = assembly('pumpkin-patch');
const W = pr * 2 * Math.max(2, n) * 0.9 + 300;
patch.part('soil', ngon(W * 0.46, 8).loft(ngon(W * 0.38, 8, 0.39), { spacing: 25, ruled: true }).scale([1, 0.75, 1]).color(soil));

const spots: [number, number][] = [[-0.25, 0.1], [0.3, -0.12], [0.05, 0.38], [-0.05, -0.35]];
for (let i = 0; i < n; i++) {
  const [fx, fy] = n === 1 ? [0, 0] : spots[i];
  const r = pr * (1 - 0.15 * (i % 2));
  const p = pumpkinAt(fx * W * 0.7, fy * W * 0.55, r, i * 23);
  patch.part(`pumpkin-${i + 1}`, p.body.translate(0, 0, 18).color(pumpkin));
  patch.part(`stem-${i + 1}`, p.st.translate(0, 0, 18).color(stem));
}
// Broad five-point vine leaves lying on the soil between the pumpkins.
const leafShape = (r: number) => {
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const a = (Math.PI * k) / 5;
    const rr = k % 2 === 0 ? r : r * 0.6;
    pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
  }
  return extrudePolygon(pts, 8);
};
const nl = 3;
for (let i = 0; i < nl; i++) {
  const a = i * 2.39996 + 0.7;
  const d = W * 0.28;
  patch.part(`leaf-${i + 1}`, leafShape(pr * 1.05).rotateY(-8).rotateZ(i * 40).translate(d * Math.cos(a), d * 0.75 * Math.sin(a), pr * 1.05 * 0.14 + 20).color(leaf));
}

return patch.model();
