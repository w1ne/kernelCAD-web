// Original kernelCAD low-poly mushrooms: a small cluster of faceted stems with
// lofted caps (dome, flat or conical), spotted toadstool look by default.

meta({
  name: 'mushroom',
  license: 'CC0-1.0',
  title: 'Mushroom',
  description: 'Cluster of forest mushrooms with faceted stems and dome, flat or conical caps, optional spots. Knobs: count, size, cap shape, spots, cap and stem colours.',
  tags: ['mushroom', 'toadstool', 'fungus', 'fly agaric', 'forest floor', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'swamp'],
  triangleBudget: 300,
});

const count = param('count', '3', { choices: ['1', '2', '3'], label: 'Mushrooms' });
const size = param('size', '0.2', { choices: ['0.1', '0.2', '0.5', '1'], label: 'Height (m)' });
const shape = param('shape', 'dome', { choices: ['dome', 'flat', 'cone'], label: 'Cap shape' });
const spots = param('spots', 'yes', { choices: ['yes', 'no'], label: 'Spots' });
const cap = param('cap', '#d0362c', { label: 'Cap' });
const stem = param('stem', '#f2ead6', { label: 'Stem and spots' });

presets({
  porcini: { cap: '#8a5a32', spots: 'no', stem: '#e2d3ae' },
  glowing: { cap: '#4fb0d8', stem: '#d8f4ff' },
});

const h = Number(size.value) * 1000;
const n = Number(count.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Cap profile rings (radius factor, height factor) per shape.
const capRings: Record<string, number[][]> = {
  dome: [[0.6, 0], [1, 0.15], [0.85, 0.55], [0.35, 0.9]],
  flat: [[0.6, 0], [1, 0.12], [0.9, 0.35], [0.4, 0.5]],
  cone: [[0.5, 0], [1, 0.1], [0.55, 0.6], [0.12, 1.1]],
};

const m = assembly('mushroom');
for (let i = 0; i < n; i++) {
  const sc = [1, 0.7, 0.5][i];
  const a = [0, 2.2, 4.1][i];
  const d = i === 0 ? 0 : h * 0.45;
  const x = d * Math.cos(a);
  const y = d * Math.sin(a);
  const hh = h * sc;
  const sr = hh * 0.14;
  const stemH = hh * 0.62;
  m.part(`stem-${i + 1}`, ngon(sr * 1.15, 6).loft(ngon(sr * 0.85, 6), { spacing: stemH, ruled: true }).translate(x, y, 0).color(stem));
  const cr = hh * 0.45;
  const capH = hh * 0.5;
  const rings = capRings[shape.value];
  const cs = i === 0 ? 7 : 6;
  const secs = rings.map(([rf], k) => ngon(cr * rf, cs, k % 2 === 0 ? 0 : Math.PI / cs));
  const planes = rings.map(([, zf]) => ({ plane: 'XY' as const, origin: [x, y, stemH * 0.92 + capH * zf] as [number, number, number] }));
  m.part(`cap-${i + 1}`, secs[0].loft(secs.slice(1), { planes, ruled: true }).color(cap));
  if (spots.value === 'yes') {
    // Spots ride just outside the upper cap ring.
    const [rf2, zf2] = rings[2];
    for (let k = 0; k < 3; k++) {
      const sa = (2 * Math.PI * k) / 3 + i;
      const rr = cr * rf2 * 0.84;
      const dot = ngon(cr * 0.17, 3).extrude(cr * 0.14).rotateY(55).rotateZ((sa * 180) / Math.PI);
      m.part(`spot-${i + 1}-${k + 1}`, dot.translate(x + rr * Math.cos(sa), y + rr * Math.sin(sa), stemH * 0.92 + capH * zf2).color(stem));
    }
  }
}

return m.model();
