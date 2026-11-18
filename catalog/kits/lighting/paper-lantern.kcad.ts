// Original kernelCAD low-poly paper lantern: a faceted ribbed paper body
// (round, cylinder or tall) between dark rims, with a hanging loop on top and
// either a tassel below for hanging or a small wooden foot for a table.
// Millimetres, Z up, lowest point on z = 0 centred on x = y = 0.

meta({
  name: 'paper-lantern',
  license: 'CC0-1.0',
  title: 'Paper lantern',
  description: 'Ribbed paper lantern, round, cylinder or tall, with dark rims and hanging loop, hung from its cord with a tassel or standing on a wooden foot. Knobs: shape, ribs, mount, paper, rim and tassel colours.',
  tags: ['paper lantern', 'lantern', 'chinese lantern', 'japanese lantern', 'chochin', 'festival', 'lamp', 'decoration'],
  kit: 'lighting',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'festival', 'garden', 'asian', 'market', 'night'],
  triangleBudget: 420,
});

const shape = param('shape', 'round', { choices: ['round', 'cylinder', 'tall'], label: 'Shape' });
const ribs = param('ribs', '10', { choices: ['8', '10', '12'], label: 'Ribs' });
const mount = param('mount', 'hanging', { choices: ['hanging', 'table'], label: 'Mount' });
const paper = param('paper', '#d8302a', { label: 'Paper' });
const rim = param('rim', '#2a2a2c', { label: 'Rims and loop' });
const tassel = param('tassel', '#e8c33a', { label: 'Tassel or foot' });

presets({
  white: { paper: '#f2ead8', rim: '#5a3a27', tassel: '#5a3a27' },
  festival: { paper: '#f0a020', rim: '#8a2a1a', tassel: '#c8302a' },
  night: { paper: '#ffd27a', rim: '#1c1c1e', tassel: '#c8302a' },
});

const n = Number(ribs.value);
const ngon = (r: number, k = n) => {
  let p = path().moveTo(r, 0);
  for (let i = 1; i < k; i++) p = p.lineTo(r * Math.cos((2 * Math.PI * i) / k), r * Math.sin((2 * Math.PI * i) / k));
  return p.close();
};
const lathe = (rings: [number, number][], k = n) =>
  ngon(rings[0][0], k).loft(rings.slice(1).map(([r]) => ngon(r, k)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });

// Body profile [radius, height] from rim to rim.
const R = shape.value === 'tall' ? 140 : 170;
const H = shape.value === 'round' ? 300 : shape.value === 'tall' ? 460 : 340;
const rimR = 85;
const prof: [number, number][] = shape.value === 'round'
  ? [[rimR, 0], [R * 0.82, H * 0.12], [R, H * 0.35], [R, H * 0.65], [R * 0.82, H * 0.88], [rimR, H]]
  : [[rimR, 0], [R, H * 0.08], [R, H * 0.92], [rimR, H]];

const z0 = mount.value === 'hanging' ? 110 : 30;
const l = assembly('paper-lantern');
l.part('paper', lathe(prof.map(([r, z]) => [r, z + z0] as [number, number])).color(paper));
l.part('rim-bottom', ngon(rimR + 8, 8).extrude(26).translate(0, 0, z0 - 14).color(rim));
l.part('rim-top', ngon(rimR + 8, 8).extrude(26).translate(0, 0, z0 + H - 12).color(rim));
// Hanging loop: a flat square ring standing on the top rim.
l.part('loop', extrudePolygon([[-30, -2], [30, -2], [30, 60], [-30, 60]], 8).rotateX(90).translate(0, 4, z0 + H + 12)
  .subtract(box(36, 20, 40).translate(-18, -10, z0 + H + 20)).color(rim));

if (mount.value === 'hanging') {
  // Tassel: a short cord and a flared tuft hanging under the bottom rim.
  l.part('tassel', ngon(26, 6).loft(ngon(8, 6), { spacing: 70, ruled: true })
    .union(ngon(6, 6).extrude(50).translate(0, 0, 66)).color(tassel));
} else {
  // Table foot: a low wooden plinth the lantern sits on.
  l.part('foot', ngon(rimR + 30, 8).loft(ngon(rimR + 14, 8), { spacing: 20, ruled: true }).color(tassel));
}

return l.model();
