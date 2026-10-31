// Original kernelCAD low-poly palm: a curved, ringed trunk lofted through
// offset polygon sections, a crown of two-segment drooping fronds, coconuts.

meta({
  name: 'palm-tree',
  license: 'CC0-1.0',
  title: 'Palm tree',
  description: 'Coconut palm with a curved segmented trunk, drooping fronds and a coconut cluster. Knobs: height, frond count, trunk lean, trunk, frond and coconut colours.',
  tags: ['tree', 'palm', 'coconut', 'tropical', 'beach', 'island', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'beach', 'desert', 'water'],
  triangleBudget: 420,
});

const heightM = param('heightM', '7', { choices: ['4', '7', '10'], label: 'Height (m)' });
const fronds = param('fronds', '7', { choices: ['5', '6', '7', '8', '9'], label: 'Fronds' });
const lean = param('lean', 'curved', { choices: ['straight', 'curved', 'leaning'], label: 'Trunk lean' });
const trunk = param('trunk', '#9a7650', { label: 'Trunk' });
const frond = param('frond', '#3f9a3c', { label: 'Fronds' });
const coconut = param('coconut', '#5a4128', { label: 'Coconuts' });

presets({
  dry: { frond: '#a6a24a', trunk: '#8a7458' },
  lush: { frond: '#2f8a44' },
});

const h = Number(heightM.value) * 1000;
const nf = Number(fronds.value);
const bend = lean.value === 'straight' ? 0 : lean.value === 'curved' ? 0.12 : 0.25;

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

// Trunk: sections alternate wide/narrow for the ringed look and drift along +X.
const trunkH = h * 0.9;
const segs = 7;
const xAt = (t: number) => bend * h * t * t;
const sections = [];
const planes = [];
for (let i = 0; i <= segs; i++) {
  const t = i / segs;
  const r = h * (0.028 - 0.01 * t) * (i % 2 === 0 ? 1 : 0.86);
  sections.push(ngon(r, 6));
  planes.push({ plane: 'XY' as const, origin: [xAt(t), 0, trunkH * t] as [number, number, number] });
}
const palm = assembly('palm-tree');
palm.part('trunk', sections[0].loft(sections.slice(1), { planes, ruled: true }).color(trunk));

// Frond: an upswept inner blade and a drooping outer blade, both thin plates.
const topX = xAt(1);
const topZ = trunkH;
const blade = (len: number, w0: number, w1: number) =>
  extrudePolygon([[0, -w0], [len, -w1], [len, w1], [0, w0]], 40).translate(0, 0, -20);
const L1 = h * 0.22;
const L2 = h * 0.24;
for (let i = 0; i < nf; i++) {
  const az = (360 * i) / nf + (i % 2) * 12;
  const up = 22 + (i % 3) * 8;
  const down = 38 + (i % 2) * 14;
  const upR = (up * Math.PI) / 180;
  const inner = blade(L1, h * 0.012, h * 0.04).rotateY(-up);
  const outer = blade(L2, h * 0.04, h * 0.004)
    .rotateY(down)
    .translate(L1 * Math.cos(upR), 0, L1 * Math.sin(upR));
  palm.part(`frond-${i + 1}a`, inner.rotateZ(az).translate(topX, 0, topZ).color(frond));
  palm.part(`frond-${i + 1}b`, outer.rotateZ(az).translate(topX, 0, topZ).color(frond));
}

// Coconut cluster tucked under the crown.
for (let i = 0; i < 3; i++) {
  const a = (2 * Math.PI * i) / 3;
  const rc = h * 0.022;
  const nut = ngon(rc * 0.6, 5).loft([ngon(rc, 5, Math.PI / 5), ngon(rc * 0.6, 5)], { spacing: rc * 0.9, ruled: true });
  palm.part(`coconut-${i + 1}`, nut.translate(topX + rc * 1.3 * Math.cos(a), rc * 1.3 * Math.sin(a), topZ - rc * 2.4).color(coconut));
}

return palm.model();
