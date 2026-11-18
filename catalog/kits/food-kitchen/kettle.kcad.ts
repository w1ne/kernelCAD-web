// Original kernelCAD low-poly stovetop kettle: a faceted pot-bellied body with
// a lid and knob, an angled spout and an arched top handle or a side handle.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, spout toward +X.

meta({
  name: 'kettle',
  license: 'CC0-1.0',
  title: 'Kettle',
  description: 'Stovetop kettle with a pot-bellied body, lid with knob, angled spout and an arched over-the-top or side handle. Knobs: size, handle style, body, handle and knob colours.',
  tags: ['kettle', 'tea kettle', 'teakettle', 'stovetop', 'tea', 'boil', 'cookware', 'kitchen'],
  kit: 'food-kitchen',
  category: 'prop',
  origin: 'base',
  compat: ['kitchen', 'indoor', 'food', 'cottage', 'camp', 'cafe'],
  triangleBudget: 340,
});

const size = param('size', '2', { choices: ['1.2', '2', '3'], label: 'Capacity (litres)' });
const style = param('handle', 'arched', { choices: ['arched', 'side'], label: 'Handle' });
const body = param('body', '#c8302a', { label: 'Body' });
const grip = param('grip', '#2a2a2c', { label: 'Handle' });
const knob = param('knob', '#d8d4c8', { label: 'Lid and knob' });

presets({
  steel: { body: '#b8c0c4', grip: '#2a2a2c', knob: '#8a9296' },
  enamel: { body: '#f0ece2', grip: '#1f3a5a', knob: '#1f3a5a' },
  copper: { body: '#b8693a', grip: '#3a2a20', knob: '#d8a070' },
});

const s = Math.cbrt(Number(size.value) / 2);
const R = 100 * s;
const n = 10;
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
// Hexagonal rod from p0 to p1, tapering from radius r0 to r1.
const rod = (p0: [number, number, number], p1: [number, number, number], r0: number, r1: number) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return ngon(r0, 6).loft(ngon(r1, 6), { spacing: len, ruled: true })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const k = assembly('kettle');
const top = 170 * s;
// Pot belly: wide low body tapering to a short collar under the lid.
k.part('body', lathe([[R * 0.88, 0], [R, 22 * s], [R, 85 * s], [R * 0.62, 150 * s], [50 * s, top]])
  .union(rod([R * 0.7, 0, 50 * s], [R + 85 * s, 0, 150 * s], 17 * s, 8 * s))
  .color(body));
k.part('lid', lathe([[54 * s, top - 2 * s], [54 * s, top + 6 * s], [34 * s, top + 18 * s], [14 * s, top + 22 * s]]).color(knob));
k.part('knob', lathe([[10 * s, top + 18 * s], [10 * s, top + 30 * s], [18 * s, top + 34 * s], [14 * s, top + 42 * s]], 6).color(knob));

if (style.value === 'arched') {
  // Arched strap handle over the lid, profile in (y, z) so it spans front to back.
  const outer: [number, number][] = [[-70, 130], [-62, 215], [-30, 250], [30, 250], [62, 215], [70, 130]];
  const inner: [number, number][] = [[54, 140], [48, 205], [22, 232], [-22, 232], [-48, 205], [-54, 140]];
  const pts = [...outer, ...inner].map(([y, z]) => [y * s, z * s] as [number, number]);
  k.part('handle', extrudePolygon(pts, 20 * s).rotateX(90).rotateZ(90).translate(-10 * s, 0, 0).color(grip));
} else {
  // C handle on the back (-X) side.
  const pts: [number, number][] = [[-R * 0.75, 140], [-R - 60, 150], [-R - 70, 70], [-R + 4, 40], [-R + 4, 60], [-R - 48, 82], [-R - 42, 135], [-R * 0.75, 124]];
  k.part('handle', extrudePolygon(pts.map(([x, z]) => [x * s, z * s] as [number, number]).reverse(), 20 * s)
    .rotateX(90).translate(0, 10 * s, 0).color(grip));
}

return k.model();
