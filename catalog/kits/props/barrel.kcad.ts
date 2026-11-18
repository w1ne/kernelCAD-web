// Original kernelCAD low-poly wooden barrel: a bulging faceted stave body
// (ruled loft of polygon rings) with iron hoops and a recessed lid.
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'barrel',
  license: 'CC0-1.0',
  title: 'Wooden barrel',
  description: 'Bulging wooden stave barrel with iron hoops and a sunken lid, for taverns, docks and cellars. Knobs: size, hoop count, facets, wood, hoop and lid colours.',
  tags: ['barrel', 'cask', 'keg', 'wooden barrel', 'container', 'tavern', 'storage'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'medieval', 'warehouse', 'farm', 'harbour'],
  triangleBudget: 420,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const hoops = param('hoops', '4', { choices: ['2', '4'], label: 'Hoops' });
const sides = param('sides', '10', { choices: ['8', '10', '12'], label: 'Facets' });
const wood = param('wood', '#a5703f', { label: 'Staves' });
const iron = param('iron', '#4a4846', { label: 'Hoops' });
const lid = param('lid', '#7f5430', { label: 'Lid' });

presets({
  aged: { wood: '#7d6449', iron: '#5c4636', lid: '#5e4a36' },
  painted: { wood: '#9e3328', iron: '#2d2d2d', lid: '#7a261e' },
});

const s = size.value === 'small' ? 0.65 : size.value === 'large' ? 1.3 : 1;
const n = Number(sides.value);
const H = 900 * s;
const rEnd = 240 * s;
const rMid = 300 * s;

const ngon = (r: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) {
    const a = rot + (2 * Math.PI * k) / n;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Radius of the bulging body at height z (piecewise linear between the rings).
const zs = [0, H * 0.3, H * 0.5, H * 0.7, H];
const rs = [rEnd, rMid * 0.96, rMid, rMid * 0.96, rEnd];
const rAt = (z: number) => {
  for (let i = 0; i < zs.length - 1; i++) {
    if (z <= zs[i + 1]) return rs[i] + ((rs[i + 1] - rs[i]) * (z - zs[i])) / (zs[i + 1] - zs[i]);
  }
  return rEnd;
};

const barrel = assembly('barrel');
barrel.part('staves', ngon(rs[0]).loft(rs.slice(1).map((r) => ngon(r)), {
  planes: zs.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
}).subtract(ngon(rEnd * 0.86).extrude(40 * s).translate(0, 0, H - 30 * s)).color(wood));
barrel.part('lid', ngon(rEnd * 0.87).extrude(15 * s).translate(0, 0, H - 45 * s).color(lid));

// Hoops: short prisms slightly proud of the body.
const hz = Number(hoops.value) === 2 ? [H * 0.12, H * 0.88] : [H * 0.06, H * 0.27, H * 0.73, H * 0.94];
hz.forEach((z, i) => {
  const hh = 40 * s;
  const r0 = rAt(z - hh / 2) + 10 * s;
  const r1 = rAt(z + hh / 2) + 10 * s;
  barrel.part(`hoop-${i + 1}`, ngon(r0).loft(ngon(r1), { spacing: hh, ruled: true }).translate(0, 0, z - hh / 2).color(iron));
});

return barrel.model();
