// Original kernelCAD low-poly rain barrel (water butt): a faceted plastic
// tub flaring towards the top with moulded ribs, a dished lid with a
// downpipe inlet and a tap near the base, on the ground or a stand.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, tap towards -Y.

meta({
  name: 'rain-barrel',
  license: 'CC0-1.0',
  title: 'Rain barrel',
  description: 'Plastic garden water butt with moulded ribs, a lid with downpipe inlet and a tap near the base, standing on the ground or on a stand. Knobs: size, stand, body, lid, tap and stand colours.',
  tags: ['rain barrel', 'water butt', 'water tank', 'barrel', 'garden', 'rainwater', 'tap'],
  kit: 'containers',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'garden', 'farm', 'house', 'allotment'],
  triangleBudget: 460,
});

const size = param('size', '200', { choices: ['100', '200', '300'], label: 'Capacity (litres)' });
const stand = param('stand', 'stand', { choices: ['none', 'stand'], label: 'Stand' });
const body = param('body', '#3f8a4a', { label: 'Body' });
const lid = param('lid', '#2b5e33', { label: 'Lid' });
const tap = param('tap', '#c9a43a', { label: 'Tap' });
const standC = param('standColor', '#5e4a36', { label: 'Stand' });

presets({
  black: { body: '#2e3033', lid: '#222426', standColor: '#222426' },
  terracotta: { body: '#b8603a', lid: '#8a4428', standColor: '#8a4428', tap: '#2a2a2c' },
  blue: { body: '#2f5f9a', lid: '#244a7a', standColor: '#244a7a' },
});

const cap = Number(size.value);
const H = cap === 100 ? 650 : cap === 200 ? 900 : 1050;
const r0 = cap === 300 ? 290 : cap === 200 ? 250 : 210;
const r1 = r0 + 40;
const n = 10;
const zs0 = stand.value === 'stand' ? 300 : 0;
const ngon = (r: number, k0 = n) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < k0; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / k0), r * Math.sin((2 * Math.PI * k) / k0));
  return p.close();
};
const rAt = (z: number) => r0 + ((r1 - r0) * z) / H;
const frust = (z0: number, z1: number, grow: number) =>
  ngon(rAt(z0) + grow).loft(ngon(rAt(z1) + grow), { spacing: z1 - z0, ruled: true }).translate(0, 0, zs0 + z0);

const b = assembly('rain-barrel');
// Tub with a recessed top so the lid sits in it, plus three proud rib bands.
b.part('body', frust(0, H, 0).subtract(ngon(rAt(H) - 25).extrude(60).translate(0, 0, zs0 + H - 30)).color(body));
[0.22, 0.5, 0.78].forEach((f, i) => b.part(`rib-${i + 1}`, frust(H * f - 18, H * f + 18, 10).color(body)));
// Lid: a shallow dished cover with a raised downpipe inlet collar.
b.part('lid', ngon(rAt(H) + 12).extrude(30).translate(0, 0, zs0 + H - 15)
  .union(ngon(55, 8).extrude(50).translate(r0 * 0.35, 0, zs0 + H + 10))
  .subtract(ngon(38, 8).extrude(60).translate(r0 * 0.35, 0, zs0 + H + 25))
  .color(lid));
// Tap: a boss on the wall, a spout pointing down and a lever on top.
const tz = zs0 + 110;
const ty = -rAt(110) + 6;
b.part('tap', box(64, 80, 64, true).translate(0, ty - 35, tz)
  .union(box(36, 36, 90, true).translate(0, ty - 62, tz - 50))
  .union(box(90, 20, 18, true).translate(0, ty - 55, tz + 40))
  .color(tap));

if (stand.value === 'stand') {
  // Stand: a faceted platform on four splayed legs joined by a ring.
  b.part('stand', ngon(r0 + 30, 8).extrude(40).translate(0, 0, zs0 - 40).color(standC));
  for (let i = 0; i < 4; i++) {
    const a = 45 + 90 * i;
    b.part(`leg-${i + 1}`, extrudePolygon([[r0 - 30, 0], [r0 + 30, 0], [r0 + 5, zs0 - 39], [r0 - 45, zs0 - 39]], 50)
      .rotateX(90).translate(0, 25, 0).rotateZ(a).color(standC));
  }
}

return b.model();
