// Original kernelCAD low-poly phone booth: a tall box on a plinth with glazed
// panels on all four sides, glazing bars, a pale header band under a stepped
// pyramid roof. No text: the header band is plain. Millimetres, Z up.

meta({
  name: 'phone-booth',
  license: 'CC0-1.0',
  title: 'Phone booth',
  description: 'Classic telephone kiosk with glazed sides, glazing bars, a header band and a stepped roof. Knobs: glazing rows, body, glass and header colours.',
  tags: ['phone booth', 'telephone box', 'kiosk', 'booth', 'phone', 'street', 'british'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 450,
});

const rows = param('rows', '3', { choices: ['2', '3', '4'], label: 'Glazing rows' });
const body = param('body', '#c8261e', { label: 'Body' });
const glass = param('glass', '#b9d4dc', { label: 'Glass' });
const header = param('header', '#f2f0e6', { label: 'Header band' });

presets({
  green: { body: '#1f5a3a' },
  modern: { body: '#3a3f45', glass: '#8fb4c4', header: '#e8c33a' },
});

const n = Number(rows.value);
const W = 900;
const top = 2400;
const g0 = 700;
const g1 = 2050;
const gw = 640;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const sq = (r: number) => {
  let p = path().moveTo(r, r);
  p = p.lineTo(-r, r).lineTo(-r, -r).lineTo(r, -r);
  return p.close();
};

const pb = assembly('phone-booth');
pb.part('plinth', blk(-W / 2 - 50, -W / 2 - 50, 0, W / 2 + 50, W / 2 + 50, 100).color(body));
pb.part('box', blk(-W / 2, -W / 2, 100, W / 2, W / 2, top).color(body));
pb.part('roof-slab', blk(-W / 2 - 40, -W / 2 - 40, top, W / 2 + 40, W / 2 + 40, top + 80).color(body));
pb.part('roof', sq(W / 2).loft(sq(W / 4), { spacing: 170, ruled: true }).translate(0, 0, top + 80).color(body));
pb.part('finial', blk(-90, -90, top + 250, 90, 90, top + 300).color(body));

// Each face: a proud glass panel crossed by glazing bars, a header band above.
const y = -W / 2;
for (let f = 0; f < 4; f++) {
  const rz = 90 * f;
  pb.part(`glass-${f + 1}`, blk(-gw / 2, y - 6, g0, gw / 2, y + 1, g1).rotateZ(rz).color(glass));
  pb.part(`header-${f + 1}`, blk(-gw / 2 - 40, y - 6, 2150, gw / 2 + 40, y + 1, 2310).rotateZ(rz).color(header));
  pb.part(`mullion-${f + 1}`, blk(-20, y - 14, g0, 20, y + 1, g1).rotateZ(rz).color(body));
  for (let i = 1; i < n; i++) {
    const z = g0 + ((g1 - g0) * i) / n;
    pb.part(`bar-${f + 1}-${i}`, blk(-gw / 2, y - 14, z - 18, gw / 2, y + 1, z + 18).rotateZ(rz).color(body));
  }
}

return pb.model();
