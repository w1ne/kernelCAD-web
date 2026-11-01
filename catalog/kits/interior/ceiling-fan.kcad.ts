// Original kernelCAD low-poly ceiling fan: a canopy, a downrod, a faceted
// motor housing and three to five pitched blades on irons, with an optional
// light bowl. Origin 'ceiling': the canopy's top face sits on the z = 0
// ceiling plane and the fan hangs down along -Z, centred on x = y = 0.

meta({
  name: 'ceiling-fan',
  license: 'CC0-1.0',
  title: 'Ceiling fan',
  description: 'Ceiling fan with downrod, motor housing, three to five pitched blades and an optional light bowl. Knobs: blades, light, downrod length, blade, body and light colours.',
  tags: ['ceiling fan', 'fan', 'ceiling', 'cooling', 'light', 'living room', 'bedroom'],
  kit: 'interior',
  category: 'attachment',
  origin: 'ceiling',
  compat: ['indoor', 'living-room', 'bedroom', 'office', 'cafe'],
  triangleBudget: 400,
});

const blades = param('blades', '5', { choices: ['3', '4', '5'], label: 'Blades' });
const light = param('light', 'yes', { choices: ['yes', 'no'], label: 'Light' });
const rod = param('rod', '300', { choices: ['150', '300', '600'], label: 'Downrod (mm)' });
const blade = param('blade', '#8a6040', { label: 'Blades' });
const body = param('body', '#ece9e2', { label: 'Body' });
const glow = param('glow', '#fff2c4', { label: 'Light' });

presets({
  black: { body: '#2b2927', blade: '#3b3d42' },
  bronze: { body: '#6b4f2f', blade: '#c69c6d' },
  white: { body: '#f2f1ec', blade: '#f2f1ec' },
});

const n = Number(blades.value);
const rl = Number(rod.value);
const ngon = (r: number, s: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  return p.close();
};
const rings = (rs: [number, number][], s: number) =>
  ngon(rs[0][0], s).loft(rs.slice(1).map(([r]) => ngon(r, s)), {
    planes: rs.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });

const f = assembly('ceiling-fan');
f.part('canopy', rings([[45, -70], [75, -15], [70, 0]], 8).color(body));
f.part('downrod', ngon(13, 6).extrude(rl + 20).translate(0, 0, -rl - 75).color(body));
const mz = -rl - 70; // top of motor
f.part('motor', rings([[60, mz + 5], [160, mz - 40], [165, mz - 110], [110, mz - 150]], 10).color(body));
// Blades: thin tapered slabs pitched 12 degrees, held by angled irons.
for (let i = 0; i < n; i++) {
  const a = (360 * i) / n;
  const bl = extrudePolygon([[150, -55], [700, -80], [720, 0], [700, 80], [150, 55]], 10).translate(0, 0, -5).rotateX(12);
  f.part(`blade-${i + 1}`, bl.rotateZ(a).translate(0, 0, mz - 95).color(blade));
  const iron = box(150, 30, 15, true).translate(185, 0, 0).rotateZ(a).translate(0, 0, mz - 85);
  f.part(`iron-${i + 1}`, iron.color(body));
}
if (light.value === 'yes') {
  f.part('light', rings([[105, mz - 149], [100, mz - 200], [45, mz - 250]], 10).color(glow));
}

return f.model();
