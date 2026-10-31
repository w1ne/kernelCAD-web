// Original kernelCAD low-poly bike rack: a row of inverted-U (Sheffield)
// stands on two base rails. Each loop is a polygon frame profile, not a tube
// sweep. Millimetres, Z up, base on z = 0.

meta({
  name: 'bike-rack',
  license: 'CC0-1.0',
  title: 'Bike rack',
  description: 'Row of inverted-U bicycle stands on two base rails. Knobs: loop count, loop shape, stand and rail colours.',
  tags: ['bike rack', 'bicycle', 'cycle stand', 'parking', 'sheffield', 'sidewalk', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 300,
});

const loops = param('loops', '3', { choices: ['1', '2', '3', '4', '5'], label: 'Loops' });
const shape = param('shape', 'round', { choices: ['round', 'square'], label: 'Loop shape' });
const stand = param('stand', '#8d949b', { label: 'Stands' });
const rail = param('rail', '#3a3d40', { label: 'Base rails' });

presets({
  black: { stand: '#2a2c2e', rail: '#2a2c2e' },
  yellow: { stand: '#f2c418' },
  blue: { stand: '#2a5ea8' },
});

const n = Number(loops.value);
const W = 700; // loop width (along Y, the bike direction)
const H = 800; // loop height
const t = 50; // bar thickness
const pitch = 800; // loop spacing along X

// Half-octagon arch of radius r centred W/2 below the top, from +y to -y.
const arch = (r: number, steps: number): [number, number][] => {
  const pts: [number, number][] = [];
  for (let k = 0; k <= steps; k++) {
    const a = (Math.PI * k) / steps;
    pts.push([r * Math.cos(a), H - W / 2 + r * Math.sin(a)]);
  }
  return pts;
};
// Inverted-U profile in (y, z): outer arch, then the inner arch back.
const profile = (): [number, number][] => {
  const ro = W / 2;
  const ri = W / 2 - t;
  if (shape.value === 'square') {
    return [[-ro, 0], [-ri, 0], [-ri, H - t], [ri, H - t], [ri, 0], [ro, 0], [ro, H], [-ro, H]];
  }
  const outer = arch(ro, 4); // from +y over the top to -y
  const inner = arch(ri, 4).reverse(); // from -y back to +y
  return [[ro, 0], ...outer, [-ro, 0], [-ri, 0], ...inner, [ri, 0]];
};

const br = assembly('bike-rack');
const L = (n - 1) * pitch + 400;
// Two flat base rails, one under each line of legs.
br.part('rail-front', box(L, 100, 30, true).translate(0, -(W - t) / 2, 15).color(rail));
br.part('rail-back', box(L, 100, 30, true).translate(0, (W - t) / 2, 15).color(rail));
const prof = profile();
for (let i = 0; i < n; i++) {
  const x0 = -((n - 1) * pitch) / 2 + i * pitch - t / 2;
  br.part(`loop-${i + 1}`, extrudePolygon(prof, t).rotateX(90).rotateZ(90).translate(x0, 0, 30).color(stand));
}

return br.model();
