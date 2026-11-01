// Original kernelCAD low-poly water-filled barrier: a row of interlocking
// plastic road barriers with a stepped profile, fill caps and end lugs,
// alternating colours. Millimetres, Z up, row runs along X.

meta({
  name: 'water-barrier',
  license: 'CC0-1.0',
  title: 'Water-filled barrier',
  description: 'Row of interlocking plastic water-filled road barriers in alternating colours. Knobs: unit count, two barrier colours and cap colour.',
  tags: ['barrier', 'water barrier', 'roadworks', 'traffic', 'construction', 'plastic', 'road', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'road', 'construction'],
  triangleBudget: 300,
});

const units = param('units', '3', { choices: ['1', '2', '3', '4'], label: 'Units' });
const colorA = param('colorA', '#d8342c', { label: 'Barrier A' });
const colorB = param('colorB', '#f2f2ee', { label: 'Barrier B' });
const cap = param('cap', '#2a2c2e', { label: 'Fill caps' });

presets({
  orange: { colorA: '#f07a1c', colorB: '#f2f2ee' },
  yellow: { colorA: '#f2c418', colorB: '#1e1e1e', cap: '#7d8288' },
});

const n = Number(units.value);
const L = 1200;
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Side-profile prism: points are (y, z), thickness t along X from x0.
const sideProfile = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);
const profile: [number, number][] = [[-260, 0], [260, 0], [260, 160], [120, 320], [95, 800], [-95, 800], [-120, 320], [-260, 160]];

const wb = assembly('water-barrier');
for (let i = 0; i < n; i++) {
  const x0 = -(n * L) / 2 + i * L;
  wb.part(`unit-${i + 1}`, sideProfile(profile, x0 + 10, L - 20).color(i % 2 === 0 ? colorA : colorB));
  wb.part(`cap-${i + 1}`, ngon(70, 6).extrude(40).translate(x0 + L / 2, 0, 790).color(cap));
  wb.part(`lug-${i + 1}`, box(80, 120, 500, true).translate(x0 + L - 10, 0, 450).color(cap));
}
wb.part('lug-end', box(80, 120, 500, true).translate(-(n * L) / 2 + 10, 0, 450).color(cap));

return wb.model();
