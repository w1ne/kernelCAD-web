// Original kernelCAD low-poly pendant lamp: a ceiling canopy, a cord and a
// faceted dome, cone or drum shade with a visible bulb. Origin 'ceiling': the
// canopy's top face sits on the z = 0 ceiling plane and the lamp hangs down
// along -Z, centred on x = y = 0. Millimetres, Z up.

meta({
  name: 'pendant-lamp',
  license: 'CC0-1.0',
  title: 'Pendant lamp',
  description: 'Ceiling pendant light on a cord with a faceted dome, cone or drum shade and a glowing bulb. Knobs: shade style, drop length, shade, fitting and bulb colours.',
  tags: ['pendant lamp', 'pendant light', 'ceiling light', 'hanging lamp', 'lamp', 'light', 'lighting'],
  kit: 'interior',
  category: 'attachment',
  origin: 'ceiling',
  compat: ['indoor', 'kitchen', 'dining-room', 'living-room', 'cafe'],
  triangleBudget: 350,
});

const style = param('style', 'dome', { choices: ['dome', 'cone', 'drum'], label: 'Shade style' });
const drop = param('drop', '700', { choices: ['400', '700', '1000'], label: 'Drop (mm)' });
const shade = param('shade', '#2f5a46', { label: 'Shade' });
const fitting = param('fitting', '#2b2927', { label: 'Canopy and cord' });
const bulb = param('bulb', '#fff2c4', { label: 'Bulb' });

presets({
  brass: { shade: '#b8913f', fitting: '#8a6a2f' },
  white: { shade: '#f2f1ec', fitting: '#c9ccd0' },
  black: { shade: '#232323', fitting: '#232323', bulb: '#ffd98a' },
});

const dz = Number(drop.value);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};
const rings = (rs: [number, number][], n: number) =>
  ngon(rs[0][0], n).loft(rs.slice(1).map(([r]) => ngon(r, n)), {
    planes: rs.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });

const l = assembly('pendant-lamp');
l.part('canopy', rings([[60, -30], [55, -10], [40, 0]], 8).color(fitting));
l.part('cord', ngon(4, 4).extrude(dz).translate(0, 0, -dz - 25).color(fitting));
const top = -dz;
l.part('holder', ngon(22, 8).extrude(70).translate(0, 0, top - 60).color(fitting));
const n = 10;
if (style.value === 'dome') {
  l.part('shade', rings([[175, top - 230], [155, top - 140], [90, top - 45], [25, top + 2]], n)
    .subtract(rings([[165, top - 240], [145, top - 140], [80, top - 52], [15, top - 8]], n)).color(shade));
} else if (style.value === 'cone') {
  l.part('shade', rings([[150, top - 260], [25, top + 2]], n)
    .subtract(rings([[140, top - 270], [15, top - 8]], n)).color(shade));
} else {
  l.part('shade', ngon(170, n).extrude(220).subtract(ngon(160, n).extrude(240).translate(0, 0, -10)).translate(0, 0, top - 240)
    .union(ngon(165, n).extrude(10).translate(0, 0, top - 30).subtract(ngon(25, 8).extrude(30).translate(0, 0, top - 40)))
    .color(shade));
}
l.part('bulb', rings([[20, top - 60], [45, top - 110], [40, top - 150], [15, top - 170]], 8).color(bulb));

return l.model();
